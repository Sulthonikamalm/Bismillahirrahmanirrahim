<?php
/**
 * SIGAP PPKS - API Hapus Blog
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
ini_set('error_log', __DIR__ . '/../../logs/blog_error.log');

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
// GET INPUT
// ========================================================

// Get input from POST or JSON
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

$csrfToken = $input['csrf_token'] ?? '';
$id = $input['id'] ?? null;
$ids = $input['ids'] ?? [];

// ========================================================
// CSRF TOKEN VALIDATION
// ========================================================

if (empty($csrfToken) || !isset($_SESSION['csrf_token']) || $csrfToken !== $_SESSION['csrf_token']) {
    error_log("SECURITY: CSRF token mismatch - Admin ID: " . ($_SESSION['admin_id'] ?? 'unknown'));
    http_response_code(403);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid security token. Please refresh the page.'
    ]));
}

// ========================================================
// PREPARE IDS FOR DELETION
// ========================================================

// If single ID provided, convert to array
if (!empty($id)) {
    $ids = [(int) $id];
} elseif (is_array($ids)) {
    // Validate and convert all IDs to integers
    $ids = array_filter(array_map('intval', $ids), function($id) {
        return $id > 0;
    });
}

// Check if we have valid IDs
if (empty($ids)) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'No valid blog IDs provided'
    ]));
}

// Limit bulk delete to 100 items for safety
if (count($ids) > 100) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Cannot delete more than 100 blogs at once'
    ]));
}

// ========================================================
// DATABASE CONNECTION
// ========================================================
try {
    require_once __DIR__ . '/../../config/database.php';
} catch (Exception $e) {
    error_log("Database connection failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Database connection failed'
    ]));
}

// ========================================================
// GET BLOG INFO BEFORE DELETION (for logging)
// ========================================================

try {
    // Create placeholders for IN clause
    $placeholders = str_repeat('?,', count($ids) - 1) . '?';

    $infoQuery = "SELECT id, judul, author_id FROM ArtikelBlog WHERE id IN ($placeholders)";
    $infoStmt = $pdo->prepare($infoQuery);
    $infoStmt->execute($ids);
    $blogsToDelete = $infoStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($blogsToDelete)) {
        http_response_code(404);
        exit(json_encode([
            'status' => 'error',
            'message' => 'No blogs found with provided IDs'
        ]));
    }

    // Optional: Check if user is the author of all blogs (uncomment if needed)
    /*
    foreach ($blogsToDelete as $blog) {
        if ((int)$blog['author_id'] !== (int)$_SESSION['admin_id']) {
            http_response_code(403);
            exit(json_encode([
                'status' => 'error',
                'message' => 'You can only delete your own blogs'
            ]));
        }
    }
    */

} catch (PDOException $e) {
    error_log("Database check failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Database error'
    ]));
}

// ========================================================
// DELETE BLOGS
// ========================================================

try {
    // Begin transaction
    $pdo->beginTransaction();

    // Delete blogs
    $deleteQuery = "DELETE FROM ArtikelBlog WHERE id IN ($placeholders)";
    $deleteStmt = $pdo->prepare($deleteQuery);
    $deleteStmt->execute($ids);

    $deletedCount = $deleteStmt->rowCount();

    // Commit transaction
    $pdo->commit();

    // Log activity
    $blogTitles = array_column($blogsToDelete, 'judul');
    $blogIdsStr = implode(', ', $ids);
    error_log("BLOGS DELETED - Count: $deletedCount, IDs: [$blogIdsStr], Admin: " . $_SESSION['admin_email']);
    error_log("Deleted titles: " . implode(', ', $blogTitles));

    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => $deletedCount === 1 ?
            'Blog deleted successfully' :
            "$deletedCount blogs deleted successfully",
        'data' => [
            'deleted_count' => $deletedCount,
            'deleted_ids' => $ids
        ]
    ]);

} catch (PDOException $e) {
    // Rollback transaction on error
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("Database delete failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Failed to delete blog(s)'
    ]));
}

exit;
