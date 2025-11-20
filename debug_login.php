<?php
/**
 * Simple diagnostic script to debug login issues
 * Access: http://localhost/debug_login.php
 */

// Enable ALL error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

echo "<h1>Login Diagnostic Tool</h1>";
echo "<hr>";

// Test 1: PHP Version
echo "<h2>1. PHP Environment</h2>";
echo "PHP Version: " . PHP_VERSION . "<br>";
echo "Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "<br>";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "<br>";
echo "Current File: " . __FILE__ . "<br>";
echo "<br>";

// Test 2: PDO Extension
echo "<h2>2. PDO MySQL Extension</h2>";
if (extension_loaded('pdo_mysql')) {
    echo "✅ PDO MySQL extension is loaded<br>";
} else {
    echo "❌ PDO MySQL extension is NOT loaded<br>";
    echo "<strong>ERROR: Cannot proceed without PDO MySQL!</strong><br>";
    exit;
}
echo "<br>";

// Test 3: Database Connection
echo "<h2>3. Database Connection Test</h2>";
$db_host = 'localhost';
$db_name = 'sigap_ppks';
$db_user = 'root';
$db_pass = '';

try {
    $pdo = new PDO(
        "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",
        $db_user,
        $db_pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "✅ Database connection successful<br>";
    echo "Database: <strong>$db_name</strong><br>";
} catch (PDOException $e) {
    echo "❌ Database connection FAILED<br>";
    echo "Error: " . $e->getMessage() . "<br>";
    echo "<br><strong>Possible solutions:</strong><br>";
    echo "1. Make sure MySQL/MariaDB is running<br>";
    echo "2. Create database 'sigap_ppks' if it doesn't exist<br>";
    echo "3. Check username and password<br>";
    exit;
}
echo "<br>";

// Test 4: Check Admin table
echo "<h2>4. Admin Table Check</h2>";
try {
    $result = $pdo->query("SHOW TABLES LIKE 'Admin'");
    if ($result->rowCount() > 0) {
        echo "✅ Admin table exists<br>";

        // Count admins
        $count = $pdo->query("SELECT COUNT(*) FROM Admin")->fetchColumn();
        echo "Total admin accounts: <strong>$count</strong><br>";

        if ($count == 0) {
            echo "⚠️ <strong>WARNING: No admin accounts found!</strong><br>";
            echo "You need to run <a href='setup_admin.php'>setup_admin.php</a> first!<br>";
        } else {
            // Show admin list
            $admins = $pdo->query("SELECT id, email, username, nama FROM Admin")->fetchAll();
            echo "<br>Admin accounts:<br>";
            echo "<ul>";
            foreach ($admins as $admin) {
                echo "<li>ID: {$admin['id']}, Email: <strong>{$admin['email']}</strong>, Username: {$admin['username']}, Name: {$admin['nama']}</li>";
            }
            echo "</ul>";
        }
    } else {
        echo "❌ Admin table does NOT exist<br>";
        echo "You need to run the database schema SQL file first!<br>";
    }
} catch (PDOException $e) {
    echo "❌ Error checking Admin table: " . $e->getMessage() . "<br>";
}
echo "<br>";

// Test 5: Test Login API directly
echo "<h2>5. Test Login API</h2>";
echo "<p>Testing with email: <strong>admin@ppks.com</strong>, password: <strong>admin123</strong></p>";

// Simulate POST request to login API
$_POST['email'] = 'admin@ppks.com';
$_POST['password'] = 'admin123';
$_SERVER['REQUEST_METHOD'] = 'POST';

echo "<h3>Calling auth_login.php...</h3>";
echo "<pre>";

// Capture output
ob_start();
try {
    include __DIR__ . '/api/auth_login.php';
    $output = ob_get_clean();
    echo "Response from auth_login.php:\n";
    echo htmlspecialchars($output);

    // Try to parse as JSON
    $json = json_decode($output, true);
    if ($json) {
        echo "\n\nParsed JSON:\n";
        print_r($json);
    } else {
        echo "\n\n⚠️ Response is not valid JSON!";
        echo "\nJSON Error: " . json_last_error_msg();
    }
} catch (Exception $e) {
    ob_end_clean();
    echo "Exception occurred: " . $e->getMessage();
}

echo "</pre>";

echo "<hr>";
echo "<p><strong>Diagnostic complete.</strong></p>";
echo "<p>If you see errors above, fix them before trying to login.</p>";
