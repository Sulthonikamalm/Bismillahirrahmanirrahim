<?php
/**
 * ============================================================
 * CHAT HELPERS - IMPROVED VERSION 3.0
 * ============================================================
 * Version 3.0 - Smarter phase detection, better context awareness
 * 
 * @version 3.0
 * @date 2025-11-16
 */

class ChatHelpers {
    
    /**
     * Determine current phase (IMPROVED V3 - smarter logic)
     */
    public static function determinePhase($labels, $messageCount, $consentAsked = false, $lastUserMessage = '', $conversationHistory = []) {
        // CRITICAL: Check if user is asking about reporting concerns (not rejecting)
        if (self::isAskingAboutReporting($lastUserMessage)) {
            // User is concerned about reporting process, stay in CONSENT phase
            return 'consent';
        }
        
        // Check for explicit report intent
        if (self::detectReportIntent($lastUserMessage)) {
            if (!$consentAsked) {
                return 'consent';  // Ask for consent first
            } else {
                return 'report';  // Start collecting data
            }
        }
        
        // Phase 1: Curhat (first 6-8 messages - give more space)
        if ($messageCount < 8) {
            return 'curhat';
        }
        
        // Check labels filled
        $filledLabels = self::countFilledLabels($labels);
        
        // Phase 2: Collect (gathering labels naturally, 8-12 messages)
        if ($filledLabels < 3 && $messageCount < 14) {
            return 'collect';
        }
        
        // Phase 3: Consent (ask permission if enough info gathered)
        if ($filledLabels >= 3 && !$consentAsked) {
            return 'consent';
        }
        
        // Phase 4: Report (filling missing data after consent)
        if ($consentAsked) {
            return 'report';
        }
        
        return 'curhat';  // Default to curhat if unclear
    }
    
