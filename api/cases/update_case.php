<?php
/**
 * ========================================================
 * SIGAP PPKS - Update Case API
 * File: api/cases/update_case.php
 * ========================================================
 *
 * Usage: POST /api/cases/update_case.php
 * Body: { id, status_laporan, [other fields...], csrf_token }
 *
 * Security Features:
 * - Session authentication
 * - CSRF token validation
 * - SQL Injection prevention (prepared statements)
 * - Input validation & sanitization
 * - Audit logging
 */

// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Only allow POST/PUT
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
// GET INPUT DATA (POST or JSON)
// ========================================================

// Try POST first, then JSON
$id = $_POST['id'] ?? '';
$statusLaporan = $_POST['status_laporan'] ?? '';
$csrfToken = $_POST['csrf_token'] ?? '';

// Additional editable fields
$statusDarurat = $_POST['status_darurat'] ?? null;
$pelakuKekerasan = $_POST['pelaku_kekerasan'] ?? null;
$lokasiKejadian = $_POST['lokasi_kejadian'] ?? null;
$detailKejadian = $_POST['detail_kejadian'] ?? null;

// If POST is empty, try JSON
if (empty($id)) {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input) {
        $id = $input['id'] ?? '';
        $statusLaporan = $input['status_laporan'] ?? '';
        $csrfToken = $input['csrf_token'] ?? '';
        $statusDarurat = $input['status_darurat'] ?? null;
        $pelakuKekerasan = $input['pelaku_kekerasan'] ?? null;
        $lokasiKejadian = $input['lokasi_kejadian'] ?? null;
        $detailKejadian = $input['detail_kejadian'] ?? null;
    }
}

// ========================================================
// CSRF TOKEN VALIDATION
// ========================================================

if (empty($csrfToken) || !isset($_SESSION['csrf_token']) || $csrfToken !== $_SESSION['csrf_token']) {
    error_log("SECURITY: CSRF token mismatch on case update - Admin ID: " . ($_SESSION['admin_id'] ?? 'unknown'));
    http_response_code(403);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid security token. Please refresh the page.'
    ]));
}

// ========================================================
// INPUT VALIDATION
// ========================================================

// Validate case ID
$caseId = filter_var($id, FILTER_VALIDATE_INT);
if ($caseId === false || $caseId <= 0) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid case ID'
    ]));
}

// Validate status_laporan
$allowedStatuses = ['Process', 'In Progress', 'Resolved', 'Closed', 'Rejected'];
if (!empty($statusLaporan) && !in_array($statusLaporan, $allowedStatuses)) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid status. Allowed: ' . implode(', ', $allowedStatuses)
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
// CHECK IF CASE EXISTS
// ========================================================

try {
    $checkQuery = "SELECT id, kode_pelaporan, status_laporan FROM Laporan WHERE id = :id LIMIT 1";
    $checkStmt = $pdo->prepare($checkQuery);
    $checkStmt->execute([':id' => $caseId]);
    $existingCase = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$existingCase) {
        http_response_code(404);
        exit(json_encode([
            'status' => 'error',
            'message' => 'Case not found'
        ]));
    }

    // ========================================================
    // BUILD UPDATE QUERY DYNAMICALLY
    // ========================================================

    $updateFields = [];
    $params = [':id' => $caseId];

    // Only update fields that are provided
    if (!empty($statusLaporan)) {
        $updateFields[] = "status_laporan = :status_laporan";
        $params[':status_laporan'] = $statusLaporan;
    }

    if ($statusDarurat !== null) {
        $updateFields[] = "status_darurat = :status_darurat";
        $params[':status_darurat'] = trim($statusDarurat);
    }

    if ($pelakuKekerasan !== null) {
        $updateFields[] = "pelaku_kekerasan = :pelaku_kekerasan";
        $params[':pelaku_kekerasan'] = trim($pelakuKekerasan);
    }

    if ($lokasiKejadian !== null) {
        $updateFields[] = "lokasi_kejadian = :lokasi_kejadian";
        $params[':lokasi_kejadian'] = trim($lokasiKejadian);
    }

    if ($detailKejadian !== null) {
        $updateFields[] = "detail_kejadian = :detail_kejadian";
        $params[':detail_kejadian'] = trim($detailKejadian);
    }

    // Check if there's anything to update
    if (empty($updateFields)) {
        http_response_code(400);
        exit(json_encode([
            'status' => 'error',
            'message' => 'No fields to update'
        ]));
    }

    // Build and execute update query
    $updateQuery = "UPDATE Laporan SET " . implode(', ', $updateFields) . " WHERE id = :id";
    $updateStmt = $pdo->prepare($updateQuery);
    $updateStmt->execute($params);

    // Log the update for audit
    error_log("CASE UPDATED - ID: $caseId, Kode: {$existingCase['kode_pelaporan']}, " .
              "Old Status: {$existingCase['status_laporan']}, New Status: " . ($statusLaporan ?: 'unchanged') . ", " .
              "Admin: " . ($_SESSION['admin_email'] ?? 'unknown'));

    // Get updated case data
    $getUpdatedQuery = "SELECT * FROM Laporan WHERE id = :id LIMIT 1";
    $getUpdatedStmt = $pdo->prepare($getUpdatedQuery);
    $getUpdatedStmt->execute([':id' => $caseId]);
    $updatedCase = $getUpdatedStmt->fetch(PDO::FETCH_ASSOC);

    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Case updated successfully',
        'data' => [
            'id' => (int) $updatedCase['id'],
            'kode_pelaporan' => $updatedCase['kode_pelaporan'],
            'status_laporan' => $updatedCase['status_laporan'],
            'updated_at' => $updatedCase['updated_at']
        ]
    ]);

} catch (PDOException $e) {
    error_log("Database query failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Failed to update case'
    ]));
}

exit;
