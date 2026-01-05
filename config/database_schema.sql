-- ============================================================
-- SIGAP PPKS - PRODUCTION DATABASE SCHEMA (COMPLETE & FINAL)
-- Version: 2.0.0 FINAL
-- Date: January 2026
-- Description: Complete schema with encryption support, NO dummy data
-- ============================================================

-- Drop database if exists (CAUTION: Use only for fresh install!)
-- DROP DATABASE IF EXISTS sigap_ppks;

-- Create database
CREATE DATABASE IF NOT EXISTS sigap_ppks
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sigap_ppks;

-- ============================================================
-- TABLE: Admin
-- Purpose: Admin accounts & blog authors
-- Features: Login tracking, account lockout, encryption permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS `Admin` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `failed_attempts` INT DEFAULT 0 COMMENT 'Failed login counter',
  `locked_until` TIMESTAMP NULL DEFAULT NULL COMMENT 'Account unlock time',
  `last_login` TIMESTAMP NULL DEFAULT NULL COMMENT 'Last successful login',
  `can_decrypt_reports` BOOLEAN DEFAULT TRUE COMMENT 'Permission to decrypt sensitive data',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (`email`),
  INDEX idx_username (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: LoginAttempts
-- Purpose: Security audit log for all login attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS `LoginAttempts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL COMMENT 'IPv4 or IPv6',
  `attempt_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `success` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=success, 0=failed',
  `failure_reason` VARCHAR(255) NULL COMMENT 'e.g., wrong password, user not found',
  INDEX idx_email (`email`),
  INDEX idx_ip (`ip_address`),
  INDEX idx_attempt_time (`attempt_time`),
  INDEX idx_success (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: ArtikelBlog
-- Purpose: Blog posts from admin
-- ============================================================
CREATE TABLE IF NOT EXISTS `ArtikelBlog` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `author_id` INT NULL,
  `judul` VARCHAR(255) NOT NULL,
  `isi_postingan` MEDIUMTEXT NOT NULL COMMENT 'Supports longer articles',
  `gambar_header_url` VARCHAR(255) NULL,
  `kategori` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`author_id`) REFERENCES `Admin`(`id`) ON DELETE SET NULL,
  INDEX idx_created_at (`created_at`),
  INDEX idx_kategori (`kategori`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: ChatSession
-- Purpose: Chat session containers
-- ============================================================
CREATE TABLE IF NOT EXISTS `ChatSession` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id_unik` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (`session_id_unik`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: ChatMessage
-- Purpose: Individual chat messages (user & bot)
-- ============================================================
CREATE TABLE IF NOT EXISTS `ChatMessage` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT NOT NULL,
  `role` ENUM('user', 'bot') NOT NULL,
  `content` TEXT NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `ChatSession`(`id`) ON DELETE CASCADE,
  INDEX idx_session_timestamp (`session_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: Laporan (COMPLETE WITH ENCRYPTION SUPPORT)
-- Purpose: Core table for all reports (form & chatbot)
-- Features: 
--   - Encrypted sensitive data storage
--   - Multiple encryption versions support
--   - Audit trail integration
-- ============================================================
CREATE TABLE IF NOT EXISTS `Laporan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kode_pelaporan` VARCHAR(50) NOT NULL UNIQUE,
  `status_laporan` VARCHAR(50) NOT NULL DEFAULT 'Process',
  
  -- Step 1: Emergency status
  `status_darurat` VARCHAR(50) NULL,
  
  -- Step 2: Reporter info
  `korban_sebagai` VARCHAR(100) NULL COMMENT 'Myself/Friend/Other',
  `tingkat_kekhawatiran` VARCHAR(100) NULL COMMENT 'sedikit/khawatir/sangat',
  
  -- Step 3: Victim gender
  `gender_korban` VARCHAR(50) NULL,
  
  -- Step 4: Incident details (can be encrypted)
  `pelaku_kekerasan` VARCHAR(255) NULL,
  `waktu_kejadian` DATE NULL,
  `lokasi_kejadian` VARCHAR(255) NULL,
  `detail_kejadian` TEXT NULL,
  
  -- Step 5: Contact info
  `email_korban` VARCHAR(255) NULL,
  `usia_korban` VARCHAR(50) NULL,
  `whatsapp_korban` VARCHAR(50) NULL,
  `status_disabilitas` VARCHAR(10) DEFAULT 'tidak' COMMENT 'ya/tidak',
  `jenis_disabilitas` VARCHAR(255) DEFAULT NULL,
  
  -- ENCRYPTION FIELDS
  `encrypted_data` TEXT NULL COMMENT 'Encrypted sensitive fields (JSON)',
  `is_encrypted` BOOLEAN DEFAULT FALSE COMMENT 'Encryption flag',
  `encryption_version` VARCHAR(10) DEFAULT 'v1' COMMENT 'Algorithm version for future upgrades',
  
  -- Metadata
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `chat_session_id` INT DEFAULT NULL COMMENT 'Links to chatbot session if created via chat',
  
  FOREIGN KEY (`chat_session_id`) REFERENCES `ChatSession`(`id`) ON DELETE SET NULL,
  
  -- Performance indexes
  INDEX idx_kode_pelaporan (`kode_pelaporan`),
  INDEX idx_email_korban (`email_korban`),
  INDEX idx_status_laporan (`status_laporan`),
  INDEX idx_created_at (`created_at`),
  INDEX idx_is_encrypted (`is_encrypted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: Bukti
-- Purpose: Evidence files (photos/videos/audio)
-- ============================================================
CREATE TABLE IF NOT EXISTS `Bukti` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `laporan_id` INT NOT NULL,
  `file_url` VARCHAR(255) NOT NULL COMMENT 'Server file path',
  `file_type` VARCHAR(50) NOT NULL COMMENT 'image/video/audio',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`laporan_id`) REFERENCES `Laporan`(`id`) ON DELETE CASCADE,
  INDEX idx_laporan_id (`laporan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: encryption_audit_log
-- Purpose: Audit trail for encryption/decryption operations
-- Security: Track who accessed encrypted data and when
-- ============================================================
CREATE TABLE IF NOT EXISTS `encryption_audit_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `laporan_id` INT NOT NULL,
  `admin_id` INT NOT NULL,
  `action` VARCHAR(50) NOT NULL COMMENT 'encrypt/decrypt/view',
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `success` BOOLEAN DEFAULT TRUE,
  `error_message` TEXT NULL,
  FOREIGN KEY (`laporan_id`) REFERENCES `Laporan`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_id`) REFERENCES `Admin`(`id`) ON DELETE CASCADE,
  INDEX idx_laporan_id (`laporan_id`),
  INDEX idx_admin_id (`admin_id`),
  INDEX idx_timestamp (`timestamp`),
  INDEX idx_action (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VIEW: Laporan_Safe
-- Purpose: Safe view with encrypted data masked
-- Usage: For displaying reports without exposing encrypted data
-- ============================================================
CREATE OR REPLACE VIEW `Laporan_Safe` AS
SELECT 
  id,
  kode_pelaporan,
  status_laporan,
  status_darurat,
  korban_sebagai,
  tingkat_kekhawatiran,
  gender_korban,
  waktu_kejadian,
  lokasi_kejadian,
  email_korban,
  usia_korban,
  whatsapp_korban,
  status_disabilitas,
  jenis_disabilitas,
  created_at,
  updated_at,
  is_encrypted,
  encryption_version,
  chat_session_id,
  CASE 
    WHEN is_encrypted = TRUE THEN '[ENCRYPTED - Requires Decryption Key]'
    ELSE NULL
  END as encrypted_status,
  CASE
    WHEN is_encrypted = TRUE THEN NULL
    ELSE detail_kejadian
  END as safe_detail_kejadian,
  CASE
    WHEN is_encrypted = TRUE THEN NULL
    ELSE pelaku_kekerasan
  END as safe_pelaku_kekerasan
FROM Laporan;

-- ============================================================
-- INITIAL ADMIN ACCOUNT SETUP
-- ============================================================
-- Note: You MUST generate the password hash before using this
-- Run this PHP code to generate hash:
-- <?php echo password_hash('YourSecurePassword', PASSWORD_DEFAULT); ?>

-- Example admin insert (REPLACE HASH BEFORE USING!)
-- INSERT INTO `Admin` (`username`, `email`, `password_hash`, `nama`, `can_decrypt_reports`) 
-- VALUES (
--   'admin',
--   'admin@itb.ac.id',
--   '$2y$10$REPLACE_WITH_YOUR_GENERATED_HASH',
--   'System Administrator',
--   TRUE
-- );

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
SELECT '======================================' AS '';
SELECT 'DATABASE CREATION SUCCESSFUL' AS Status;
SELECT '======================================' AS '';

-- Show all tables
SELECT 
  TABLE_NAME as 'Table Name',
  TABLE_ROWS as 'Rows',
  ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as 'Size (MB)',
  ENGINE as 'Engine'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'sigap_ppks'
ORDER BY TABLE_NAME;

-- Show all indexes
SELECT '======================================' AS '';
SELECT 'INDEXES CREATED' AS Status;
SELECT '======================================' AS '';

SELECT 
  TABLE_NAME as 'Table',
  INDEX_NAME as 'Index Name',
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as 'Columns'
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'sigap_ppks'
  AND INDEX_NAME != 'PRIMARY'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;

-- Verify encryption columns exist
SELECT '======================================' AS '';
SELECT 'ENCRYPTION FEATURES VERIFICATION' AS Status;
SELECT '======================================' AS '';

SELECT 
  'Laporan.encrypted_data' as Feature,
  IF(COUNT(*) > 0, '✓ EXISTS', '✗ MISSING') as Status
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sigap_ppks' 
  AND TABLE_NAME = 'Laporan' 
  AND COLUMN_NAME = 'encrypted_data'
UNION ALL
SELECT 
  'Laporan.is_encrypted',
  IF(COUNT(*) > 0, '✓ EXISTS', '✗ MISSING')
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sigap_ppks' 
  AND TABLE_NAME = 'Laporan' 
  AND COLUMN_NAME = 'is_encrypted'
UNION ALL
SELECT 
  'encryption_audit_log table',
  IF(COUNT(*) > 0, '✓ EXISTS', '✗ MISSING')
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'sigap_ppks' 
  AND TABLE_NAME = 'encryption_audit_log'
UNION ALL
SELECT 
  'Admin.can_decrypt_reports',
  IF(COUNT(*) > 0, '✓ EXISTS', '✗ MISSING')
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sigap_ppks' 
  AND TABLE_NAME = 'Admin' 
  AND COLUMN_NAME = 'can_decrypt_reports'
UNION ALL
SELECT 
  'Laporan_Safe view',
  IF(COUNT(*) > 0, '✓ EXISTS', '✗ MISSING')
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = 'sigap_ppks' 
  AND TABLE_NAME = 'Laporan_Safe';

SELECT '======================================' AS '';
SELECT 'SETUP COMPLETE' AS Status;
SELECT '======================================' AS '';

-- Commit all changes
COMMIT;
