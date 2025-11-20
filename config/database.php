<?php

/**
 * ========================================================
 * SIGAP PPKS - SECURE Database Configuration (CLEAN VERSION)
 * File: config/database.php
 * ========================================================
 * 
 * Security Features:
 * ✅ PDO with prepared statements (SQL Injection Prevention)
 * ✅ Error handling without data leakage
 * ✅ Connection timeout
 * ✅ Character set enforcement (UTF-8)
 * ✅ Strict mode enabled
 * ✅ Secure error logging
 */

// ========================================================
// DATABASE CREDENTIALS
// ========================================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'sigap_ppks');
define('DB_USER', 'root');
define('DB_PASS', ''); // CHANGE THIS IN PRODUCTION!
define('DB_CHARSET', 'utf8mb4');
define('DB_PORT', 3306);

// ========================================================
// ENVIRONMENT CONFIGURATION
// ========================================================

// Set to 'production' when deploying!
define('APP_ENV', 'development'); // 'development' or 'production'

// ========================================================
// SECURITY CONFIGURATION
// ========================================================

// Disable error display (security best practice)
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Log errors to file instead
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../api/logs/database_error.log');

// ========================================================
// PDO CONNECTION WITH SECURITY OPTIONS
// ========================================================

$dsn = sprintf(
    "mysql:host=%s;port=%d;dbname=%s;charset=%s",
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_CHARSET
);

$options = [
    // ✅ CRITICAL: Use exceptions for error handling
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,

    // ✅ CRITICAL: Fetch as associative array by default
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,

    // ✅ CRITICAL: Use real prepared statements (prevents SQL injection)
    PDO::ATTR_EMULATE_PREPARES => false,

    // ✅ CRITICAL: Force persistent connections off (security)
    PDO::ATTR_PERSISTENT => false,

    // ✅ Connection timeout (10 seconds)
    PDO::ATTR_TIMEOUT => 10,

    // ✅ Force string conversion for numeric values
    PDO::ATTR_STRINGIFY_FETCHES => false,

    // ✅ MySQL specific: Use buffered queries
    PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,

    // ✅ MySQL specific: Enable strict mode
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, sql_mode='STRICT_ALL_TABLES'"
];

// ========================================================
// ESTABLISH CONNECTION
// ========================================================

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);

    // Log successful connection (only in development)
    if (APP_ENV === 'development') {
        error_log("[INFO] Database connection established successfully");
    }

    // ✅ Additional security: Set session variables
    $pdo->exec("SET SESSION sql_mode = 'STRICT_ALL_TABLES'");
    $pdo->exec("SET SESSION time_zone = '+00:00'"); // UTC timezone

} catch (PDOException $e) {

    // ========================================================
    // SECURE ERROR HANDLING
    // ========================================================

    // Log detailed error (for debugging)
    error_log("[CRITICAL] Database connection failed: " . $e->getMessage());
    error_log("[CRITICAL] Connection details - Host: " . DB_HOST . ", DB: " . DB_NAME);

    // ❌ NEVER show database errors to end users in production!
    // Send generic error response instead

    if (PHP_SAPI === 'cli') {
        // CLI mode: Show error for debugging
        die("Database connection failed: " . $e->getMessage() . "\n");
    } else {
        // Web mode: Send secure error response
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(503); // Service Unavailable

        $errorResponse = [
            'status' => 'error',
            'message' => 'Service temporarily unavailable. Please try again later.'
        ];

        // Only show detailed error in development mode
        if (APP_ENV === 'development') {
            $errorResponse['debug'] = [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ];
        }

        echo json_encode($errorResponse);
        exit;
    }
}

// ========================================================
// HELPER FUNCTIONS FOR SECURE DATABASE OPERATIONS
// ========================================================

/**
 * Validate and sanitize table/column names
 * (Use for dynamic table names - escape special chars)
 * 
 * @param string $identifier Table or column name
 * @return string Sanitized identifier
 */
function sanitizeIdentifier($identifier)
{
    // Only allow alphanumeric and underscore
    return preg_replace('/[^a-zA-Z0-9_]/', '', $identifier);
}

// ========================================================
// CONFIGURATION VALIDATION
// ========================================================

// Verify required extensions
if (!extension_loaded('pdo_mysql')) {
    error_log("[CRITICAL] PDO MySQL extension not loaded!");
    die("Required database extension not available.\n");
}

// Verify PHP version (PDO features require PHP 5.6+)
if (version_compare(PHP_VERSION, '5.6.0', '<')) {
    error_log("[CRITICAL] PHP version too old: " . PHP_VERSION);
    die("PHP 5.6.0 or higher required.\n");
}

// ========================================================
// END OF CONFIGURATION
// ========================================================