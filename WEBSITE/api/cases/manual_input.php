<?php
/**
 * SIGAP PPKS - API Input Manual
 */
// Start session
session_start();

// Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Method not allowed', null, 405);
}

// Check admin session
if (!isset($_SESSION['admin_id'])) {
    sendResponse(false, 'Unauthorized. Please login first.', null, 401);
}

// Include database
require_once '../../config/database.php';

// Validate PDO
if (!isset($pdo) || !($pdo instanceof PDO)) {
    sendResponse(false, 'Database connection failed', null, 500);
}

// Upload directory
define('UPLOAD_DIR', __DIR__ . '/../../uploads/bukti/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm']);

try {
    // Get form data (multipart/form-data)
    $input = $_POST;

    if (empty($input)) {
        sendResponse(false, 'Empty request body', null, 400);
    }

    // Validate required fields
    $errors = validateInput($input);
    if (!empty($errors)) {
        sendResponse(false, 'Validation failed', $errors, 400);
    }

    // Generate unique kode pelaporan
    $kodePelaporan = generateKodePelaporan($pdo);

    // Prepare data
    $data = [
        'kode_pelaporan' => $kodePelaporan,
        'status_laporan' => sanitize($input['status_laporan'] ?? 'Completed'),
        'status_darurat' => 'tidak',
        'korban_sebagai' => sanitize($input['korban_sebagai'] ?? null),
        'tingkat_kekhawatiran' => sanitize($input['tingkat_kekhawatiran'] ?? null),
        'gender_korban' => sanitize($input['gender_korban'] ?? null),
        'pelaku_kekerasan' => sanitize($input['pelaku_kekerasan'] ?? null),
        'waktu_kejadian' => $input['waktu_kejadian'] ?? null,
        'lokasi_kejadian' => sanitize($input['lokasi_kejadian'] ?? null),
        'detail_kejadian' => sanitize($input['detail_kejadian'] ?? null),
        'email_korban' => sanitize($input['email_korban'] ?? null),
        'usia_korban' => sanitize($input['usia_korban'] ?? null),
        'whatsapp_korban' => sanitize($input['whatsapp_korban'] ?? null),
        'status_disabilitas' => sanitize($input['status_disabilitas'] ?? 'tidak'),
        'jenis_disabilitas' => null,
        'sumber_laporan' => sanitize($input['sumber_laporan'] ?? 'WhatsApp Darurat'),
        'catatan_admin' => sanitize($input['catatan_admin'] ?? null),
        'input_by_admin' => $_SESSION['admin_id']
    ];

    // Begin transaction
    $pdo->beginTransaction();

    // Insert to database
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
        jenis_disabilitas
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
        :jenis_disabilitas
    )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'kode_pelaporan' => $data['kode_pelaporan'],
        'status_laporan' => $data['status_laporan'],
        'status_darurat' => $data['status_darurat'],
        'korban_sebagai' => $data['korban_sebagai'],
        'tingkat_kekhawatiran' => $data['tingkat_kekhawatiran'],
        'gender_korban' => $data['gender_korban'],
        'pelaku_kekerasan' => $data['pelaku_kekerasan'],
        'waktu_kejadian' => $data['waktu_kejadian'],
        'lokasi_kejadian' => $data['lokasi_kejadian'],
        'detail_kejadian' => $data['detail_kejadian'],
        'email_korban' => $data['email_korban'],
        'usia_korban' => $data['usia_korban'],
        'whatsapp_korban' => $data['whatsapp_korban'],
        'status_disabilitas' => $data['status_disabilitas'],
        'jenis_disabilitas' => $data['jenis_disabilitas']
    ]);

    $laporanId = $pdo->lastInsertId();

    // Handle file uploads
    $uploadedFiles = [];
    if (isset($_FILES['bukti']) && !empty($_FILES['bukti']['name'][0])) {
        $uploadedFiles = handleFileUploads($pdo, $laporanId, $kodePelaporan);
    }

    // Commit transaction
    $pdo->commit();

    // Send success response
    sendResponse(true, 'Kasus berhasil disimpan', [
        'laporan_id' => $laporanId,
        'kode_pelaporan' => $kodePelaporan,
        'status_laporan' => $data['status_laporan'],
        'uploaded_files' => count($uploadedFiles)
    ], 201);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Manual Input Error: " . $e->getMessage());
    sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Manual Input Error: " . $e->getMessage());
    sendResponse(false, 'Server error: ' . $e->getMessage(), null, 500);
}

/**
 * Handle file uploads
 */
