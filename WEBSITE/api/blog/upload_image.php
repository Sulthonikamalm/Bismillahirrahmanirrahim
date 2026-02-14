<?php
header('Content-Type: application/json');
require_once '../../config/database.php';

// Start session with same settings as auth
session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Strict'
]);

// Check if user is logged in (Admin)
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || !isset($_SESSION['admin_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['image'])) {
    $file = $_FILES['image'];
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!in_array($file['type'], $allowedTypes)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid file type. Only JPG, PNG, GIF, WEBP allowed.']);
        exit;
    }

    // Limit size (5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        echo json_encode(['status' => 'error', 'message' => 'File size too large. Max 5MB.']);
        exit;
    }

    // Create directory if not exists
    $uploadDir = '../../uploads/content/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Generate unique name
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('content_') . '.' . $ext;
    $targetPath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        // Return URL relative to domain root or relevant path
        // Script is in api/blog/, uploads is in uploads/content/
        // Frontend expects path relative to where it is used.
        // If used in Admin pages, it needs full path or relative.
        // Best to return root-relative path: /uploads/content/filename
        
        // Return valid relative path that frontend can adjust
        $url = 'uploads/content/' . $filename;
        
        echo json_encode([
            'status' => 'success', 
            'url' => $url,
            'message' => 'Image uploaded successfully'
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to move uploaded file.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'No file uploaded']);
}
?>
