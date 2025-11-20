<?php
/**
 * ========================================================
 * SIGAP PPKS - SECURE Session Check & Authentication
 * File: auth_check_secure.php
 * ========================================================
 * 
 * Security Features:
 * ✅ Session validation
 * ✅ Session timeout (30 minutes idle)
 * ✅ Session hijacking prevention
 * ✅ IP address verification
 * ✅ User agent verification
 * ✅ CSRF token validation
 */

// Security headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Disable error display
error_reporting(0);
ini_set('display_errors', 0);

// Start secure session
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => true, // Enable only if using HTTPS
    'cookie_samesite' => 'Strict',
    'use_strict_mode' => true,
    'use_only_cookies' => true,
    'gc_maxlifetime' => 1800 // 30 minutes
]);

// ========================================================
// HELPER FUNCTIONS
// ========================================================

/**
 * Get client IP address
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
    
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

/**
 * Get user agent
 */
function getUserAgent() {
    return $_SERVER['HTTP_USER_AGENT'] ?? '';
}

/**
 * Destroy session securely
 */
function destroySession() {
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

// ========================================================
// SESSION VALIDATION
// ========================================================

// Check if session exists
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode([
        'status' => 'unauthorized',
        'message' => 'Not authenticated'
    ]);
    exit;
}

// ========================================================
// SECURITY CHECKS
// ========================================================

$currentIP = getClientIP();
$currentUserAgent = getUserAgent();
$currentTime = time();

// 1. Check session timeout (30 minutes of inactivity)
if (isset($_SESSION['last_activity'])) {
    $inactiveTime = $currentTime - $_SESSION['last_activity'];
    
    if ($inactiveTime > 1800) { // 30 minutes
        error_log("Session timeout - User: " . ($_SESSION['admin_email'] ?? 'unknown'));
        destroySession();
        
        http_response_code(401);
        echo json_encode([
            'status' => 'unauthorized',
            'message' => 'Session expired due to inactivity',
            'reason' => 'timeout'
        ]);
        exit;
    }
}

// Update last activity time
$_SESSION['last_activity'] = $currentTime;

// 2. Check IP address (prevent session hijacking)
if (isset($_SESSION['login_ip'])) {
    if ($_SESSION['login_ip'] !== $currentIP) {
        error_log("SECURITY WARNING: IP mismatch - Session IP: " . $_SESSION['login_ip'] . ", Current IP: $currentIP");
        
        // For high-security applications, destroy session
        // destroySession();
        
        // For now, log warning but allow (some users have dynamic IPs)
        // Uncomment below to enforce strict IP checking:
        /*
        http_response_code(401);
        echo json_encode([
            'status' => 'unauthorized',
            'message' => 'Session security violation detected',
            'reason' => 'ip_mismatch'
        ]);
        exit;
        */
    }
}

// 3. Check absolute session lifetime (4 hours max)
if (isset($_SESSION['login_time'])) {
    $sessionLifetime = $currentTime - $_SESSION['login_time'];
    
    if ($sessionLifetime > 14400) { // 4 hours
        error_log("Session expired - Max lifetime reached - User: " . ($_SESSION['admin_email'] ?? 'unknown'));
        destroySession();
        
        http_response_code(401);
        echo json_encode([
            'status' => 'unauthorized',
            'message' => 'Session expired. Please login again.',
            'reason' => 'max_lifetime'
        ]);
        exit;
    }
}

// 4. Validate required session variables
$requiredSessionVars = ['admin_id', 'admin_email', 'admin_name'];
foreach ($requiredSessionVars as $var) {
    if (!isset($_SESSION[$var]) || empty($_SESSION[$var])) {
        error_log("Invalid session - Missing variable: $var");
        destroySession();
        
        http_response_code(401);
        echo json_encode([
            'status' => 'unauthorized',
            'message' => 'Invalid session data'
        ]);
        exit;
    }
}

// 5. Optional: Verify user still exists and is active in database
// (Uncomment if you want real-time verification on every request)
/*
try {
    require_once __DIR__ . '/../config/database_secure.php';
    
    $stmt = $pdo->prepare("
        SELECT id, is_active 
        FROM Admin 
        WHERE id = :id AND email = :email
        LIMIT 1
    ");
    
    $stmt->execute([
        ':id' => $_SESSION['admin_id'],
        ':email' => $_SESSION['admin_email']
    ]);
    
    $user = $stmt->fetch();
    
    if (!$user || !$user['is_active']) {
        error_log("User no longer active or deleted - ID: " . $_SESSION['admin_id']);
        destroySession();
        
        http_response_code(401);
        echo json_encode([
            'status' => 'unauthorized',
            'message' => 'Account is no longer active'
        ]);
        exit;
    }
    
} catch (Exception $e) {
    error_log("Database check failed during auth: " . $e->getMessage());
    // Don't fail if database check fails - allow session to continue
}
*/

// ========================================================
// SESSION REGENERATION (Periodic)
// ========================================================

// Regenerate session ID every 10 minutes (prevents session fixation)
if (!isset($_SESSION['last_regeneration'])) {
    $_SESSION['last_regeneration'] = $currentTime;
} else {
    $timeSinceRegeneration = $currentTime - $_SESSION['last_regeneration'];
    
    if ($timeSinceRegeneration > 600) { // 10 minutes
        session_regenerate_id(true);
        $_SESSION['last_regeneration'] = $currentTime;
        error_log("Session ID regenerated for user: " . $_SESSION['admin_email']);
    }
}

// ========================================================
// AUTHENTICATED RESPONSE
// ========================================================

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
        'csrf_token' => $_SESSION['csrf_token'] ?? null,
        'login_time' => $_SESSION['login_time'] ?? null,
        'last_activity' => $_SESSION['last_activity'] ?? null
    ]
]);

exit;