<?php
/**
 * ========================================================
 * SIGAP PPKS - Admin Account Setup Script
 * ========================================================
 *
 * Script ini untuk membuat akun admin pertama kali.
 * Jalankan SEKALI SAJA, lalu HAPUS file ini untuk keamanan!
 *
 * Cara pakai:
 * 1. Buka di browser: http://localhost/setup_admin.php
 * 2. Atau jalankan: php setup_admin.php
 * 3. Setelah selesai, HAPUS file ini!
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// ========================================================
// KONFIGURASI ADMIN
// ========================================================

// GANTI SESUAI KEBUTUHAN!
$ADMIN_CONFIG = [
    'username' => 'admin',
    'email' => 'admin@ppks.com',
    'password' => 'admin123',  // GANTI dengan password yang aman!
    'nama' => 'Administrator PPKS'
];

// ========================================================
// DATABASE CONNECTION
// ========================================================

try {
    require_once __DIR__ . '/config/database.php';
    echo "✓ Database connection: OK\n";
} catch (Exception $e) {
    die("✗ ERROR: Tidak bisa connect ke database!\n" . $e->getMessage() . "\n");
}

// ========================================================
// CEK APAKAH SUDAH ADA ADMIN
// ========================================================

try {
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM Admin");
    $stmt->execute();
    $result = $stmt->fetch();

    if ($result['total'] > 0) {
        die("\n⚠ WARNING: Sudah ada {$result['total']} admin di database!\n" .
            "Jika ingin membuat admin baru, gunakan dashboard atau database langsung.\n" .
            "Script ini HANYA untuk setup pertama kali.\n\n");
    }

    echo "✓ Database check: Belum ada admin, aman untuk create\n";

} catch (PDOException $e) {
    die("✗ ERROR: Gagal cek database!\n" . $e->getMessage() . "\n");
}

// ========================================================
// HASH PASSWORD DENGAN BCRYPT
// ========================================================

$passwordHash = password_hash($ADMIN_CONFIG['password'], PASSWORD_BCRYPT);
echo "✓ Password hashing: OK\n";

// ========================================================
// INSERT ADMIN KE DATABASE
// ========================================================

try {
    $stmt = $pdo->prepare("
        INSERT INTO Admin (username, email, password_hash, nama, created_at)
        VALUES (:username, :email, :password_hash, :nama, NOW())
    ");

    $stmt->execute([
        ':username' => $ADMIN_CONFIG['username'],
        ':email' => $ADMIN_CONFIG['email'],
        ':password_hash' => $passwordHash,
        ':nama' => $ADMIN_CONFIG['nama']
    ]);

    $adminId = $pdo->lastInsertId();

    echo "\n";
    echo "========================================================\n";
    echo "✓ SUKSES! Admin berhasil dibuat!\n";
    echo "========================================================\n\n";
    echo "Admin ID: {$adminId}\n";
    echo "Username: {$ADMIN_CONFIG['username']}\n";
    echo "Email: {$ADMIN_CONFIG['email']}\n";
    echo "Password: {$ADMIN_CONFIG['password']}\n";
    echo "Nama: {$ADMIN_CONFIG['nama']}\n\n";
    echo "========================================================\n";
    echo "⚠ PENTING! SECURITY WARNING!\n";
    echo "========================================================\n";
    echo "1. Login sekarang dengan kredensial di atas\n";
    echo "2. GANTI PASSWORD segera setelah login\n";
    echo "3. HAPUS file setup_admin.php ini untuk keamanan!\n";
    echo "4. Jangan share kredensial ini!\n";
    echo "========================================================\n\n";

} catch (PDOException $e) {
    die("✗ ERROR: Gagal create admin!\n" . $e->getMessage() . "\n");
}

// ========================================================
// CEK APAKAH TABLE LoginAttempts ADA
// ========================================================

try {
    // Pastikan table LoginAttempts ada untuk login attempts tracking
    $pdo->query("SELECT 1 FROM LoginAttempts LIMIT 1");
    echo "✓ LoginAttempts table: OK\n";
} catch (PDOException $e) {
    echo "\n⚠ WARNING: LoginAttempts table belum ada.\n";
    echo "Jalankan database schema: config/database_schema_improved.sql\n\n";
}

echo "\n✓ Setup complete! Silakan login.\n\n";
