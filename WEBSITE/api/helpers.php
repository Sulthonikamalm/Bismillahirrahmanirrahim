<?php
/**
 * SIGAP PPKS - Helper Functions
 * Fungsi-fungsi utilitas yang digunakan di seluruh API
 */

/**
 * Ambil IP client (support proxy)
 */
function getClientIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
    
    return filter_var(trim($ip), FILTER_VALIDATE_IP) ?: '0.0.0.0';
}

/**
 * Sanitasi input untuk mencegah XSS
 */
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
}

/**
 * Kirim response JSON dan exit
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Kirim response error
 */
function errorResponse($message, $statusCode = 400, $extra = []) {
    $response = array_merge(['status' => 'error', 'message' => $message], $extra);
    jsonResponse($response, $statusCode);
}

/**
 * Kirim response sukses
 */
function successResponse($message, $data = null, $extra = []) {
    $response = ['status' => 'success', 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    jsonResponse(array_merge($response, $extra), 200);
}

/**
 * Set security headers standar
 */
function setSecurityHeaders() {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

/**
 * Mulai session dengan konfigurasi aman
 */
function startSecureSession() {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') 
               || ($_SERVER['SERVER_PORT'] ?? 80) == 443;
    
    session_start([
        'cookie_httponly' => true,
        'cookie_secure' => $isHttps,
        'cookie_samesite' => 'Strict',
        'use_strict_mode' => true,
        'use_only_cookies' => true,
        'gc_maxlifetime' => 1800
    ]);
}

/**
 * Hancurkan session dengan aman
 */
function destroySessionSecurely() {
    $_SESSION = [];
    
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }
    
    session_destroy();
}

/**
 * Validasi email
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Generate kode unik
 */
function generateUniqueCode($prefix = 'PPKPT', $length = 9) {
    return $prefix . substr(str_shuffle('0123456789'), 0, $length);
}

/**
 * Format tanggal ke Indonesia
 */
function formatDateID($date) {
    if (empty($date)) return '-';
    
    $bulan = [
        1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
        5 => 'Mei', 6 => 'Jun', 7 => 'Jul', 8 => 'Agu',
        9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des'
    ];
    
    $timestamp = strtotime($date);
    $d = date('d', $timestamp);
    $m = $bulan[(int)date('m', $timestamp)];
    $y = date('Y', $timestamp);
    $h = date('H:i', $timestamp);
    
    return "$d $m $y, $h";
}

/**
 * Log error ke file
 */
function logError($message, $context = []) {
    $logFile = __DIR__ . '/logs/error.log';
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? json_encode($context) : '';
    $logMessage = "[$timestamp] $message $contextStr\n";
    error_log($logMessage, 3, $logFile);
}
