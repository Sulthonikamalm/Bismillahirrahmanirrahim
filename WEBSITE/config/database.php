<?php
/**
 * SIGAP PPKS - Konfigurasi Database
 * Koneksi PDO dengan prepared statements
 */

// Load environment
if (!function_exists('env')) {
    require_once __DIR__ . '/env_loader.php';
}

// Kredensial database
if (!defined('DB_HOST')) {
    define('DB_HOST', env('DB_HOST', 'localhost'));
}
if (!defined('DB_NAME')) {
    define('DB_NAME', env('DB_NAME', 'sigap_ppks'));
}
if (!defined('DB_USER')) {
    define('DB_USER', env('DB_USER', 'root'));
}
if (!defined('DB_PASS')) {
    define('DB_PASS', env('DB_PASS', ''));
}
if (!defined('DB_PORT')) {
    define('DB_PORT', env('DB_PORT', 3306));
}
if (!defined('DB_CHARSET')) {
    define('DB_CHARSET', env('DB_CHARSET', 'utf8mb4'));
}

if (!defined('APP_ENV')) {
    define('APP_ENV', env('APP_ENV', 'development'));
}

// Error reporting
if (APP_ENV === 'production') {
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
} else {
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
}

ini_set('error_log', __DIR__ . '/../api/logs/database_error.log');

// Validasi ekstensi
if (!extension_loaded('pdo_mysql')) {
    error_log("[CRITICAL] Ekstensi PDO MySQL tidak aktif!");
    die("Ekstensi database tidak tersedia.");
}

// Koneksi PDO
$dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    PDO::ATTR_PERSISTENT         => false,
    PDO::ATTR_TIMEOUT            => 10,
    PDO::ATTR_STRINGIFY_FETCHES  => false,
    PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    $pdo->exec("SET SESSION sql_mode = 'STRICT_ALL_TABLES'");
    $pdo->exec("SET SESSION time_zone = '+00:00'");

} catch (PDOException $e) {
    error_log("[CRITICAL] Koneksi database gagal: " . $e->getMessage());

    if (PHP_SAPI === 'cli') {
        die("Koneksi database gagal: " . $e->getMessage() . "\n");
    }

    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);

    $response = [
        'status'  => 'error',
        'message' => 'Layanan tidak tersedia.'
    ];

    if (APP_ENV === 'development') {
        $response['debug'] = [
            'error' => $e->getMessage(),
            'file'  => $e->getFile(),
            'line'  => $e->getLine()
        ];
    }

    echo json_encode($response);
    exit;
}

/**
 * Bersihkan nama identifier (tabel/kolom)
 */
function sanitizeIdentifier($identifier) {
    return preg_replace('/[^a-zA-Z0-9_]/', '', $identifier);
}

/**
 * Ambil koneksi database (singleton)
 */
function getDBConnection() {
    global $pdo;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        "mysql:host=%s;port=%d;dbname=%s;charset=%s",
        DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
    );

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_PERSISTENT => false,
        PDO::ATTR_TIMEOUT => 10,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, sql_mode='STRICT_ALL_TABLES'"
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        error_log("[CRITICAL] getDBConnection failed: " . $e->getMessage());
        throw new Exception('Koneksi database gagal');
    }
}
