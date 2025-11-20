<?php
/**
 * Test script untuk debugging auth_login.php
 * Akses via browser: http://localhost/test_login_api.php
 */

echo "<!DOCTYPE html><html><head><title>Login API Test</title></head><body>";
echo "<h1>Testing auth_login.php</h1>";
echo "<hr>";

// Test 1: Check if auth_login.php exists
echo "<h2>Test 1: File Existence</h2>";
$authFile = __DIR__ . '/api/auth_login.php';
if (file_exists($authFile)) {
    echo "✅ auth_login.php exists at: $authFile<br>";
} else {
    echo "❌ auth_login.php NOT FOUND at: $authFile<br>";
    exit;
}

// Test 2: Check database connection
echo "<h2>Test 2: Database Connection</h2>";
try {
    require_once __DIR__ . '/config/database.php';
    echo "✅ Database connection successful<br>";
    echo "Database: " . $pdo->query("SELECT DATABASE()")->fetchColumn() . "<br>";
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "<br>";
}

// Test 3: Check if Admin table exists
echo "<h2>Test 3: Admin Table</h2>";
try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'Admin'");
    if ($stmt->rowCount() > 0) {
        echo "✅ Admin table exists<br>";

        // Count admins
        $count = $pdo->query("SELECT COUNT(*) FROM Admin")->fetchColumn();
        echo "Total admins: $count<br>";

        // Show admin emails (masked)
        $admins = $pdo->query("SELECT id, email, username FROM Admin")->fetchAll();
        echo "<ul>";
        foreach ($admins as $admin) {
            echo "<li>ID: {$admin['id']}, Email: {$admin['email']}, Username: {$admin['username']}</li>";
        }
        echo "</ul>";
    } else {
        echo "❌ Admin table does not exist<br>";
    }
} catch (Exception $e) {
    echo "❌ Error checking Admin table: " . $e->getMessage() . "<br>";
}

// Test 4: Check LoginAttempts table
echo "<h2>Test 4: LoginAttempts Table</h2>";
try {
    $stmt = $pdo->query("SHOW TABLES LIKE 'LoginAttempts'");
    if ($stmt->rowCount() > 0) {
        echo "✅ LoginAttempts table exists<br>";
    } else {
        echo "❌ LoginAttempts table does not exist<br>";
    }
} catch (Exception $e) {
    echo "❌ Error checking LoginAttempts table: " . $e->getMessage() . "<br>";
}

// Test 5: Simulate login request
echo "<h2>Test 5: Simulate Login Request</h2>";
echo "<form method='POST' action='api/auth_login.php'>";
echo "Email: <input type='email' name='email' value='admin@ppks.com'><br><br>";
echo "Password: <input type='password' name='password' value='admin123'><br><br>";
echo "<button type='submit'>Test Login</button>";
echo "</form>";

echo "<hr>";
echo "<h2>Test 6: Direct cURL Test</h2>";
echo "<pre>";

// Use cURL to test login API
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost' . dirname($_SERVER['PHP_SELF']) . '/api/auth_login.php');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'email' => 'admin@ppks.com',
    'password' => 'admin123'
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);

$response = curl_exec($ch);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$headers = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

echo "REQUEST:\n";
echo "URL: http://localhost" . dirname($_SERVER['PHP_SELF']) . "/api/auth_login.php\n";
echo "Email: admin@ppks.com\n";
echo "Password: admin123\n\n";

echo "RESPONSE HEADERS:\n";
echo htmlspecialchars($headers) . "\n";

echo "RESPONSE BODY:\n";
echo htmlspecialchars($body) . "\n";

echo "RESPONSE BODY (formatted):\n";
$json = json_decode($body, true);
if ($json) {
    print_r($json);
} else {
    echo "⚠️ Response is not valid JSON!\n";
    echo "JSON Error: " . json_last_error_msg() . "\n";
}

curl_close($ch);

echo "</pre>";

echo "</body></html>";
