<?php
/**
 * DEBUG VERSION - Auth Login
 * Simplified version to identify the issue
 */

// Log everything
$logFile = __DIR__ . '/../logs/debug_login.log';
@mkdir(__DIR__ . '/../logs', 0777, true);

file_put_contents($logFile, "\n\n=== NEW REQUEST " . date('Y-m-d H:i:s') . " ===\n", FILE_APPEND);
file_put_contents($logFile, "REQUEST_METHOD: " . ($_SERVER['REQUEST_METHOD'] ?? 'UNDEFINED') . "\n", FILE_APPEND);
file_put_contents($logFile, "REQUEST_URI: " . ($_SERVER['REQUEST_URI'] ?? 'UNDEFINED') . "\n", FILE_APPEND);
file_put_contents($logFile, "POST data: " . print_r($_POST, true) . "\n", FILE_APPEND);
file_put_contents($logFile, "PHP_SELF: " . ($_SERVER['PHP_SELF'] ?? 'UNDEFINED') . "\n", FILE_APPEND);

// Set headers FIRST
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Check method
$method = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
file_put_contents($logFile, "Method check: $method\n", FILE_APPEND);

if ($method !== 'POST') {
    file_put_contents($logFile, "ERROR: Method not POST, returning 405\n", FILE_APPEND);
    http_response_code(405);
    $response = json_encode([
        'status' => 'error',
        'message' => 'Method not allowed. Use POST.',
        'received_method' => $method,
        'debug' => true
    ]);
    file_put_contents($logFile, "Response: $response\n", FILE_APPEND);
    echo $response;
    exit;
}

file_put_contents($logFile, "Method is POST, continuing...\n", FILE_APPEND);

// Get input
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

file_put_contents($logFile, "Email: $email\n", FILE_APPEND);
file_put_contents($logFile, "Password length: " . strlen($password) . "\n", FILE_APPEND);

// Validate input
if (empty($email) || empty($password)) {
    file_put_contents($logFile, "ERROR: Empty credentials\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Email and password required',
        'debug' => true
    ]);
    exit;
}

// Try database connection
file_put_contents($logFile, "Attempting database connection...\n", FILE_APPEND);
try {
    require_once __DIR__ . '/../config/database.php';
    file_put_contents($logFile, "Database connected successfully\n", FILE_APPEND);
} catch (Exception $e) {
    file_put_contents($logFile, "ERROR: Database connection failed: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed',
        'debug' => $e->getMessage()
    ]);
    exit;
}

// Start session
file_put_contents($logFile, "Starting session...\n", FILE_APPEND);
try {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443;
    session_start([
        'cookie_httponly' => true,
        'cookie_secure' => $isHttps,
        'cookie_samesite' => 'Strict'
    ]);
    file_put_contents($logFile, "Session started successfully\n", FILE_APPEND);
} catch (Exception $e) {
    file_put_contents($logFile, "ERROR: Session start failed: " . $e->getMessage() . "\n", FILE_APPEND);
}

// Query admin
file_put_contents($logFile, "Querying admin with email: $email\n", FILE_APPEND);
try {
    $stmt = $pdo->prepare("SELECT id, username, nama, email, password_hash FROM Admin WHERE email = :email LIMIT 1");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        file_put_contents($logFile, "ERROR: User not found\n", FILE_APPEND);
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email or password',
            'debug' => 'User not found'
        ]);
        exit;
    }

    file_put_contents($logFile, "User found: " . $user['email'] . "\n", FILE_APPEND);

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        file_put_contents($logFile, "ERROR: Password incorrect\n", FILE_APPEND);
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email or password',
            'debug' => 'Password mismatch'
        ]);
        exit;
    }

    file_put_contents($logFile, "Password verified successfully\n", FILE_APPEND);

    // Device fingerprinting
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? 'unknown';
    $acceptEncoding = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? 'unknown';
    $clientIP = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    $deviceFingerprint = hash('sha256',
        $userAgent . '|' .
        $acceptLanguage . '|' .
        $acceptEncoding . '|' .
        $clientIP
    );

    file_put_contents($logFile, "Device fingerprint created: $deviceFingerprint\n", FILE_APPEND);

    // Set session
    $_SESSION['admin_id'] = $user['id'];
    $_SESSION['admin_name'] = $user['nama'];
    $_SESSION['admin_email'] = $user['email'];
    $_SESSION['admin_username'] = $user['username'];
    $_SESSION['logged_in'] = true;
    $_SESSION['login_time'] = time();
    $_SESSION['last_activity'] = time();
    $_SESSION['device_fingerprint'] = $deviceFingerprint;
    $_SESSION['user_agent'] = $userAgent;
    $_SESSION['login_ip'] = $clientIP;

    file_put_contents($logFile, "Session set successfully\n", FILE_APPEND);

    // Success response
    http_response_code(200);
    $response = json_encode([
        'status' => 'success',
        'message' => 'Login successful',
        'data' => [
            'id' => $user['id'],
            'name' => $user['nama'],
            'email' => $user['email'],
            'username' => $user['username']
        ],
        'redirect' => '../dashboard/cases.html',
        'debug' => true
    ]);

    file_put_contents($logFile, "SUCCESS: Response: $response\n", FILE_APPEND);
    echo $response;
    exit;

} catch (Exception $e) {
    file_put_contents($logFile, "ERROR: Database query failed: " . $e->getMessage() . "\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error',
        'debug' => $e->getMessage()
    ]);
    exit;
}
