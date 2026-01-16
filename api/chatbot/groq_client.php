<?php
/**
 * SIGAP PPKS - Enhanced Groq Client dengan Failover
 * 
 * Client untuk berkomunikasi dengan Groq AI dengan dukungan:
 * - Dual API key failover
 * - Quota management integration
 * - Intent classification via AI (Layer 3)
 * - Context compression untuk efisiensi token
 * 
 * ARSITEKTUR:
 * - Terintegrasi dengan QuotaManager untuk auto-switch
 * - Retry logic dengan exponential backoff
 * - Graceful degradation ke local rules
 * 
 * @package SIGAP_PPKS
 * @subpackage ChatBot
 */

require_once __DIR__ . '/../../config/chatbot_config.php';
require_once __DIR__ . '/quota_manager.php';

class GroqClient {
    
    private $quotaManager;
    private $currentApiKey;
    private $currentModel;
    private $currentKeyType;
    
    private $apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    private $maxTokens = 1000;
    private $lastTokenCount = 0;
    private $lastLatency = 0;
    private $maxRetries = 2;
    private $retryDelayMs = 500;
    
    /**
     * Constructor dengan QuotaManager integration
     * 
     * @param string|null $apiKey API key override (untuk backward compatibility)
     */
    public function __construct($apiKey = null) {
        $this->quotaManager = new QuotaManager();
        
        if ($apiKey !== null) {
            // Legacy mode: gunakan key yang diberikan langsung
            $this->currentApiKey = $apiKey;
            $this->currentModel = GROQ_MODEL_PRIMARY;
            $this->currentKeyType = 'legacy';
        } else {
            // Mode baru: gunakan QuotaManager untuk failover
            $this->refreshActiveKey();
        }
    }
    
    /**
     * Refresh active key dari QuotaManager
     */
    private function refreshActiveKey() {
        $keyInfo = $this->quotaManager->getActiveAPIKey();
        $this->currentApiKey = $keyInfo['key'];
        $this->currentModel = $keyInfo['model'];
        $this->currentKeyType = $keyInfo['type'];
    }
    
    public function getLastTokenCount() {
        return $this->lastTokenCount;
    }
    
    public function getLastLatency() {
        return $this->lastLatency;
    }
    
    public function getCurrentKeyType() {
        return $this->currentKeyType;
    }
    
    /**
     * Generate respons empatik untuk chat
     * 
     * @param array $conversationHistory History percakapan
     * @param string $currentPhase Fase percakapan saat ini
     * @return string Respons dari AI
     */
    public function generateEmpathyResponse($conversationHistory, $currentPhase = 'curhat') {
        // Cek apakah harus fallback
        if ($this->quotaManager->shouldUseFallback()) {
            return $this->generateFallbackResponse($currentPhase);
        }
        
        $this->refreshActiveKey();
        
        $systemPrompt = $this->getSystemPrompt($currentPhase);
        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        
        // Compress history untuk efisiensi token
        $compressedHistory = $this->compressHistory($conversationHistory);
        
        foreach ($compressedHistory as $msg) {
            $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
        }
        
        return $this->callGroqAPI($messages);
    }
    
    /**
     * Compress conversation history untuk mengurangi token usage
     * Strategi: Simpan semua pesan user, ringkas respons bot yang lama
     */
    private function compressHistory($history, $maxMessages = 15) {
        if (count($history) <= $maxMessages) {
            return $history;
        }
        
        $compressed = [];
        $recentCount = 0;
        
        // Proses dari yang terbaru
        for ($i = count($history) - 1; $i >= 0 && $recentCount < $maxMessages; $i--) {
            $msg = $history[$i];
            
            // Selalu simpan pesan user
            if ($msg['role'] === 'user') {
                array_unshift($compressed, $msg);
                $recentCount++;
            } 
            // Simpan bot response hanya untuk recent messages
            elseif ($recentCount < 10) {
                array_unshift($compressed, $msg);
                $recentCount++;
            }
        }
        
        return $compressed;
    }
    
