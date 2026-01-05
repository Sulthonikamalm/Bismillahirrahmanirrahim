<?php
/**
 * SIGAP PPKS - Layanan Enkripsi
 * Enkripsi data sensitif laporan menggunakan AES-256-GCM
 */

class EncryptionService {
    
    const CURRENT_VERSION = 'v1';
    const CIPHER_METHOD = 'aes-256-gcm';
    const TAG_LENGTH = 16;
    const IV_LENGTH = 12;
    
    // Field yang dienkripsi
    const SENSITIVE_FIELDS = [
        'pelaku_kekerasan',
        'detail_kejadian',
        'email_korban',
        'whatsapp_korban',
        'lokasi_kejadian'
    ];
    
    private $pdo;
    private $adminId;
    private $key;
    private $enabled;
    
    public function __construct(PDO $pdo, $adminId = null) {
        $this->pdo = $pdo;
        $this->adminId = $adminId;
        $this->enabled = $this->initializeKey();
    }
    
    /**
     * Inisialisasi encryption key
     */
    private function initializeKey() {
        if (!defined('ENCRYPTION_KEY') || empty(ENCRYPTION_KEY)) {
            return false;
        }
        
        $rawKey = ENCRYPTION_KEY;
        
        if (strlen($rawKey) < 32) {
            return false;
        }
        
        $this->key = hash_hkdf('sha256', $rawKey, 32, 'sigap-ppks-encryption-v1');
        return true;
    }
    
    public function isEnabled() {
        return $this->enabled;
    }
    
