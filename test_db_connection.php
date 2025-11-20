<?php
/**
 * Test Database Connection & Troubleshooting
 */

echo "========================================\n";
echo "DATABASE CONNECTION TROUBLESHOOTING\n";
echo "========================================\n\n";

// Step 1: Check MySQL extension
echo "1. Checking PDO MySQL extension...\n";
if (extension_loaded('pdo_mysql')) {
    echo "   ✓ PDO MySQL extension is loaded\n\n";
} else {
    die("   ✗ ERROR: PDO MySQL extension NOT loaded!\n   Install: apt-get install php-mysql\n\n");
}

// Step 2: Test basic connection
echo "2. Testing MySQL connection...\n";
$host = 'localhost';
$user = 'root';
$pass = '';
$port = 3306;

try {
    // Test connection WITHOUT database name first
    $dsn = "mysql:host=$host;port=$port";
    $pdo_test = new PDO($dsn, $user, $pass);
    echo "   ✓ MySQL server connection: OK\n\n";
} catch (PDOException $e) {
    die("   ✗ ERROR: Cannot connect to MySQL server!\n   Error: " . $e->getMessage() . "\n\n");
}

// Step 3: Check if database exists
echo "3. Checking if database 'sigap_ppks' exists...\n";
try {
    $stmt = $pdo_test->query("SHOW DATABASES LIKE 'sigap_ppks'");
    $result = $stmt->fetch();

    if ($result) {
        echo "   ✓ Database 'sigap_ppks' exists\n\n";
    } else {
        echo "   ✗ Database 'sigap_ppks' NOT FOUND!\n";
        echo "   Creating database...\n";
        $pdo_test->exec("CREATE DATABASE IF NOT EXISTS sigap_ppks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "   ✓ Database created!\n\n";
    }
} catch (PDOException $e) {
    die("   ✗ ERROR: " . $e->getMessage() . "\n\n");
}

// Step 4: Connect to sigap_ppks database
echo "4. Connecting to 'sigap_ppks' database...\n";
try {
    $dsn = "mysql:host=$host;port=$port;dbname=sigap_ppks;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    echo "   ✓ Connected to 'sigap_ppks' database\n\n";
} catch (PDOException $e) {
    die("   ✗ ERROR: " . $e->getMessage() . "\n\n");
}

// Step 5: Check required tables
echo "5. Checking required tables...\n";
$required_tables = ['Admin', 'LoginAttempts'];

foreach ($required_tables as $table) {
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        $exists = $stmt->fetch();

        if ($exists) {
            echo "   ✓ Table '$table' exists\n";

            // Check table structure
            $stmt = $pdo->query("DESCRIBE $table");
            $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo "      Columns: " . implode(', ', $columns) . "\n";
        } else {
            echo "   ✗ Table '$table' NOT FOUND!\n";
        }
    } catch (PDOException $e) {
        echo "   ✗ ERROR checking table '$table': " . $e->getMessage() . "\n";
    }
}

echo "\n";

// Step 6: Check Admin table structure specifically
echo "6. Checking Admin table structure...\n";
try {
    $stmt = $pdo->query("DESCRIBE Admin");
    $columns = $stmt->fetchAll();

    $required_columns = ['id', 'username', 'email', 'password_hash', 'nama', 'failed_attempts', 'locked_until', 'last_login'];
    $existing_columns = array_column($columns, 'Field');

    foreach ($required_columns as $col) {
        if (in_array($col, $existing_columns)) {
            echo "   ✓ Column '$col' exists\n";
        } else {
            echo "   ✗ Column '$col' MISSING!\n";
        }
    }
} catch (PDOException $e) {
    echo "   ✗ ERROR: " . $e->getMessage() . "\n";
}

echo "\n";

// Step 7: Check if any admin exists
echo "7. Checking existing admin accounts...\n";
try {
    $stmt = $pdo->query("SELECT id, username, email, nama FROM Admin");
    $admins = $stmt->fetchAll();

    if (count($admins) > 0) {
        echo "   ✓ Found " . count($admins) . " admin(s):\n";
        foreach ($admins as $admin) {
            echo "      - ID: {$admin['id']}, Username: {$admin['username']}, Email: {$admin['email']}\n";
        }
    } else {
        echo "   ⚠ No admin accounts found!\n";
    }
} catch (PDOException $e) {
    echo "   ✗ ERROR: " . $e->getMessage() . "\n";
}

echo "\n";

// Step 8: Test auth_login.php database connection
echo "8. Testing auth_login.php database connection...\n";
try {
    require_once __DIR__ . '/config/database.php';
    echo "   ✓ config/database.php loaded successfully\n";
    echo "   ✓ \$pdo object is available\n";
} catch (Exception $e) {
    echo "   ✗ ERROR loading config/database.php: " . $e->getMessage() . "\n";
}

echo "\n";
echo "========================================\n";
echo "TROUBLESHOOTING COMPLETE!\n";
echo "========================================\n\n";

// Summary
echo "SUMMARY:\n";
echo "--------\n";
echo "If all steps show ✓, your database is ready.\n";
echo "If any step shows ✗, fix that issue first.\n\n";
echo "Common fixes:\n";
echo "1. Database not found: Run 'mysql -u root -p < config/database_schema_improved.sql'\n";
echo "2. Table not found: Run the schema SQL file\n";
echo "3. Column missing: Run ALTER TABLE commands or re-run schema\n";
echo "4. No admin: Run 'php setup_admin.php'\n\n";