    /**
     * Fallback response ketika API tidak tersedia
     */
    private function generateFallbackResponse($phase) {
        $this->quotaManager->recordFallbackUse();
        
        $fallbackResponses = [
            'curhat' => "Hmm, terus gimana? Ceritain aja, aku dengerin kok 💙",
            'collect' => "Terus apa yang terjadi selanjutnya?",
            'consent' => "Makasih udah mau cerita ya. Kalau kamu mau, aku bisa bantu bikin laporan ke Satgas. Identitas kamu dijaga kok. Mau?",
            'report' => "Oke, biar aku catat. Kamu bisa dihubungi di WA atau email apa?",
            'rejected' => "Gapapa kok, keputusan ada di kamu. Kalau butuh teman ngobrol, aku tetap di sini ya 💪",
            'emergency' => "Hey, aku khawatir sama kamu. Tolong hubungi Satgas PPKPT sekarang di 082188467793 ya 🆘"
        ];
        
        return $fallbackResponses[$phase] ?? $fallbackResponses['curhat'];
    }
    
    /**
     * Klasifikasi intent menggunakan AI (Layer 3)
     * Hanya dipanggil ketika Layer 1 & 2 tidak yakin
     * 
     * @param string $message Pesan user
     * @param array $context Konteks percakapan
     * @return array Hasil klasifikasi
     */
    public function classifyIntent($message, $context = []) {
        // Jika harus fallback, return uncertain
        if ($this->quotaManager->shouldUseFallback()) {
            return [
                'classification' => 'uncertain',
                'confidence' => 0,
                'source' => 'fallback'
            ];
        }
        
        $this->refreshActiveKey();
        
        $prompt = $this->getIntentClassificationPrompt();
        
        $contextSummary = '';
        if (!empty($context)) {
            $contextSummary = "Konteks sebelumnya: " . implode(' | ', array_slice($context, -3));
        }
        
        $messages = [
            ['role' => 'system', 'content' => $prompt],
            ['role' => 'user', 'content' => "Pesan: \"$message\"\n$contextSummary"]
        ];
        
        try {
            $response = $this->callGroqAPI($messages, 200);
            $result = $this->parseIntentResponse($response);
            $result['source'] = 'ai';
            return $result;
        } catch (Exception $e) {
            error_log("[GROQ] Intent classification failed: " . $e->getMessage());
            return [
                'classification' => 'uncertain',
                'confidence' => 0,
                'source' => 'error'
            ];
        }
    }
    
    /**
     * Parse response klasifikasi intent dari AI
     */
    private function parseIntentResponse($response) {
        $response = strtolower(trim($response));
        
        // Cari pola classification
        $classifications = ['faq', 'casual', 'curhat', 'potential_report', 'strong_report'];
        
        foreach ($classifications as $class) {
            if (strpos($response, $class) !== false) {
                // Cari confidence score jika ada
                $confidence = 0.7; // Default
                if (preg_match('/confidence[:\s]+(\d+(?:\.\d+)?)/i', $response, $matches)) {
                    $confidence = floatval($matches[1]);
                    if ($confidence > 1) $confidence /= 100; // Normalize 0-1
                }
                
                return [
                    'classification' => $class,
                    'confidence' => $confidence
                ];
            }
        }
        
        return [
            'classification' => 'uncertain',
            'confidence' => 0.5
        ];
    }
    
    /**
     * Ekstrak label dari percakapan untuk autofill
     */
    public function extractLabelsForAutofill($conversationText) {
        if ($this->quotaManager->shouldUseFallback()) {
            return $this->getEmptyAutofillData();
        }
        
        $this->refreshActiveKey();
        
        $messages = [
            ['role' => 'system', 'content' => $this->getAutofillExtractionPrompt()],
            ['role' => 'user', 'content' => "Ekstrak data dari percakapan untuk autofill:\n\n" . $conversationText]
        ];
        
        try {
            $response = $this->callGroqAPI($messages, 1500);
            $cleanResponse = $this->cleanJsonResponse($response);
            $data = json_decode($cleanResponse, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("[GROQ] JSON parse error in autofill: " . json_last_error_msg());
                return $this->getEmptyAutofillData();
            }
            
            if (!isset($data['extracted_data'])) {
                return $this->getEmptyAutofillData();
            }
            
            return $data;
            
        } catch (Exception $e) {
            error_log("[GROQ] Autofill extraction error: " . $e->getMessage());
            return $this->getEmptyAutofillData();
        }
    }
    
