<?php
/**
 * SIGAP PPKS - API Daftar Blog
 * Mengambil daftar artikel dengan pagination dan pencarian
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

// Check if admin is logged in
// Check if admin is logged in - OPTIONAL: Allow public access for reading blogs
// if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
//     http_response_code(401);
//     exit(json_encode([
//         'status' => 'error',
//         'message' => 'Unauthorized. Please login first.'
//     ]));
// }

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
// GET PARAMETERS (with validation)
// ========================================================

// Pagination
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 10;
$offset = ($page - 1) * $limit;

// Search
$search = isset($_GET['search']) ? trim($_GET['search']) : '';

// Category filter
$category = isset($_GET['category']) ? trim($_GET['category']) : '';

// ========================================================
// BUILD QUERY
// ========================================================

try {
    // Base query parts
    $selectFields = "
        b.id,
        b.judul,
        b.isi_postingan,
        b.gambar_header_url,
        b.kategori,
        b.created_at,
        b.updated_at,
        b.author_id,
        a.nama as author_name,
        a.email as author_email
    ";
    
    $whereConditions = [];
    $params = [];
    $orderBy = "b.created_at DESC"; // Default order

    // Search condition (Smart Keyword Matching)
    $hasSearch = false;
    if (!empty($search)) {
        // Cleaning: remove special chars, keep alphanumeric and spaces
        $cleanSearch = preg_replace('/[^a-zA-Z0-9\s]/', '', $search);
        $keywords = explode(' ', $cleanSearch); 
        $keywords = array_filter($keywords, function($k) { return strlen($k) > 2; }); 
        
        if (!empty($keywords)) {
            $hasSearch = true;
            $scoreCases = [];
            $i = 0;
            foreach ($keywords as $word) {
                // Generate TWO unique placeholders per keyword: one for title, one for content
                $paramTitle = ":searchT_$i";
                $paramContent = ":searchC_$i";
                
                $scoreCases[] = "(CASE WHEN b.judul LIKE $paramTitle THEN 2 ELSE 0 END + CASE WHEN b.isi_postingan LIKE $paramContent THEN 1 ELSE 0 END)";
                
                // Bind the word to both placeholders
                $params[$paramTitle] = '%' . $word . '%';
                $params[$paramContent] = '%' . $word . '%';
                $i++;
            }
            
            // Add Score to Selection
            $scoreQuery = implode(' + ', $scoreCases);
            $selectFields .= ", ($scoreQuery) as relevance_score";
            
            $mainQueryHaving = "HAVING relevance_score > 0";
            $orderBy = "relevance_score DESC, b.created_at DESC";
        }
    }

    // Category filter
    if (!empty($category)) {
        $whereConditions[] = "b.kategori = :category";
        $params[':category'] = $category;
    }

    // Build WHERE clause (Common)
    $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

    // ============================================
    // 1. COUNT QUERY
    // ============================================
    // For COUNT, we cannot use HAVING relevance_score because we just want count.
    // We must replicate the filter logic in WHERE using *distinct* params if needed, 
    // OR since COUNT query is separate, we can just use the score logic in WHERE with the *same* params 
    // because count query doesn't select the score, so params appear only once in WHERE!
    
    if ($hasSearch) {
        // Add the search filter to WHERE clause specifically for COUNT query
        // logic: ($scoreQuery) > 0
        $countWhere = empty($whereConditions) ? "WHERE ($scoreQuery) > 0" : $whereClause . " AND ($scoreQuery) > 0";
    } else {
        $countWhere = $whereClause;
    }

    $countQuery = "SELECT COUNT(*) as total FROM ArtikelBlog b $countWhere";
    $countStmt = $pdo->prepare($countQuery);
    foreach ($params as $key => $value) { 
        $countStmt->bindValue($key, $value); 
    }
    $countStmt->execute();
    $totalRecords = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // ============================================
    // 2. MAIN QUERY
    // ============================================
    
    // For Main Query, we use HAVING to avoid parameter reuse issue in SELECT + WHERE
    // logic: SELECT ..., score ... WHERE ... HAVING score > 0
    
    $query = "
        SELECT $selectFields
        FROM ArtikelBlog b
        LEFT JOIN Admin a ON b.author_id = a.id
        $whereClause
        " . ($hasSearch ? $mainQueryHaving : "") . "
        ORDER BY $orderBy
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $pdo->prepare($query);

    // Bind parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();
    $blogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate pagination info
    $totalPages = ceil($totalRecords / $limit);

    // ========================================================
    // FORMAT RESPONSE
    // ========================================================

    // Format blogs (truncate content for list view)
    $formattedBlogs = array_map(function($blog) {
        return [
            'id' => (int) $blog['id'],
            'judul' => htmlspecialchars($blog['judul'], ENT_QUOTES, 'UTF-8'),
            'isi_postingan' => $blog['isi_postingan'], // Return RAW HTML for rendering
            // Send raw HTML for content so frontend can render rich text
            // Excerpt is safe because we strip tags first
            'excerpt' => htmlspecialchars(substr(strip_tags($blog['isi_postingan']), 0, 150) . '...', ENT_QUOTES, 'UTF-8'),
            'gambar_header_url' => $blog['gambar_header_url'] ? htmlspecialchars($blog['gambar_header_url'], ENT_QUOTES, 'UTF-8') : null,
            'kategori' => $blog['kategori'] ? htmlspecialchars($blog['kategori'], ENT_QUOTES, 'UTF-8') : null,
            'author' => [
                'id' => (int) $blog['author_id'],
                'name' => htmlspecialchars($blog['author_name'] ?? 'Unknown', ENT_QUOTES, 'UTF-8'),
                'email' => htmlspecialchars($blog['author_email'] ?? '', ENT_QUOTES, 'UTF-8')
            ],
            'created_at' => $blog['created_at'],
            'updated_at' => $blog['updated_at'],
            'formatted_date' => date('d M Y', strtotime($blog['created_at']))
        ];
    }, $blogs);

    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'blogs' => $formattedBlogs,
            'total_count' => (int) $totalRecords
        ],
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_records' => (int) $totalRecords,
            'limit' => $limit,
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1
        ],
        'filters' => [
            'search' => $search,
            'category' => $category
        ],
        'csrf_token' => $_SESSION['csrf_token'] ?? ''
    ]);

} catch (PDOException $e) {
    error_log("Database query failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch blogs: ' . $e->getMessage()
    ]));
}

exit;