    /**
     * NEW: Detect if user is ASKING about reporting (not rejecting)
     */
    public static function isAskingAboutReporting($message) {
        $message = strtolower(trim($message));
        
        $questionPatterns = [
            // Questions about safety/anonymity
            'bakal ada orang yang tau',
            'orang tau aku yang',
            'bakal ketahuan',
            'identitas',
            'nama aku',
            'rahasia',
            'aman',
            'takut dia dendam',
            'kalau dia tau',
            
            // Questions about process
            'gimana caranya',
            'bagaimana prosesnya',
            'apa yang akan terjadi',
            'nanti gimana',
            'terus gimana',
            
            // Concerns but not rejection
            'tapi aku takut',
            'tapi aku khawatir',
            'aku takut kalau',
            'aku khawatir',
            'masalah ini selesai'
        ];
        
        foreach ($questionPatterns as $pattern) {
            if (strpos($message, $pattern) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * DETECT REPORT INTENT - User explicitly wants to report
     */
    public static function detectReportIntent($message) {
        $message = strtolower(trim($message));
        
        $reportKeywords = [
            // Explicit report intent
            'saya mau lapor',
            'saya ingin melapor',
            'saya ingin lapor',
            'mau lapor',
            'ingin melapor',
            'tolong bantu saya lapor',
            'bantu saya melapor',
            'pengen masalah ini selesai', // User wants resolution
            
            // Questions about reporting
            'apakah saya bisa lapor',
            'bisa lapor',
            'gimana cara lapor',
            'bagaimana caranya melapor',
            
            // Affirmative after being asked
            'ya saya mau',
            'iya tolong',
            'iya bantu saya',
            'tolong catatkan',
            
            // Direct "yes" variants (when in context)
            'ya lapor',
            'iya lapor'
        ];
        
        foreach ($reportKeywords as $keyword) {
            if (strpos($message, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Count filled labels
     */
    public static function countFilledLabels($labels) {
        $count = 0;
        $criticalFields = [
            'pelaku_kekerasan',
            'waktu_kejadian',
            'lokasi_kejadian',
            'tingkat_kekhawatiran',
            'detail_kejadian'
        ];
        
        foreach ($criticalFields as $field) {
            if (isset($labels[$field]) && !empty($labels[$field]) && $labels[$field] !== null) {
                $count++;
            }
        }
        
        return $count;
    }
    
    /**
     * Merge labels (unchanged)
     */
    public static function mergeLabels($existingLabels, $newLabels) {
        $merged = $existingLabels;
        
        foreach ($newLabels as $key => $value) {
            if (empty($merged[$key]) && !empty($value)) {
                $merged[$key] = $value;
            } elseif (!empty($value) && isset($merged[$key])) {
                if (strlen($value) > strlen($merged[$key])) {
                    $merged[$key] = $value;
                }
            }
        }
        
        return $merged;
    }
    
    /**
     * Detect consent (IMPROVED - more nuanced)
     */
    public static function detectConsent($message) {
        $message = strtolower(trim($message));
        
        // Check if this is a QUESTION about reporting (not consent answer)
        if (self::isAskingAboutReporting($message)) {
            return 'unclear';  // They're asking, not answering
        }
        
        // Negative consent patterns (high priority)
        $noPatterns = [
            'tidak', 'gak', 'ga ', 'enggak', 'engga',
            'belum siap', 'belum mau', 'nanti dulu',
            'takut', 'khawatir',
            'tidak mau', 'tidak bersedia', 'tidak setuju',
            'jangan dulu', 'nggak mau', 'nggak dulu'
        ];
        
        // Check negative first (higher priority)
        foreach ($noPatterns as $pattern) {
            if (strpos($message, $pattern) !== false) {
                // But if they also say "tapi pengen" - it's unclear
                if (strpos($message, 'tapi') !== false || strpos($message, 'pengen') !== false) {
                    return 'unclear';
                }
                return 'no';
            }
        }
        
        // Positive consent patterns
        $yesPatterns = [
            'ya ', 'iya ', 'yah ', 'iyah ',
            'saya mau', 'saya bersedia', 'saya setuju',
            'oke', 'okay', 'ok ',
            'boleh', 'siap', 'baik',
            'saya ingin melapor', 'tolong bantu saya',
            'mau', 'bersedia', 'setuju',
            'pengen masalah ini selesai'  // Implicit yes
        ];
        
        // Check positive
        foreach ($yesPatterns as $pattern) {
            if (strpos($message, $pattern) !== false) {
                return 'yes';
            }
        }
        
        return 'unclear';
    }
    
    /**
     * Get missing required fields
     */
    public static function getMissingFields($labels) {
        $required = [
            'pelaku_kekerasan' => 'Pelaku kekerasan',
            'waktu_kejadian' => 'Waktu kejadian',
            'lokasi_kejadian' => 'Lokasi kejadian',
            'detail_kejadian' => 'Detail kejadian',
            'usia_korban' => 'Usia korban'
        ];
        
        $missing = [];
        
        foreach ($required as $field => $label) {
            if (empty($labels[$field]) || $labels[$field] === null) {
                $missing[$field] = $label;
            }
        }
        
        return $missing;
    }
    
    /**
     * Check if labels complete
     */
    public static function isLabelsComplete($labels) {
        $required = [
            'pelaku_kekerasan',
            'waktu_kejadian',
            'lokasi_kejadian',
            'detail_kejadian',
            'usia_korban'
        ];
        
        foreach ($required as $field) {
            if (empty($labels[$field]) || $labels[$field] === null) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Normalize date
     */
    public static function normalizeDate($dateString) {
        if (empty($dateString)) {
            return null;
        }
        
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateString)) {
            return $dateString;
        }
        
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        $lower = strtolower($dateString);
        
        // Indonesian date patterns
        if (strpos($lower, 'hari ini') !== false || strpos($lower, 'tadi') !== false) {
            return $today;
        }
        
        if (strpos($lower, 'kemarin') !== false) {
            return $yesterday;
        }
        
        // Relative days
        if (preg_match('/(\d+)\s*(hari|minggu|bulan)\s*(yang\s*)?(lalu|kemarin)/i', $lower, $matches)) {
            $number = intval($matches[1]);
            $unit = $matches[2];
            
            switch ($unit) {
                case 'hari':
                    return date('Y-m-d', strtotime("-$number days"));
                case 'minggu':
                    return date('Y-m-d', strtotime("-$number weeks"));
                case 'bulan':
                    return date('Y-m-d', strtotime("-$number months"));
            }
        }
        
        $timestamp = strtotime($dateString);
        if ($timestamp !== false) {
            return date('Y-m-d', $timestamp);
        }
        
        return $dateString;
    }
    
    /**
     * Sanitize labels
     */
    public static function sanitizeLabels($labels) {
        $sanitized = [];
        
        foreach ($labels as $key => $value) {
            if ($value === null || $value === '' || $value === 'null') {
                $sanitized[$key] = null;
            } else {
                $sanitized[$key] = trim($value);
                
                if ($key === 'waktu_kejadian') {
                    $sanitized[$key] = self::normalizeDate($value);
                }
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Get conversation text for extraction
     */
    public static function getConversationText($messages) {
        $text = '';
        
        foreach ($messages as $msg) {
            if ($msg['role'] === 'user') {
                $text .= "User: " . $msg['content'] . "\n";
            }
        }
        
        return $text;
    }
    
    /**
     * Emergency detection (unchanged)
     */
    public static function isEmergency($message) {
        $emergencyKeywords = [
            'bunuh diri', 'akhiri hidup', 'mengakhiri hidup',
            'ingin mati', 'mau mati', 'lebih baik mati',
            'mati aja', 'mati saja', 'mati lebih baik',
            'ingin menghilang', 'ingin lenyap', 'hilang selamanya',
            'sudah tidak tahan', 'tidak kuat lagi', 'tidak sanggup lagi',
            'sudah tidak sanggup', 'tidak ada harapan',
            'hidup hancur', 'capek hidup', 'cape hidup',
            'hidup percuma', 'hidup sia sia', 'hidup tidak berarti',
            'biar ketabrak', 'pengen ketabrak', 'ditabrak aja',
            'selamat tinggal', 'goodbye semuanya',
            'pesan terakhirku', 'ini akhir dari semuanya',
            'mending mati', 'mau ngilang', 'gak kuat hidup',
            'pengen end', 'end hidupku', 'game over aja'
        ];
        
        $lower = strtolower($message);
        
        foreach ($emergencyKeywords as $keyword) {
            if (strpos($lower, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * ============================================================
     * SMART AUTOFILL: Data Normalization Functions
     * ============================================================
     * @version 1.0
     * @date 2025-12-14
     */
    
    /**
     * Normalize extracted data for form autofill
     * Converts snake_case to camelCase and applies transformations
     */
    public static function normalizeExtractedData($rawData) {
        return [
            'pelakuKekerasan' => self::normalizePelaku($rawData['pelaku_kekerasan'] ?? null),
            'waktuKejadian' => self::normalizeDate($rawData['waktu_kejadian'] ?? null),
            'lokasiKejadian' => self::normalizeLocation($rawData['lokasi_kejadian'] ?? null),
            'detailKejadian' => $rawData['detail_kejadian'] ?? null,
            'tingkatKekhawatiran' => self::normalizeKekhawatiran($rawData['tingkat_kekhawatiran'] ?? null),
            'usiaKorban' => $rawData['usia_korban'] ?? null,
            'genderKorban' => self::normalizeGender($rawData['gender_korban'] ?? null),
            'korbanSebagai' => $rawData['korban_sebagai'] ?? null,
            'emailKorban' => $rawData['email_korban'] ?? null,
            'whatsappKorban' => $rawData['whatsapp_korban'] ?? null,
            'confidence' => $rawData['confidence_scores'] ?? [
                'pelaku' => 0.7,
                'waktu' => 0.7,
                'lokasi' => 0.7,
                'detail' => 0.8
            ]
        ];
    }
    
    /**
     * Normalize pelaku (perpetrator) field
     */
    private static function normalizePelaku($pelaku) {
        if (empty($pelaku)) return null;
        
        $lower = strtolower(trim($pelaku));
        
        $mappings = [
            'dosen' => 'Dosen',
            'tenaga pendidik' => 'Dosen',
            'pengajar' => 'Dosen',
            'teman' => 'Teman',
            'kawan' => 'Teman',
            'sahabat' => 'Teman',
            'senior' => 'Senior',
            'kakak tingkat' => 'Senior',
            'asing' => 'Orang yang tidak dikenal',
            'orang asing' => 'Orang yang tidak dikenal',
            'orang tidak dikenal' => 'Orang yang tidak dikenal',
            'tidak kenal' => 'Orang yang tidak dikenal',
            'pacar' => 'Pacar',
            'mantan' => 'Mantan (Pacar)',
            'keluarga' => 'Keluarga',
            'pegawai' => 'Pegawai',
            'staf' => 'Pegawai',
            'mahasiswa' => 'Teman'
        ];
        
        foreach ($mappings as $keyword => $normalized) {
            if (strpos($lower, $keyword) !== false) {
                return $normalized;
            }
        }
        
        // Return capitalized original if no match
        return ucwords($pelaku);
    }
    
    /**
     * Normalize location to standard campus locations
     */
    private static function normalizeLocation($location) {
        if (empty($location)) return null;
        
        $lower = strtolower(trim($location));
        
        $mappings = [
            'kelas' => 'Di dalam gedung kampus',
            'ruang kelas' => 'Di dalam gedung kampus',
            'lab' => 'Di dalam gedung kampus',
            'laboratorium' => 'Di dalam gedung kampus',
            'perpustakaan' => 'Di dalam gedung kampus',
            'gedung' => 'Di dalam gedung kampus',
            'fakultas' => 'Di dalam gedung kampus',
            'kantor' => 'Di dalam gedung kampus',
            'asrama' => 'Asrama / Kos',
            'kos' => 'Asrama / Kos',
            'kost' => 'Asrama / Kos',
            'tempat tinggal' => 'Asrama / Kos',
            'rumah' => 'Asrama / Kos',
            'kantin' => 'Lingkungan kampus',
            'taman' => 'Lingkungan kampus',
            'parkir' => 'Lingkungan kampus',
            'halaman' => 'Lingkungan kampus',
            'koridor' => 'Lingkungan kampus',
            'jalan' => 'Luar kampus (Tempat umum)',
            'mall' => 'Luar kampus (Tempat umum)',
            'cafe' => 'Luar kampus (Tempat umum)',
            'restoran' => 'Luar kampus (Tempat umum)',
            'online' => 'Online',
            'medsos' => 'Online',
            'sosial media' => 'Online',
            'whatsapp' => 'Online',
            'instagram' => 'Online',
            'twitter' => 'Online'
        ];
        
        foreach ($mappings as $keyword => $normalized) {
            if (strpos($lower, $keyword) !== false) {
                return $normalized;
            }
        }
        
        // Return original with proper capitalization if no match
        return ucwords($location);
    }
    
    /**
     * Normalize kekhawatiran (concern level)
     */
    private static function normalizeKekhawatiran($level) {
        if (empty($level)) return null;
        
        $lower = strtolower(trim($level));
        
        $mappings = [
            'sangat' => 'SangatKhawatir',
            'sangat khawatir' => 'SangatKhawatir',
            'khawatir' => 'Khawatir',
            'sedikit' => 'Lumayan',
            'lumayan' => 'Lumayan',
            'biasa' => 'Lumayan',
            'stalking' => 'Khawatir',
            'pelecehan' => 'SangatKhawatir',
            'kekerasan' => 'SangatKhawatir',
            'fisik' => 'SangatKhawatir',
            'seksual' => 'SangatKhawatir'
        ];
        
        foreach ($mappings as $keyword => $normalized) {
            if (strpos($lower, $keyword) !== false) {
                return $normalized;
            }
        }
        
        return 'Khawatir'; // Default
    }
    
    /**
     * Normalize gender
     */
    private static function normalizeGender($gender) {
        if (empty($gender)) return null;
        
        $lower = strtolower(trim($gender));
        
        if (strpos($lower, 'perempuan') !== false || strpos($lower, 'wanita') !== false || strpos($lower, 'cewe') !== false) {
            return 'Perempuan';
        }
        
        if (strpos($lower, 'laki') !== false || strpos($lower, 'pria') !== false || strpos($lower, 'cowo') !== false) {
            return 'Laki-laki';
        }
        
        return null;
    }

    /**
     * Detect if message is off-topic (non-PPKPT)
     */
    public static function isOffTopic($message) {
        $message = strtolower(trim($message));
        
        $offTopicPatterns = [
            // Programming requests
            'buatkan.*kode', 'buat.*kode', 'code.*c\+\+', 'code.*java',
            'program.*java', 'program.*python', 'buatkan.*program',
            'script.*php', 'function.*javascript',
            
            // General questions not related to PPKPT
            'apa itu.*', 'jelaskan tentang.*', 'ceritakan tentang.*',
            'bagaimana cara.*membuat', 'tutorial.*',
            
            // Academic help
            'tugas.*kuliah', 'pr.*sekolah', 'help.*assignment'
        ];
        
        foreach ($offTopicPatterns as $pattern) {
            if (preg_match('/' . $pattern . '/i', $message)) {
                return true;
            }
        }
        
        // Specific programming language mentions
        $programmingWords = ['c++', 'java', 'python', 'javascript', 'php', 'ruby', 'golang'];
        foreach ($programmingWords as $lang) {
            if (strpos($message, $lang) !== false && 
                (strpos($message, 'buatkan') !== false || strpos($message, 'buat') !== false)) {
                return true;
            }
        }
        
        return false;
    }
}
?>