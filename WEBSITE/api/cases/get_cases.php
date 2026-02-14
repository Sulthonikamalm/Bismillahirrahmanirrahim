<?php
/**
 * SIGAP PPKS - API Daftar Kasus
 * Mengambil daftar laporan dengan pagination dan filter
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
// INPUT VALIDATION & SANITIZATION
// ========================================================

// Pagination
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 10;
$offset = ($page - 1) * $limit;

// Search & Filters
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$statusFilter = isset($_GET['status']) ? trim($_GET['status']) : '';
$genderFilter = isset($_GET['gender']) ? trim($_GET['gender']) : '';
$dateFrom = isset($_GET['date_from']) ? trim($_GET['date_from']) : '';
$dateTo = isset($_GET['date_to']) ? trim($_GET['date_to']) : '';

// Sorting
$allowedSortFields = ['created_at', 'updated_at', 'kode_pelaporan', 'status_laporan'];
$sortField = isset($_GET['sort']) && in_array($_GET['sort'], $allowedSortFields)
    ? $_GET['sort']
    : 'created_at';
$sortOrder = isset($_GET['order']) && strtoupper($_GET['order']) === 'ASC'
    ? 'ASC'
    : 'DESC';

// ========================================================
// BUILD QUERY
// ========================================================

try {
    $whereConditions = [];
    $params = [];

    // Search filter
    if (!empty($search)) {
        $whereConditions[] = "(kode_pelaporan LIKE :search OR email_korban LIKE :search2)";
        $params[':search'] = '%' . $search . '%';
        $params[':search2'] = '%' . $search . '%';
    }

    // Status filter
    if (!empty($statusFilter)) {
        $whereConditions[] = "status_laporan = :status";
        $params[':status'] = $statusFilter;
    }

    // Gender filter
    if (!empty($genderFilter)) {
        $whereConditions[] = "gender_korban = :gender";
        $params[':gender'] = $genderFilter;
    }

    // Date range filter
    if (!empty($dateFrom)) {
        $whereConditions[] = "DATE(created_at) >= :date_from";
        $params[':date_from'] = $dateFrom;
    }
    if (!empty($dateTo)) {
        $whereConditions[] = "DATE(created_at) <= :date_to";
        $params[':date_to'] = $dateTo;
    }

    // Build WHERE clause
    $whereClause = !empty($whereConditions)
        ? 'WHERE ' . implode(' AND ', $whereConditions)
        : '';

    // Count total records
    $countQuery = "SELECT COUNT(*) as total FROM Laporan $whereClause";
    $countStmt = $pdo->prepare($countQuery);
    $countStmt->execute($params);
    $totalRecords = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    $totalPages = ceil($totalRecords / $limit);

    // Get cases with pagination
    $query = "
        SELECT
            l.id,
            l.kode_pelaporan,
            l.status_laporan,
            l.status_darurat,
            l.korban_sebagai,
            l.tingkat_kekhawatiran,
            l.gender_korban,
            l.pelaku_kekerasan,
            l.waktu_kejadian,
            l.lokasi_kejadian,
            l.email_korban,
            l.usia_korban,
            l.whatsapp_korban,
            l.status_disabilitas,
            l.created_at,
            l.updated_at,
            (SELECT COUNT(*) FROM Bukti b WHERE b.laporan_id = l.id) as bukti_count
        FROM Laporan l
        $whereClause
        ORDER BY $sortField $sortOrder
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $pdo->prepare($query);

    // Bind all parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();
    $cases = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format response with XSS prevention
    $formattedCases = array_map(function($case) {
        return [
            'id' => (int) $case['id'],
            'kode_pelaporan' => htmlspecialchars($case['kode_pelaporan'], ENT_QUOTES, 'UTF-8'),
            'status_laporan' => htmlspecialchars($case['status_laporan'], ENT_QUOTES, 'UTF-8'),
            'status_darurat' => htmlspecialchars($case['status_darurat'] ?? '', ENT_QUOTES, 'UTF-8'),
            'korban_sebagai' => htmlspecialchars($case['korban_sebagai'] ?? '', ENT_QUOTES, 'UTF-8'),
            'tingkat_kekhawatiran' => htmlspecialchars($case['tingkat_kekhawatiran'] ?? '', ENT_QUOTES, 'UTF-8'),
            'gender_korban' => htmlspecialchars($case['gender_korban'] ?? '', ENT_QUOTES, 'UTF-8'),
            'pelaku_kekerasan' => htmlspecialchars($case['pelaku_kekerasan'] ?? '', ENT_QUOTES, 'UTF-8'),
            'waktu_kejadian' => $case['waktu_kejadian'],
            'lokasi_kejadian' => htmlspecialchars($case['lokasi_kejadian'] ?? '', ENT_QUOTES, 'UTF-8'),
            'email_korban' => htmlspecialchars($case['email_korban'] ?? '', ENT_QUOTES, 'UTF-8'),
            'usia_korban' => htmlspecialchars($case['usia_korban'] ?? '', ENT_QUOTES, 'UTF-8'),
            'whatsapp_korban' => htmlspecialchars($case['whatsapp_korban'] ?? '', ENT_QUOTES, 'UTF-8'),
            'status_disabilitas' => htmlspecialchars($case['status_disabilitas'] ?? '', ENT_QUOTES, 'UTF-8'),
            'bukti_count' => (int) $case['bukti_count'],
            'created_at' => $case['created_at'],
            'updated_at' => $case['updated_at'],
            'formatted_date' => date('d M Y, H:i', strtotime($case['created_at']))
        ];
    }, $cases);

    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'cases' => $formattedCases,
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
            'status' => $statusFilter,
            'gender' => $genderFilter,
            'date_from' => $dateFrom,
            'date_to' => $dateTo
        ],
        'csrf_token' => $_SESSION['csrf_token'] ?? ''
    ]);

} catch (PDOException $e) {
    error_log("Database query failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch cases'
    ]));
}

exit;
