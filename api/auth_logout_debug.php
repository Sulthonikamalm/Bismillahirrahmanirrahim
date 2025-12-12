<?php
/**
 * DEBUG LOGOUT - Versi debug untuk troubleshooting
 */

// Log file
$logFile = __DIR__ . '/../logs/logout_debug.log';
@mkdir(__DIR__ . '/../logs', 0777, true);

file_put_contents($logFile, "\n\n=== LOGOUT REQUEST " . date('Y-m-d H:i:s') . " ===\n", FILE_APPEND);
file_put_contents($logFile, "REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);

// Headers
header('Content-Type: application/json; charset=utf-8');

// Method check
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    file_put_contents($logFile, "ERROR: Not POST method\n", FILE_APPEND);
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed', 'debug' => true]);
    exit;
}

file_put_contents($logFile, "Method OK: POST\n", FILE_APPEND);

// Start session
try {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443;
    session_start([
        'cookie_httponly' => true,
        'cookie_secure' => $isHttps,
        'cookie_samesite' => 'Strict'
    ]);
    file_put_contents($logFile, "Session started\n", FILE_APPEND);
} catch (Exception $e) {
    file_put_contents($logFile, "ERROR: Session start failed: " . $e->getMessage() . "\n", FILE_APPEND);
}

// Check session
$isLoggedIn = isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
$adminEmail = $_SESSION['admin_email'] ?? 'unknown';

file_put_contents($logFile, "Is logged in: " . ($isLoggedIn ? 'YES' : 'NO') . "\n", FILE_APPEND);
file_put_contents($logFile, "Admin email: $adminEmail\n", FILE_APPEND);

// Destroy session
$_SESSION = array();

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

file_put_contents($logFile, "Session destroyed\n", FILE_APPEND);

// Success response
http_response_code(200);
$response = json_encode([
    'status' => 'success',
    'message' => 'Logout successful',
    'data' => [
        'was_logged_in' => $isLoggedIn,
        'logout_time' => date('Y-m-d H:i:s')
    ],
    'redirect' => '/Bismillahirrahmanirrahim/Admin/pages/auth/login.html',
    'debug' => true
]);

file_put_contents($logFile, "Response: $response\n", FILE_APPEND);
echo $response;
exit;
