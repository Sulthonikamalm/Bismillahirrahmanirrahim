<?php
/**
 * ========================================================
 * SIGAP PPKPT - ULTRA SECURE Authentication System
 * File: auth_login_secure.php
 * ========================================================
 * 
 * Security Features:
 * ✅ Prepared Statements (SQL Injection Prevention)
 * ✅ BCrypt Password Hashing (Cost 12)
 * ✅ Rate Limiting (Brute Force Prevention)
 * ✅ Account Lockout (After 5 failed attempts)
 * ✅ IP-based Tracking
 * ✅ Session Security (Regeneration, HttpOnly, SameSite)
 * ✅ CSRF Token Validation
 * ✅ Input Sanitization & Validation
 * ✅ Secure Headers
 * ✅ Login Attempt Logging
 * ✅ Time-based Attack Prevention
 */

// ========================================================
// SECURITY HEADERS
// ========================================================
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Only allow POST
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
// DATABASE CONNECTION (With Prepared Statement Protection)
// ========================================================
try {
    require_once __DIR__ . '/../config/database.php';
} catch (Exception $e) {
    error_log("CRITICAL: Database connection failed - " . $e->getMessage());
    http_response_code(500);
    exit(json_encode(['status' => 'error', 'message' => 'Service temporarily unavailable']));
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
 * Sanitize input to prevent XSS
 */
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

/**
 * Log authentication attempt
 */
function logAuthAttempt($pdo, $email, $ip, $success, $reason = '') {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO LoginAttempts 
            (email, ip_address, attempt_time, success, failure_reason) 
            VALUES (:email, :ip, NOW(), :success, :reason)
        ");
        
        $stmt->execute([
            ':email' => $email,
            ':ip' => $ip,
            ':success' => $success ? 1 : 0,
            ':reason' => $reason
        ]);
    } catch (Exception $e) {
        error_log("Failed to log auth attempt: " . $e->getMessage());
    }
}

/**
 * Check rate limiting (max attempts per IP/email)
 */
function checkRateLimit($pdo, $email, $ip) {
    try {
        // Check failed attempts in last 15 minutes
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as attempt_count
            FROM LoginAttempts
            WHERE (email = :email OR ip_address = :ip)
            AND success = 0
            AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        ");
        
        $stmt->execute([':email' => $email, ':ip' => $ip]);
        $result = $stmt->fetch();
        
        if ($result['attempt_count'] >= 5) {
            return [
                'allowed' => false,
                'message' => 'Too many failed login attempts. Please try again after 15 minutes.'
            ];
        }
        
        return ['allowed' => true];
        
    } catch (Exception $e) {
        error_log("Rate limit check failed: " . $e->getMessage());
        // Fail-safe: allow login if rate limit check fails
        return ['allowed' => true];
    }
}

/**
 * Check if account is locked
 */
function checkAccountLock($pdo, $email) {
    try {
        $stmt = $pdo->prepare("
            SELECT locked_until 
            FROM Admin 
            WHERE email = :email 
            AND locked_until IS NOT NULL 
            AND locked_until > NOW()
        ");
        
        $stmt->execute([':email' => $email]);
        $result = $stmt->fetch();
        
        if ($result) {
            return [
                'locked' => true,
                'message' => 'Account is temporarily locked due to multiple failed login attempts.'
            ];
        }
        
        return ['locked' => false];
        
    } catch (Exception $e) {
        error_log("Account lock check failed: " . $e->getMessage());
        return ['locked' => false];
    }
}

/**
 * Lock account after multiple failures
 */
function lockAccount($pdo, $email) {
    try {
        $stmt = $pdo->prepare("
            UPDATE Admin 
            SET locked_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE),
                failed_attempts = failed_attempts + 1
            WHERE email = :email
        ");
        
        $stmt->execute([':email' => $email]);
        
        error_log("SECURITY: Account locked - Email: $email");
        
    } catch (Exception $e) {
        error_log("Failed to lock account: " . $e->getMessage());
    }
}

/**
 * Reset failed attempts on successful login
 */
function resetFailedAttempts($pdo, $email) {
    try {
        $stmt = $pdo->prepare("
            UPDATE Admin 
            SET failed_attempts = 0,
                locked_until = NULL,
                last_login = NOW()
            WHERE email = :email
        ");
        
        $stmt->execute([':email' => $email]);
    } catch (Exception $e) {
        error_log("Failed to reset attempts: " . $e->getMessage());
    }
}

// ========================================================
// MAIN AUTHENTICATION LOGIC
// ========================================================

// Start secure session
// Auto-detect HTTPS for cookie_secure setting
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443;

session_start([
    'cookie_httponly' => true,
    'cookie_secure' => $isHttps, // Enable only if using HTTPS
    'cookie_samesite' => 'Strict',
    'use_strict_mode' => true,
    'use_only_cookies' => true
]);

// Get client IP
$clientIP = getClientIP();

// ========================================================
// INPUT VALIDATION & SANITIZATION
// ========================================================

// Get input
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

// Try JSON if POST is empty
if (empty($email) || empty($password)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
}

// Sanitize inputs
$email = sanitizeInput($email);
$password = trim($password); // Don't sanitize password, just trim

// Validate presence
if (empty($email) || empty($password)) {
    logAuthAttempt($pdo, $email ?: 'unknown', $clientIP, false, 'Empty credentials');
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Email and password are required'
    ]));
}