    /**
     * Panggil Groq API dengan retry dan failover
     */
    private function callGroqAPI($messages, $maxTokens = null) {
        if ($maxTokens === null) $maxTokens = $this->maxTokens;
        
        $data = [
            'model' => $this->currentModel,
            'messages' => $messages,
            'max_tokens' => $maxTokens,
            'temperature' => 0.7,
            'top_p' => 0.9
        ];
        
        $attempt = 0;
        $lastError = null;
        
        while ($attempt <= $this->maxRetries) {
            $attempt++;
            $startTime = microtime(true);
            
            try {
                // Cek apakah key tersedia
                if (empty($this->currentApiKey)) {
                    throw new Exception("No API key available");
                }
                
                $ch = curl_init($this->apiUrl);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => json_encode($data),
                    CURLOPT_HTTPHEADER => [
                        'Authorization: Bearer ' . $this->currentApiKey,
                        'Content-Type: application/json'
                    ],
                    CURLOPT_TIMEOUT => 30,
                    CURLOPT_CONNECTTIMEOUT => 10
                ]);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_errno($ch);
                $curlErrorMsg = curl_error($ch);
                curl_close($ch);
                
                $this->lastLatency = microtime(true) - $startTime;
                
                // Handle curl errors
                if ($curlError) {
                    $lastError = "cURL Error [$curlError]: $curlErrorMsg";
                    $this->handleAPIError($lastError, false);
                    
                    if ($attempt <= $this->maxRetries) {
                        $this->tryFailover();
                        usleep($this->retryDelayMs * 1000 * $attempt);
                        continue;
                    }
                    throw new Exception($lastError);
                }
                
                // Handle HTTP errors
                if ($httpCode === 429) {
                    // Rate limit - switch to secondary immediately
                    $lastError = "Rate limit reached";
                    $this->handleAPIError($lastError, true);
                    $this->tryFailover();
                    
                    if ($attempt <= $this->maxRetries) {
                        usleep($this->retryDelayMs * 1000 * $attempt);
                        continue;
                    }
                    throw new Exception($lastError);
                }
                
                if ($httpCode >= 500) {
                    $lastError = "HTTP $httpCode Server Error";
                    $this->handleAPIError($lastError, false);
                    
                    if ($attempt <= $this->maxRetries) {
                        $this->tryFailover();
                        usleep($this->retryDelayMs * 1000 * $attempt);
                        continue;
                    }
                    throw new Exception($lastError);
                }
                
                if ($httpCode >= 400) {
                    throw new Exception("HTTP Client Error: $httpCode");
                }
                
                // Success
                if ($httpCode === 200) {
                    $result = json_decode($response, true);
                    
                    if (!isset($result['choices'][0]['message']['content'])) {
                        throw new Exception("Invalid response structure");
                    }
                    
                    // Record success
                    if (isset($result['usage']['total_tokens'])) {
                        $this->lastTokenCount = $result['usage']['total_tokens'];
                    }
                    
                    $this->quotaManager->recordSuccess(
                        $this->currentKeyType, 
                        $this->lastTokenCount
                    );
                    
                    return $result['choices'][0]['message']['content'];
                }
                
                throw new Exception("Unexpected HTTP code: $httpCode");
                
            } catch (Exception $e) {
                $lastError = $e->getMessage();
                
                if ($attempt <= $this->maxRetries && QuotaManager::isRetryableError($lastError)) {
                    $this->tryFailover();
                    usleep($this->retryDelayMs * 1000 * $attempt);
                    continue;
                }
                
                throw $e;
            }
        }
        
        throw new Exception("API call failed after $attempt attempts: $lastError");
    }
    
    /**
     * Handle API error dan update quota manager
     */
    private function handleAPIError($errorMessage, $isRateLimit) {
        $this->quotaManager->recordError(
            $this->currentKeyType,
            $errorMessage,
            $isRateLimit
        );
    }
    
    /**
     * Try failover ke key lain
     */
    private function tryFailover() {
        $this->refreshActiveKey();
        error_log("[GROQ] Failover to: " . $this->currentKeyType);
    }
    
    /**
     * Bersihkan response JSON dari AI
     */
    private function cleanJsonResponse($response) {
        $response = preg_replace('/^\xEF\xBB\xBF/', '', $response);
        $response = preg_replace('/[\x00-\x1F\x7F]/u', '', $response);
        $response = preg_replace('/```json\s*/i', '', $response);
        $response = preg_replace('/```\s*/', '', $response);
        $response = trim($response);
        
        if (preg_match('/\{[\s\S]*\}/u', $response, $matches)) {
            $response = $matches[0];
        }
        
        $response = preg_replace('/,\s*\]/', ']', $response);
        $response = preg_replace('/,\s*\}/', '}', $response);
        
        return $response;
    }
    
    /**
     * System prompt berdasarkan fase
     */
    private function getSystemPrompt($phase) {
        $base = "IDENTITAS: Kamu adalah 'TemanKu', teman curhat khusus untuk topik kekerasan seksual (PPKS).

ATURAN WAJIB:
1. Kamu adalah TEMAN yang MENDENGARKAN, BUKAN konselor yang memberi solusi
2. JANGAN langsung kasih saran atau solusi
3. FOKUS bertanya untuk menggali cerita, bukan menghakimi
4. Gunakan bahasa sehari-hari yang hangat (aku/kamu)
5. Respons SINGKAT 1-3 kalimat saja
6. Validasi perasaan user hanya SETELAH mereka cerita, JANGAN assume perasaan mereka

BATASAN TOPIK:
- Kamu HANYA membahas topik terkait kekerasan seksual, pelecehan, dan pelaporan PPKS
- TOLAK dengan sopan jika diminta hal di luar topik (coding, tugas, game, dll)
- Contoh penolakan: \"Hmm, aku khusus bantu soal curhat atau laporan PPKS aja nih. Ada yang mau kamu ceritain?\"

YANG HARUS DIHINDARI:
- JANGAN assume perasaan user (misal \"kamu terlihat murung\") - kamu tidak tahu perasaan mereka
- Jangan bilang \"Aku di sini untuk mendengarkan\" berulang-ulang
- Jangan terlalu formal seperti robot customer service
- Jangan langsung kasih solusi sebelum user selesai cerita
- Jangan pakai kalimat template yang terdengar tidak tulus

GAYA BICARA:
- Hangat seperti teman dekat, tapi tidak sok akrab
- Untuk sapaan biasa (halo, hai): cukup balas singkat \"Hai juga! Ada apa nih?\" TANPA assume apapun
- Boleh pakai emoji tapi jangan berlebihan\n\n";
        
        $phases = [
            'curhat' => "FASE SEKARANG: MENDENGARKAN

Tugasmu sekarang:
- Kalau user cuma nyapa (hai, halo): balas singkat \"Hai juga! Ada yang mau diceritain?\" TANPA assume apapun
- Kalau user mulai cerita: dengarkan dan TANYA untuk menggali, contoh:
  * \"Terus gimana?\"
  * \"Itu terjadi kapan?\"
  * \"Orangnya siapa?\"
- Validasi perasaan HANYA setelah mereka cerita perasaannya
- JANGAN kasih saran atau solusi dulu
- JANGAN tanya terlalu banyak sekaligus, satu per satu aja",
            
            'collect' => "FASE SEKARANG: MENGGALI DETAIL

User sudah mulai cerita. Sekarang:
- Tanya detail dengan natural, SATU per satu:
  * \"Orangnya siapa? Dosen? Senior?\"
  * \"Ini kejadiannya kapan ya?\"
  * \"Di mana waktu itu?\"
  * \"Dia ngapain aja?\"
- Tetap empatik, jangan seperti interogasi polisi
- Kalau user belum siap cerita detail, tidak apa-apa",
            
            'consent' => "FASE SEKARANG: TANYA KESEDIAAN LAPOR

User sudah cerita cukup banyak. Sekarang:
- Akui keberaniannya: \"Makasih udah mau cerita, itu butuh keberanian\"
- Tawarkan dengan lembut: \"Kalau kamu mau, aku bisa bantu bikin laporan resmi ke Satgas PPKPT. Identitas kamu dijaga kok.\"
- Tidak memaksa: \"Tapi kalau belum siap, gapapa juga\"
- Tunggu keputusan user",
            
            'report' => "FASE SEKARANG: BANTU BUAT LAPORAN

User setuju untuk dibantu. Sekarang:
- Minta data yang belum ada dengan natural:
  * \"Biar aku catat ya, nama dosennya siapa?\"
  * \"Ini kejadiannya kapan tepatnya?\"
  * \"Kamu bisa dihubungi di WA atau email apa?\"
- WAJIB dapat minimal 1 kontak (WA atau email)
- Tetap hangat, ini bukan formulir resmi",
            
            'rejected' => "FASE SEKARANG: USER MENOLAK LAPOR

User tidak mau lapor, dan itu tidak apa-apa:
- \"Oke, gapapa kok. Keputusan ada di kamu\"
- \"Kalau suatu saat berubah pikiran, aku tetap di sini ya\"
- Tetap supportive, jangan memaksa
- Tawarkan untuk tetap ngobrol kalau butuh"
        ];
        
        return $base . ($phases[$phase] ?? "Dengarkan dengan empati. Tanya \"terus gimana?\" untuk menggali cerita.");
    }
    
    /**
     * Prompt untuk klasifikasi intent (Layer 3)
     */
    private function getIntentClassificationPrompt() {
        return "Klasifikasikan intent pesan user ke dalam salah satu kategori:

1. faq - Pertanyaan umum tentang layanan/prosedur
2. casual - Sapaan atau obrolan ringan
3. curhat - Berbagi perasaan tanpa detail kekerasan
4. potential_report - Ada indikasi cerita kekerasan seksual
5. strong_report - Jelas ingin melaporkan kekerasan

PENTING: Jika ada kata seperti 'dilecehkan', 'diperkosa', 'disentuh paksa', atau cerita kekerasan seksual, SELALU klasifikasikan sebagai 'potential_report' atau 'strong_report'.

Contoh 'potential_report':
- 'aku takut banget kemarin dilecehkan sama dosen'
- 'aku sedih karena aku dilecehkan'
- 'ada yang ganggu aku terus'

Format respons (hanya ini):
classification: [nama_kategori]
confidence: [0.0-1.0]";
    }
    
    /**
     * Prompt untuk ekstraksi autofill
     */
    private function getAutofillExtractionPrompt() {
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        return "Ekstrak data untuk autofill form dengan confidence score.

HARI INI: $today | KEMARIN: $yesterday

PENTING: Ekstrak SEMUA nomor HP dan email!

OUTPUT FORMAT (JSON saja):
{
  \"extracted_data\": {
    \"pelaku_kekerasan\": \"value atau null\",
    \"waktu_kejadian\": \"YYYY-MM-DD atau null\",
    \"lokasi_kejadian\": \"value atau null\",
    \"detail_kejadian\": \"value atau null\",
    \"tingkat_kekhawatiran\": \"sedikit|khawatir|sangat atau null\",
    \"usia_korban\": \"range atau null\",
    \"gender_korban\": \"lakilaki|perempuan atau null\",
    \"email_korban\": \"email atau null\",
    \"whatsapp_korban\": \"nomor HP atau null\"
  },
  \"confidence_scores\": {
    \"pelaku\": 0.0, \"waktu\": 0.0, \"lokasi\": 0.0,
    \"detail\": 0.0, \"tingkat\": 0.0, \"usia\": 0.0,
    \"gender\": 0.0, \"email\": 0.0, \"whatsapp\": 0.0
  }
}";
    }
    
    private function getEmptyAutofillData() {
        return [
            'extracted_data' => [
                'pelaku_kekerasan' => null,
                'waktu_kejadian' => null,
                'lokasi_kejadian' => null,
                'detail_kejadian' => null,
                'tingkat_kekhawatiran' => null,
                'usia_korban' => null,
                'gender_korban' => null,
                'email_korban' => null,
                'whatsapp_korban' => null
            ],
            'confidence_scores' => [
                'pelaku' => 0.0, 'waktu' => 0.0, 'lokasi' => 0.0,
                'detail' => 0.0, 'tingkat' => 0.0, 'usia' => 0.0,
                'gender' => 0.0, 'email' => 0.0, 'whatsapp' => 0.0
            ]
        ];
    }
    
    /**
     * Dapatkan status quota saat ini
     */
    public function getQuotaStatus() {
        return $this->quotaManager->getQuotaStatus();
    }
}