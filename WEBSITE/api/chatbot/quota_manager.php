<?php
/**
 * SIGAP PPKS - Quota Manager
 * 
 * Mengelola penggunaan API quota dengan dual API key untuk failover.
 * Menyediakan mekanisme automatic switch ketika primary key mendekati limit.
 * 
 * ARSITEKTUR FAILOVER:
 * 1. Primary Key: Digunakan secara default
 * 2. Secondary Key: Digunakan ketika:
 *    - Primary mencapai 80% quota (warning threshold)
 *    - Primary mengalami rate limit error
 *    - Primary timeout atau service unavailable
 * 3. Local Fallback: Jika kedua key tidak tersedia
 * 
 * RASIONAL DESAIN:
 * - File-based storage untuk tracking (tidak memerlukan Redis/DB tambahan)
 * - Auto-reset quota setiap hari
 * - Graceful degradation ke local rules jika semua API down
 * 
 * @package SIGAP_PPKS
 * @subpackage ChatBot
 */

require_once __DIR__ . '/../../config/chatbot_config.php';

class QuotaManager {
    
    /**
     * Path untuk menyimpan tracking quota
     * Menggunakan file JSON untuk simplicity (bisa upgrade ke Redis nanti)
     */
    private $storagePath;
    
    /**
     * Status API key saat ini
     */
    private $currentKeyType = 'primary';
    private $quotaData = null;
    
    public function __construct() {
        $this->storagePath = __DIR__ . '/../logs/quota_tracking.json';
        $this->loadQuotaData();
    }
    
