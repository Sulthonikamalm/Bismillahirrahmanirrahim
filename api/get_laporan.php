<?php
/**
 * ==========================================================
 * API GET LAPORAN - DUAL SEARCH VERSION
 * ==========================================================
 * Endpoint untuk mendapatkan detail laporan berdasarkan:
 * - Kode Pelaporan (PPKS123456789) ATAU
 * - Email Korban (user@example.com)
 * 
 * Method: GET
 * Parameter: query (bisa kode atau email)
 * Example: 
 * - /api/get_laporan.php?query=PPKS228236148
 * - /api/get_laporan.php?query=test@student.itb.ac.id
 * 
 * @version 2.0 (Dual Search)
 * @date 2025-11-16
 */

// Start output buffering
ob_start();

// Error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Handle preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(false, 'Method not allowed. Use GET.', null, 405);
}

// Include database config
require_once '../config/database.php';

// Validate PDO connection
if (!isset($pdo) || !($pdo instanceof PDO)) {
    sendResponse(false, 'Database connection failed', null, 500);
}

try {
    // ==========================================
    // DUAL SEARCH: Accept 'query' or 'kode'
    // ==========================================
    $query = isset($_GET['query']) ? trim($_GET['query']) : 
             (isset($_GET['kode']) ? trim($_GET['kode']) : null);
    
    if (empty($query)) {
        sendResponse(false, 'Parameter query (kode atau email) wajib diisi', [
            'examples' => [
                'By kode: ?query=PPKS228236148',
                'By email: ?query=test@student.itb.ac.id'
            ]
        ], 400);
    }
    
    // ==========================================
    // AUTO-DETECT: Email or Kode?
    // ==========================================
    $query = trim($query);
    $isEmail = filter_var($query, FILTER_VALIDATE_EMAIL);
    
    // Log search attempt
    error_log("🔍 Search Request - Type: " . ($isEmail ? 'EMAIL' : 'KODE') . ", Query: $query");
    
    // ==========================================
    // BUILD DYNAMIC SQL
    // ==========================================
    $sql = "SELECT 
                id,
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
                created_at,
                updated_at
            FROM Laporan 
            WHERE ";
    
    if ($isEmail) {
        // Search by EMAIL
        $sql .= "email_korban = :query LIMIT 1";
        $params = ['query' => $query];
        $searchType = 'email';
    } else {
        // Search by KODE (case-insensitive)
        $query = strtoupper($query); // Normalize kode
        $sql .= "kode_pelaporan = :query LIMIT 1";
        $params = ['query' => $query];
        $searchType = 'kode';
    }
    
    // Execute query
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $laporan = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // ==========================================
    // HANDLE NOT FOUND
    // ==========================================
    if (!$laporan) {
        error_log("❌ Not found - $searchType: $query");
        
        $errorDetail = $isEmail ? [
            'email' => $query,
            'hint' => 'Pastikan email yang digunakan sama dengan saat melapor',
            'search_type' => 'email'
        ] : [
            'kode' => $query,
            'hint' => 'Periksa kembali kode pelaporan Anda (format: PPKS123456789)',
            'search_type' => 'kode'
        ];
        
        sendResponse(false, 'Laporan tidak ditemukan', $errorDetail, 404);
    }
    
    error_log("✅ Found - $searchType: $query, Kode: " . $laporan['kode_pelaporan']);
    
    // ==========================================
    // GET BUKTI FILES
    // ==========================================
    $sqlBukti = "SELECT 
                    id,
                    file_url,
                    file_type,
                    created_at
                 FROM Bukti 
                 WHERE laporan_id = :laporan_id 
                 ORDER BY created_at ASC";
    
    $stmtBukti = $pdo->prepare($sqlBukti);
    $stmtBukti->execute(['laporan_id' => $laporan['id']]);
    $buktiFiles = $stmtBukti->fetchAll(PDO::FETCH_ASSOC);
    
    // ==========================================
    // GENERATE TIMELINE
    // ==========================================
    $timeline = generateTimeline($laporan);
    
    // ==========================================
    // FORMAT RESPONSE
    // ==========================================
    $response = [
        'id' => $laporan['kode_pelaporan'],
        'status' => determineOverallStatus($laporan['status_laporan']),
        'reporterName' => 'Anonymous', // Privacy
        'createdAt' => $laporan['created_at'],
        'updatedAt' => $laporan['updated_at'],
        'searchedBy' => $searchType, // INFO: Searched by kode or email
        'steps' => $timeline,
        'details' => [
            'status_darurat' => $laporan['status_darurat'],
            'korban_sebagai' => $laporan['korban_sebagai'],
            'tingkat_kekhawatiran' => $laporan['tingkat_kekhawatiran'],
            'gender_korban' => $laporan['gender_korban'],
            'pelaku_kekerasan' => $laporan['pelaku_kekerasan'],
            'waktu_kejadian' => $laporan['waktu_kejadian'],
            'lokasi_kejadian' => $laporan['lokasi_kejadian'],
            'detail_kejadian' => $laporan['detail_kejadian'],
            'usia_korban' => $laporan['usia_korban'],
            'status_disabilitas' => $laporan['status_disabilitas'],
            'jenis_disabilitas' => $laporan['jenis_disabilitas']
        ],
        'bukti' => $buktiFiles
    ];
    
    // Send success response
    sendResponse(true, 'Laporan ditemukan', $response, 200);
    
} catch (PDOException $e) {
    error_log("❌ Database Error: " . $e->getMessage());
    sendResponse(false, 'Database error', ['detail' => $e->getMessage()], 500);
    
} catch (Exception $e) {
    error_log("❌ General Error: " . $e->getMessage());
    sendResponse(false, 'Server error', ['detail' => $e->getMessage()], 500);
}

