<?php
/**
 * SIGAP PPKS - API Cek Sesi
 * Validasi sesi admin yang sudah login
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

error_reporting(0);
ini_set('display_errors', 0);

// Start session
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443;
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => $isHttps,
    'cookie_samesite' => 'Strict',
    'use_strict_mode' => true,
    'use_only_cookies' => true,
    'gc_maxlifetime' => 1800
]);

function getClientIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

function destroySession() {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
    }
    session_destroy();
}

// Cek login
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['status' => 'unauthorized', 'message' => 'Belum login']);
    exit;
}

$currentIP = getClientIP();
$currentUserAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$currentTime = time();

// Device fingerprint validation
$acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'unknown';
$acceptEncoding = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? 'unknown';
$currentFingerprint = hash('sha256', $currentUserAgent . '|' . $acceptLanguage . '|' . $acceptEncoding . '|' . $currentIP);

if (isset($_SESSION['device_fingerprint'])) {
    if ($_SESSION['device_fingerprint'] !== $currentFingerprint) {
        error_log("SECURITY ALERT: Device fingerprint mismatch! User: " . ($_SESSION['admin_email'] ?? 'unknown'));
        destroySession();
        http_response_code(401);
        echo json_encode([
            'status' => 'unauthorized',
            'message' => 'Sesi tidak valid. Perangkat berbeda terdeteksi.',
            'reason' => 'device_mismatch'
        ]);
        exit;
    }
} else {
    error_log("SECURITY WARNING: No device fingerprint for user: " . ($_SESSION['admin_email'] ?? 'unknown'));
    destroySession();
    http_response_code(401);
    echo json_encode(['status' => 'unauthorized', 'message' => 'Sesi tidak valid. Silakan login ulang.', 'reason' => 'no_fingerprint']);
    exit;
}

// Session timeout (30 menit)
if (isset($_SESSION['last_activity'])) {
    if (($currentTime - $_SESSION['last_activity']) > 1800) {
        error_log("Session timeout - User: " . ($_SESSION['admin_email'] ?? 'unknown'));
        destroySession();
        http_response_code(401);
        echo json_encode(['status' => 'unauthorized', 'message' => 'Sesi kadaluarsa karena tidak aktif', 'reason' => 'timeout']);
        exit;
    }
}
$_SESSION['last_activity'] = $currentTime;

// Max session lifetime (4 jam)
if (isset($_SESSION['login_time'])) {
    if (($currentTime - $_SESSION['login_time']) > 14400) {
        error_log("Session expired - Max lifetime - User: " . ($_SESSION['admin_email'] ?? 'unknown'));
        destroySession();
        http_response_code(401);
        echo json_encode(['status' => 'unauthorized', 'message' => 'Sesi kadaluarsa. Silakan login ulang.', 'reason' => 'max_lifetime']);
        exit;
    }
}

// Validate required session vars
$requiredVars = ['admin_id', 'admin_email', 'admin_name'];
foreach ($requiredVars as $var) {
    if (!isset($_SESSION[$var]) || empty($_SESSION[$var])) {
        error_log("Invalid session - Missing: $var");
        destroySession();
        http_response_code(401);
        echo json_encode(['status' => 'unauthorized', 'message' => 'Data sesi tidak valid']);
        exit;
    }
}

// Regenerate session ID setiap 10 menit
if (!isset($_SESSION['last_regeneration'])) {
    $_SESSION['last_regeneration'] = $currentTime;
} elseif (($currentTime - $_SESSION['last_regeneration']) > 600) {
    session_regenerate_id(true);
    $_SESSION['last_regeneration'] = $currentTime;
}

// Generate CSRF token jika belum ada
if (!isset($_SESSION['csrf_token']) || empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

http_response_code(200);
echo json_encode([
    'status' => 'authenticated',
    'user' => [
        'id' => $_SESSION['admin_id'],
        'name' => $_SESSION['admin_name'],
        'email' => $_SESSION['admin_email'],
        'username' => $_SESSION['admin_username'] ?? ''
    ],
    'session' => [
        'csrf_token' => $_SESSION['csrf_token'],
        'login_time' => $_SESSION['login_time'] ?? null,
        'last_activity' => $_SESSION['last_activity'] ?? null
    ],
    'csrf_token' => $_SESSION['csrf_token']
]);
exit;