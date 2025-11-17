<?php
/**
 * ==========================================================
 * API SUBMIT LAPORAN - FIXED VERSION
 * ==========================================================
 * Endpoint untuk submit laporan kekerasan
 * 
 * Method: POST
 * Content-Type: application/json
 * 
 * @version 2.0
 * @date 2025-11-15
 */

// Start output buffering
ob_start();

// Error reporting (set to 0 in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Handle preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Method not allowed. Use POST.', null, 405);
}

// Include database config
require_once '../config/database.php';

// Validate PDO connection
if (!isset($pdo) || !($pdo instanceof PDO)) {
    sendResponse(false, 'Database connection failed', null, 500);
}

try {
    // Read and parse JSON input
    $rawInput = file_get_contents('php://input');
    
    if (empty($rawInput)) {
        sendResponse(false, 'Empty request body', null, 400);
    }
    
    $input = json_decode($rawInput, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendResponse(false, 'Invalid JSON: ' . json_last_error_msg(), null, 400);
    }
    
    // Validate and sanitize input
    $validatedData = validateInput($input);
    
    if ($validatedData['errors']) {
        sendResponse(false, 'Validation failed', $validatedData['errors'], 400);
    }
    
    // Generate unique kode pelaporan
    $kodePelaporan = generateKodePelaporan($pdo);
    
    if (!$kodePelaporan) {
        sendResponse(false, 'Failed to generate kode pelaporan', null, 500);
    }
    
    // Prepare data for insert
    $data = array_merge($validatedData['data'], [
        'kode_pelaporan' => $kodePelaporan,
        'status_laporan' => 'Process' // Default status
    ]);
    
    // Insert into database
    $laporanId = insertLaporan($pdo, $data);
    
    if (!$laporanId) {
        sendResponse(false, 'Failed to save laporan', null, 500);
    }
    
    // Send success response
    sendResponse(true, 'Laporan berhasil dikirim', [
        'kode_pelaporan' => $kodePelaporan,
        'laporan_id' => $laporanId,
        'status_laporan' => 'Process',
        'created_at' => date('Y-m-d H:i:s')
    ], 201);
    
} catch (PDOException $e) {
    // Log error (in production, don't expose details)
    error_log("Database Error: " . $e->getMessage());
    sendResponse(false, 'Database error', ['detail' => $e->getMessage()], 500);
    
} catch (Exception $e) {
    error_log("General Error: " . $e->getMessage());
    sendResponse(false, 'Server error', ['detail' => $e->getMessage()], 500);
}

/**
 * Validate and sanitize input data
 * 
 * @param array $input Raw input data
 * @return array ['data' => sanitized data, 'errors' => validation errors]
 */
function validateInput($input) {
    $data = [];
    $errors = [];
    
    // Step 1: Status Darurat
    $data['status_darurat'] = isset($input['statusDarurat']) ? 
        sanitizeString($input['statusDarurat']) : null;
    
    // Step 2: Kategori
    $data['korban_sebagai'] = isset($input['korbanSebagai']) ? 
        sanitizeString($input['korbanSebagai']) : null;
    
    $data['tingkat_kekhawatiran'] = isset($input['tingkatKekhawatiran']) ? 
        sanitizeString($input['tingkatKekhawatiran']) : null;
    
    // Step 3: Gender
    $data['gender_korban'] = isset($input['genderKorban']) ? 
        sanitizeString($input['genderKorban']) : null;
    
    // Step 4: Detail Kejadian (REQUIRED)
    $data['pelaku_kekerasan'] = isset($input['pelakuKekerasan']) ? 
        sanitizeString($input['pelakuKekerasan']) : null;
    
    if (empty($data['pelaku_kekerasan'])) {
        $errors['pelakuKekerasan'] = 'Pelaku kekerasan wajib diisi';
    }
    
    $data['waktu_kejadian'] = isset($input['waktuKejadian']) ? 
        $input['waktuKejadian'] : null;
    
    // Validate date format
    if (!empty($data['waktu_kejadian'])) {
        if (!validateDate($data['waktu_kejadian'])) {
            $errors['waktuKejadian'] = 'Format tanggal tidak valid (gunakan YYYY-MM-DD)';
        }
    } else {
        $errors['waktuKejadian'] = 'Waktu kejadian wajib diisi';
    }
    
    $data['lokasi_kejadian'] = isset($input['lokasiKejadian']) ? 
        sanitizeString($input['lokasiKejadian']) : null;
    
    if (empty($data['lokasi_kejadian'])) {
        $errors['lokasiKejadian'] = 'Lokasi kejadian wajib diisi';
    }
    
    $data['detail_kejadian'] = isset($input['detailKejadian']) ? 
        sanitizeText($input['detailKejadian']) : null;
    
    if (empty($data['detail_kejadian'])) {
        $errors['detailKejadian'] = 'Detail kejadian wajib diisi';
    }
    
    // Step 5: Data Korban
    $data['email_korban'] = isset($input['emailKorban']) ? 
        trim($input['emailKorban']) : null;
    
    // Validate email format (optional field, but if filled must be valid)
    if (!empty($data['email_korban']) && !filter_var($data['email_korban'], FILTER_VALIDATE_EMAIL)) {
        $errors['emailKorban'] = 'Format email tidak valid';
    }
    
    $data['usia_korban'] = isset($input['usiaKorban']) ? 
        sanitizeString($input['usiaKorban']) : null;
    
    if (empty($data['usia_korban'])) {
        $errors['usiaKorban'] = 'Usia korban wajib diisi';
    }
    
    $data['whatsapp_korban'] = isset($input['whatsappKorban']) ? 
        sanitizePhone($input['whatsappKorban']) : null;
    
    // Validate phone number (must be numeric and 10-15 digits)
    if (!empty($data['whatsapp_korban'])) {
        if (!preg_match('/^[0-9]{10,15}$/', $data['whatsapp_korban'])) {
            $errors['whatsappKorban'] = 'Format nomor WhatsApp tidak valid (10-15 digit)';
        }
    }
    
    $data['status_disabilitas'] = isset($input['statusDisabilitas']) ? 
        sanitizeString($input['statusDisabilitas']) : 'tidak';
    
    // Normalize to 'ya' or 'tidak'
    $data['status_disabilitas'] = in_array(strtolower($data['status_disabilitas']), ['ya', 'yes', '1', 'true']) ? 
        'ya' : 'tidak';
    
    $data['jenis_disabilitas'] = isset($input['jenisDisabilitas']) ? 
        sanitizeString($input['jenisDisabilitas']) : null;
    
    // If status_disabilitas is 'ya', jenis_disabilitas is required
    if ($data['status_disabilitas'] === 'ya' && empty($data['jenis_disabilitas'])) {
        $errors['jenisDisabilitas'] = 'Jenis disabilitas wajib diisi jika status disabilitas adalah Ya';
    }
    
    // Optional: Chat session ID
    $data['chat_session_id'] = isset($input['chatSessionId']) ? 
        intval($input['chatSessionId']) : null;
    
    return [
        'data' => $data,
        'errors' => count($errors) > 0 ? $errors : null
    ];
}

