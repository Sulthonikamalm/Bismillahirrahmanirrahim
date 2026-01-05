<?php
/**
 * SIGAP PPKS - Groq API Client
 * Client untuk berkomunikasi dengan Groq AI
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
     * Generate respons empatik untuk chat
     */
    public function generateEmpathyResponse($conversationHistory, $currentPhase = 'curhat') {
        $systemPrompt = $this->getSystemPrompt($currentPhase);
        
        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        
        foreach ($conversationHistory as $msg) {
            $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
        }
        
        return $this->callGroqAPI($messages, null, 'llama-3.3-70b-versatile');
    }
    
    /**
     * Ekstrak label dari percakapan
     */
    public function extractLabels($conversationText) {
        $messages = [
            ['role' => 'system', 'content' => $this->getExtractionPrompt()],
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
     * Ekstrak label untuk autofill dengan confidence score
     */
    public function extractLabelsForAutofill($conversationText) {
        $messages = [
            ['role' => 'system', 'content' => $this->getAutofillExtractionPrompt()],
            ['role' => 'user', 'content' => "Ekstrak data dari percakapan untuk autofill:\n\n" . $conversationText]
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
                return $this->getEmptyAutofillData();
            }
            
            return $data;
        } catch (Exception $e) {
            error_log("[AUTOFILL ERROR] " . $e->getMessage());
            return $this->getEmptyAutofillData();
        }
    }
    
    /**
     * Panggil Groq API dengan retry
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
                
                if ($curlError) {
                    $lastError = "cURL Error [$curlError]: $curlErrorMsg";
                    if ($attempt <= $this->maxRetries) {
                        usleep($this->retryDelayMs * 1000);
                        continue;
                    }
                    throw new Exception("Groq API Error: $lastError");
                }
                
                if ($httpCode >= 500) {
                    $lastError = "HTTP $httpCode Server Error";
                    if ($attempt <= $this->maxRetries) {
                        usleep($this->retryDelayMs * 1000);
                        continue;
                    }
                    throw new Exception("Groq API Error: $lastError");
                }
                
                if ($httpCode >= 400 && $httpCode < 500) {
                    throw new Exception("Groq API Client Error: HTTP $httpCode");
                }
                
                if ($httpCode === 200) {
                    $result = json_decode($response, true);
                    
                    if (!isset($result['choices'][0]['message']['content'])) {
                        throw new Exception("Invalid response structure");
                    }
                    
                    if (isset($result['usage']['total_tokens'])) {
                        $this->lastTokenCount = $result['usage']['total_tokens'];
                    }
                    
                    return $result['choices'][0]['message']['content'];
                }
                
                throw new Exception("Unexpected HTTP: $httpCode");
                
            } catch (Exception $e) {
                $lastError = $e->getMessage();
                if ($attempt <= $this->maxRetries && $this->isRetryableError($lastError)) {
                    usleep($this->retryDelayMs * 1000);
                    continue;
                }
                throw $e;
            }
        }
        
        throw new Exception("Groq API failed: $lastError");
    }
    
    private function isRetryableError($error) {
        $patterns = ['timeout', 'connection', 'curl', '500', '502', '503', '504'];
        $errorLower = strtolower($error);
        foreach ($patterns as $pattern) {
            if (strpos($errorLower, $pattern) !== false) return true;
        }
        return false;
    }
    
    /**
     * Bersihkan response JSON
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
    
    private function getSystemPrompt($phase) {
        $base = "KONTEKS: Kamu adalah 'TemanKu', chatbot resmi Satgas PPKPT.
- HARUS membantu user membuat laporan kekerasan seksual
- JANGAN TOLAK permintaan bantuan terkait kekerasan
- TERIMA informasi kontak (WA/email) untuk follow-up
- Gunakan Bahasa Indonesia natural dan empatik
- Respons SINGKAT 2-3 kalimat\n\n";
        
        switch ($phase) {
            case 'curhat':
                return $base . "FASE: MENDENGARKAN
- Dengarkan dengan empati, validasi perasaan
- Buat user merasa aman dan didengar
- Jangan tanya detail dulu";
            
            case 'collect':
                return $base . "FASE: KUMPULKAN INFO
- Tanya satu per satu: Pelaku, Waktu, Lokasi, Detail
- Tanya dengan sopan, tidak seperti interogasi";
            
            case 'consent':
                return $base . "FASE: MINTA PERSETUJUAN
- Tawarkan buat laporan resmi ke Satgas PPKPT
- Jelaskan identitas dijaga kerahasiaannya
- Tidak memaksa, hormati keputusan user";
            
            case 'report':
                return $base . "FASE: BUAT LAPORAN
- Bantu lengkapi data laporan
- WAJIB minta minimal 1 kontak: WA atau email
- Data: Pelaku, Waktu, Lokasi, Detail, Kontak";
            
            case 'rejected':
                return $base . "FASE: USER MENOLAK
- Hormati keputusan
- Tetap supportive
- Ingatkan selalu ada jika berubah pikiran";
            
            default:
                return $base . "Dengarkan dan validasi perasaan user dengan empati.";
        }
    }
    
    private function getExtractionPrompt() {
        return "Ekstrak informasi dari percakapan untuk laporan PPKPT.
Ekstrak SEMUA nomor HP/WA dan email yang disebutkan!

FORMAT JSON (tanpa penjelasan):
{
  \"pelaku_kekerasan\": \"siapa pelaku\",
  \"waktu_kejadian\": \"YYYY-MM-DD atau deskripsi\",
  \"lokasi_kejadian\": \"tempat\",
  \"tingkat_kekhawatiran\": \"sedikit|khawatir|sangat\",
  \"detail_kejadian\": \"ringkasan 1-2 kalimat\",
  \"gender_korban\": \"laki-laki|perempuan|null\",
  \"usia_korban\": \"rentang atau angka\",
  \"korban_sebagai\": \"korban|saksi|keluarga\",
  \"email_korban\": \"email jika ada\",
  \"whatsapp_korban\": \"nomor HP/WA jika ada\"
}

HANYA kembalikan JSON valid.";
    }
    
    private function getAutofillExtractionPrompt() {
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        return "Ekstrak data untuk autofill form dengan confidence score.

HARI INI: $today | KEMARIN: $yesterday

PENTING: Ekstrak SEMUA nomor HP dan email!

OUTPUT FORMAT:
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
  },
  \"extraction_metadata\": {
    \"total_fields_found\": 0,
    \"average_confidence\": 0.0,
    \"notes\": \"catatan\"
  }
}

HANYA JSON. Tanpa penjelasan.";
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
                'pelaku' => 0.0, 'waktu' => 0.0, 'lokasi' => 0.0,
                'detail' => 0.0, 'tingkat' => 0.0, 'usia' => 0.0,
                'gender' => 0.0, 'email' => 0.0, 'whatsapp' => 0.0
            ],
            'extraction_metadata' => [
                'total_fields_found' => 0,
                'average_confidence' => 0.0,
                'notes' => 'Tidak ada data ditemukan'
            ]
        ];
    }
}