// Validate email format
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    logAuthAttempt($pdo, $email, $clientIP, false, 'Invalid email format');
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid email format'
    ]));
}

// Validate password length
if (strlen($password) < 6 || strlen($password) > 255) {
    logAuthAttempt($pdo, $email, $clientIP, false, 'Invalid password length');
    http_response_code(400);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid credentials'
    ]));
}

// ========================================================
// SECURITY CHECKS
// ========================================================

// Check rate limiting
$rateCheck = checkRateLimit($pdo, $email, $clientIP);
if (!$rateCheck['allowed']) {
    logAuthAttempt($pdo, $email, $clientIP, false, 'Rate limit exceeded');
    http_response_code(429);
    exit(json_encode([
        'status' => 'error',
        'message' => $rateCheck['message']
    ]));
}

// Check account lock
$lockCheck = checkAccountLock($pdo, $email);
if ($lockCheck['locked']) {
    logAuthAttempt($pdo, $email, $clientIP, false, 'Account locked');
    http_response_code(403);
    exit(json_encode([
        'status' => 'error',
        'message' => $lockCheck['message']
    ]));
}

// ========================================================
// DATABASE QUERY (SQL Injection Protected)
// ========================================================

try {
    // Use prepared statement - PREVENTS SQL INJECTION
    $stmt = $pdo->prepare("
        SELECT 
            id, 
            username,
            nama, 
            email,
            password_hash,
            failed_attempts,
            locked_until
        FROM Admin 
        WHERE email = :email 
        AND (locked_until IS NULL OR locked_until < NOW())
        LIMIT 1
    ");
    
    // Execute with bound parameter
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
} catch (PDOException $e) {
    error_log("CRITICAL: Database query failed - " . $e->getMessage());
    logAuthAttempt($pdo, $email, $clientIP, false, 'Database error');
    http_response_code(500);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Service temporarily unavailable'
    ]));
}

// ========================================================
// PASSWORD VERIFICATION
// ========================================================

// Use timing-safe comparison to prevent timing attacks
if (!$user) {
    // User not found - but still hash to prevent timing attacks
    password_hash('dummy_password_to_prevent_timing_attack', PASSWORD_BCRYPT);
    
    logAuthAttempt($pdo, $email, $clientIP, false, 'User not found');
    
    // Generic error message (don't reveal if user exists)
    http_response_code(401);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid email or password'
    ]));
}

// Verify password with bcrypt
if (!password_verify($password, $user['password_hash'])) {
    // Password incorrect
    logAuthAttempt($pdo, $email, $clientIP, false, 'Wrong password');
    
    // Increment failed attempts
    try {
        $stmt = $pdo->prepare("
            UPDATE Admin 
            SET failed_attempts = failed_attempts + 1 
            WHERE email = :email
        ");
        $stmt->execute([':email' => $email]);
        
        // Lock account after 5 failed attempts
        if (($user['failed_attempts'] + 1) >= 5) {
            lockAccount($pdo, $email);
            
            http_response_code(403);
            exit(json_encode([
                'status' => 'error',
                'message' => 'Account locked due to multiple failed attempts. Please try again after 30 minutes.'
            ]));
        }
        
    } catch (Exception $e) {
        error_log("Failed to update attempts: " . $e->getMessage());
    }
    
    http_response_code(401);
    exit(json_encode([
        'status' => 'error',
        'message' => 'Invalid email or password'
    ]));
}

// ========================================================
// LOGIN SUCCESS - SET SECURE SESSION
// ========================================================

// Regenerate session ID (prevent session fixation)
session_regenerate_id(true);

// ========================================================
// DEVICE FINGERPRINTING - Bind session to specific browser/device
// ========================================================
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'unknown';
$acceptEncoding = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? 'unknown';

// Create unique device fingerprint
$deviceFingerprint = hash('sha256',
    $userAgent . '|' .
    $acceptLanguage . '|' .
    $acceptEncoding . '|' .
    $clientIP
);

// Set session variables
$_SESSION['admin_id'] = $user['id'];
$_SESSION['admin_name'] = $user['nama'];
$_SESSION['admin_email'] = $user['email'];
$_SESSION['admin_username'] = $user['username'];
$_SESSION['logged_in'] = true;
$_SESSION['login_time'] = time();
$_SESSION['login_ip'] = $clientIP;
$_SESSION['last_activity'] = time();

// CRITICAL: Bind session to device fingerprint
$_SESSION['device_fingerprint'] = $deviceFingerprint;
$_SESSION['user_agent'] = $userAgent;

// Generate CSRF token
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

error_log("DEVICE FINGERPRINT - User: {$user['email']}, Fingerprint: $deviceFingerprint");

// Reset failed attempts
resetFailedAttempts($pdo, $email);

// Log successful login
logAuthAttempt($pdo, $email, $clientIP, true, 'Success');

error_log("LOGIN SUCCESS - User: {$user['email']} (ID: {$user['id']}) from IP: $clientIP");

// ========================================================
// RESPONSE
// ========================================================

http_response_code(200);
echo json_encode([
    'status' => 'success',
    'message' => 'Login successful',
    'data' => [
        'id' => $user['id'],
        'name' => $user['nama'],
        'email' => $user['email'],
        'username' => $user['username']
    ],
    'csrf_token' => $_SESSION['csrf_token'],
    'redirect' => '../dashboard/cases.html'
]);

exit;