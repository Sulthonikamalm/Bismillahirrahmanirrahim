<?php
/**
 * SIGAP PPKS - API Statistik Kasus
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
// INPUT VALIDATION
// ========================================================

$period = isset($_GET['period']) ? trim($_GET['period']) : 'all';
$dateFrom = isset($_GET['date_from']) ? trim($_GET['date_from']) : '';
$dateTo = isset($_GET['date_to']) ? trim($_GET['date_to']) : '';

// Build date filter based on period
$dateCondition = '';
$dateParams = [];

switch ($period) {
    case 'today':
        $dateCondition = "DATE(created_at) = CURDATE()";
        break;
    case 'week':
        $dateCondition = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        break;
    case 'month':
        $dateCondition = "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        break;
    case 'year':
        $dateCondition = "YEAR(created_at) = YEAR(NOW())";
        break;
    case 'custom':
        if (!empty($dateFrom) && !empty($dateTo)) {
            $dateCondition = "DATE(created_at) BETWEEN :date_from AND :date_to";
            $dateParams[':date_from'] = $dateFrom;
            $dateParams[':date_to'] = $dateTo;
        }
        break;
    default:
        $dateCondition = '1=1'; // All records
}

// ========================================================
// GET STATISTICS
// ========================================================

try {
    $statistics = [];

    // 1. Total Cases
    $totalQuery = "SELECT COUNT(*) as total FROM Laporan" . ($dateCondition ? " WHERE $dateCondition" : "");
    $totalStmt = $pdo->prepare($totalQuery);
    $totalStmt->execute($dateParams);
    $statistics['total_cases'] = (int) $totalStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // 2. Cases by Status
    $statusQuery = "
        SELECT status_laporan, COUNT(*) as count
        FROM Laporan
        " . ($dateCondition ? "WHERE $dateCondition" : "") . "
        GROUP BY status_laporan
        ORDER BY count DESC
    ";
    $statusStmt = $pdo->prepare($statusQuery);
    $statusStmt->execute($dateParams);
    $statistics['by_status'] = $statusStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Cases by Gender
    $genderQuery = "
        SELECT
            COALESCE(gender_korban, 'Tidak Diketahui') as gender_korban,
            COUNT(*) as count
        FROM Laporan
        " . ($dateCondition ? "WHERE $dateCondition" : "") . "
        GROUP BY gender_korban
        ORDER BY count DESC
    ";
    $genderStmt = $pdo->prepare($genderQuery);
    $genderStmt->execute($dateParams);
    $statistics['by_gender'] = $genderStmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Cases by Tingkat Kekhawatiran (Type of Violence)
    $kekhawatiranQuery = "
        SELECT
            COALESCE(tingkat_kekhawatiran, 'Lainnya') as tingkat_kekhawatiran,
            COUNT(*) as count
        FROM Laporan
        " . ($dateCondition ? "WHERE $dateCondition" : "") . "
        GROUP BY tingkat_kekhawatiran
        ORDER BY count DESC
    ";
    $kekhawatiranStmt = $pdo->prepare($kekhawatiranQuery);
    $kekhawatiranStmt->execute($dateParams);
    $statistics['by_kekhawatiran'] = $kekhawatiranStmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Cases by Korban Sebagai (Reporter relationship)
    $korbanQuery = "
        SELECT
            COALESCE(korban_sebagai, 'Tidak Diketahui') as korban_sebagai,
            COUNT(*) as count
        FROM Laporan
        " . ($dateCondition ? "WHERE $dateCondition" : "") . "
        GROUP BY korban_sebagai
        ORDER BY count DESC
    ";
    $korbanStmt = $pdo->prepare($korbanQuery);
    $korbanStmt->execute($dateParams);
    $statistics['by_korban_sebagai'] = $korbanStmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. Cases Trend (Last 7 days)
    $trendQuery = "
        SELECT
            DATE(created_at) as date,
            COUNT(*) as count
        FROM Laporan
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ";
    $trendStmt = $pdo->query($trendQuery);
    $trendResults = $trendStmt->fetchAll(PDO::FETCH_ASSOC);

    $statistics['trend_7_days'] = [];
    foreach ($trendResults as $row) {
        $statistics['trend_7_days'][] = [
            'date' => $row['date'],
            'count' => (int) $row['count']
        ];
    }

    // 7. Monthly Trend (Last 12 months)
    $monthlyQuery = "
        SELECT
            DATE_FORMAT(created_at, '%Y-%m') as month,
            COUNT(*) as count
        FROM Laporan
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
    ";
    $monthlyStmt = $pdo->query($monthlyQuery);
    $monthlyResults = $monthlyStmt->fetchAll(PDO::FETCH_ASSOC);

    $statistics['trend_12_months'] = [];
    foreach ($monthlyResults as $row) {
        $statistics['trend_12_months'][] = [
            'month' => $row['month'],
            'count' => (int) $row['count']
        ];
    }

    // 8. Recent Cases (Last 5)
    $recentQuery = "
        SELECT
            id,
            kode_pelaporan,
            status_laporan,
            gender_korban,
            tingkat_kekhawatiran,
            created_at
        FROM Laporan
        ORDER BY created_at DESC
        LIMIT 5
    ";
    $recentStmt = $pdo->query($recentQuery);
    $recentResults = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    $statistics['recent_cases'] = array_map(function($case) {
        return [
            'id' => (int) $case['id'],
            'kode_pelaporan' => htmlspecialchars($case['kode_pelaporan'], ENT_QUOTES, 'UTF-8'),
            'status_laporan' => htmlspecialchars($case['status_laporan'], ENT_QUOTES, 'UTF-8'),
            'gender_korban' => htmlspecialchars($case['gender_korban'] ?? '', ENT_QUOTES, 'UTF-8'),
            'tingkat_kekhawatiran' => htmlspecialchars($case['tingkat_kekhawatiran'] ?? '', ENT_QUOTES, 'UTF-8'),
            'created_at' => $case['created_at'],
            'formatted_date' => date('d M Y, H:i', strtotime($case['created_at']))
        ];
    }, $recentResults);

    // 9. Status Summary (Quick stats for dashboard)
    // Handle all status values including NULL and unknown ones
    $statusSummary = ['process' => 0, 'in_progress' => 0, 'completed' => 0, 'other' => 0];
    foreach ($statistics['by_status'] as $row) {
        $status = strtolower(trim($row['status_laporan'] ?? ''));
        $count = (int) $row['count'];

        if ($status === 'process') {
            $statusSummary['process'] = $count;
        } elseif ($status === 'in progress') {
            $statusSummary['in_progress'] = $count;
        } elseif ($status === 'completed') {
            $statusSummary['completed'] = $count;
        } else {
            // Count NULL, empty string, or unknown status values as 'other'
            $statusSummary['other'] += $count;
        }
    }

    // For backward compatibility, add process count to 'other' category
    // (records with NULL status should be treated as new/process)
    if ($statusSummary['other'] > 0) {
        // Keep 'other' separate for transparency
    }

    $statistics['summary'] = array_merge(['total' => $statistics['total_cases']], $statusSummary);

    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => $statistics,
        'filters' => [
            'period' => $period,
            'date_from' => $dateFrom,
            'date_to' => $dateTo
        ],
        'generated_at' => date('Y-m-d H:i:s'),
        'csrf_token' => $_SESSION['csrf_token'] ?? ''
    ]);

} catch (PDOException $e) {
    error_log("Database query failed: " . $e->getMessage());
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch statistics'
    ]));
}

exit;
