<?php
/**
 * SIGAP PPKS - API Buat Blog
 */
// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
// GET INPUT DATA (POST or JSON)
// ========================================================

// First, try to get data from POST
$judul = $_POST['judul'] ?? '';
$isi_postingan = $_POST['isi_postingan'] ?? '';
$kategori = $_POST['kategori'] ?? '';
$gambar_header_url = $_POST['gambar_header_url'] ?? '';
$csrfToken = $_POST['csrf_token'] ?? '';

// If POST is empty, try JSON
if (empty($judul) && empty($isi_postingan)) {
    $input = json_decode(file_get_contents('php://input'), true);
    if ($input) {
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
    error_log("SECURITY: CSRF token mismatch - Admin ID: " . ($_SESSION['admin_id'] ?? 'unknown') . ", Token received: " . substr($csrfToken, 0, 10) . "...");
    http_response_code(403);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid security token. Please refresh the page.'
    ]));
}

// ========================================================
// INPUT SANITIZATION
// ========================================================

// Sanitize input
$judul = trim($judul);
$isi_postingan = trim($isi_postingan);
$kategori = trim($kategori);
$isi_postingan = trim($isi_postingan);
$kategori = trim($kategori);
$gambar_header_url = trim($gambar_header_url);

// SERVER-SIDE CLEANING ARTIFACTS
$isi_postingan = preg_replace('/<button class="image-delete-btn".*?<\/button>/s', '', $isi_postingan);
$isi_postingan = preg_replace('/<div class="image-size-info".*?<\/div>/s', '', $isi_postingan);
$isi_postingan = preg_replace('/<div class="image-toolbar">.*?<\/div>/s', '', $isi_postingan);
$isi_postingan = preg_replace('/<div class="resize-handle.*?<\/div>/s', '', $isi_postingan);

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
    // Basic URL validation
    if (!filter_var($gambar_header_url, FILTER_VALIDATE_URL) && !preg_match('/^\/?uploads\//', $gambar_header_url)) {
        $errors[] = 'Invalid image URL format';
    }
}

// Return validation errors
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
// INSERT BLOG
// ========================================================

try {
    $query = "
        INSERT INTO ArtikelBlog
        (author_id, judul, isi_postingan, gambar_header_url, kategori, created_at, updated_at)
        VALUES
        (:author_id, :judul, :isi_postingan, :gambar_header_url, :kategori, NOW(), NOW())
    ";

    $stmt = $pdo->prepare($query);

    $stmt->execute([
        ':author_id' => $_SESSION['admin_id'],
        ':judul' => $judul,
        ':isi_postingan' => $isi_postingan,
        ':gambar_header_url' => !empty($gambar_header_url) ? $gambar_header_url : null,
        ':kategori' => !empty($kategori) ? $kategori : null
    ]);

    $blogId = $pdo->lastInsertId();

    // Log activity
    error_log("BLOG CREATED - ID: $blogId, Admin: " . $_SESSION['admin_email'] . ", Judul: $judul");

    // Success response
    http_response_code(201);
    echo json_encode([
        'status' => 'success',
        'message' => 'Blog created successfully',
        'data' => [
            'id' => (int) $blogId,
            'judul' => $judul,
            'kategori' => $kategori
        ]
    ]);

} catch (PDOException $e) {
    error_log("Database insert failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Failed to create blog'
    ]));
}

exit;

