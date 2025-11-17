

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS sigap_ppks
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sigap_ppks;

-- ========================================================
-- TABEL 1: Admin
-- Tujuan: Menyimpan data login admin & penulis blog.
-- ========================================================
CREATE TABLE IF NOT EXISTS `Admin` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- TABEL 2: ArtikelBlog
-- Tujuan: Menyimpan semua postingan blog dari admin.
-- ========================================================
CREATE TABLE IF NOT EXISTS `ArtikelBlog` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `author_id` INT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `isi_postingan` TEXT NOT NULL,
  `gambar_header_url` VARCHAR(255) NULL,
  `kategori` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`author_id`) REFERENCES `Admin`(`id`) ON DELETE SET NULL,
  INDEX idx_created_at (`created_at`),
  INDEX idx_kategori (`kategori`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- TABEL 3: ChatSession
-- Tujuan: Folder untuk setiap sesi obrolan unik.
-- ========================================================
CREATE TABLE IF NOT EXISTS `ChatSession` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id_unik` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (`session_id_unik`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- TABEL 4: ChatMessage
-- Tujuan: Menyimpan setiap baris pesan (user & bot).
-- ========================================================
CREATE TABLE IF NOT EXISTS `ChatMessage` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT NOT NULL,
  `role` ENUM('user', 'bot') NOT NULL COMMENT 'user atau bot',
  `content` TEXT NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `ChatSession`(`id`) ON DELETE CASCADE,
  INDEX idx_session_timestamp (`session_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- TABEL 5: Laporan (IMPROVED)
-- Tujuan: Tabel inti untuk semua laporan (dari form & chat).
-- PERBAIKAN:
-- - waktu_kejadian: VARCHAR → DATE
-- - status_disabilitas: BOOLEAN → VARCHAR (sesuai frontend)
-- - Menambahkan INDEX untuk kode_pelaporan & email_korban
-- ========================================================
CREATE TABLE IF NOT EXISTS `Laporan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_pelaporan` VARCHAR(50) NOT NULL UNIQUE,
  `status_laporan` VARCHAR(50) NOT NULL DEFAULT 'Process',

  -- Data dari Step 1
  `status_darurat` VARCHAR(50) NULL,

  -- Data dari Step 2
  `korban_sebagai` VARCHAR(100) NULL COMMENT 'Saya sendiri / Teman saya / Orang lain',
  `tingkat_kekhawatiran` VARCHAR(100) NULL COMMENT 'Kekerasan Fisik / Seksual / Psikologis / dll',

  -- Data dari Step 3
  `gender_korban` VARCHAR(50) NULL,

  -- Data dari Step 4
  `pelaku_kekerasan` VARCHAR(255) NULL,
  `waktu_kejadian` DATE NULL,
  `lokasi_kejadian` VARCHAR(255) NULL,
  `detail_kejadian` TEXT NULL,

  -- Data dari Step 5
  `email_korban` VARCHAR(255) NULL,
  `usia_korban` VARCHAR(50) NULL,
  `whatsapp_korban` VARCHAR(50) NULL,
  `status_disabilitas` VARCHAR(10) DEFAULT 'tidak' COMMENT 'ya atau tidak',
  `jenis_disabilitas` VARCHAR(255) DEFAULT NULL,

  -- Metadata
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `chat_session_id` INT DEFAULT NULL COMMENT 'Menghubungkan ke sesi chat jika laporan dibuat via chatbot',

  FOREIGN KEY (`chat_session_id`) REFERENCES `ChatSession`(`id`) ON DELETE SET NULL,

  -- INDEXES untuk performance query
  INDEX idx_kode_pelaporan (`kode_pelaporan`),
  INDEX idx_email_korban (`email_korban`),
  INDEX idx_status_laporan (`status_laporan`),
  INDEX idx_created_at (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- TABEL 6: Bukti
-- Tujuan: Menyimpan file (foto/video/audio) untuk laporan.
-- ========================================================
CREATE TABLE IF NOT EXISTS `Bukti` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `laporan_id` INT NOT NULL,
  `file_url` VARCHAR(255) NOT NULL COMMENT 'Path ke file di server',
  `file_type` VARCHAR(50) NOT NULL COMMENT 'image, video, audio',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`laporan_id`) REFERENCES `Laporan`(`id`) ON DELETE CASCADE,
  INDEX idx_laporan_id (`laporan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- INSERT DATA DUMMY UNTUK TESTING
-- ==========================================================
-- Menggunakan INSERT IGNORE agar tidak error jika data sudah ada
-- Script ini bisa dijalankan berkali-kali dengan aman

-- Dummy Admin
INSERT IGNORE INTO `Admin` (`username`, `email`, `password_hash`, `nama`) VALUES
('admin1', 'admin@itb.ac.id', '$2y$10$abcdefghijklmnopqrstuvwxyz12345678901234567890', 'Admin PPKS ITB'),
('penulis1', 'penulis@itb.ac.id', '$2y$10$abcdefghijklmnopqrstuvwxyz12345678901234567890', 'Penulis Blog');

-- Dummy Artikel Blog
INSERT IGNORE INTO `ArtikelBlog` (`author_id`, `judul`, `isi_postingan`, `kategori`) VALUES
(2, 'Mengenal PPKS dan Pentingnya Perlindungan', 'Artikel tentang pentingnya pencegahan kekerasan seksual...', 'Edukasi'),
(2, 'Apa yang Harus Dilakukan Jika Mengalami Kekerasan', 'Panduan langkah-langkah melapor dan mendapat bantuan...', 'Panduan');

-- Dummy Chat Session
INSERT IGNORE INTO `ChatSession` (`session_id_unik`) VALUES
('session_001_test'),
('session_002_test'),
('session_003_test');

-- Dummy Chat Message
INSERT IGNORE INTO `ChatMessage` (`session_id`, `role`, `content`) VALUES
(1, 'user', 'Halo, saya ingin melapor kekerasan'),
(1, 'bot', 'Halo, saya siap membantu Anda. Apakah ini keadaan darurat?'),
(1, 'user', 'Tidak, ini bukan darurat'),
(1, 'bot', 'Baik, mari kita lanjutkan. Siapa yang mengalami kekerasan?');

-- Dummy Laporan (PENTING UNTUK TESTING API check_progress.php!)
INSERT IGNORE INTO `Laporan` (
  `kode_pelaporan`,
  `status_laporan`,
  `status_darurat`,
  `korban_sebagai`,
  `tingkat_kekhawatiran`,
  `gender_korban`,
  `pelaku_kekerasan`,
  `waktu_kejadian`,
  `lokasi_kejadian`,
  `detail_kejadian`,
  `email_korban`,
  `usia_korban`,
  `whatsapp_korban`,
  `status_disabilitas`,
  `jenis_disabilitas`,
  `chat_session_id`
) VALUES
-- Laporan 1: Untuk testing dengan kode PPKS001
(
  'PPKS001',
  'Process',
  'tidak',
  'Saya sendiri',
  'Kekerasan Fisik',
  'perempuan',
  'Teman sekelas',
  '2024-01-15',
  'Kampus ITB, Gedung A',
  'Saya mengalami kekerasan fisik dari teman sekelas ketika sedang di lab. Saya dipukul dan diancam.',
  'korban1@example.com',
  '20-25',
  '08123456789',
  'tidak',
  NULL,
  NULL
),
-- Laporan 2: Untuk testing dengan kode PPKS002
(
  'PPKS002',
  'Completed',
  'tidak',
  'Teman saya',
  'Kekerasan Seksual',
  'perempuan',
  'Dosen',
  '2024-01-10',
  'Kampus ITB, Ruang dosen',
  'Teman saya mengalami pelecehan seksual dari dosen pembimbingnya saat bimbingan skripsi.',
  'korban2@example.com',
  '20-25',
  '08234567890',
  'tidak',
  NULL,
  NULL
),
-- Laporan 3: Untuk testing dengan kode GNJ34 (seperti di contoh sebelumnya)
(
  'GNJ34',
  'Process',
  'tidak',
  'Saya sendiri',
  'Kekerasan Psikologis',
  'laki-laki',
  'Atasan lab',
  '2024-01-20',
  'Kampus ITB, Lab Komputer',
  'Saya mengalami bullying dan tekanan psikologis dari atasan lab secara terus menerus. Saya sering dipermalukan di depan orang lain.',
  'test@example.com',
  '20-25',
  '08345678901',
  'tidak',
  NULL,
  NULL
),
-- Laporan 4: Testing dengan disabilitas
(
  'PPKS004',
  'Process',
  'tidak',
  'Orang lain',
  'Kekerasan Fisik',
  'perempuan',
  'Mahasiswa senior',
  '2024-01-25',
  'Kampus ITB, Asrama',
  'Seseorang yang saya kenal mengalami kekerasan fisik di asrama. Korban memiliki disabilitas fisik.',
  'korban4@example.com',
  '18-20',
  '08456789012',
  'ya',
  'Disabilitas Fisik',
  NULL
),
-- Laporan 5: Via chatbot (dengan chat_session_id)
(
  'PPKS005',
  'Process',
  'tidak',
  'Saya sendiri',
  'Kekerasan Verbal',
  'perempuan',
  'Teman satu kelas',
  '2024-02-01',
  'Kampus ITB, Kelas',
  'Saya sering mendapat pelecehan verbal dan komentar tidak pantas dari teman sekelas.',
  'chatbot@example.com',
  '20-25',
  '08567890123',
  'tidak',
  NULL,
  1
);

-- Dummy Bukti File
-- Catatan: laporan_id mengacu pada auto-increment ID dari tabel Laporan
-- Jika script dijalankan berkali-kali, ID mungkin berubah
-- Untuk production, gunakan subquery berdasarkan kode_pelaporan
INSERT IGNORE INTO `Bukti` (`laporan_id`, `file_url`, `file_type`) VALUES
(1, '/uploads/bukti/ppks001_foto1.jpg', 'image'),
(1, '/uploads/bukti/ppks001_foto2.jpg', 'image'),
(2, '/uploads/bukti/ppks002_screenshot.png', 'image'),
(3, '/uploads/bukti/gnj34_video1.mp4', 'video'),
(4, '/uploads/bukti/ppks004_foto.jpg', 'image');

-- ==========================================================
-- VERIFIKASI DATA
-- ==========================================================
SELECT 'Admin' AS Tabel, COUNT(*) AS JumlahData FROM Admin
UNION ALL
SELECT 'ArtikelBlog', COUNT(*) FROM ArtikelBlog
UNION ALL
SELECT 'ChatSession', COUNT(*) FROM ChatSession
UNION ALL
SELECT 'ChatMessage', COUNT(*) FROM ChatMessage
UNION ALL
SELECT 'Laporan', COUNT(*) FROM Laporan
UNION ALL
SELECT 'Bukti', COUNT(*) FROM Bukti;

-- Tampilkan data laporan untuk testing
SELECT
  kode_pelaporan,
  email_korban,
  status_laporan,
  tingkat_kekhawatiran,
  DATE_FORMAT(created_at, '%d %M %Y') as tanggal_lapor
FROM Laporan
ORDER BY created_at DESC;

-- ==========================================================
-- TESTING QUERY (Seperti yang digunakan di check_progress.php)
-- ==========================================================
-- Test 1: Cari dengan kode laporan
SELECT kode_pelaporan FROM Laporan WHERE kode_pelaporan = 'GNJ34' LIMIT 1;

-- Test 2: Cari dengan email
SELECT kode_pelaporan FROM Laporan WHERE email_korban = 'test@example.com' LIMIT 1;

-- Test 3: Cari dengan kode ATAU email
SELECT kode_pelaporan FROM Laporan
WHERE kode_pelaporan = 'PPKS001' OR email_korban = 'korban1@example.com'
LIMIT 1;

-- ==========================================================
-- SELESAI!
-- Database siap digunakan dengan 5 laporan dummy untuk testing.
-- ==========================================================
