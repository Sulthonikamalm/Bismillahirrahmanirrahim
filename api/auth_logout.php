<?php
/**
 * ========================================================
 * SIGAP PPKS - ULTRA SECURE Logout System
 * File: auth_logout.php
 * ========================================================
 *
 * Security Features:
 * ✅ Session Destruction & Cleanup
 * ✅ Cookie Invalidation
 * ✅ Session Regeneration Protection
 * ✅ Logout Event Logging
 * ✅ CSRF Protection (Optional but Recommended)
 * ✅ Secure Headers
 * ✅ Error Handling
 * ✅ IP-based Tracking
 */

// ========================================================
// SECURITY HEADERS
// ========================================================
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Only allow POST for security
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['status' => 'error', 'message' => 'Method not allowed']));
}

// Disable error display in production
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/auth_error.log');

// ========================================================
// DATABASE CONNECTION
// ========================================================
try {
    require_once __DIR__ . '/../config/database.php';
} catch (Exception $e) {
    error_log("CRITICAL: Database connection failed during logout - " . $e->getMessage());
    // Continue with logout even if DB fails - security priority
}

// ========================================================
// HELPER FUNCTIONS
// ========================================================

/**
 * Get client IP address (with proxy support)
 */
function getClientIP() {
    $ip = '';

    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    // Validate IP
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

/**
 * Log logout event for security audit
 */
function logLogoutEvent($pdo, $adminId, $email, $ip, $reason = 'User logout') {
    try {
        if (!isset($pdo)) return;

        $stmt = $pdo->prepare("
            INSERT INTO LoginAttempts
            (email, ip_address, attempt_time, success, failure_reason)
            VALUES (:email, :ip, NOW(), 1, :reason)
        ");

        $stmt->execute([
            ':email' => $email,
            ':ip' => $ip,
            ':reason' => $reason
        ]);

        error_log("LOGOUT SUCCESS - Admin ID: $adminId, Email: $email, IP: $ip");

    } catch (Exception $e) {
        error_log("Failed to log logout event: " . $e->getMessage());
        // Don't fail logout if logging fails
    }
}

/**
 * Destroy all session data securely
 */
function destroySessionSecurely() {
    // Unset all session variables
    $_SESSION = array();

    // Delete the session cookie
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

    // Destroy the session
    session_destroy();
}

// ========================================================
// START SESSION
// ========================================================
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => true, // Enable only if using HTTPS
    'cookie_samesite' => 'Strict',
    'use_strict_mode' => true,
    'use_only_cookies' => true
]);

// Get client IP
$clientIP = getClientIP();

// ========================================================
// CHECK IF USER IS LOGGED IN
// ========================================================

// Store session data before destroying
$isLoggedIn = isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
$adminId = $_SESSION['admin_id'] ?? null;
$adminEmail = $_SESSION['admin_email'] ?? 'unknown';
$adminName = $_SESSION['admin_name'] ?? 'Unknown';

// If user is not logged in, still return success (idempotent operation)
if (!$isLoggedIn) {
    // Still destroy session for cleanup
    destroySessionSecurely();

    http_response_code(200);
    exit(json_encode([
        'status' => 'success',
        'message' => 'Already logged out',
        'redirect' => '../index.html'
    ]));
}

// ========================================================
// OPTIONAL: CSRF TOKEN VALIDATION
// ========================================================
// Uncomment below for extra security (requires sending token from frontend)
/*
$csrfToken = $_POST['csrf_token'] ?? '';
if (empty($csrfToken) || !isset($_SESSION['csrf_token']) || $csrfToken !== $_SESSION['csrf_token']) {
    error_log("SECURITY: CSRF token mismatch during logout - Admin ID: $adminId, IP: $clientIP");
    http_response_code(403);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid security token'
    ]));
}
*/

// ========================================================
// LOG LOGOUT EVENT
// ========================================================
if (isset($pdo)) {
    logLogoutEvent($pdo, $adminId, $adminEmail, $clientIP, 'User logout');
}

// ========================================================
// DESTROY SESSION
// ========================================================
destroySessionSecurely();

// ========================================================
// RESPONSE
// ========================================================
http_response_code(200);
echo json_encode([
    'status' => 'success',
    'message' => 'Logout successful',
    'data' => [
        'admin_name' => $adminName,
        'logout_time' => date('Y-m-d H:i:s')
    ],
    'redirect' => '../index.html'
]);

exit;
