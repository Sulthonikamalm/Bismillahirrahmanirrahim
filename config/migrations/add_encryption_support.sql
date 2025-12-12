-- Migration: Add encryption support to Laporan table (SAFE - Can run multiple times)
-- Date: 2025-12-13
-- Description: Add columns for encrypted sensitive data

USE sigap_ppks;

-- Check and add encrypted_data column if not exists
SET @col_exists = (SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'sigap_ppks' 
    AND TABLE_NAME = 'Laporan' 
    AND COLUMN_NAME = 'encrypted_data');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Laporan ADD COLUMN encrypted_data TEXT NULL COMMENT "Encrypted sensitive fields (JSON)"',
    'SELECT "Column encrypted_data already exists" AS Status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add is_encrypted column if not exists
SET @col_exists = (SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'sigap_ppks' 
    AND TABLE_NAME = 'Laporan' 
    AND COLUMN_NAME = 'is_encrypted');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Laporan ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE COMMENT "Flag to indicate if report contains encrypted data"',
    'SELECT "Column is_encrypted already exists" AS Status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add encryption_version column if not exists
SET @col_exists = (SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'sigap_ppks' 
    AND TABLE_NAME = 'Laporan' 
    AND COLUMN_NAME = 'encryption_version');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Laporan ADD COLUMN encryption_version VARCHAR(10) DEFAULT "v1" COMMENT "Encryption algorithm version for future upgrades"',
    'SELECT "Column encryption_version already exists" AS Status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create index for faster querying of encrypted reports (if not exists)
SET @index_exists = (SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'sigap_ppks' 
    AND TABLE_NAME = 'Laporan' 
    AND INDEX_NAME = 'idx_is_encrypted');

SET @sql = IF(@index_exists = 0,
    'CREATE INDEX idx_is_encrypted ON Laporan(is_encrypted)',
    'SELECT "Index idx_is_encrypted already exists" AS Status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing reports to mark as non-encrypted
UPDATE Laporan SET is_encrypted = FALSE WHERE is_encrypted IS NULL;

-- Create audit log table for decryption access (if not exists)
CREATE TABLE IF NOT EXISTS encryption_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    laporan_id INT NOT NULL,
    admin_id INT NOT NULL,
    action VARCHAR(50) NOT NULL COMMENT 'encrypt, decrypt, view',
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT NULL,
    FOREIGN KEY (laporan_id) REFERENCES Laporan(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES Admin(id) ON DELETE CASCADE,
    INDEX idx_laporan_id (laporan_id),
    INDEX idx_admin_id (admin_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Check and add can_decrypt_reports column to Admin table if not exists
SET @col_exists = (SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'sigap_ppks' 
    AND TABLE_NAME = 'Admin' 
    AND COLUMN_NAME = 'can_decrypt_reports');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Admin ADD COLUMN can_decrypt_reports BOOLEAN DEFAULT FALSE COMMENT "Permission to decrypt sensitive report data"',
    'SELECT "Column can_decrypt_reports already exists" AS Status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Grant decryption permission to all existing admin users
UPDATE Admin SET can_decrypt_reports = TRUE WHERE can_decrypt_reports IS NULL OR can_decrypt_reports = FALSE;

-- Drop view if exists and recreate
DROP VIEW IF EXISTS Laporan_Safe;

CREATE VIEW Laporan_Safe AS
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

-- Verification Report
SELECT '=== ENCRYPTION MIGRATION VERIFICATION ===' AS Status;

SELECT 
    'Laporan Table' as Component,
    CONCAT(
        'encrypted_data: ', 
        IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Laporan' AND COLUMN_NAME = 'encrypted_data') > 0, 'YES', 'NO'),
        ' | is_encrypted: ',
        IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Laporan' AND COLUMN_NAME = 'is_encrypted') > 0, 'YES', 'NO'),
        ' | encryption_version: ',
        IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Laporan' AND COLUMN_NAME = 'encryption_version') > 0, 'YES', 'NO')
    ) as Columns_Added
UNION ALL
SELECT 
    'encryption_audit_log Table',
    IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'encryption_audit_log') > 0, 
        CONCAT('EXISTS - ', (SELECT COUNT(*) FROM encryption_audit_log), ' records'), 
        'NOT CREATED') as Status
UNION ALL
SELECT 
    'Admin Permissions',
    CONCAT(
        (SELECT COUNT(*) FROM Admin WHERE can_decrypt_reports = TRUE), 
        ' admin(s) have decrypt permission'
    ) as Status
UNION ALL
SELECT 
    'Laporan_Safe View',
    IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.VIEWS 
        WHERE TABLE_NAME = 'Laporan_Safe') > 0, 'CREATED', 'NOT CREATED') as Status;

SELECT '=== MIGRATION COMPLETED SUCCESSFULLY ===' AS Status;

COMMIT;
