<?php
/**
 * Groq API Client v4.1 - Robust Edition
 * Features: Smart retry, JSON repair, latency monitoring, dynamic model selection
 */

class GroqClient {
    private $apiKey;
    private $apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    private $defaultModel = 'llama-3.3-70b-versatile';
    private $maxTokens = 1000;
    private $lastTokenCount = 0;
    private $lastLatency = 0;
    private $maxRetries = 2;
    private $retryDelayMs = 500;
    private $slowQueryThreshold = 5.0;
    
    public function __construct($apiKey) {
        $this->apiKey = $apiKey;
    }
    
    public function getLastTokenCount() {
        return $this->lastTokenCount;
    }
    
    public function getLastLatency() {
        return $this->lastLatency;
    }
    
    /**
     * Generate empathetic response for chat
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
        
        return $this->callGroqAPI($messages, null, 'llama-3.3-70b-versatile');
    }
    
    /**
     * Extract labels from conversation
     */
    public function extractLabels($conversationText) {
        $extractionPrompt = $this->getExtractionPrompt();
        
        $messages = [
            ['role' => 'system', 'content' => $extractionPrompt],
            ['role' => 'user', 'content' => "Ekstrak informasi dari percakapan berikut:\n\n" . $conversationText]
        ];
        
        $response = $this->callGroqAPI($messages, 1000, 'llama-3.3-70b-versatile');
        
        try {
            $cleanResponse = $this->cleanJsonResponse($response);
            $labels = json_decode($cleanResponse, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("[JSON ERROR] extractLabels: " . json_last_error_msg());
                return $this->getEmptyLabels();
            }
            
            return $labels;
        } catch (Exception $e) {
            error_log("[EXTRACTION ERROR] " . $e->getMessage());
            return $this->getEmptyLabels();
        }
    }
    
    /**
     * Extract labels for autofill with confidence scores
     */
    public function extractLabelsForAutofill($conversationText) {
        $autofillPrompt = $this->getAutofillExtractionPrompt();
        
        $messages = [
            ['role' => 'system', 'content' => $autofillPrompt],
            ['role' => 'user', 'content' => "Extract data from this conversation for form autofill:\n\n" . $conversationText]
        ];
        
        $response = $this->callGroqAPI($messages, 1500, 'llama-3.3-70b-versatile');
        
        try {
            $cleanResponse = $this->cleanJsonResponse($response);
            $data = json_decode($cleanResponse, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("[JSON ERROR] autofill: " . json_last_error_msg());
                return $this->getEmptyAutofillData();
            }
            
            if (!isset($data['extracted_data']) || !isset($data['confidence_scores'])) {
                error_log("[STRUCTURE ERROR] Invalid autofill response");
                return $this->getEmptyAutofillData();
            }
            
            error_log("[AUTOFILL] Fields: " . ($data['extraction_metadata']['total_fields_found'] ?? 'N/A'));
            return $data;
            
        } catch (Exception $e) {
            error_log("[AUTOFILL ERROR] " . $e->getMessage());
            return $this->getEmptyAutofillData();
        }
    }
    
    /**
     * Core API call with smart retry
     */
    private function callGroqAPI($messages, $maxTokens = null, $model = null) {
        if ($maxTokens === null) $maxTokens = $this->maxTokens;
        if ($model === null) $model = $this->defaultModel;
        
        $data = [
            'model' => $model,
            'messages' => $messages,
            'max_tokens' => $maxTokens,
            'temperature' => 0.7,
            'top_p' => 0.9
        ];
        
        $lastError = null;
        $attempt = 0;
        
        while ($attempt <= $this->maxRetries) {
            $attempt++;
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
                
                $this->lastLatency = microtime(true) - $startTime;
                
                error_log(sprintf("[GROQ] Model: %s | Time: %.2fs | Attempt: %d/%d",
                    $model, $this->lastLatency, $attempt, $this->maxRetries + 1));
                
                if ($this->lastLatency > $this->slowQueryThreshold) {
                    error_log(sprintf("[SLOW QUERY] API took %.2fs (threshold: %.1fs)",
                        $this->lastLatency, $this->slowQueryThreshold));
                }
                
                if ($curlError) {
                    $lastError = "cURL Error [$curlError]: $curlErrorMsg";
                    error_log("[GROQ RETRY] Attempt $attempt: $lastError");
                    if ($attempt <= $this->maxRetries) {
                        usleep($this->retryDelayMs * 1000);
                        continue;
                    }
                    throw new Exception("Groq API Error after {$attempt} attempts: $lastError");
                }
                
                if ($httpCode >= 500 && $httpCode < 600) {
                    $lastError = "HTTP $httpCode Server Error";
                    error_log("[GROQ RETRY] Attempt $attempt: $lastError");
                    if ($attempt <= $this->maxRetries) {
                        usleep($this->retryDelayMs * 1000);
                        continue;
                    }
                    throw new Exception("Groq API Error after {$attempt} attempts: $lastError");
                }
                
                if ($httpCode >= 400 && $httpCode < 500) {
                    error_log("[GROQ ERROR] HTTP $httpCode: " . substr($response, 0, 300));
                    throw new Exception("Groq API Client Error: HTTP $httpCode");
                }
                
                if ($httpCode === 200) {
                    $result = json_decode($response, true);
                    
                    if (!isset($result['choices'][0]['message']['content'])) {
                        error_log("[GROQ ERROR] Invalid response structure");
                        throw new Exception("Invalid response structure from Groq API");
                    }
                    
                    if (isset($result['usage']['total_tokens'])) {
                        $this->lastTokenCount = $result['usage']['total_tokens'];
                        error_log(sprintf("[GROQ] Tokens: %d", $this->lastTokenCount));
                    }
                    
                    return $result['choices'][0]['message']['content'];
                }
                
                throw new Exception("Unexpected HTTP response: $httpCode");
                
            } catch (Exception $e) {
                $lastError = $e->getMessage();
                if ($attempt <= $this->maxRetries && $this->isRetryableError($lastError)) {
                    error_log("[GROQ RETRY] Attempt $attempt: $lastError");
                    usleep($this->retryDelayMs * 1000);
                    continue;
                }
                throw $e;
            }
        }
        
