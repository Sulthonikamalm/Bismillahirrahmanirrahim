<?php
/**
 * ==========================================================
 * CHECK PROGRESS API - FIXED VERSION
 * ==========================================================
 * Fix: SQLSTATE[HY093] Invalid parameter number
 */

// Start output buffering
ob_start();

// Error settings
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // 1. Include database
    $configPath = __DIR__ . '/../config/database.php';
    
    if (!file_exists($configPath)) {
        throw new Exception("Database config not found");
    }
    
    require_once $configPath;
    
    // 2. Validate PDO
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new Exception("PDO not initialized");
    }
    
    // 3. Read input
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
    
    $input = json_decode($rawInput);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON: " . json_last_error_msg());
    }
    
    // 4. Validate query parameter
    if (!isset($input->query)) {
        throw new Exception("Missing query parameter");
    }
    
    $query = trim($input->query);
    
    if (empty($query)) {
        ob_clean();
        http_response_code(400);
        echo json_encode([
            'status' => 'tidak_ditemukan',
            'message' => 'Query kosong'
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
    // Database error
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // General error
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

ob_end_flush();
?>