/**
 * Generate timeline steps based on laporan status
 */
function generateTimeline($laporan) {
    $status = $laporan['status_laporan'];
    $createdAt = $laporan['created_at'];
    
    $timeline = [];
    
    // Step 1: Laporan Diterima (ALWAYS completed)
    $timeline[] = [
        'id' => 1,
        'title' => 'Laporan Diterima',
        'description' => 'Laporan Anda telah berhasil diterima oleh sistem Satgas PPKS. Tim kami akan segera memverifikasi informasi yang Anda berikan.',
        'status' => 'success',
        'date' => $createdAt,
        'icon' => '✓'
    ];
    
    // Step 2: Verifikasi Data
    if ($status === 'Process') {
        $timeline[] = [
            'id' => 2,
            'title' => 'Verifikasi Data',
            'description' => 'Tim kami sedang memverifikasi kelengkapan data dan bukti yang Anda sampaikan untuk proses investigasi lebih lanjut.',
            'status' => 'loading',
            'date' => null,
            'icon' => '⏳'
        ];
    } else {
        $timeline[] = [
            'id' => 2,
            'title' => 'Verifikasi Data',
            'description' => 'Data laporan Anda telah diverifikasi dan dinyatakan lengkap untuk proses selanjutnya.',
            'status' => 'success',
            'date' => null,
            'icon' => '✓'
        ];
    }
    
    // Step 3: Investigasi
    if ($status === 'Process') {
        $timeline[] = [
            'id' => 3,
            'title' => 'Investigasi',
            'description' => 'Menunggu tahap investigasi dimulai. Anda akan dihubungi jika diperlukan informasi tambahan.',
            'status' => 'pending',
            'date' => null,
            'icon' => '⏸'
        ];
    } elseif ($status === 'Investigation') {
        $timeline[] = [
            'id' => 3,
            'title' => 'Investigasi Berlangsung',
            'description' => 'Tim investigasi sedang melakukan penyelidikan menyeluruh terhadap laporan Anda. Proses ini memerlukan waktu untuk memastikan keadilan bagi semua pihak.',
            'status' => 'loading',
            'date' => null,
            'icon' => '🔍'
        ];
    } else {
        $timeline[] = [
            'id' => 3,
            'title' => 'Investigasi Selesai',
            'description' => 'Investigasi telah diselesaikan dan hasil temuan telah didokumentasikan dengan lengkap.',
            'status' => 'success',
            'date' => null,
            'icon' => '✓'
        ];
    }
    
    // Step 4: Tindak Lanjut
    if ($status === 'Completed') {
        $timeline[] = [
            'id' => 4,
            'title' => 'Tindak Lanjut Selesai',
            'description' => 'Laporan Anda telah selesai ditindaklanjuti. Terima kasih atas kepercayaan Anda kepada Satgas PPKS. Jika ada pertanyaan lebih lanjut, silakan hubungi kami.',
            'status' => 'success',
            'date' => $laporan['updated_at'],
            'icon' => '🎉'
        ];
    } else {
        $timeline[] = [
            'id' => 4,
            'title' => 'Tindak Lanjut',
            'description' => 'Menunggu tahap tindak lanjut dari hasil investigasi.',
            'status' => 'pending',
            'date' => null,
            'icon' => '⏸'
        ];
    }
    
    return $timeline;
}

/**
 * Determine overall status for frontend
 */
function determineOverallStatus($status_laporan) {
    switch ($status_laporan) {
        case 'Completed':
            return 'completed';
        case 'Investigation':
            return 'in_progress';
        case 'Process':
        default:
            return 'in_progress';
    }
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