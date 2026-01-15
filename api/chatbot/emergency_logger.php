<?php
/**
 * SIGAP PPKS - Emergency Logger
 * 
 * Menangani logging khusus untuk kasus emergency (suicide ideation, active danger).
 * Data disimpan dengan retention period dan auto-delete untuk compliance.
 * 
 * RASIONAL PENYIMPANAN EMERGENCY:
 * - Legal compliance: Banyak regulasi mengharuskan logging crisis intervention
 * - Quality assurance: Review apakah bot memberikan respons tepat
 * - Follow-up possibility: Memungkinkan tim untuk reach out jika diperlukan
 * - Pattern detection: Identifikasi serial offender atau repeated crisis
 * 
 * PRIVACY BALANCE:
 * - Hanya metadata yang disimpan, bukan full transcript
 * - Auto-delete setelah retention period (default: 7 hari)
 * - Anonymization option untuk long-term analytics
 * 
 * @package SIGAP_PPKS
 * @subpackage ChatBot
 */

require_once __DIR__ . '/../../config/chatbot_config.php';
require_once __DIR__ . '/../../config/database.php';

class EmergencyLogger {
    
    /**
     * Instance database
     */
    private $pdo;
    
    /**
     * Flag untuk disable logging (testing/privacy mode)
     */
    private $loggingEnabled = true;
    
    public function __construct($pdo = null) {
        if ($pdo !== null) {
            $this->pdo = $pdo;
        } else {
            // Gunakan global $pdo dari database.php
            global $pdo;
            $this->pdo = $pdo;
        }
    }
    
