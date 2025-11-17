<?php


// 1. Definisikan konstanta untuk detail koneksi Anda
// (Ini adalah setting default XAMPP)
define('DB_HOST', 'localhost'); // Server database Anda (biasanya localhost)
define('DB_NAME', 'sigap_ppks'); // Nama database yang Anda buat di Langkah 1
define('DB_USER', 'root');      // Username default XAMPP
define('DB_PASS', 'root');          // Password default XAMPP (kosong)
define('DB_CHARSET', 'utf8mb4');  // Charset agar mendukung emoji dari chat

// 2. Siapkan DSN (Data Source Name)
$dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

// 3. Siapkan Opsi untuk PDO
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Tampilkan error sebagai exceptions (lebih mudah ditangani)
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Ambil data sebagai array asosiatif (contoh: $row['nama'])
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Gunakan prepared statements asli dari database
];

// 4. Buat objek PDO (koneksi)
try {
    // $pdo adalah variabel koneksi kita.
    // File-file API lain akan meng-include file ini untuk mendapatkan $pdo.
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    
} catch (\PDOException $e) {
    // Jika koneksi gagal, hentikan skrip dan tampilkan error.
    // (Dalam mode produksi, ini harus dicatat ke log, bukan ditampilkan ke user)
    header('Content-Type: application/json');
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'status' => 'error',
        'message' => 'Koneksi database gagal: ' . $e->getMessage()
    ]);
    exit; // Hentikan eksekusi
}

?>