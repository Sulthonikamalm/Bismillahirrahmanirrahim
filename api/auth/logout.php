<?php
/**
 * SIGAP PPKS - API Logout
 * Logout admin dengan pembersihan sesi yang aman
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['status' => 'error', 'message' => 'Method not allowed']));
}

error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/auth_error.log');

// Database (opsional untuk logging)
try {
    require_once __DIR__ . '/../../config/database.php';
} catch (Exception $e) {
    error_log("Database connection failed during logout");
}

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

function logLogoutEvent($pdo, $email, $ip) {
    try {
        if (!isset($pdo)) return;
        $stmt = $pdo->prepare("
            INSERT INTO LoginAttempts (email, ip_address, attempt_time, success, failure_reason)
            VALUES (:email, :ip, NOW(), 1, 'Logout')
        ");
        $stmt->execute([':email' => $email, ':ip' => $ip]);
    } catch (Exception $e) {
        error_log("Failed to log logout: " . $e->getMessage());
    }
}

function destroySessionSecurely() {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
    }
    session_destroy();
}

// Start session
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443;
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => $isHttps,
    'cookie_samesite' => 'Strict',
    'use_strict_mode' => true,
    'use_only_cookies' => true
]);

$clientIP = getClientIP();

// Simpan data sebelum destroy
$isLoggedIn = isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
$adminEmail = $_SESSION['admin_email'] ?? 'unknown';
$adminName = $_SESSION['admin_name'] ?? 'Unknown';

if (!$isLoggedIn) {
    destroySessionSecurely();
    http_response_code(200);
    exit(json_encode([
        'status' => 'success',
        'message' => 'Sudah logout',
        'redirect' => '/Bismillahirrahmanirrahim/Admin/pages/auth/login.html'
    ]));
}

// Log logout
if (isset($pdo)) {
    logLogoutEvent($pdo, $adminEmail, $clientIP);
}

error_log("LOGOUT - User: $adminEmail, IP: $clientIP");

// Destroy session
destroySessionSecurely();

http_response_code(200);
echo json_encode([
    'status' => 'success',
    'message' => 'Logout berhasil',
    'data' => [
        'admin_name' => $adminName,
        'logout_time' => date('Y-m-d H:i:s')
    ],
    'redirect' => '/Bismillahirrahmanirrahim/Admin/pages/auth/login.html'
]);
exit;