    /**
     * Log emergency event
     * 
     * @param string $sessionId ID session chat
     * @param string $emergencyType Tipe emergency (suicide, active_danger, self_harm)
     * @param string $triggerMessage Pesan yang memicu deteksi (di-truncate)
     * @param string $botResponse Respons yang diberikan bot
     * @param array $metadata Data tambahan
     * @return int|false ID log atau false jika gagal
     */
    public function logEmergency($sessionId, $emergencyType, $triggerMessage, $botResponse, $metadata = []) {
        if (!$this->loggingEnabled) {
            return false;
        }
        
        try {
            // Cek apakah tabel ada, jika belum, buat
            $this->ensureTableExists();
            
            // Truncate message untuk privacy (hanya simpan awal)
            $truncatedMessage = $this->truncateForPrivacy($triggerMessage, 200);
            $truncatedResponse = $this->truncateForPrivacy($botResponse, 500);
            
            // Anonymize session ID untuk analytics
            $anonymizedSession = $this->anonymizeSessionId($sessionId);
            
            $stmt = $this->pdo->prepare("
                INSERT INTO emergency_logs (
                    session_id_hash,
                    emergency_type,
                    trigger_message_preview,
                    bot_response_preview,
                    severity_level,
                    metadata,
                    created_at,
                    expires_at
                ) VALUES (
                    :session_hash,
                    :type,
                    :trigger,
                    :response,
                    :severity,
                    :metadata,
                    NOW(),
                    DATE_ADD(NOW(), INTERVAL :retention_hours HOUR)
                )
            ");
            
            $severity = $this->calculateSeverity($emergencyType, $triggerMessage);
            
            $stmt->execute([
                ':session_hash' => $anonymizedSession,
                ':type' => $emergencyType,
                ':trigger' => $truncatedMessage,
                ':response' => $truncatedResponse,
                ':severity' => $severity,
                ':metadata' => json_encode($metadata),
                ':retention_hours' => EMERGENCY_RETENTION_HOURS
            ]);
            
            $logId = $this->pdo->lastInsertId();
            
            error_log("[EMERGENCY] Logged emergency event ID: $logId, Type: $emergencyType, Severity: $severity");
            
            return $logId;
            
        } catch (Exception $e) {
            error_log("[EMERGENCY] Failed to log emergency: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Buat tabel jika belum ada
     */
    private function ensureTableExists() {
        $sql = "
            CREATE TABLE IF NOT EXISTS emergency_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id_hash VARCHAR(64) NOT NULL,
                emergency_type ENUM('suicide', 'self_harm', 'active_danger', 'crisis', 'other') NOT NULL,
                trigger_message_preview TEXT,
                bot_response_preview TEXT,
                severity_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                metadata JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                is_followed_up BOOLEAN DEFAULT FALSE,
                followed_up_by VARCHAR(100),
                followed_up_at DATETIME,
                notes TEXT,
                INDEX idx_session (session_id_hash),
                INDEX idx_type (emergency_type),
                INDEX idx_created (created_at),
                INDEX idx_expires (expires_at),
                INDEX idx_severity (severity_level)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        $this->pdo->exec($sql);
    }
    
    /**
     * Truncate pesan untuk privacy
     */
    private function truncateForPrivacy($message, $maxLength) {
        if (strlen($message) <= $maxLength) {
            return $message;
        }
        
        return substr($message, 0, $maxLength) . '... [truncated]';
    }
    
    /**
     * Anonymize session ID dengan hash
     */
    private function anonymizeSessionId($sessionId) {
        // Gunakan salt + hash untuk anonymization
        $salt = date('Y-m'); // Salt berubah per bulan untuk rotation
        return hash('sha256', $sessionId . $salt);
    }
    
    /**
     * Hitung severity level berdasarkan emergency type dan content
     */
    private function calculateSeverity($type, $message) {
        $message = strtolower($message);
        
        // Critical indicators
        $criticalPatterns = [
            'sedang', 'sekarang', 'mau bunuh', 'mau mati sekarang',
            'sudah siap', 'sudah memutuskan', 'tidak ada harapan'
        ];
        
        foreach ($criticalPatterns as $pattern) {
            if (strpos($message, $pattern) !== false) {
                return 'critical';
            }
        }
        
        // High indicators
        if ($type === 'suicide' || $type === 'active_danger') {
            return 'high';
        }
        
        // Medium for self_harm
        if ($type === 'self_harm') {
            return 'medium';
        }
        
        return 'low';
    }
    
    /**
     * Cleanup expired logs (untuk dipanggil via CRON)
     * 
     * @return int Jumlah record yang dihapus
     */
    public function cleanupExpiredLogs() {
        try {
            $this->ensureTableExists();
            
            $stmt = $this->pdo->prepare("
                DELETE FROM emergency_logs 
                WHERE expires_at < NOW() 
                AND is_followed_up = FALSE
            ");
            
            $stmt->execute();
            $deletedCount = $stmt->rowCount();
            
            if ($deletedCount > 0) {
                error_log("[EMERGENCY] Cleaned up $deletedCount expired emergency logs");
            }
            
            return $deletedCount;
            
        } catch (Exception $e) {
            error_log("[EMERGENCY] Cleanup failed: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Dapatkan log emergency yang belum di-follow up
     * Untuk dashboard admin
     */
    public function getPendingFollowUps($limit = 50) {
        try {
            $this->ensureTableExists();
            
            $stmt = $this->pdo->prepare("
                SELECT 
                    id,
                    session_id_hash,
                    emergency_type,
                    trigger_message_preview,
                    severity_level,
                    created_at,
                    expires_at
                FROM emergency_logs
                WHERE is_followed_up = FALSE
                AND expires_at > NOW()
                ORDER BY 
                    FIELD(severity_level, 'critical', 'high', 'medium', 'low'),
                    created_at DESC
                LIMIT :limit
            ");
            
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("[EMERGENCY] Failed to get pending follow-ups: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Tandai log sebagai sudah di-follow up
     */
    public function markAsFollowedUp($logId, $followedUpBy, $notes = null) {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE emergency_logs
                SET 
                    is_followed_up = TRUE,
                    followed_up_by = :by,
                    followed_up_at = NOW(),
                    notes = :notes
                WHERE id = :id
            ");
            
            $stmt->execute([
                ':id' => $logId,
                ':by' => $followedUpBy,
                ':notes' => $notes
            ]);
            
            return $stmt->rowCount() > 0;
            
        } catch (Exception $e) {
            error_log("[EMERGENCY] Failed to mark as followed up: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Dapatkan statistik emergency untuk analytics
     * Data yang dikembalikan sudah di-anonymize
     */
    public function getAnonymizedStats($days = 30) {
        try {
            $this->ensureTableExists();
            
            $stmt = $this->pdo->prepare("
                SELECT 
                    DATE(created_at) as date,
                    emergency_type,
                    severity_level,
                    COUNT(*) as count
                FROM emergency_logs
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                GROUP BY DATE(created_at), emergency_type, severity_level
                ORDER BY date DESC
            ");
            
            $stmt->bindValue(':days', $days, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("[EMERGENCY] Failed to get stats: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Disable logging (untuk testing atau special privacy mode)
     */
    public function disableLogging() {
        $this->loggingEnabled = false;
    }
    
    /**
     * Enable logging
     */
    public function enableLogging() {
        $this->loggingEnabled = true;
    }
}
