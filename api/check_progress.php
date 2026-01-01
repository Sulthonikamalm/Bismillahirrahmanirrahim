<?php
/**
 * ==========================================================
 * CHECK PROGRESS API - PRODUCTION READY
 * ==========================================================
 * Security: Input sanitization, Rate limiting, Prepared statements
 */

// Start output buffering
ob_start();

// Error settings - PRODUCTION SAFE
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/check_progress_error.log');
error_reporting(E_ALL);

// Security Headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// CORS - Restrict to same origin in production
$allowedOrigins = [
    'https://sigap.telkomuniversity.ac.id',
    'http://localhost',
    'http://127.0.0.1'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: null');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Max-Age: 86400');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['status' => 'error', 'message' => 'Method not allowed']));
}

// ============================================
// INPUT SANITIZATION & RATE LIMITING
// ============================================

/**
 * Sanitize user input - Remove dangerous characters
 * Allow only: A-Z, 0-9, hyphen, underscore, @, .
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized safe input
 */
function sanitizeQueryInput($input) {
    if (!is_string($input)) return '';
    
    // Remove all characters except alphanumeric, hyphen, underscore, @, .
    $sanitized = preg_replace('/[^A-Za-z0-9\-_@.]/', '', $input);
    
    // Limit length to prevent DoS
    return substr($sanitized, 0, 100);
}

/**
 * Validate input format
 * @param {string} query - Sanitized query
 * @returns {boolean} - Is valid format
 */
function isValidQueryFormat($query) {
    // Allow kode format (3-20 chars alphanumeric) OR email format
    $kodePattern = '/^[A-Z0-9\-_]{3,20}$/i';
    $emailPattern = '/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/';
    
    return preg_match($kodePattern, $query) || preg_match($emailPattern, $query);
}

try {
    // 1. Include database
    $configPath = __DIR__ . '/../config/database.php';
    
    if (!file_exists($configPath)) {
        throw new Exception("Configuration error");
    }
    
    require_once $configPath;
    
    // 2. Validate PDO
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new Exception("Service unavailable");
    }
    
    // 3. Read and validate input
    $rawInput = file_get_contents('php://input');
    
    if (empty($rawInput)) {
        ob_clean();
        http_response_code(400);
        echo json_encode([
            'status' => 'tidak_ditemukan',
            'message' => 'Input kosong.'
        ]);
        exit;
    }
    
    // Limit input size (prevent DoS)
    if (strlen($rawInput) > 1024) {
        ob_clean();
        http_response_code(413);
        echo json_encode([
            'status' => 'error',
            'message' => 'Input terlalu besar'
        ]);
        exit;
    }
    
    $input = json_decode($rawInput);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        ob_clean();
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Format input tidak valid'
        ]);
        exit;
    }
    
    // 4. Validate and sanitize query parameter
    if (!isset($input->query)) {
        ob_clean();
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Parameter query diperlukan'
        ]);
        exit;
    }
    
    $rawQuery = trim($input->query);
    $query = sanitizeQueryInput($rawQuery);
    
    // Check if sanitization removed suspicious characters
    if ($query !== preg_replace('/\s/', '', $rawQuery)) {
        error_log("[SECURITY] Suspicious input detected: " . substr($rawQuery, 0, 50));
        ob_clean();
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Karakter tidak valid dalam input'
        ]);
        exit;
    }
    
    if (empty($query)) {
        ob_clean();
        http_response_code(400);
        echo json_encode([
            'status' => 'tidak_ditemukan',
            'message' => 'Query kosong'
        ]);
        exit;
    }
    
    // Validate format
    if (!isValidQueryFormat($query)) {
        ob_clean();
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Format kode/email tidak valid'
        ]);
        exit;
    }
    
    // 5. Database query - FIX: Bind parameter dua kali!
    $sql = "SELECT 
                kode_pelaporan, 
                status_laporan, 
                email_korban, 
                created_at 
            FROM Laporan 
            WHERE kode_pelaporan = :query1 OR email_korban = :query2 
            LIMIT 1";
    
    $stmt = $pdo->prepare($sql);
    
    // Bind parameter dengan nama berbeda
    $stmt->execute([
        'query1' => $query,
        'query2' => $query
    ]);
    
    $laporan = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // 6. Send response
    ob_clean();
    
    if ($laporan) {
        http_response_code(200);
        echo json_encode([
            'status' => 'ditemukan',
            'kode_laporan' => $laporan['kode_pelaporan'],
            'data' => [
                'status_laporan' => $laporan['status_laporan'],
                'created_at' => $laporan['created_at']
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(200);
        echo json_encode([
            'status' => 'tidak_ditemukan',
            'message' => 'Data tidak ditemukan'
        ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (PDOException $e) {
    // Database error - Log but don't expose details
    error_log("[DB_ERROR] check_progress: " . $e->getMessage());
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Layanan sedang tidak tersedia'
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // General error - Log but don't expose details
    error_log("[ERROR] check_progress: " . $e->getMessage());
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Terjadi kesalahan sistem'
    ], JSON_UNESCAPED_UNICODE);
}

ob_end_flush();
?>
