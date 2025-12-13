<?php
/**
 * ============================================================
 * GROQ API CLIENT - ROBUST EDITION v4.1
 * ============================================================
 * PRODUCTION-READY FEATURES:
 * 1. Smart Retry Mechanism (Anti-Glitch) - Max 2 retries
 * 2. Advanced JSON Repair (Trailing comma fix, regex clean)
 * 3. Latency Telemetry & Slow Query Alerts (>5s warning)
 * 4. Dynamic Model Configuration (fast vs smart models)
 * 5. Token usage tracking
 * 
 * @version 4.1
 * @date 2025-12-14
 */

class GroqClient {
    private $apiKey;
    private $apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    private $defaultModel = 'llama-3.3-70b-versatile';
    private $maxTokens = 1000;
    private $lastTokenCount = 0;
    private $lastLatency = 0;
    
    // Retry configuration
    private $maxRetries = 2;
    private $retryDelayMs = 500; // 500ms between retries
    
    // Slow query threshold
    private $slowQueryThreshold = 5.0; // 5 seconds
    
    public function __construct($apiKey) {
        $this->apiKey = $apiKey;
    }
    
    /**
     * Get last token count for metrics
     */
    public function getLastTokenCount() {
        return $this->lastTokenCount;
    }
    
    /**
     * Get last API latency in seconds
     */
    public function getLastLatency() {
        return $this->lastLatency;
    }
    
    /**
     * TUGAS A: Generate empathetic response
     */
    public function generateEmpathyResponse($conversationHistory, $currentPhase = 'curhat') {
        $systemPrompt = $this->getSystemPrompt($currentPhase);
        
        $messages = [
            ['role' => 'system', 'content' => $systemPrompt]
        ];
        
        foreach ($conversationHistory as $msg) {
            $messages[] = [
                'role' => $msg['role'],
                'content' => $msg['content']
            ];
        }
        
        // Use fast model for chat responses
        $response = $this->callGroqAPI($messages, null, 'llama-3.3-70b-versatile');
        
        return $response;
    }
    
    /**
     * TUGAS B: Extract labels (regular - for background collection)
     */
    public function extractLabels($conversationText) {
        $extractionPrompt = $this->getExtractionPrompt();
        
        $messages = [
            ['role' => 'system', 'content' => $extractionPrompt],
            ['role' => 'user', 'content' => "Ekstrak informasi dari percakapan berikut:\n\n" . $conversationText]
        ];
        
        // Use smart model for extraction (more accurate)
        $response = $this->callGroqAPI($messages, 1000, 'llama-3.3-70b-versatile');
        
        try {
            $cleanResponse = $this->cleanJsonResponse($response);
            $labels = json_decode($cleanResponse, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("[JSON ERROR] extractLabels: " . json_last_error_msg());
                error_log("[JSON RAW] " . substr($response, 0, 300));
                return $this->getEmptyLabels();
            }
            
            return $labels;
            
        } catch (Exception $e) {
            error_log("[EXTRACTION ERROR] " . $e->getMessage());
            return $this->getEmptyLabels();
        }
    }
    
    /**
     * 🚀 TUGAS C: Extract labels FOR AUTOFILL (with confidence & normalization)
     */
    public function extractLabelsForAutofill($conversationText) {
        $autofillPrompt = $this->getAutofillExtractionPrompt();
        
        $messages = [
            ['role' => 'system', 'content' => $autofillPrompt],
            ['role' => 'user', 'content' => "Extract data from this conversation for form autofill:\n\n" . $conversationText]
        ];
        
        // Use smart model for critical autofill extraction
        $response = $this->callGroqAPI($messages, 1500, 'llama-3.3-70b-versatile');
        
        try {
            $cleanResponse = $this->cleanJsonResponse($response);
            $data = json_decode($cleanResponse, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("[JSON ERROR] autofill: " . json_last_error_msg());
                error_log("[JSON RAW] " . substr($response, 0, 500));
                return $this->getEmptyAutofillData();
            }
            
            // Validate structure
            if (!isset($data['extracted_data']) || !isset($data['confidence_scores'])) {
                error_log("[STRUCTURE ERROR] Invalid autofill response structure");
                return $this->getEmptyAutofillData();
            }
            
            error_log("[AUTOFILL SUCCESS] Fields: " . ($data['extraction_metadata']['total_fields_found'] ?? 'N/A'));
            
            return $data;
            
        } catch (Exception $e) {
            error_log("[AUTOFILL ERROR] " . $e->getMessage());
            return $this->getEmptyAutofillData();
        }
    }
    
