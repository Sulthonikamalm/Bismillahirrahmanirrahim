<?php
/**
 * SIGAP PPKS - API Detail Blog
 */
// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Only allow GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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

// if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
//     http_response_code(401);
//     exit(json_encode([
//         'status' => 'error',
//         'message' => 'Unauthorized. Please login first.'
//     ]));
// }

// ========================================================
// INPUT VALIDATION
// ========================================================

if (!isset($_GET['id']) || empty($_GET['id'])) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Blog ID is required'
    ]));
}

$blogId = filter_var($_GET['id'], FILTER_VALIDATE_INT);

if ($blogId === false || $blogId <= 0) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid blog ID'
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
// FETCH BLOG DETAIL
// ========================================================

try {
    $query = "
        SELECT
            b.id,
            b.judul,
            b.isi_postingan,
            b.gambar_header_url,
            b.kategori,
            b.created_at,
            b.updated_at,
            b.author_id,
            a.nama as author_name,
            a.email as author_email,
            a.username as author_username
        FROM ArtikelBlog b
        LEFT JOIN Admin a ON b.author_id = a.id
        WHERE b.id = :id
        LIMIT 1
    ";

    $stmt = $pdo->prepare($query);
    $stmt->bindValue(':id', $blogId, PDO::PARAM_INT);
    $stmt->execute();

    $blog = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$blog) {
        http_response_code(404);
        exit(json_encode([
            'status' => 'error',
            'message' => 'Blog not found'
        ]));
    }

    // Format response
    $response = [
        'id' => (int) $blog['id'],
        'judul' => htmlspecialchars($blog['judul'], ENT_QUOTES, 'UTF-8'),
        'isi_postingan' => $blog['isi_postingan'], // Return RAW HTML for rendering
        'gambar_header_url' => $blog['gambar_header_url'] ? htmlspecialchars($blog['gambar_header_url'], ENT_QUOTES, 'UTF-8') : null,
        'kategori' => $blog['kategori'] ? htmlspecialchars($blog['kategori'], ENT_QUOTES, 'UTF-8') : null,
        'author' => [
            'id' => (int) $blog['author_id'],
            'name' => htmlspecialchars($blog['author_name'] ?? 'Unknown', ENT_QUOTES, 'UTF-8'),
            'email' => htmlspecialchars($blog['author_email'] ?? '', ENT_QUOTES, 'UTF-8'),
            'username' => htmlspecialchars($blog['author_username'] ?? '', ENT_QUOTES, 'UTF-8')
        ],
        'created_at' => $blog['created_at'],
        'updated_at' => $blog['updated_at'],
        'formatted_date' => date('d M Y, H:i', strtotime($blog['created_at'])),
        'updated_formatted' => date('d M Y, H:i', strtotime($blog['updated_at']))
    ];

    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => $response,
        'csrf_token' => $_SESSION['csrf_token'] ?? ''
    ]);

} catch (PDOException $e) {
    error_log("Database query failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch blog detail'
    ]));
}

exit;
