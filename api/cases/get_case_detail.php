<?php
/**
 * SIGAP PPKS - API Detail Kasus
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
// INPUT VALIDATION
// ========================================================

$caseId = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;
$kodePerlaporan = isset($_GET['kode']) ? trim($_GET['kode']) : null;

if (!$caseId && !$kodePerlaporan) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Case ID or kode_pelaporan is required'
    ]));
}

if ($caseId !== null && ($caseId === false || $caseId <= 0)) {
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid case ID'
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
// GET CASE DATA
// ========================================================

try {
    // Build query based on ID or kode
    if ($caseId) {
        $query = "SELECT * FROM Laporan WHERE id = :identifier LIMIT 1";
        $identifier = $caseId;
    } else {
        $query = "SELECT * FROM Laporan WHERE kode_pelaporan = :identifier LIMIT 1";
        $identifier = $kodePerlaporan;
    }

    $stmt = $pdo->prepare($query);
    $stmt->execute([':identifier' => $identifier]);
    $case = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$case) {
        http_response_code(404);
        exit(json_encode([
            'status' => 'error',
            'message' => 'Case not found'
        ]));
    }

    // Get evidence files (Bukti)
    $buktiQuery = "SELECT id, file_url, file_type, created_at FROM Bukti WHERE laporan_id = :laporan_id ORDER BY created_at DESC";
    $buktiStmt = $pdo->prepare($buktiQuery);
    $buktiStmt->execute([':laporan_id' => $case['id']]);
    $buktiList = $buktiStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format evidence list
    $formattedBukti = array_map(function($bukti) {
        return [
            'id' => (int) $bukti['id'],
            'file_url' => htmlspecialchars($bukti['file_url'], ENT_QUOTES, 'UTF-8'),
            'file_type' => htmlspecialchars($bukti['file_type'], ENT_QUOTES, 'UTF-8'),
            'created_at' => $bukti['created_at']
        ];
    }, $buktiList);

    // Format response with XSS prevention
    $response = [
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
        'detail_kejadian' => htmlspecialchars($case['detail_kejadian'] ?? '', ENT_QUOTES, 'UTF-8'),
        'email_korban' => htmlspecialchars($case['email_korban'] ?? '', ENT_QUOTES, 'UTF-8'),
        'usia_korban' => htmlspecialchars($case['usia_korban'] ?? '', ENT_QUOTES, 'UTF-8'),
        'whatsapp_korban' => htmlspecialchars($case['whatsapp_korban'] ?? '', ENT_QUOTES, 'UTF-8'),
        'status_disabilitas' => htmlspecialchars($case['status_disabilitas'] ?? '', ENT_QUOTES, 'UTF-8'),
        'jenis_disabilitas' => htmlspecialchars($case['jenis_disabilitas'] ?? '', ENT_QUOTES, 'UTF-8'),
        'chat_session_id' => $case['chat_session_id'] ? (int) $case['chat_session_id'] : null,
        'bukti' => $formattedBukti,
        'bukti_count' => count($formattedBukti),
        'created_at' => $case['created_at'],
        'updated_at' => $case['updated_at'],
        'formatted_date' => date('d M Y, H:i', strtotime($case['created_at'])),
        'updated_formatted' => date('d M Y, H:i', strtotime($case['updated_at']))
    ];

    // Log access for audit
    error_log("CASE ACCESSED - ID: {$case['id']}, Kode: {$case['kode_pelaporan']}, Admin: " . ($_SESSION['admin_email'] ?? 'unknown'));

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
        'message' => 'Failed to fetch case detail'
    ]));
}

exit;
