<?php
// API SUBMIT LAPORAN - POST multipart/form-data

// Start output buffering
ob_start();

// MAINTENANCE MODE CHECK - Akan auto-block request jika maintenance aktif
require_once __DIR__ . '/../../maintenance/check.php';

// Load CORS helper
require_once __DIR__ . '/../../config/cors.php';

// Error reporting (set to 0 in production)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/submit_laporan.log');

// Headers & CORS
header('Content-Type: application/json; charset=utf-8');
if (handlePublicCors()) {
    exit; // Preflight request handled
}

// Rate Limiting: Session-based (60s cooldown)
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'cookie_samesite' => 'Strict',
    'use_strict_mode' => true
]);

$currentTime = time();
$sessionCooldown = 60; // 60 seconds between submissions

if (isset($_SESSION['last_submit_time'])) {
    $timeSinceLastSubmit = $currentTime - $_SESSION['last_submit_time'];
    
    if ($timeSinceLastSubmit < $sessionCooldown) {
        $remainingTime = $sessionCooldown - $timeSinceLastSubmit;
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'message' => 'Terlalu cepat! Harap tunggu ' . $remainingTime . ' detik sebelum mengirim laporan baru.',
            'error_code' => 'RATE_LIMIT_SESSION',
            'retry_after' => $remainingTime
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Rate Limiting: IP-based (max 5 req/min)
$clientIP = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? 
            $_SERVER['HTTP_X_REAL_IP'] ?? 
            $_SERVER['HTTP_CLIENT_IP'] ?? 
            $_SERVER['REMOTE_ADDR'] ?? 
            'unknown';

// Sanitize IP (get first IP if multiple)
$clientIP = explode(',', $clientIP)[0];
$clientIP = trim($clientIP);

// Rate limit configuration
$maxRequests = 5;      // Maximum requests allowed
$timeWindow = 60;      // Time window in seconds (1 minute)

// PRODUCTION-READY: Try system temp first, fallback to project storage
$rateLimitDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sigap_rate_limit' . DIRECTORY_SEPARATOR;
$usingFallback = false;

// Try to create in system temp directory
if (!is_dir($rateLimitDir)) {
    if (!@mkdir($rateLimitDir, 0755, true)) {
        // Fallback to project storage directory (protected by .htaccess)
        $rateLimitDir = __DIR__ . '/../../storage/rate_limit/';
        $usingFallback = true;
    }
}

// Verify directory is writable, if not try fallback
if (!$usingFallback && !is_writable($rateLimitDir)) {
    $rateLimitDir = __DIR__ . '/../../storage/rate_limit/';
    $usingFallback = true;
}

// Create fallback directory if needed
if ($usingFallback && !is_dir($rateLimitDir)) {
    @mkdir($rateLimitDir, 0755, true);
    
    // Create .htaccess to protect the directory
    $htaccessPath = $rateLimitDir . '.htaccess';
    if (!file_exists($htaccessPath)) {
        $htaccessContent = "# Deny all access to rate limit files\nOrder deny,allow\nDeny from all\n\n# Apache 2.4+\n<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>";
        @file_put_contents($htaccessPath, $htaccessContent);
    }
    
    // Create index.php to prevent directory listing
    $indexPath = $rateLimitDir . 'index.php';
    if (!file_exists($indexPath)) {
        @file_put_contents($indexPath, "<?php http_response_code(403); exit('Forbidden');");
    }
}

// Generate safe filename from IP
$ipHash = md5($clientIP . '_submit_laporan');
$rateLimitFile = $rateLimitDir . 'rate_' . $ipHash . '.json';

// Read current rate limit data
$rateData = ['count' => 0, 'start_time' => $currentTime, 'last_request' => $currentTime];

if (file_exists($rateLimitFile)) {
    $fileContent = @file_get_contents($rateLimitFile);
    if ($fileContent !== false) {
        $decoded = json_decode($fileContent, true);
        if (is_array($decoded)) {
            $rateData = $decoded;
        }
    }
}

// Check if time window has expired - reset counter
if (($currentTime - $rateData['start_time']) > $timeWindow) {
    // Window expired, reset
    $rateData = [
        'count' => 1,
        'start_time' => $currentTime,
        'last_request' => $currentTime
    ];
} else {
    // Within window, check rate limit
    $rateData['count']++;
    $rateData['last_request'] = $currentTime;
    
    if ($rateData['count'] > $maxRequests) {
        // Rate limit exceeded
        $retryAfter = $timeWindow - ($currentTime - $rateData['start_time']);
        
        // Log suspicious activity
        error_log("[RATE_LIMIT] IP: {$clientIP} exceeded {$maxRequests} requests in {$timeWindow}s. Count: {$rateData['count']}");
        
        http_response_code(429);
        header('Retry-After: ' . max(1, $retryAfter));
        echo json_encode([
            'success' => false,
            'message' => 'Terlalu banyak permintaan. Harap tunggu ' . max(1, $retryAfter) . ' detik.',
            'error_code' => 'RATE_LIMIT_IP',
            'retry_after' => max(1, $retryAfter)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Save updated rate limit data with exclusive lock
@file_put_contents($rateLimitFile, json_encode($rateData), LOCK_EX);

// Update session timestamp (will be committed after successful submission)
// This is set here but only matters if submission succeeds
$_SESSION['last_submit_time'] = $currentTime;

// Optional: Clean old rate limit files (run occasionally)
if (rand(1, 100) === 1) { // 1% chance to run cleanup
    $files = @glob($rateLimitDir . 'rate_*.json');
    if (is_array($files)) {
        foreach ($files as $file) {
            if (@filemtime($file) < ($currentTime - 3600)) { // Older than 1 hour
                @unlink($file);
            }
        }
    }
}



// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Method not allowed. Use POST.', null, 405);
}

// Include database config
require_once __DIR__ . '/../../config/database.php';

// Validate PDO connection
if (!isset($pdo) || !($pdo instanceof PDO)) {
    sendResponse(false, 'Database connection failed', null, 500);
}

// Upload configuration
define('UPLOAD_DIR', __DIR__ . '/../../uploads/bukti/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('MAX_FILES', 5);
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm']);

try {
    // Check content type to determine how to parse input
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (strpos($contentType, 'multipart/form-data') !== false) {
        // Handle multipart/form-data (with file uploads)
        $input = $_POST;
    } elseif (strpos($contentType, 'application/json') !== false) {
        // Handle JSON input (backward compatibility)
        $rawInput = file_get_contents('php://input');
        if (empty($rawInput)) {
            sendResponse(false, 'Empty request body', null, 400);
        }
        $input = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            sendResponse(false, 'Invalid JSON: ' . json_last_error_msg(), null, 400);
        }
    } else {
        // Try to auto-detect
        if (!empty($_POST)) {
            $input = $_POST;
        } else {
            $rawInput = file_get_contents('php://input');
            $input = json_decode($rawInput, true) ?: [];
        }
    }

    if (empty($input)) {
        sendResponse(false, 'Empty request body', null, 400);
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

    // Begin transaction
    $pdo->beginTransaction();

    // Insert into database
    $laporanId = insertLaporan($pdo, $data);

    if (!$laporanId) {
        $pdo->rollBack();
        sendResponse(false, 'Failed to save laporan', null, 500);
    }

    // Handle file uploads if present
    $uploadedFiles = [];
    if (isset($_FILES['buktiFiles']) && !empty($_FILES['buktiFiles']['name'][0])) {
        $uploadedFiles = handleFileUploads($pdo, $laporanId, $kodePelaporan);
    }

    // Commit transaction
    $pdo->commit();

    // Send success response
    sendResponse(true, 'Laporan berhasil dikirim', [
        'kode_pelaporan' => $kodePelaporan,
        'laporan_id' => $laporanId,
        'status_laporan' => 'Process',
        'uploaded_files' => count($uploadedFiles),
        'created_at' => date('Y-m-d H:i:s')
    ], 201);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Database Error: " . $e->getMessage());
    sendResponse(false, 'Database error', ['detail' => $e->getMessage()], 500);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("General Error: " . $e->getMessage());
    sendResponse(false, 'Server error', ['detail' => $e->getMessage()], 500);
}

/**
 * Handle file uploads
 */
function handleFileUploads($pdo, $laporanId, $kodePelaporan) {
    $uploadedFiles = [];
    $files = $_FILES['buktiFiles'];

    // Create upload directory if not exists
    $uploadPath = UPLOAD_DIR . $kodePelaporan . '/';
    if (!is_dir($uploadPath)) {
        if (!mkdir($uploadPath, 0755, true)) {
            error_log("Failed to create upload directory: " . $uploadPath);
            return $uploadedFiles;
        }
    }

    // Handle both single and multiple file uploads
    $fileCount = is_array($files['name']) ? count($files['name']) : 1;

    for ($i = 0; $i < $fileCount && $i < MAX_FILES; $i++) {
        // Get file info (handle both single and array format)
        $error = is_array($files['error']) ? $files['error'][$i] : $files['error'];
        $tmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
        $originalName = is_array($files['name']) ? $files['name'][$i] : $files['name'];
        $fileSize = is_array($files['size']) ? $files['size'][$i] : $files['size'];

        // Skip if no file or error
        if ($error !== UPLOAD_ERR_OK || empty($tmpName)) {
            continue;
        }

        // Validate file size
        if ($fileSize > MAX_FILE_SIZE) {
            error_log("File too large: " . $originalName);
            continue;
        }

        // Validate extension
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if (!in_array($extension, ALLOWED_EXTENSIONS)) {
            error_log("Invalid file extension: " . $extension);
            continue;
        }

        // Generate unique filename
        $newFilename = uniqid('bukti_') . '_' . time() . '.' . $extension;
        $destination = $uploadPath . $newFilename;

        // Move uploaded file
        if (move_uploaded_file($tmpName, $destination)) {
            // Determine file type category
            $fileCategory = in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp']) ? 'image' : 'video';

            // Insert to Bukti table
            try {
                // Use relative path (without leading slash) for better compatibility
                $fileUrl = 'uploads/bukti/' . $kodePelaporan . '/' . $newFilename;

                $sql = "INSERT INTO Bukti (laporan_id, file_url, file_type) VALUES (:laporan_id, :file_url, :file_type)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    'laporan_id' => $laporanId,
                    'file_url' => $fileUrl,
                    'file_type' => $fileCategory
                ]);

                $uploadedFiles[] = [
                    'filename' => $newFilename,
                    'original' => $originalName,
                    'type' => $fileCategory,
                    'size' => $fileSize
                ];

                error_log("File uploaded successfully: " . $newFilename);

            } catch (PDOException $e) {
                error_log("Bukti table insert error: " . $e->getMessage());
            }
        } else {
            error_log("Failed to move uploaded file: " . $originalName);
        }
    }

    return $uploadedFiles;
}

/**
 * Validate and sanitize input data
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
        $errors['usiaKorban'] = 'Usia penyintas wajib diisi';
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
 */
function generateKodePelaporan($pdo) {
    $maxAttempts = 10;
    $prefix = 'PPKPT';

    for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
        $timestamp = substr((string)time(), -6);
        $random = str_pad(rand(0, 999), 3, '0', STR_PAD_LEFT);
        $kode = $prefix . $timestamp . $random;

        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM Laporan WHERE kode_pelaporan = :kode");
            $stmt->execute(['kode' => $kode]);
            $count = $stmt->fetchColumn();

            if ($count == 0) {
                return $kode;
            }
        } catch (PDOException $e) {
            error_log("Check kode error: " . $e->getMessage());
            continue;
        }

        usleep(100000);
    }

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
    $text = trim($input);
    $text = preg_replace('/\s+/', ' ', $text);
    return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
}

/**
 * Sanitize phone number
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
 */
function sendResponse($success, $message, $data = null, $statusCode = 200) {
    ob_clean();
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

ob_end_flush();
?>
