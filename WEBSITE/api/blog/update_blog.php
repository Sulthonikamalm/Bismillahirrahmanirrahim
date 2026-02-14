<?php
/**
 * SIGAP PPKS - API Update Blog
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
$id = $_POST['id'] ?? '';
$judul = $_POST['judul'] ?? '';
$isi_postingan = $_POST['isi_postingan'] ?? '';
$kategori = $_POST['kategori'] ?? '';
$gambar_header_url = $_POST['gambar_header_url'] ?? '';
$csrfToken = $_POST['csrf_token'] ?? '';

// Try JSON if POST is empty
if (empty($id)) {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input) {
        $id = $input['id'] ?? '';
        $judul = $input['judul'] ?? '';
        $isi_postingan = $input['isi_postingan'] ?? '';
        $kategori = $input['kategori'] ?? '';
        $gambar_header_url = $input['gambar_header_url'] ?? '';
        $csrfToken = $input['csrf_token'] ?? '';
    }
}

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
// INPUT VALIDATION
// ========================================================

// Validate ID
$blogId = filter_var($id, FILTER_VALIDATE_INT);
if ($blogId === false || $blogId <= 0) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid blog ID'
    ]));
}

// Sanitize input
$judul = trim($judul);
$isi_postingan = trim($isi_postingan);
$kategori = trim($kategori);
$isi_postingan = trim($isi_postingan);
$kategori = trim($kategori);
$gambar_header_url = trim($gambar_header_url);

// SERVER-SIDE CLEANING ARTIFACTS
// Remove editor tools that might have slipped through JS sanitizer
$isi_postingan = preg_replace('/<button class="image-delete-btn".*?<\/button>/s', '', $isi_postingan);
$isi_postingan = preg_replace('/<div class="image-size-info".*?<\/div>/s', '', $isi_postingan);
$isi_postingan = preg_replace('/<div class="image-toolbar">.*?<\/div>/s', '', $isi_postingan);
$isi_postingan = preg_replace('/<div class="resize-handle.*?<\/div>/s', '', $isi_postingan);
// Unwrap Resizable Wrapper (Simple Regex: Remove opening and closing tag if matches pattern)
// Removes <div class="resizable-image-wrapper..."> and the last </div>
// Note: This is risky if multiple divs nested. But removing the tools above solves the visible text "Small Medium Large".
// We can leave the wrapper div if it has no visual impact, or try to strip it.
// For now, let's trust removing the toolbar solves the main ugly text issue.

// Validate required fields
$errors = [];

if (empty($judul)) {
    $errors[] = 'Judul blog is required';
} elseif (strlen($judul) < 5) {
    $errors[] = 'Judul must be at least 5 characters';
} elseif (strlen($judul) > 255) {
    $errors[] = 'Judul must not exceed 255 characters';
}

if (empty($isi_postingan)) {
    $errors[] = 'Isi postingan is required';
} elseif (strlen($isi_postingan) < 50) {
    $errors[] = 'Isi postingan must be at least 50 characters';
}

// Validate image URL if provided
if (!empty($gambar_header_url)) {
    if (!filter_var($gambar_header_url, FILTER_VALIDATE_URL) && !preg_match('/^\/?uploads\//', $gambar_header_url)) {
        $errors[] = 'Invalid image URL format';
    }
}

if (!empty($errors)) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Validation failed',
        'errors' => $errors
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
// CHECK IF BLOG EXISTS
// ========================================================

try {
    $checkQuery = "SELECT id, author_id, judul FROM ArtikelBlog WHERE id = :id LIMIT 1";
    $checkStmt = $pdo->prepare($checkQuery);
    $checkStmt->bindValue(':id', $blogId, PDO::PARAM_INT);
    $checkStmt->execute();
    $existingBlog = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$existingBlog) {
        http_response_code(404);
        exit(json_encode([
            'status' => 'error',
            'message' => 'Blog not found'
        ]));
    }

    // Optional: Check if user is the author (uncomment if needed)
    /*
    if ((int)$existingBlog['author_id'] !== (int)$_SESSION['admin_id']) {
        http_response_code(403);
        exit(json_encode([
            'status' => 'error',
            'message' => 'You can only edit your own blogs'
        ]));
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
// UPDATE BLOG
// ========================================================

try {
    $query = "
        UPDATE ArtikelBlog
        SET
            judul = :judul,
            isi_postingan = :isi_postingan,
            gambar_header_url = :gambar_header_url,
            kategori = :kategori,
            updated_at = NOW()
        WHERE id = :id
    ";

    $stmt = $pdo->prepare($query);

    $stmt->execute([
        ':id' => $blogId,
        ':judul' => $judul,
        ':isi_postingan' => $isi_postingan,
        ':gambar_header_url' => !empty($gambar_header_url) ? $gambar_header_url : null,
        ':kategori' => !empty($kategori) ? $kategori : null
    ]);

    // Log activity
    error_log("BLOG UPDATED - ID: $blogId, Admin: " . $_SESSION['admin_email'] . ", Old: {$existingBlog['judul']}, New: $judul");

    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Blog updated successfully',
        'data' => [
            'id' => $blogId,
            'judul' => $judul,
            'kategori' => $kategori
        ]
    ]);

} catch (PDOException $e) {
    error_log("Database update failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Failed to update blog'
    ]));
}

exit;

