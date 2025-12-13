<?php

/**
 * Konfigurasi Database SIGAP PPKPT
 * Menggunakan PDO dengan fitur keamanan (Prepared Statements, Strict Mode).
 */

// -------------------------------------------------------------------------
// 1. Kredensial & Konfigurasi Lingkungan
// -------------------------------------------------------------------------

define('DB_HOST', 'localhost');
define('DB_NAME', 'sigap_ppks');
define('DB_USER', 'root');
define('DB_PASS', ''); // Password kosong untuk XAMPP default
define('DB_PORT', 3306);
define('DB_CHARSET', 'utf8mb4');

// Ubah ke 'production' saat deploy
if (!defined('APP_ENV')) {
    define('APP_ENV', 'development');
}

// Pengaturan Error Reporting
if (APP_ENV === 'production') {
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
} else {
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
}

// Lokasi log error database
ini_set('error_log', __DIR__ . '/../api/logs/database_error.log');

// -------------------------------------------------------------------------
// 2. Validasi Ekstensi
// -------------------------------------------------------------------------

if (!extension_loaded('pdo_mysql')) {
    error_log("[CRITICAL] Ekstensi PDO MySQL tidak aktif!");
    die("Ekstensi database yang dibutuhkan tidak tersedia.");
}

// -------------------------------------------------------------------------
// 3. Inisialisasi Koneksi PDO
// -------------------------------------------------------------------------

$dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Error throw exception
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,      // Default fetch array asosiatif
    PDO::ATTR_EMULATE_PREPARES   => false,                 // Mencegah SQL Injection
    PDO::ATTR_PERSISTENT         => false,                 // Non-persistent connection
    PDO::ATTR_TIMEOUT            => 10,                    // Timeout 10 detik
    PDO::ATTR_STRINGIFY_FETCHES  => false,                 // Menjaga tipe data numerik
    PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    $pdo->exec("SET SESSION sql_mode = 'STRICT_ALL_TABLES'");
    $pdo->exec("SET SESSION time_zone = '+00:00'");

} catch (PDOException $e) {

    // Log detail error untuk developer
    error_log("[CRITICAL] Koneksi database gagal: " . $e->getMessage());

    // Respon untuk CLI
    if (PHP_SAPI === 'cli') {
        die("Koneksi database gagal: " . $e->getMessage() . "\n");
    }

    // Respon JSON Aman untuk Web (Mencegah kebocoran data sensitif di Production)
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);

    $response = [
        'status'  => 'error',
        'message' => 'Layanan sedang tidak tersedia sementara waktu.'
    ];

    // Tampilkan detail error HANYA di mode development
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

// -------------------------------------------------------------------------
// 4. Fungsi Helper
// -------------------------------------------------------------------------

/**
 * Membersihkan nama tabel/kolom (Hanya alfanumerik & underscore).
 */
function sanitizeIdentifier($identifier)
{
    return preg_replace('/[^a-zA-Z0-9_]/', '', $identifier);
}

/**
 * Get database connection (singleton pattern)
 * Returns existing connection or creates new one
 *
 * @return PDO Database connection object
 * @throws Exception If connection fails
 */
function getDBConnection()
{
    global $pdo;

    // Return existing connection if available
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    // Create new connection
    $dsn = sprintf(
        "mysql:host=%s;port=%d;dbname=%s;charset=%s",
        DB_HOST,
        DB_PORT,
        DB_NAME,
        DB_CHARSET
    );

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_PERSISTENT => false,
        PDO::ATTR_TIMEOUT => 10,
        PDO::ATTR_STRINGIFY_FETCHES => false,
        PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, sql_mode='STRICT_ALL_TABLES'"
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        error_log("[CRITICAL] getDBConnection failed: " . $e->getMessage());
        throw new Exception('Database connection failed');
    }
}