function handleFileUploads($pdo, $laporanId, $kodePelaporan) {
    $uploadedFiles = [];
    $files = $_FILES['bukti'];

    // Create upload directory if not exists
    $uploadPath = UPLOAD_DIR . $kodePelaporan . '/';
    if (!is_dir($uploadPath)) {
        mkdir($uploadPath, 0755, true);
    }

    $fileCount = count($files['name']);

    for ($i = 0; $i < $fileCount; $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) {
            continue;
        }

        $tmpName = $files['tmp_name'][$i];
        $originalName = $files['name'][$i];
        $fileSize = $files['size'][$i];
        $fileType = $files['type'][$i];

        // Validate file size
        if ($fileSize > MAX_FILE_SIZE) {
            continue;
        }

        // Validate extension
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if (!in_array($extension, ALLOWED_EXTENSIONS)) {
            continue;
        }

        // Generate unique filename
        $newFilename = uniqid('bukti_') . '_' . time() . '.' . $extension;
        $destination = $uploadPath . $newFilename;

        // Move uploaded file
        if (move_uploaded_file($tmpName, $destination)) {
            // Determine file type category
            $fileCategory = in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp']) ? 'image' : 'video';

            // Insert to database (Bukti table)
            try {
                // Use relative path (without leading slash) for better compatibility
                $fileUrl = 'uploads/bukti/' . $kodePelaporan . '/' . $newFilename;

                $sql = "INSERT INTO Bukti (laporan_id, file_url, file_type)
                        VALUES (:laporan_id, :file_url, :file_type)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    'laporan_id' => $laporanId,
                    'file_url' => $fileUrl,
                    'file_type' => $fileCategory
                ]);
            } catch (PDOException $e) {
                // Table might not exist or have different schema, log and continue
                error_log("Bukti table insert error: " . $e->getMessage());
            }

            $uploadedFiles[] = [
                'filename' => $newFilename,
                'original' => $originalName,
                'type' => $fileCategory,
                'size' => $fileSize
            ];
        }
    }

    return $uploadedFiles;
}

/**
 * Validate input data
 */
function validateInput($input) {
    $errors = [];

    // Required fields
    if (empty($input['tingkat_kekhawatiran'])) {
        $errors['tingkat_kekhawatiran'] = 'Tingkat kekhawatiran wajib dipilih';
    }

    if (empty($input['gender_korban'])) {
        $errors['gender_korban'] = 'Gender korban wajib diisi';
    }

    if (empty($input['pelaku_kekerasan'])) {
        $errors['pelaku_kekerasan'] = 'Pelaku kekerasan wajib diisi';
    }

    if (empty($input['waktu_kejadian'])) {
        $errors['waktu_kejadian'] = 'Waktu kejadian wajib diisi';
    }

    if (empty($input['lokasi_kejadian'])) {
        $errors['lokasi_kejadian'] = 'Lokasi kejadian wajib diisi';
    }

    if (empty($input['detail_kejadian'])) {
        $errors['detail_kejadian'] = 'Detail kejadian wajib diisi';
    }

    // Validate tingkat_kekhawatiran value
    $allowedKekhawatiran = ['sedikit', 'khawatir', 'sangat'];
    if (!empty($input['tingkat_kekhawatiran']) && !in_array($input['tingkat_kekhawatiran'], $allowedKekhawatiran)) {
        $errors['tingkat_kekhawatiran'] = 'Nilai tingkat kekhawatiran tidak valid';
    }

    // Validate status_laporan value
    $allowedStatus = ['Process', 'In Progress', 'Completed'];
    if (!empty($input['status_laporan']) && !in_array($input['status_laporan'], $allowedStatus)) {
        $errors['status_laporan'] = 'Nilai status tidak valid';
    }

    // Validate email format if provided
    if (!empty($input['email_korban']) && !filter_var($input['email_korban'], FILTER_VALIDATE_EMAIL)) {
        $errors['email_korban'] = 'Format email tidak valid';
    }

    return $errors;
}

/**
 * Generate unique kode pelaporan
 */
function generateKodePelaporan($pdo) {
    $prefix = 'PPKPT';
    $maxAttempts = 10;

    for ($i = 0; $i < $maxAttempts; $i++) {
        $timestamp = substr((string)time(), -6);
        $random = str_pad(rand(0, 999), 3, '0', STR_PAD_LEFT);
        $kode = $prefix . $timestamp . $random;

        // Check if exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM Laporan WHERE kode_pelaporan = ?");
        $stmt->execute([$kode]);

        if ($stmt->fetchColumn() == 0) {
            return $kode;
        }

        usleep(100000);
    }

    // Fallback
    return $prefix . strtoupper(substr(uniqid(), -9));
}

/**
 * Sanitize string
 */
function sanitize($value) {
    if ($value === null) return null;
    return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
}

/**
 * Send JSON response
 */
function sendResponse($success, $message, $data = null, $statusCode = 200) {
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

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}
?>