    /**
     * Muat data quota dari storage
     */
    private function loadQuotaData() {
        // Pastikan direktori ada
        $dir = dirname($this->storagePath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        // Load existing data
        if (file_exists($this->storagePath)) {
            $content = file_get_contents($this->storagePath);
            $this->quotaData = json_decode($content, true);
            
            // Reset jika hari baru
            if ($this->isNewDay()) {
                $this->resetDailyQuota();
            }
        } else {
            $this->initializeQuotaData();
        }
    }
    
    /**
     * Inisialisasi data quota baru
     */
    private function initializeQuotaData() {
        $this->quotaData = [
            'date' => date('Y-m-d'),
            'primary' => [
                'key_prefix' => $this->getKeyPrefix('primary'),
                'requests_today' => 0,
                'tokens_today' => 0,
                'errors_today' => 0,
                'last_error' => null,
                'last_success' => null,
                'is_available' => true
            ],
            'secondary' => [
                'key_prefix' => $this->getKeyPrefix('secondary'),
                'requests_today' => 0,
                'tokens_today' => 0,
                'errors_today' => 0,
                'last_error' => null,
                'last_success' => null,
                'is_available' => true
            ],
            'fallback_used' => 0
        ];
        
        $this->saveQuotaData();
    }
    
    /**
     * Simpan data quota ke storage
     */
    private function saveQuotaData() {
        file_put_contents(
            $this->storagePath, 
            json_encode($this->quotaData, JSON_PRETTY_PRINT)
        );
    }
    
    /**
     * Cek apakah hari baru (untuk reset quota harian)
     */
    private function isNewDay() {
        return $this->quotaData['date'] !== date('Y-m-d');
    }
    
    /**
     * Reset quota harian
     */
    private function resetDailyQuota() {
        $this->quotaData['date'] = date('Y-m-d');
        $this->quotaData['primary']['requests_today'] = 0;
        $this->quotaData['primary']['tokens_today'] = 0;
        $this->quotaData['primary']['errors_today'] = 0;
        $this->quotaData['primary']['is_available'] = true;
        $this->quotaData['secondary']['requests_today'] = 0;
        $this->quotaData['secondary']['tokens_today'] = 0;
        $this->quotaData['secondary']['errors_today'] = 0;
        $this->quotaData['secondary']['is_available'] = true;
        $this->quotaData['fallback_used'] = 0;
        
        error_log("[QUOTA] Daily quota reset for " . date('Y-m-d'));
        $this->saveQuotaData();
    }
    
    /**
     * Dapatkan prefix API key untuk logging (tidak expose full key)
     */
    private function getKeyPrefix($type) {
        $key = $type === 'primary' ? GROQ_API_KEY_PRIMARY : GROQ_API_KEY_SECONDARY;
        if (empty($key)) return 'NOT_SET';
        return substr($key, 0, 8) . '...';
    }
    
    /**
     * Dapatkan API key yang seharusnya digunakan
     * Dengan logic failover otomatis
     * 
     * @return array ['key' => string, 'type' => string, 'model' => string]
     */
    public function getActiveAPIKey() {
        // Cek primary key availability
        if ($this->isPrimaryAvailable()) {
            $this->currentKeyType = 'primary';
            return [
                'key' => GROQ_API_KEY_PRIMARY,
                'type' => 'primary',
                'model' => GROQ_MODEL_PRIMARY
            ];
        }
        
        // Fallback ke secondary
        if ($this->isSecondaryAvailable()) {
            $this->currentKeyType = 'secondary';
            error_log("[QUOTA] Switching to secondary API key");
            return [
                'key' => GROQ_API_KEY_SECONDARY,
                'type' => 'secondary',
                'model' => GROQ_MODEL_SECONDARY
            ];
        }
        
        // Kedua key tidak tersedia
        error_log("[QUOTA] All API keys unavailable - using local fallback");
        return [
            'key' => null,
            'type' => 'fallback',
            'model' => null
        ];
    }
    
    /**
     * Cek apakah primary key masih available
     */
    private function isPrimaryAvailable() {
        // Key tidak dikonfigurasi
        if (empty(GROQ_API_KEY_PRIMARY)) {
            return false;
        }
        
        // Key ditandai unavailable (error berturut-turut)
        if (!$this->quotaData['primary']['is_available']) {
            return false;
        }
        
        // Cek quota usage
        $usagePercent = $this->quotaData['primary']['requests_today'] / DAILY_QUOTA_LIMIT;
        
        // Jika sudah mencapai critical threshold, switch ke secondary
        if ($usagePercent >= QUOTA_CRITICAL_THRESHOLD) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Cek apakah secondary key masih available
     */
    private function isSecondaryAvailable() {
        if (empty(GROQ_API_KEY_SECONDARY)) {
            return false;
        }
        
        if (!$this->quotaData['secondary']['is_available']) {
            return false;
        }
        
        $usagePercent = $this->quotaData['secondary']['requests_today'] / DAILY_QUOTA_LIMIT;
        
        if ($usagePercent >= QUOTA_CRITICAL_THRESHOLD) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Record successful API call
     * 
     * @param string $keyType 'primary' atau 'secondary'
     * @param int $tokensUsed Jumlah token yang digunakan
     */
    public function recordSuccess($keyType, $tokensUsed = 0) {
        if (!isset($this->quotaData[$keyType])) return;
        
        $this->quotaData[$keyType]['requests_today']++;
        $this->quotaData[$keyType]['tokens_today'] += $tokensUsed;
        $this->quotaData[$keyType]['last_success'] = date('Y-m-d H:i:s');
        $this->quotaData[$keyType]['is_available'] = true;
        
        // Reset error count on success
        $this->quotaData[$keyType]['errors_today'] = max(0, $this->quotaData[$keyType]['errors_today'] - 1);
        
        $this->saveQuotaData();
        
        // Log jika mendekati warning threshold
        $usagePercent = $this->quotaData[$keyType]['requests_today'] / DAILY_QUOTA_LIMIT;
        if ($usagePercent >= QUOTA_WARNING_THRESHOLD) {
            error_log("[QUOTA] Warning: $keyType key at " . round($usagePercent * 100) . "% usage");
        }
    }
    
    /**
     * Record failed API call
     * 
     * @param string $keyType 'primary' atau 'secondary'
     * @param string $errorMessage Error message
     * @param bool $isRateLimitError Apakah error karena rate limit
     */
    public function recordError($keyType, $errorMessage, $isRateLimitError = false) {
        if (!isset($this->quotaData[$keyType])) return;
        
        $this->quotaData[$keyType]['errors_today']++;
        $this->quotaData[$keyType]['last_error'] = [
            'message' => $errorMessage,
            'timestamp' => date('Y-m-d H:i:s'),
            'is_rate_limit' => $isRateLimitError
        ];
        
        // Jika error berturut-turut 3x, tandai unavailable
        if ($this->quotaData[$keyType]['errors_today'] >= 3) {
            $this->quotaData[$keyType]['is_available'] = false;
            error_log("[QUOTA] API key $keyType marked as unavailable after 3 errors");
        }
        
        // Jika rate limit, langsung unavailable
        if ($isRateLimitError) {
            $this->quotaData[$keyType]['is_available'] = false;
            error_log("[QUOTA] API key $keyType rate limited - switching");
        }
        
        $this->saveQuotaData();
    }
    
    /**
     * Record penggunaan fallback (local rules)
     */
    public function recordFallbackUse() {
        $this->quotaData['fallback_used']++;
        $this->saveQuotaData();
    }
    
    /**
     * Dapatkan status quota saat ini
     */
    public function getQuotaStatus() {
        return [
            'date' => $this->quotaData['date'],
            'primary' => [
                'usage_percent' => round(($this->quotaData['primary']['requests_today'] / DAILY_QUOTA_LIMIT) * 100, 2),
                'requests' => $this->quotaData['primary']['requests_today'],
                'tokens' => $this->quotaData['primary']['tokens_today'],
                'available' => $this->quotaData['primary']['is_available']
            ],
            'secondary' => [
                'usage_percent' => round(($this->quotaData['secondary']['requests_today'] / DAILY_QUOTA_LIMIT) * 100, 2),
                'requests' => $this->quotaData['secondary']['requests_today'],
                'tokens' => $this->quotaData['secondary']['tokens_today'],
                'available' => $this->quotaData['secondary']['is_available']
            ],
            'fallback_used' => $this->quotaData['fallback_used'],
            'current_active' => $this->getCurrentActiveKeyType()
        ];
    }
    
    /**
     * Dapatkan tipe key yang sedang aktif
     */
    public function getCurrentActiveKeyType() {
        if ($this->isPrimaryAvailable()) return 'primary';
        if ($this->isSecondaryAvailable()) return 'secondary';
        return 'fallback';
    }
    
    /**
     * Cek apakah harus menggunakan fallback
     */
    public function shouldUseFallback() {
        return !$this->isPrimaryAvailable() && !$this->isSecondaryAvailable();
    }
    
    /**
     * Force switch ke secondary (untuk testing atau manual override)
     */
    public function forceSecondary() {
        $this->quotaData['primary']['is_available'] = false;
        $this->saveQuotaData();
    }
    
    /**
     * Reset availability semua key (untuk recovery)
     */
    public function resetAvailability() {
        $this->quotaData['primary']['is_available'] = true;
        $this->quotaData['primary']['errors_today'] = 0;
        $this->quotaData['secondary']['is_available'] = true;
        $this->quotaData['secondary']['errors_today'] = 0;
        $this->saveQuotaData();
        
        error_log("[QUOTA] All API keys availability reset");
    }
    
    /**
     * Cek apakah error message mengindikasikan rate limit
     */
    public static function isRateLimitError($errorMessage) {
        $rateLimitPatterns = [
            'rate limit',
            'rate_limit',
            'too many requests',
            '429',
            'quota exceeded',
            'limit exceeded'
        ];
        
        $errorLower = strtolower($errorMessage);
        foreach ($rateLimitPatterns as $pattern) {
            if (strpos($errorLower, $pattern) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Cek apakah error message mengindikasikan retryable error
     */
    public static function isRetryableError($errorMessage) {
        $retryablePatterns = [
            'timeout',
            'connection',
            'curl',
            '500',
            '502',
            '503',
            '504',
            'temporarily',
            'unavailable'
        ];
        
        $errorLower = strtolower($errorMessage);
        foreach ($retryablePatterns as $pattern) {
            if (strpos($errorLower, $pattern) !== false) {
                return true;
            }
        }
        
        return false;
    }
}
