<?php
/**
 * SIGAP PPKS - API Login
 * Autentikasi admin dengan keamanan lengkap
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

// Database
try {
    require_once __DIR__ . '/../../config/database.php';
} catch (Exception $e) {
    error_log("CRITICAL: Database connection failed - " . $e->getMessage());
    http_response_code(500);
    exit(json_encode(['status' => 'error', 'message' => 'Layanan tidak tersedia']));
}

// Helper functions
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

function sanitizeInput($data) {
    return htmlspecialchars(trim(stripslashes($data)), ENT_QUOTES, 'UTF-8');
}

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

function checkRateLimit($pdo, $email, $ip) {
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as attempt_count FROM LoginAttempts
            WHERE (email = :email OR ip_address = :ip)
            AND success = 0
            AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        ");
        $stmt->execute([':email' => $email, ':ip' => $ip]);
        $result = $stmt->fetch();
        
        if ($result['attempt_count'] >= 5) {
            return ['allowed' => false, 'message' => 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.'];
        }
        return ['allowed' => true];
    } catch (Exception $e) {
        return ['allowed' => true];
    }
}

function checkAccountLock($pdo, $email) {
    try {
        $stmt = $pdo->prepare("
            SELECT locked_until FROM Admin 
            WHERE email = :email AND locked_until IS NOT NULL AND locked_until > NOW()
        ");
        $stmt->execute([':email' => $email]);
        if ($stmt->fetch()) {
            return ['locked' => true, 'message' => 'Akun terkunci sementara karena percobaan login gagal.'];
        }
        return ['locked' => false];
    } catch (Exception $e) {
        return ['locked' => false];
    }
}

function lockAccount($pdo, $email) {
    try {
        $stmt = $pdo->prepare("
            UPDATE Admin SET locked_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE),
            failed_attempts = failed_attempts + 1 WHERE email = :email
        ");
        $stmt->execute([':email' => $email]);
        error_log("SECURITY: Account locked - Email: $email");
    } catch (Exception $e) {
        error_log("Failed to lock account: " . $e->getMessage());
    }
}

function resetFailedAttempts($pdo, $email) {
    try {
        $stmt = $pdo->prepare("
            UPDATE Admin SET failed_attempts = 0, locked_until = NULL, last_login = NOW()
            WHERE email = :email
        ");
        $stmt->execute([':email' => $email]);
    } catch (Exception $e) {
        error_log("Failed to reset attempts: " . $e->getMessage());
    }
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

// Get input
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

if (empty($email) || empty($password)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
}

$email = sanitizeInput($email);
$password = trim($password);

// Validasi
if (empty($email) || empty($password)) {
    logAuthAttempt($pdo, $email ?: 'unknown', $clientIP, false, 'Empty credentials');
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Email dan password wajib diisi']));
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    logAuthAttempt($pdo, $email, $clientIP, false, 'Invalid email format');
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Format email tidak valid']));
}

if (strlen($password) < 6 || strlen($password) > 255) {
    logAuthAttempt($pdo, $email, $clientIP, false, 'Invalid password length');
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Kredensial tidak valid']));
}

// Security checks
$rateCheck = checkRateLimit($pdo, $email, $clientIP);
if (!$rateCheck['allowed']) {
    logAuthAttempt($pdo, $email, $clientIP, false, 'Rate limit exceeded');
    http_response_code(429);
    exit(json_encode(['status' => 'error', 'message' => $rateCheck['message']]));
}

$lockCheck = checkAccountLock($pdo, $email);
if ($lockCheck['locked']) {
    logAuthAttempt($pdo, $email, $clientIP, false, 'Account locked');
    http_response_code(403);
    exit(json_encode(['status' => 'error', 'message' => $lockCheck['message']]));
}

// Query user
try {
    $stmt = $pdo->prepare("
        SELECT id, username, nama, email, password_hash, failed_attempts, locked_until
        FROM Admin WHERE email = :email 
        AND (locked_until IS NULL OR locked_until < NOW()) LIMIT 1
    ");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    error_log("CRITICAL: Database query failed - " . $e->getMessage());
    logAuthAttempt($pdo, $email, $clientIP, false, 'Database error');
    http_response_code(500);
    exit(json_encode(['status' => 'error', 'message' => 'Layanan tidak tersedia']));
}

// Verify password
if (!$user) {
    password_hash('dummy_password_to_prevent_timing_attack', PASSWORD_BCRYPT);
    logAuthAttempt($pdo, $email, $clientIP, false, 'User not found');
    http_response_code(401);
    exit(json_encode(['status' => 'error', 'message' => 'Email atau password salah']));
}

if (!password_verify($password, $user['password_hash'])) {
    logAuthAttempt($pdo, $email, $clientIP, false, 'Wrong password');
    
    try {
        $stmt = $pdo->prepare("UPDATE Admin SET failed_attempts = failed_attempts + 1 WHERE email = :email");
        $stmt->execute([':email' => $email]);
        
        if (($user['failed_attempts'] + 1) >= 5) {
            lockAccount($pdo, $email);
            http_response_code(403);
            exit(json_encode(['status' => 'error', 'message' => 'Akun terkunci karena percobaan gagal. Coba lagi dalam 30 menit.']));
        }
    } catch (Exception $e) {
        error_log("Failed to update attempts: " . $e->getMessage());
    }
    
    http_response_code(401);
    exit(json_encode(['status' => 'error', 'message' => 'Email atau password salah']));
}

// Login sukses
session_regenerate_id(true);

$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'unknown';
$acceptEncoding = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? 'unknown';

$deviceFingerprint = hash('sha256', $userAgent . '|' . $acceptLanguage . '|' . $acceptEncoding . '|' . $clientIP);

$_SESSION['admin_id'] = $user['id'];
$_SESSION['admin_name'] = $user['nama'];
$_SESSION['admin_email'] = $user['email'];
$_SESSION['admin_username'] = $user['username'];
$_SESSION['logged_in'] = true;
$_SESSION['login_time'] = time();
$_SESSION['login_ip'] = $clientIP;
$_SESSION['last_activity'] = time();
$_SESSION['device_fingerprint'] = $deviceFingerprint;
$_SESSION['user_agent'] = $userAgent;
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

resetFailedAttempts($pdo, $email);
logAuthAttempt($pdo, $email, $clientIP, true, 'Success');

error_log("LOGIN SUCCESS - User: {$user['email']} (ID: {$user['id']}) from IP: $clientIP");

http_response_code(200);
echo json_encode([
    'status' => 'success',
    'message' => 'Login berhasil',
    'data' => [
        'id' => $user['id'],
        'name' => $user['nama'],
        'email' => $user['email'],
        'username' => $user['username']
    ],
    'csrf_token' => $_SESSION['csrf_token'],
    'redirect' => '/Bismillahirrahmanirrahim/Admin/pages/cases/cases.html'
]);
exit;