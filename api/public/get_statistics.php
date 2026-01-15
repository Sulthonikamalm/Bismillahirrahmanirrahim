<?php
/**
 * SIGAP PPKS - API Statistik Publik
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
ini_set('error_log', __DIR__ . '/../logs/public_statistics_error.log');

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
// GET PUBLIC STATISTICS
// ========================================================

try {
    $statistics = [];

    // 1. Total Cases (Jumlah Korban Berani Bicara)
    $totalQuery = "SELECT COUNT(*) as total FROM Laporan";
    $totalStmt = $pdo->query($totalQuery);
    $statistics['total_cases'] = (int) $totalStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // 2. Cases Received (Pelaporan Diterima) - Process + In Progress
    // Includes: 'process', 'in progress', and NULL/empty status
    $receivedQuery = "
        SELECT COUNT(*) as count
        FROM Laporan
        WHERE LOWER(TRIM(COALESCE(status_laporan, 'process'))) IN ('process', 'in progress', '')
           OR status_laporan IS NULL
    ";
    $receivedStmt = $pdo->query($receivedQuery);
    $statistics['cases_received'] = (int) $receivedStmt->fetch(PDO::FETCH_ASSOC)['count'];

    // 3. Cases Completed (Korban dalam Perlindungan)
    $completedQuery = "
        SELECT COUNT(*) as count
        FROM Laporan
        WHERE LOWER(TRIM(status_laporan)) = 'completed'
    ";
    $completedStmt = $pdo->query($completedQuery);
    $statistics['cases_completed'] = (int) $completedStmt->fetch(PDO::FETCH_ASSOC)['count'];

    // Success response
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'total_cases' => $statistics['total_cases'],
            'cases_received' => $statistics['cases_received'],
            'cases_completed' => $statistics['cases_completed']
        ],
        'generated_at' => date('Y-m-d H:i:s')
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