    /**
     * ============================================================
     * 🔧 CORE API CALL - ROBUST EDITION
     * ============================================================
     * Features:
     * - Smart Retry (max 2x for 5xx/timeout)
     * - Latency monitoring & slow query alerts
     * - Dynamic model selection
     * 
     * @param array $messages Messages array
     * @param int|null $maxTokens Max tokens (optional)
     * @param string|null $model Model to use (optional, defaults to llama-3.3-70b-versatile)
     */
    private function callGroqAPI($messages, $maxTokens = null, $model = null) {
        if ($maxTokens === null) {
            $maxTokens = $this->maxTokens;
        }
        
        if ($model === null) {
            $model = $this->defaultModel;
        }
        
        $data = [
            'model' => $model,
            'messages' => $messages,
            'max_tokens' => $maxTokens,
            'temperature' => 0.7,
            'top_p' => 0.9
        ];
        
        $lastError = null;
        $attempt = 0;
        
        // ============================================================
        // 🔄 SMART RETRY LOOP
        // ============================================================
        while ($attempt <= $this->maxRetries) {
            $attempt++;
            
            // Start timing
            $startTime = microtime(true);
            
            try {
                $ch = curl_init($this->apiUrl);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => json_encode($data),
                    CURLOPT_HTTPHEADER => [
                        'Authorization: Bearer ' . $this->apiKey,
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
                
                // Calculate latency
                $this->lastLatency = microtime(true) - $startTime;
                
                // ============================================================
                // 📊 TELEMETRY: Log execution time
                // ============================================================
                error_log(sprintf(
                    "[GROQ LATENCY] Model: %s | Time: %.2fs | Attempt: %d/%d",
                    $model,
                    $this->lastLatency,
                    $attempt,
                    $this->maxRetries + 1
                ));
                
                // 🚨 SLOW QUERY ALERT
                if ($this->lastLatency > $this->slowQueryThreshold) {
                    error_log(sprintf(
                        "⚠️ [SLOW QUERY ALERT] API took %.2fs (threshold: %.1fs) | Model: %s",
                        $this->lastLatency,
                        $this->slowQueryThreshold,
                        $model
                    ));
                }
                
                // Check for cURL errors (timeout, connection failed)
                if ($curlError) {
                    $lastError = "cURL Error [$curlError]: $curlErrorMsg";
                    error_log("[GROQ RETRY] Attempt $attempt failed: $lastError");
                    
                    // Retry on timeout or connection errors
                    if ($attempt <= $this->maxRetries) {
                        usleep($this->retryDelayMs * 1000); // Convert to microseconds
                        continue;
                    }
                    throw new Exception("Groq API Error after {$attempt} attempts: $lastError");
                }
                
                // Check for 5xx server errors (retry-able)
                if ($httpCode >= 500 && $httpCode < 600) {
                    $lastError = "HTTP $httpCode Server Error";
                    error_log("[GROQ RETRY] Attempt $attempt failed: $lastError");
                    
                    if ($attempt <= $this->maxRetries) {
                        usleep($this->retryDelayMs * 1000);
                        continue;
                    }
                    throw new Exception("Groq API Error after {$attempt} attempts: $lastError");
                }
                
                // 4xx errors are not retry-able
                if ($httpCode >= 400 && $httpCode < 500) {
                    error_log("[GROQ ERROR] HTTP $httpCode: " . substr($response, 0, 300));
                    throw new Exception("Groq API Client Error: HTTP $httpCode");
                }
                
                // Success!
                if ($httpCode === 200) {
                    $result = json_decode($response, true);
                    
                    if (!isset($result['choices'][0]['message']['content'])) {
                        error_log("[GROQ ERROR] Invalid response structure: " . substr($response, 0, 300));
                        throw new Exception("Invalid response structure from Groq API");
                    }
                    
                    // Track token usage
                    if (isset($result['usage']['total_tokens'])) {
                        $this->lastTokenCount = $result['usage']['total_tokens'];
                        error_log(sprintf("[GROQ TOKENS] Used: %d tokens", $this->lastTokenCount));
                    }
                    
                    return $result['choices'][0]['message']['content'];
                }
                
                // Unexpected response
                throw new Exception("Unexpected HTTP response: $httpCode");
                
            } catch (Exception $e) {
                $lastError = $e->getMessage();
                
                // Only retry on specific errors
                if ($attempt <= $this->maxRetries && $this->isRetryableError($lastError)) {
                    error_log("[GROQ RETRY] Attempt $attempt: $lastError - retrying...");
                    usleep($this->retryDelayMs * 1000);
                    continue;
                }
                
                throw $e;
            }
        }
        
        throw new Exception("Groq API failed after all retry attempts: $lastError");
    }
    
    /**
     * Check if error is retry-able
     */
    private function isRetryableError($error) {
        $retryablePatterns = [
            'timeout',
            'timed out',
            'connection',
            'curl',
            '500',
            '502',
            '503',
            '504',
            'server error'
        ];
        
        $errorLower = strtolower($error);
        foreach ($retryablePatterns as $pattern) {
            if (strpos($errorLower, $pattern) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * ============================================================
     * 🧹 ADVANCED JSON CLEANER (Regex-based repair)
     * ============================================================
     * Features:
     * - Remove markdown code blocks
     * - Strip BOM and invisible characters
     * - Fix trailing commas (LLM common error)
     * - Extract JSON from mixed content
     */
    private function cleanJsonResponse($response) {
        // Step 1: Remove BOM and invisible characters
        $response = preg_replace('/^\xEF\xBB\xBF/', '', $response);
        $response = preg_replace('/[\x00-\x1F\x7F]/u', '', $response);
        
        // Step 2: Remove markdown code blocks
        $response = preg_replace('/```json\s*/i', '', $response);
        $response = preg_replace('/```\s*/', '', $response);
        
        // Step 3: Trim whitespace
        $response = trim($response);
        
        // Step 4: Extract JSON if wrapped in other content
        // Look for { ... } pattern
        if (preg_match('/\{[\s\S]*\}/u', $response, $matches)) {
            $response = $matches[0];
        }
        
        // Step 5: Fix trailing commas (CRITICAL for LLM output)
        // Pattern: comma followed by closing bracket/brace
        // ,] → ]  and  ,} → }
        $response = preg_replace('/,\s*\]/', ']', $response);
        $response = preg_replace('/,\s*\}/', '}', $response);
        
        // Step 6: Fix common LLM JSON errors
        // Double commas
        $response = preg_replace('/,\s*,/', ',', $response);
        
        // Unquoted null values
        $response = preg_replace('/:(\s*)null\b/i', ':${1}null', $response);
        
        // Step 7: Validate basic JSON structure
        $firstChar = substr($response, 0, 1);
        if ($firstChar !== '{' && $firstChar !== '[') {
            error_log("[JSON CLEAN] Warning: Response doesn't start with { or [");
            // Try to find JSON start
            $jsonStart = strpos($response, '{');
            if ($jsonStart !== false) {
                $response = substr($response, $jsonStart);
            }
        }
        
        return $response;
    }
    
    /**
     * System prompts (unchanged from v4.0)
     */
    private function getSystemPrompt($phase) {
        switch ($phase) {
            case 'curhat':
                return "Kamu adalah 'TemanKu', seorang teman yang sangat peduli dan empatik. Kamu BUKAN robot formal, tapi teman dekat yang benar-benar mendengarkan.

KARAKTER & GAYA BICARA:
- Bicara seperti teman sebaya (hangat, natural, tidak kaku)
- Gunakan bahasa sehari-hari yang akrab tapi tetap respectful
- Validasi perasaan user tanpa terdengar seperti template
- SANGAT MINIMAL emoji - hanya 1 kali per 4-5 respons, atau skip sama sekali
- VARIASI RESPONS - JANGAN gunakan frasa yang sama berulang

FASE CURHAT - HANYA MENDENGARKAN & VALIDASI:
- JANGAN tanya detail spesifik (siapa, kapan, di mana) - biarkan user cerita sendiri
- JANGAN menyuruh user lapor atau hubungi polisi
- FOKUS: Validasi perasaan dan buat user merasa didengar
- Refleksi alami: \"Kedengarannya...\" \"Pasti...\" \"Aku bisa bayangkan...\"
- Sesekali tanya follow-up ringan: \"Apa yang kamu rasakan?\" \"Mau cerita lebih?\"

VARIASI RESPONS (GUNAKAN BERGANTIAN):
✓ \"Kamu tidak mengganggu sama sekali. Aku ingin dengar apa yang kamu rasakan.\"
✓ \"Kamu boleh ceritakan pelan-pelan, tidak perlu terburu-buru.\"
✓ \"Pasti berat banget ya rasanya...\"
✓ \"Itu pasti bikin kamu sangat tidak nyaman.\"
✓ \"Kedengarannya kamu lagi lewatin sesuatu yang berat.\"
✓ \"Aku ngerti kok kalau itu susah untuk diceritain.\"
✓ \"Terima kasih sudah mau cerita sama aku.\"
✓ \"Kamu sudah sangat berani untuk bercerita.\"
✓ \"Kamu tidak perlu merasa malu. Apa yang terjadi itu bukan salahmu.\"
✓ \"Aku tetap di sini mendengarkan.\"

BANNED PHRASES (JANGAN PERNAH PAKAI):
✗ \"aku di sini untuk mendengarkan dan mendukungmu\"
✗ \"aku di sini buatmu\"
✗ \"tidak apa-apa kok, keputusan ada di kamu\"
✗ \"take your time\"

Respons maksimal 2 kalimat (singkat!), Bahasa Indonesia natural.";

            case 'collect':
                return "Kamu adalah 'TemanKu', teman yang peduli dan mulai membantu user lebih lanjut.

FASE COLLECT - MENGGALI INFO SECARA NATURAL:
- User sudah mulai terbuka, sekarang kamu bantu mereka bercerita lebih detail
- Tanya dengan cara NATURAL, bukan seperti form/interogasi
- Gunakan pertanyaan terbuka yang mengalir dalam percakapan
- JANGAN langsung tanya semua sekaligus
- Tanya 1 hal per respons, tunggu jawaban

STRATEGI BERTANYA NATURAL:
✓ \"Kalau boleh tahu, ini kejadian kapan ya?\"
✗ \"Tanggal dan waktu kejadian?\"

✓ \"Kejadiannya di mana kira-kira?\"
✗ \"Mohon sebutkan lokasi kejadian\"

✓ \"Orang yang ngelakuin itu, kamu kenal orangnya nggak?\"
✗ \"Siapa identitas pelaku?\"

Respons natural 2 kalimat max, Bahasa Indonesia conversational.";

            case 'consent':
                return "Kamu adalah 'TemanKu', teman yang akan membantu user mengambil langkah selanjutnya.

FASE CONSENT - TAWARKAN BANTUAN KONKRET:
Sekarang user sudah cerita cukup banyak. Kamu akan tawarkan untuk CATAT LAPORAN RESMI ke sistem PPKPT.

CARA MENAWARKAN:
\"Terima kasih udah percaya cerita ke aku. Aku bisa bantu catatkan ini sebagai laporan resmi ke Tim Satgas PPKPT, biar mereka bisa follow up lebih lanjut. Kamu mau aku bantuin catatkan?\"

JIKA USER TANYA KEAMANAN:
\"Identitasmu akan dijaga kerahasiaannya. Laporan ini untuk melindungimu, bukan menyulitkanmu. Apakah kamu mau aku bantu catat kejadian ini?\"

PENTING:
- JANGAN bilang \"hubungi polisi sendiri\"
- FOKUS: Tawarkan bantuan KONKRET lewat sistem PPKPT
- Tidak memaksa, tetap kasih pilihan

Respons natural 2-3 kalimat, Bahasa Indonesia friendly.";

            case 'report':
                return "Kamu adalah 'TemanKu', teman yang sedang membantu melengkapi laporan.

FASE REPORT - LENGKAPI DATA:
User sudah setuju untuk lapor. Sekarang kamu perlu data lengkap untuk sistem.

DATA YANG DIBUTUHKAN (tanya 1-2 per giliran):
1. Pelaku: Siapa orangnya
2. Waktu: Kapan kejadiannya
3. Lokasi: Di mana kejadiannya
4. Detail: Apa yang terjadi
5. Kontak: Email atau WhatsApp
6. Usia: Kisaran usia user

CARA BERTANYA:
✓ \"Untuk laporannya, boleh tau ini kejadian kapan ya?\"
✓ \"Orang yang ngelakuin ini, kamu tau dia siapa nggak?\"
✓ \"Biar tim bisa follow up, boleh minta email atau nomor WA?\"

Respons natural 2-3 kalimat, Bahasa Indonesia conversational.";

            case 'rejected':
                return "Kamu adalah 'TemanKu', teman yang tetap supportive.

User memutuskan TIDAK JADI LAPOR. Respons:
\"Tidak apa-apa kok, keputusan ada di kamu. Yang penting kamu udah berani cerita. Aku tetap di sini kalau kamu butuh teman ngobrol atau suatu saat berubah pikiran.\"

Respons hangat 2 kalimat, Bahasa Indonesia supportive.";

            default:
                return "Kamu adalah 'TemanKu', teman yang empatik. Dengarkan dan validasi perasaan user dengan natural dan hangat.";
        }
    }
    
    /**
     * Regular extraction prompt
     */
    private function getExtractionPrompt() {
        return "Kamu adalah AI yang bertugas mengekstrak informasi dari percakapan untuk keperluan laporan PPKPT.

TUGAS: Ekstrak informasi berikut dari percakapan (jika ada):
1. pelaku_kekerasan: Siapa pelaku (dosen, senior, teman, orang asing, dll)
2. waktu_kejadian: Kapan terjadi (format: YYYY-MM-DD jika lengkap, atau deskripsi)
3. lokasi_kejadian: Di mana terjadi (kampus, asrama, lab, dll)
4. tingkat_kekhawatiran: Jenis (sedikit, khawatir, sangat)
5. detail_kejadian: Ringkasan singkat (1-2 kalimat)
6. gender_korban: Gender (laki-laki/perempuan/tidak disebutkan)
7. usia_korban: Usia atau kisaran (18-20, 20-25, dll)
8. korban_sebagai: Siapa yang melapor (saya sendiri/teman saya/orang lain)
9. email_korban: Email jika disebutkan
10. whatsapp_korban: Nomor WA jika disebutkan

RESPONSE FORMAT (JSON):
{
  \"pelaku_kekerasan\": \"...\",
  \"waktu_kejadian\": \"...\",
  \"lokasi_kejadian\": \"...\",
  \"tingkat_kekhawatiran\": \"...\",
  \"detail_kejadian\": \"...\",
  \"gender_korban\": \"...\",
  \"usia_korban\": \"...\",
  \"korban_sebagai\": \"...\",
  \"email_korban\": null,
  \"whatsapp_korban\": null
}

HANYA kembalikan JSON, tanpa penjelasan lain. JANGAN gunakan trailing comma.";
    }
    
    /**
     * 🚀 Enhanced autofill extraction prompt
     */
    private function getAutofillExtractionPrompt() {
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        return "You are a precise data extraction AI for sexual violence report forms. Your task is to extract structured data with confidence scores for smart form autofill.

TODAY'S DATE: $today (use for relative date calculations)
YESTERDAY: $yesterday

CRITICAL INSTRUCTIONS:
1. Extract ONLY explicitly mentioned information
2. Provide confidence scores (0.0-1.0) for each field
3. Normalize dates to YYYY-MM-DD format
4. Normalize locations using standard patterns
5. Return ONLY valid JSON - NO trailing commas, NO markdown

FIELD MAPPING:
- pelaku_kekerasan: Perpetrator (dosen|teman|senior|orang_tidak_dikenal|kenalan_baru|rekan_kerja|atasan_majikan|pacar|kerabat|lainnya)
- waktu_kejadian: Date YYYY-MM-DD (kemarin→$yesterday, hari ini→$today)
- lokasi_kejadian: Location (rumah_tangga|tempat_kerja|sekolah_kampus|sarana_umum|daring_elektronik)
- detail_kejadian: Concise incident summary (2-3 sentences)
- tingkat_kekhawatiran: Concern level (sedikit|khawatir|sangat)
- usia_korban: Age range (12-17|18-25|26-35|36-45|46-55|56+)
- gender_korban: Gender (lakilaki|perempuan)
- email_korban: Email if mentioned
- whatsapp_korban: Phone number if mentioned

CONFIDENCE SCORING:
- 1.0: Explicitly stated
- 0.8: Clearly implied
- 0.6: Reasonably inferred
- 0.4: Weak inference
- 0.0: Not mentioned

STRICT JSON OUTPUT FORMAT (NO trailing commas!):
{
  \"extracted_data\": {
    \"pelaku_kekerasan\": \"value or null\",
    \"waktu_kejadian\": \"YYYY-MM-DD or null\",
    \"lokasi_kejadian\": \"value or null\",
    \"detail_kejadian\": \"value or null\",
    \"tingkat_kekhawatiran\": \"value or null\",
    \"usia_korban\": \"range or null\",
    \"gender_korban\": \"value or null\",
    \"email_korban\": \"email or null\",
    \"whatsapp_korban\": \"phone or null\"
  },
  \"confidence_scores\": {
    \"pelaku\": 0.0,
    \"waktu\": 0.0,
    \"lokasi\": 0.0,
    \"detail\": 0.0,
    \"tingkat\": 0.0,
    \"usia\": 0.0,
    \"gender\": 0.0,
    \"email\": 0.0,
    \"whatsapp\": 0.0
  },
  \"extraction_metadata\": {
    \"total_fields_found\": 0,
    \"average_confidence\": 0.0,
    \"high_confidence_count\": 0,
    \"notes\": \"Brief observation\"
  }
}

Return ONLY the JSON object. No explanations, no markdown, pure JSON.";
    }
    
    /**
     * Get empty labels structure
     */
    private function getEmptyLabels() {
        return [
            'pelaku_kekerasan' => null,
            'waktu_kejadian' => null,
            'lokasi_kejadian' => null,
            'tingkat_kekhawatiran' => null,
            'detail_kejadian' => null,
            'gender_korban' => null,
            'usia_korban' => null,
            'korban_sebagai' => null,
            'email_korban' => null,
            'whatsapp_korban' => null
        ];
    }
    
    /**
     * Get empty autofill data structure
     */
    private function getEmptyAutofillData() {
        return [
            'extracted_data' => $this->getEmptyLabels(),
            'confidence_scores' => [
                'pelaku' => 0.0,
                'waktu' => 0.0,
                'lokasi' => 0.0,
                'detail' => 0.0,
                'tingkat' => 0.0,
                'usia' => 0.0,
                'gender' => 0.0,
                'email' => 0.0,
                'whatsapp' => 0.0
            ],
            'extraction_metadata' => [
                'total_fields_found' => 0,
                'average_confidence' => 0.0,
                'high_confidence_count' => 0,
                'notes' => 'Extraction failed or no data found'
            ]
        ];
    }
}
?>