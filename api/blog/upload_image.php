<?php
/**
 * ========================================================
 * SIGAP PPKPT - Secure Image Upload API
 * File: api/blog/upload_image.php
 * ========================================================
 *
 * Security Features:
 * ✅ File type validation (whitelist)
 * ✅ File size limit
 * ✅ MIME type verification
 * ✅ Random filename generation
 * ✅ Directory traversal prevention
 * ✅ Session authentication
 * ✅ CSRF token validation
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
ini_set('error_log', __DIR__ . '/../../logs/upload_error.log');

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
// CSRF TOKEN VALIDATION
// ========================================================

$csrfToken = $_POST['csrf_token'] ?? '';

if (empty($csrfToken) || !isset($_SESSION['csrf_token']) || $csrfToken !== $_SESSION['csrf_token']) {
    error_log("SECURITY: CSRF token mismatch - Admin ID: " . ($_SESSION['admin_id'] ?? 'unknown'));
    http_response_code(403);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid security token'
    ]));
}

// ========================================================
// CONFIGURATION
// ========================================================

// Allowed MIME types (whitelist)
$allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
];

// Allowed extensions (whitelist)
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// Max file size (5MB)
$maxFileSize = 5 * 1024 * 1024; // 5MB in bytes

// Upload directory
$uploadDir = __DIR__ . '/../../uploads/blog/';
$uploadUrlPath = '/uploads/blog/';

// ========================================================
// CREATE UPLOAD DIRECTORY IF NOT EXISTS
// ========================================================

if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        error_log("Failed to create upload directory: $uploadDir");
        http_response_code(500);
        exit(json_encode([
            'status' => 'error',
            'message' => 'Failed to create upload directory'
        ]));
    }
}

// ========================================================
// VALIDATE FILE UPLOAD
// ========================================================

if (!isset($_FILES['image']) || $_FILES['image']['error'] === UPLOAD_ERR_NO_FILE) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'No image file uploaded'
    ]));
}

$file = $_FILES['image'];

// Check for upload errors
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize in php.ini',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE in form',
        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
    ];

    $errorMessage = $errors[$file['error']] ?? 'Unknown upload error';

    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => $errorMessage
    ]));
}

// Check file size
if ($file['size'] > $maxFileSize) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'File size exceeds 5MB limit'
    ]));
}

// Check file size is not zero
if ($file['size'] === 0) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'File is empty'
    ]));
}

// ========================================================
// VALIDATE FILE TYPE
// ========================================================

// Get MIME type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedMimeTypes)) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
    ]));
}

// Get file extension
$originalFileName = basename($file['name']);
$fileExtension = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));

if (!in_array($fileExtension, $allowedExtensions)) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid file extension'
    ]));
}

// ========================================================
// GENERATE SECURE FILENAME
// ========================================================

// Generate random filename to prevent directory traversal & overwriting
$randomName = bin2hex(random_bytes(16));
$newFileName = $randomName . '_' . time() . '.' . $fileExtension;
$targetFilePath = $uploadDir . $newFileName;

// Double-check the target path doesn't escape upload directory
$realUploadDir = realpath($uploadDir);
$realTargetPath = realpath(dirname($targetFilePath)) . '/' . basename($targetFilePath);

if (strpos($realTargetPath, $realUploadDir) !== 0) {
    error_log("SECURITY: Directory traversal attempt detected!");
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid file path'
    ]));
}

// ========================================================
// MOVE UPLOADED FILE
// ========================================================

if (!move_uploaded_file($file['tmp_name'], $targetFilePath)) {
    error_log("Failed to move uploaded file to: $targetFilePath");
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Failed to save uploaded file'
    ]));
}

// Set file permissions
chmod($targetFilePath, 0644);

// Log activity
error_log("IMAGE UPLOADED - File: $newFileName, Admin: " . $_SESSION['admin_email'] . ", Size: " . $file['size'] . " bytes");

// ========================================================
// SUCCESS RESPONSE
// ========================================================

$fileUrl = $uploadUrlPath . $newFileName;

http_response_code(200);
echo json_encode([
    'status' => 'success',
    'message' => 'Image uploaded successfully',
    'data' => [
        'filename' => $newFileName,
        'url' => $fileUrl,
        'size' => $file['size'],
        'mime_type' => $mimeType
    ]
]);

exit;