/**
 * Insert laporan into database
 * 
 * @param PDO $pdo Database connection
 * @param array $data Laporan data
 * @return int|false Insert ID or false on failure
 */
function insertLaporan($pdo, $data) {
    $sql = "INSERT INTO Laporan (
        kode_pelaporan,
        status_laporan,
        status_darurat,
        korban_sebagai,
        tingkat_kekhawatiran,
        gender_korban,
        pelaku_kekerasan,
        waktu_kejadian,
        lokasi_kejadian,
        detail_kejadian,
        email_korban,
        usia_korban,
        whatsapp_korban,
        status_disabilitas,
        jenis_disabilitas,
        chat_session_id
    ) VALUES (
        :kode_pelaporan,
        :status_laporan,
        :status_darurat,
        :korban_sebagai,
        :tingkat_kekhawatiran,
        :gender_korban,
        :pelaku_kekerasan,
        :waktu_kejadian,
        :lokasi_kejadian,
        :detail_kejadian,
        :email_korban,
        :usia_korban,
        :whatsapp_korban,
        :status_disabilitas,
        :jenis_disabilitas,
        :chat_session_id
    )";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($data);
        return $pdo->lastInsertId();
    } catch (PDOException $e) {
        error_log("Insert Error: " . $e->getMessage());
        return false;
    }
}

/**
 * Generate unique kode pelaporan
 * Format: PPKS + 6-digit-timestamp + 3-digit-random
 * Example: PPKS123456789
 * 
 * @param PDO $pdo Database connection
 * @return string|false Kode pelaporan or false on failure
 */
function generateKodePelaporan($pdo) {
    $maxAttempts = 10;
    $prefix = 'PPKS';
    
    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        // Generate kode
        $timestamp = substr((string)time(), -6); // Last 6 digits of timestamp
        $random = str_pad(rand(0, 999), 3, '0', STR_PAD_LEFT); // 3-digit random
        $kode = $prefix . $timestamp . $random;
        
        // Check if kode exists
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM Laporan WHERE kode_pelaporan = :kode");
            $stmt->execute(['kode' => $kode]);
            $count = $stmt->fetchColumn();
            
            if ($count == 0) {
                return $kode; // Unique kode found
            }
            
        } catch (PDOException $e) {
            error_log("Check kode error: " . $e->getMessage());
            continue;
        }
        
        usleep(100000); // Sleep 100ms before retry
    }
    
    // Fallback: use uniqid if all attempts failed
    return $prefix . strtoupper(substr(uniqid(), -9));
}

/**
 * Sanitize string input
 */
function sanitizeString($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Sanitize text/textarea input
 */
function sanitizeText($input) {
    // Remove excessive whitespace but preserve line breaks
    $text = trim($input);
    $text = preg_replace('/\s+/', ' ', $text);
    return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
}

/**
 * Sanitize phone number (remove non-numeric characters)
 */
function sanitizePhone($input) {
    return preg_replace('/[^0-9]/', '', $input);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function validateDate($date) {
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

/**
 * Send JSON response and exit
 * 
 * @param bool $success Success status
 * @param string $message Response message
 * @param mixed $data Additional data
 * @param int $statusCode HTTP status code
 */
function sendResponse($success, $message, $data = null, $statusCode = 200) {
    ob_clean(); // Clear any output buffer
    http_response_code($statusCode);
    
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        if ($success) {
            $response['data'] = $data;
        } else {
            $response['errors'] = $data;
        }
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Cleanup
ob_end_flush();
?>