    /**
     * Enkripsi data sensitif laporan
     */
    public function encryptReportData($laporanId, array $data) {
        if (!$this->enabled) {
            $this->logAudit($laporanId, 'encrypt', false, 'Enkripsi tidak dikonfigurasi');
            return false;
        }
        
        try {
            $sensitiveData = [];
            foreach (self::SENSITIVE_FIELDS as $field) {
                if (isset($data[$field]) && !empty($data[$field])) {
                    $sensitiveData[$field] = $data[$field];
                }
            }
            
            if (empty($sensitiveData)) {
                return true;
            }
            
            $encrypted = $this->encrypt(json_encode($sensitiveData, JSON_UNESCAPED_UNICODE));
            
            if ($encrypted === false) {
                $this->logAudit($laporanId, 'encrypt', false, 'Enkripsi gagal');
                return false;
            }
            
            $stmt = $this->pdo->prepare("
                UPDATE Laporan SET
                    encrypted_data = :encrypted,
                    is_encrypted = TRUE,
                    encryption_version = :version,
                    pelaku_kekerasan = '[TERENKRIPSI]',
                    detail_kejadian = '[TERENKRIPSI]',
                    email_korban = '[TERENKRIPSI]',
                    whatsapp_korban = '[TERENKRIPSI]',
                    lokasi_kejadian = '[TERENKRIPSI]',
                    updated_at = NOW()
                WHERE id = :id
            ");
            
            $result = $stmt->execute([
                ':encrypted' => $encrypted,
                ':version' => self::CURRENT_VERSION,
                ':id' => $laporanId
            ]);
            
            if ($result) {
                $this->logAudit($laporanId, 'encrypt', true);
            }
            
            return $result;
            
        } catch (Exception $e) {
            error_log('[ENKRIPSI] Error: ' . $e->getMessage());
            $this->logAudit($laporanId, 'encrypt', false, $e->getMessage());
            return false;
        }
    }
    
    /**
     * Dekripsi data sensitif laporan
     */
    public function decryptReportData($laporanId) {
        if (!$this->enabled) {
            $this->logAudit($laporanId, 'decrypt', false, 'Enkripsi tidak dikonfigurasi');
            return false;
        }
        
        try {
            $stmt = $this->pdo->prepare("
                SELECT encrypted_data, is_encrypted, encryption_version
                FROM Laporan WHERE id = :id
            ");
            $stmt->execute([':id' => $laporanId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$row) {
                $this->logAudit($laporanId, 'decrypt', false, 'Laporan tidak ditemukan');
                return false;
            }
            
            if (!$row['is_encrypted'] || empty($row['encrypted_data'])) {
                return [];
            }
            
            $decrypted = $this->decrypt($row['encrypted_data']);
            
            if ($decrypted === false) {
                $this->logAudit($laporanId, 'decrypt', false, 'Dekripsi gagal');
                return false;
            }
            
            $data = json_decode($decrypted, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->logAudit($laporanId, 'decrypt', false, 'JSON tidak valid');
                return false;
            }
            
            $this->logAudit($laporanId, 'decrypt', true);
            return $data;
            
        } catch (Exception $e) {
            error_log('[ENKRIPSI] Error: ' . $e->getMessage());
            $this->logAudit($laporanId, 'decrypt', false, $e->getMessage());
            return false;
        }
    }
    
    /**
     * Ambil laporan lengkap dengan dekripsi
     */
    public function getDecryptedReport($laporanId) {
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM Laporan WHERE id = :id");
            $stmt->execute([':id' => $laporanId]);
            $report = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$report) {
                return false;
            }
            
            if ($report['is_encrypted']) {
                $decrypted = $this->decryptReportData($laporanId);
                
                if ($decrypted !== false) {
                    foreach ($decrypted as $field => $value) {
                        $report[$field] = $value;
                    }
                }
            }
            
            return $report;
            
        } catch (Exception $e) {
            error_log('[ENKRIPSI] Error: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Enkripsi menggunakan AES-256-GCM
     */
    private function encrypt($plaintext) {
        try {
            $iv = random_bytes(self::IV_LENGTH);
            $tag = '';
            
            $ciphertext = openssl_encrypt(
                $plaintext,
                self::CIPHER_METHOD,
                $this->key,
                OPENSSL_RAW_DATA,
                $iv,
                $tag,
                '',
                self::TAG_LENGTH
            );
            
            if ($ciphertext === false) {
                return false;
            }
            
            return base64_encode($iv . $tag . $ciphertext);
            
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Dekripsi menggunakan AES-256-GCM
     */
    private function decrypt($encryptedData) {
        try {
            $combined = base64_decode($encryptedData, true);
            
            if ($combined === false || strlen($combined) < self::IV_LENGTH + self::TAG_LENGTH + 1) {
                return false;
            }
            
            $iv = substr($combined, 0, self::IV_LENGTH);
            $tag = substr($combined, self::IV_LENGTH, self::TAG_LENGTH);
            $ciphertext = substr($combined, self::IV_LENGTH + self::TAG_LENGTH);
            
            $plaintext = openssl_decrypt(
                $ciphertext,
                self::CIPHER_METHOD,
                $this->key,
                OPENSSL_RAW_DATA,
                $iv,
                $tag
            );
            
            return $plaintext;
            
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Log operasi enkripsi/dekripsi ke audit table
     */
    private function logAudit($laporanId, $action, $success, $errorMessage = null) {
        if ($this->adminId === null) {
            return;
        }
        
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO encryption_audit_log 
                (laporan_id, admin_id, action, ip_address, user_agent, success, error_message)
                VALUES (:laporan_id, :admin_id, :action, :ip, :ua, :success, :error)
            ");
            
            $stmt->execute([
                ':laporan_id' => $laporanId,
                ':admin_id' => $this->adminId,
                ':action' => $action,
                ':ip' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
                ':ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                ':success' => $success ? 1 : 0,
                ':error' => $errorMessage
            ]);
            
        } catch (Exception $e) {
            error_log('[ENKRIPSI] Audit log gagal: ' . $e->getMessage());
        }
    }
    
    /**
     * Cek apakah admin punya izin dekripsi
     */
    public function canAdminDecrypt($adminId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT can_decrypt_reports FROM Admin WHERE id = :id
            ");
            $stmt->execute([':id' => $adminId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $row && $row['can_decrypt_reports'];
            
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Enkripsi semua laporan yang belum terenkripsi
     */
    public function encryptAllReports() {
        if (!$this->enabled) {
            return ['success' => false, 'error' => 'Enkripsi tidak dikonfigurasi'];
        }
        
        $results = [
            'total' => 0,
            'encrypted' => 0,
            'skipped' => 0,
            'failed' => 0
        ];
        
        try {
            $stmt = $this->pdo->query("
                SELECT id, pelaku_kekerasan, detail_kejadian, email_korban, 
                       whatsapp_korban, lokasi_kejadian
                FROM Laporan
                WHERE is_encrypted = FALSE OR is_encrypted IS NULL
            ");
            
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $results['total']++;
                $laporanId = $row['id'];
                unset($row['id']);
                
                $hasData = false;
                foreach (self::SENSITIVE_FIELDS as $field) {
                    if (!empty($row[$field]) && $row[$field] !== '[TERENKRIPSI]') {
                        $hasData = true;
                        break;
                    }
                }
                
                if (!$hasData) {
                    $results['skipped']++;
                    continue;
                }
                
                if ($this->encryptReportData($laporanId, $row)) {
                    $results['encrypted']++;
                } else {
                    $results['failed']++;
                }
            }
            
        } catch (Exception $e) {
            error_log('[ENKRIPSI] Error migrasi: ' . $e->getMessage());
        }
        
        return $results;
    }
}
