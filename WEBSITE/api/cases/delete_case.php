<?php
/**
 * SIGAP PPKS - API Hapus Kasus
 */
// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Only allow POST/DELETE
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    exit(json_encode(['status' => 'error', 'message' => 'Method not allowed']));
}

// Disable error display
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/cases_error.log');

// ========================================================
// SESSION AUTHENTICATION CHECK
// ========================================================
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443,
    'cookie_samesite' => 'Strict'
]);

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Unauthorized. Please login first.'
    ]));
}

// ========================================================
// GET INPUT DATA
// ========================================================

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid JSON input'
    ]));
}

$csrfToken = $input['csrf_token'] ?? '';
$singleId = $input['id'] ?? null;
$multipleIds = $input['ids'] ?? null;

// ========================================================
// CSRF TOKEN VALIDATION
// ========================================================

if (empty($csrfToken) || !isset($_SESSION['csrf_token']) || $csrfToken !== $_SESSION['csrf_token']) {
    error_log("SECURITY: CSRF token mismatch on case delete - Admin ID: " . ($_SESSION['admin_id'] ?? 'unknown'));
    http_response_code(403);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid security token. Please refresh the page.'
    ]));
}

// ========================================================
// INPUT VALIDATION
// ========================================================

// Determine IDs to delete
$ids = [];

if ($singleId !== null) {
    $validId = filter_var($singleId, FILTER_VALIDATE_INT);
    if ($validId === false || $validId <= 0) {
        http_response_code(400);
        exit(json_encode([
            'status' => 'error',
            'message' => 'Invalid case ID'
        ]));
    }
    $ids[] = $validId;
} elseif ($multipleIds !== null && is_array($multipleIds)) {
    foreach ($multipleIds as $id) {
        $validId = filter_var($id, FILTER_VALIDATE_INT);
        if ($validId !== false && $validId > 0) {
            $ids[] = $validId;
        }
    }
}

if (empty($ids)) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'No valid case IDs provided'
    ]));
}

// Limit bulk delete to 50 cases
if (count($ids) > 50) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Cannot delete more than 50 cases at once'
    ]));
}

// ========================================================
// DATABASE CONNECTION
// ========================================================
require_once __DIR__ . '/../../config/database.php';

try {
    $pdo = getDBConnection();
} catch (Exception $e) {
    error_log("Database connection failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Database connection failed'
    ]));
}

// ========================================================
// DELETE CASES WITH TRANSACTION
// ========================================================

try {
    $pdo->beginTransaction();

    // Get case details before deletion for logging
    $placeholders = str_repeat('?,', count($ids) - 1) . '?';
    $selectQuery = "SELECT id, kode_pelaporan, status_laporan FROM Laporan WHERE id IN ($placeholders)";
    $selectStmt = $pdo->prepare($selectQuery);
    $selectStmt->execute($ids);
    $casesToDelete = $selectStmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($casesToDelete) === 0) {
        $pdo->rollBack();
        http_response_code(404);
        exit(json_encode([
            'status' => 'error',
            'message' => 'No cases found with the provided IDs'
        ]));
    }

    // Log before deletion
    $deletedCodes = array_column($casesToDelete, 'kode_pelaporan');
    error_log("CASE DELETE INITIATED - IDs: " . implode(',', $ids) .
              ", Codes: " . implode(',', $deletedCodes) .
              ", Admin: " . ($_SESSION['admin_email'] ?? 'unknown'));

    // Delete associated evidence (Bukti) first - cascades automatically via FK
    // But we do it explicitly for audit
    $deleteBuktiQuery = "DELETE FROM Bukti WHERE laporan_id IN ($placeholders)";
    $deleteBuktiStmt = $pdo->prepare($deleteBuktiQuery);
    $deleteBuktiStmt->execute($ids);
    $deletedBuktiCount = $deleteBuktiStmt->rowCount();

    // Delete the cases
    $deleteQuery = "DELETE FROM Laporan WHERE id IN ($placeholders)";
    $deleteStmt = $pdo->prepare($deleteQuery);
    $deleteStmt->execute($ids);
    $deletedCount = $deleteStmt->rowCount();

    $pdo->commit();

    // Log successful deletion
    error_log("CASE DELETED - Count: $deletedCount, Bukti: $deletedBuktiCount, " .
              "Codes: " . implode(',', $deletedCodes) . ", Admin: " . ($_SESSION['admin_email'] ?? 'unknown'));

    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => "$deletedCount case(s) deleted successfully",
        'data' => [
            'deleted_count' => $deletedCount,
            'deleted_bukti_count' => $deletedBuktiCount,
            'deleted_ids' => array_column($casesToDelete, 'id'),
            'deleted_codes' => $deletedCodes
        ]
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Database query failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Failed to delete case(s)'
    ]));
}

exit;
