<?php
/**
 * ============================================================
 * MAINTENANCE MODE CHECKER
 * ============================================================
 * Include file ini di awal setiap halaman untuk cek maintenance
 * 
 * CARA PAKAI:
 * 1. Aktifkan Maintenance: Buat file .maintenance di root project
 * 2. Nonaktifkan: Hapus file .maintenance
 * 
 * BYPASS:
 * - Tambahkan IP Anda ke $bypassIPs untuk bypass maintenance
 * - Atau gunakan query ?bypass_maintenance=SECRET_KEY
 * ============================================================
 */

// Konfigurasi
$maintenanceFile = __DIR__ . '/../.maintenance';
$maintenancePage = __DIR__ . '/index.html';

// Secret key untuk bypass dari environment variable
require_once __DIR__ . '/../config/env_loader.php';
$bypassSecretKey = env('MAINTENANCE_SECRET_KEY', 'sigap_admin_' . date('Y'));

// IP yang boleh bypass maintenance (tambahkan IP Anda)
$bypassIPs = [
    '127.0.0.1',
    '::1',
    // Tambahkan IP admin di sini
    // '192.168.1.100',
];

/**
 * Check apakah maintenance mode aktif
 * @return bool
 */
function isMaintenanceMode() {
    global $maintenanceFile;
    return file_exists($maintenanceFile);
}

/**
 * Check apakah request ini boleh bypass
 * @return bool
 */
function canBypassMaintenance() {
    global $bypassIPs, $bypassSecretKey;
    
    // Check IP bypass
    $clientIP = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? 
                $_SERVER['HTTP_X_REAL_IP'] ?? 
                $_SERVER['REMOTE_ADDR'] ?? 
                'unknown';
    $clientIP = explode(',', $clientIP)[0];
    $clientIP = trim($clientIP);
    
    if (in_array($clientIP, $bypassIPs)) {
        return true;
    }
    
    // Check query parameter bypass
    if (isset($_GET['bypass_maintenance']) && $_GET['bypass_maintenance'] === $bypassSecretKey) {
        // Set cookie untuk bypass selama 1 jam
        setcookie('maintenance_bypass', md5($bypassSecretKey . date('Y-m-d')), time() + 3600, '/');
        return true;
    }
    
    // Check cookie bypass
    if (isset($_COOKIE['maintenance_bypass'])) {
        if ($_COOKIE['maintenance_bypass'] === md5($bypassSecretKey . date('Y-m-d'))) {
            return true;
        }
    }
    
    return false;
}

/**
 * Show maintenance page dan exit
 */
function showMaintenancePage() {
    global $maintenancePage;
    
    // Set HTTP status untuk maintenance
    http_response_code(503);
    header('Retry-After: 3600'); // Suggest retry after 1 hour
    header('Content-Type: text/html; charset=utf-8');
    
    // Kirim maintenance page
    if (file_exists($maintenancePage)) {
        readfile($maintenancePage);
    } else {
        echo '<h1>Site Under Maintenance</h1><p>Please check back later.</p>';
    }
    
    exit;
}

/**
 * Show maintenance JSON response (untuk API)
 */
function showMaintenanceAPI() {
    http_response_code(503);
    header('Retry-After: 3600');
    header('Content-Type: application/json; charset=utf-8');
    
    echo json_encode([
        'success' => false,
        'message' => 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
        'error_code' => 'MAINTENANCE_MODE',
        'retry_after' => 3600
    ], JSON_UNESCAPED_UNICODE);
    
    exit;
}

// ============================================================
// AUTO-CHECK MAINTENANCE (hanya jika file ini di-include)
// ============================================================

// Hanya jalankan jika di-include, bukan diakses langsung
if (basename($_SERVER['SCRIPT_FILENAME']) !== 'check.php') {
    if (isMaintenanceMode() && !canBypassMaintenance()) {
        // Detect if this is an API request
        $isAPI = (
            strpos($_SERVER['REQUEST_URI'] ?? '', '/api/') !== false ||
            strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== false ||
            isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false
        );
        
        if ($isAPI) {
            showMaintenanceAPI();
        } else {
            showMaintenancePage();
        }
    }
}