        throw new Exception("Groq API failed after all retry attempts: $lastError");
    }
    
    private function isRetryableError($error) {
        $patterns = ['timeout', 'timed out', 'connection', 'curl', '500', '502', '503', '504', 'server error'];
        $errorLower = strtolower($error);
        foreach ($patterns as $pattern) {
            if (strpos($errorLower, $pattern) !== false) return true;
        }
        return false;
    }
    
    /**
     * Advanced JSON cleaner with regex repair
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
        
        // Fix trailing commas
        $response = preg_replace('/,\s*\]/', ']', $response);
        $response = preg_replace('/,\s*\}/', '}', $response);
        $response = preg_replace('/,\s*,/', ',', $response);
        
        $firstChar = substr($response, 0, 1);
        if ($firstChar !== '{' && $firstChar !== '[') {
            $jsonStart = strpos($response, '{');
            if ($jsonStart !== false) {
                $response = substr($response, $jsonStart);
            }
        }
        
        return $response;
    }
    
    private function getSystemPrompt($phase) {
        switch ($phase) {
            case 'curhat':
                return "Kamu adalah 'TemanKu', seorang teman yang sangat peduli dan empatik. Bicara seperti teman sebaya yang hangat dan natural.

ATURAN:
- Validasi perasaan user, buat mereka merasa didengar
- JANGAN tanya detail spesifik (siapa, kapan, di mana) - biarkan user cerita sendiri
- JANGAN menyuruh user lapor atau hubungi polisi
- Minimal emoji, variasi respons
- Respons maksimal 2 kalimat, Bahasa Indonesia natural";

            case 'collect':
                return "Kamu adalah 'TemanKu', teman yang mulai membantu user lebih lanjut.

ATURAN:
- Tanya dengan cara natural, bukan seperti interogasi
- Tanya 1 hal per respons
- Contoh: 'Kalau boleh tahu, ini kejadian kapan ya?'
- Respons natural 2 kalimat, Bahasa Indonesia conversational";

            case 'consent':
                return "Kamu adalah 'TemanKu', teman yang akan membantu user mengambil langkah selanjutnya.

TUGAS: Tawarkan untuk mencatat laporan resmi ke Tim Satgas PPKPT.
- Jelaskan identitas akan dijaga kerahasiaannya
- Tidak memaksa, tetap kasih pilihan
- Respons natural 2-3 kalimat";

            case 'report':
                return "Kamu adalah 'TemanKu', membantu melengkapi laporan.

DATA YANG DIBUTUHKAN (tanya 1-2 per giliran):
- Pelaku, Waktu, Lokasi, Detail, Kontak, Usia

Respons natural 2-3 kalimat, Bahasa Indonesia conversational";

            case 'rejected':
                return "Kamu adalah 'TemanKu', tetap supportive.
User memutuskan tidak jadi lapor. Hormati keputusan mereka, tetap tawarkan untuk mengobrol.";

            default:
                return "Kamu adalah 'TemanKu', teman yang empatik. Dengarkan dan validasi perasaan user.";
        }
    }
    
    private function getExtractionPrompt() {
        return "Ekstrak informasi dari percakapan untuk laporan PPKPT.

FORMAT JSON (tanpa penjelasan):
{
  \"pelaku_kekerasan\": \"...\",
  \"waktu_kejadian\": \"YYYY-MM-DD atau deskripsi\",
  \"lokasi_kejadian\": \"...\",
  \"tingkat_kekhawatiran\": \"sedikit|khawatir|sangat\",
  \"detail_kejadian\": \"ringkasan 1-2 kalimat\",
  \"gender_korban\": \"laki-laki|perempuan|null\",
  \"usia_korban\": \"...\",
  \"korban_sebagai\": \"...\",
  \"email_korban\": null,
  \"whatsapp_korban\": null
}

HANYA kembalikan JSON valid, tanpa trailing comma.";
    }
    
    private function getAutofillExtractionPrompt() {
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        return "Extract structured data for form autofill with confidence scores.

TODAY: $today | YESTERDAY: $yesterday

RULES:
1. Extract ONLY explicitly mentioned information
2. Provide confidence scores (0.0-1.0)
3. Normalize dates to YYYY-MM-DD
4. Return ONLY valid JSON - NO trailing commas

FIELD VALUES:
- pelaku_kekerasan: dosen|teman|senior|orang_tidak_dikenal|pacar|kerabat|lainnya
- lokasi_kejadian: rumah_tangga|tempat_kerja|sekolah_kampus|sarana_umum|daring_elektronik
- tingkat_kekhawatiran: sedikit|khawatir|sangat
- usia_korban: 12-17|18-25|26-35|36-45|46-55|56+
- gender_korban: lakilaki|perempuan

OUTPUT FORMAT:
{
  \"extracted_data\": {
    \"pelaku_kekerasan\": \"value or null\",
    \"waktu_kejadian\": \"YYYY-MM-DD or null\",
    \"lokasi_kejadian\": \"value or null\",
    \"detail_kejadian\": \"value or null\",
    \"tingkat_kekhawatiran\": \"value or null\",
    \"usia_korban\": \"range or null\",
    \"gender_korban\": \"value or null\",
    \"email_korban\": null,
    \"whatsapp_korban\": null
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

Return ONLY JSON. No explanations.";
    }
    
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