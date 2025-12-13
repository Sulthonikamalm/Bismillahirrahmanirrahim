<?php
/**
 * ============================================================
 * CHAT HELPERS - ULTIMATE VERSION 4.2
 * ============================================================
 * PRODUCTION-READY FEATURES:
 * 1. Smart Autofill Normalization with Security Sanitization
 * 2. Slang-Aware Date Parsing (kmrn, bsk, hr, mg, bln)
 * 3. Precision Emergency Detection (Regex word boundaries)
 * 4. XSS-Safe Output Sanitization
 * 5. Enhanced Phase Detection
 *
 * @version 4.2
 * @date 2025-12-14
 */

class ChatHelpers {
    
    /**
     * ============================================================
     * 🚀 CORE: Normalize AI data for Form Autofill
     * ============================================================
     * Converts AI extracted data to form-compatible format
     * Includes security sanitization for XSS prevention
     */
    public static function normalizeExtractedData($rawData) {
        // Handle both nested and flat structures
        $extracted = isset($rawData['extracted_data']) ? $rawData['extracted_data'] : $rawData;
        $confidence = isset($rawData['confidence_scores']) ? $rawData['confidence_scores'] : [];
        
        return [
            'pelakuKekerasan'     => self::sanitize(self::normalizePerpetrator($extracted['pelaku_kekerasan'] ?? null)),
            'waktuKejadian'       => self::sanitize(self::normalizeDate($extracted['waktu_kejadian'] ?? null)),
            'lokasiKejadian'      => self::sanitize(self::normalizeLocation($extracted['lokasi_kejadian'] ?? null)),
            'detailKejadian'      => self::sanitize($extracted['detail_kejadian'] ?? null),
            'tingkatKekhawatiran' => self::sanitize(self::normalizeKekhawatiran($extracted['tingkat_kekhawatiran'] ?? null)),
            'usiaKorban'          => self::sanitize(self::normalizeUsia($extracted['usia_korban'] ?? null)),
            'genderKorban'        => self::sanitize(self::normalizeGender($extracted['gender_korban'] ?? null)),
            'korbanSebagai'       => 'saya', // Default: korban sendiri yang melapor
            'emailKorban'         => self::sanitize($extracted['email_korban'] ?? null),
            'whatsappKorban'      => self::sanitize($extracted['whatsapp_korban'] ?? null),
            'confidence'          => $confidence
        ];
    }

    /**
     * ============================================================
     * 🛡️ SECURITY: Sanitize output strings (XSS Prevention)
     * ============================================================
     * Strips HTML tags and encodes special characters
     */
    private static function sanitize($input) {
        if ($input === null || $input === 'null') return null;
        
        // Remove any HTML/script tags first
        $clean = strip_tags($input);
        
        // Encode special characters for safe HTML output
        $clean = htmlspecialchars(trim($clean), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        return $clean;
    }
    
    /**
     * ============================================================
     * 🗓️ SMART DATE PARSER (Slang Support)
     * ============================================================
     * Handles:
     * - Standard formats (YYYY-MM-DD)
     * - Indonesian words (kemarin, tadi, minggu lalu)
     * - Chat slang (kmrn, hr, mg, bln)
     * - Relative expressions (3 hari lalu, 2 minggu lalu)
     */
    public static function normalizeDate($dateString) {
        if (empty($dateString) || $dateString === 'null') return null;
        
        // 1. Already in correct format
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateString)) {
            return $dateString;
        }
        
        $text = strtolower(trim($dateString));
        $today = date('Y-m-d');
        
        // 2. Direct keyword mapping (Indonesian + slang)
        $directMappings = [
            // Today
            'hari ini'  => $today,
            'hr ini'    => $today,
            'hri ini'   => $today,
            'sekarang'  => $today,
            'barusan'   => $today,
            'tadi'      => $today,
            'tadi pagi' => $today,
            'tadi siang'=> $today,
            'tadi malam'=> date('Y-m-d', strtotime('-1 day')), // Tadi malam = semalam
            
            // Yesterday
            'kemarin'   => date('Y-m-d', strtotime('-1 day')),
            'kmrn'      => date('Y-m-d', strtotime('-1 day')),
            'kemaren'   => date('Y-m-d', strtotime('-1 day')),
            'kmren'     => date('Y-m-d', strtotime('-1 day')),
            'semalam'   => date('Y-m-d', strtotime('-1 day')),
            'semalem'   => date('Y-m-d', strtotime('-1 day')),
            
            // Two days ago
            'lusa'          => date('Y-m-d', strtotime('-2 days')),
            'kemarin lusa'  => date('Y-m-d', strtotime('-2 days')),
            'kmrn lusa'     => date('Y-m-d', strtotime('-2 days')),
            '2 hari lalu'   => date('Y-m-d', strtotime('-2 days')),
            
            // Week
            'minggu lalu'   => date('Y-m-d', strtotime('-7 days')),
            'mg lalu'       => date('Y-m-d', strtotime('-7 days')),
            'pekan lalu'    => date('Y-m-d', strtotime('-7 days')),
            'seminggu lalu' => date('Y-m-d', strtotime('-7 days')),
            
            // Month
            'bulan lalu'    => date('Y-m-d', strtotime('-30 days')),
            'bln lalu'      => date('Y-m-d', strtotime('-30 days')),
            'sebulan lalu'  => date('Y-m-d', strtotime('-30 days'))
        ];

        foreach ($directMappings as $keyword => $date) {
            if (strpos($text, $keyword) !== false) {
                return $date;
            }
        }
        
        // 3. Relative date parsing with regex (N hari/minggu/bulan lalu)
        // Patterns: "3 hari lalu", "2 hr lalu", "1 minggu lalu", "2 mg lalu", "1 bulan lalu"
        $relativePatterns = [
            // Days
            '/(\d+)\s*(hari|hr|hri)\s*(lalu|yang\s*lalu)/i' => 'days',
            // Weeks  
            '/(\d+)\s*(minggu|mg|pekan)\s*(lalu|yang\s*lalu)/i' => 'weeks',
            // Months
            '/(\d+)\s*(bulan|bln)\s*(lalu|yang\s*lalu)/i' => 'months'
        ];

        foreach ($relativePatterns as $pattern => $unit) {
            if (preg_match($pattern, $text, $matches)) {
                $num = (int)$matches[1];
                return date('Y-m-d', strtotime("-$num $unit"));
            }
        }
        
        // 4. Try PHP's strtotime as fallback
        $timestamp = strtotime($dateString);
        if ($timestamp !== false && $timestamp > 0) {
            $parsedDate = date('Y-m-d', $timestamp);
            // Sanity check: date should be in the past or today
            if ($parsedDate <= $today) {
                return $parsedDate;
            }
        }
        
        // Return original if can't parse
        return $dateString;
    }

    /**
     * ============================================================
     * 🚨 EMERGENCY DETECTION (Precision Mode with Word Boundaries)
     * ============================================================
     * Uses regex \b (word boundary) to avoid false positives
     * Example: "saya TIDAK ingin mati" won't trigger (negation)
     */
    public static function isEmergency($message) {
        // Normalize message: lowercase, remove punctuation
        $cleanMsg = strtolower(preg_replace('/[^\w\s]/u', ' ', $message));
        $cleanMsg = preg_replace('/\s+/', ' ', trim($cleanMsg)); // Collapse multiple spaces
        
        // Emergency phrases (using regex-safe patterns)
        $emergencyPatterns = [
            'bunuh\s+diri',
            'ingin\s+mati',
            'mau\s+mati',
            'pengen\s+mati',
            'akhiri\s+hidup',
            'mengakhiri\s+hidup',
            'gantung\s+diri',
            'lompat\s+dari',
            'minum\s+racun',
            'gores\s+tangan',
            'iris\s+tangan',
            'potong\s+urat',
            'gak\s+kuat\s+hidup',
            'ga\s+kuat\s+hidup',
            'tidak\s+kuat\s+hidup',
            'lebih\s+baik\s+mati',
            'mending\s+mati',
            'capek\s+hidup',
            'cape\s+hidup',
            'males\s+hidup'
        ];
        
        // Check for negation patterns that should NOT trigger emergency
        $negationPatterns = [
            '/tidak\s+(mau|ingin|pengen)\s+mati/i',
            '/ga(k)?\s+(mau|ingin|pengen)\s+mati/i',
            '/bukan\s+bunuh\s+diri/i',
            '/jangan\s+bunuh\s+diri/i'
        ];
        
        // First check if this is a negation (NOT an emergency)
        foreach ($negationPatterns as $negPattern) {
            if (preg_match($negPattern, $cleanMsg)) {
                return false;
            }
        }
        
        // Now check for emergency patterns with word boundaries
        foreach ($emergencyPatterns as $pattern) {
            // \b = word boundary, prevents partial matches
            if (preg_match('/\b' . $pattern . '\b/iu', $cleanMsg)) {
                error_log("[EMERGENCY DETECTED] Pattern: $pattern | Message: " . substr($message, 0, 100));
                return true;
            }
        }
        
        return false;
    }

    /**
     * ============================================================
     * 📍 LOCATION NORMALIZER
     * ============================================================
     * Maps various location descriptions to form values
     */
    private static function normalizeLocation($location) {
        if (empty($location) || $location === 'null') return null;
        
        $loc = strtolower(trim($location));
        
        $mappings = [
            // Campus/School
            'sekolah_kampus' => ['kelas', 'kampus', 'kuliah', 'lab', 'laboratorium', 'perpus', 'perpustakaan', 'fakultas', 'gedung', 'ruang', 'kantin kampus', 'toilet kampus', 'auditorium'],
            
            // Home
            'rumah_tangga' => ['rumah', 'kos', 'kost', 'asrama', 'kontrakan', 'apartemen', 'kamar', 'dapur', 'kamar mandi rumah'],
            
            // Workplace
            'tempat_kerja' => ['kantor', 'tempat kerja', 'office', 'gudang', 'pabrik', 'toko', 'warung'],
            
            // Public places
            'sarana_umum' => ['jalan', 'angkot', 'bus', 'kereta', 'stasiun', 'bandara', 'mall', 'cafe', 'resto', 'taman', 'parkir', 'toilet umum', 'halte'],
            
            // Online/Digital
            'daring_elektronik' => ['online', 'chat', 'wa', 'whatsapp', 'dm', 'ig', 'instagram', 'tiktok', 'twitter', 'facebook', 'medsos', 'video call', 'zoom', 'telepon', 'sms']
        ];
        
        foreach ($mappings as $formValue => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($loc, $keyword) !== false) {
                    return $formValue;
                }
            }
        }
        
        // If it already matches a form value
        $validValues = ['rumah_tangga', 'tempat_kerja', 'sekolah_kampus', 'sarana_umum', 'situasi_darurat', 'daring_elektronik'];
        if (in_array($location, $validValues)) {
            return $location;
        }
        
        return null;
    }

    /**
     * ============================================================
     * 👤 PERPETRATOR NORMALIZER
     * ============================================================
     * Maps perpetrator descriptions to form values
     */
    private static function normalizePerpetrator($pelaku) {
        if (empty($pelaku) || $pelaku === 'null') return null;
        
        $p = strtolower(trim($pelaku));
        
        $mappings = [
            'orang_tidak_dikenal' => ['tidak kenal', 'asing', 'stranger', 'orang asing', 'gak kenal', 'ga kenal', 'nggak kenal'],
            'dosen' => ['dosen', 'guru', 'pengajar', 'lecturer', 'profesor', 'prof'],
            'teman' => ['teman', 'kawan', 'sahabat', 'friend', 'tmen', 'tmn'],
            'senior' => ['senior', 'kakak tingkat', 'kating', 'kakak kelas'],
            'atasan_majikan' => ['atasan', 'bos', 'majikan', 'manager', 'supervisor', 'HRD'],
            'rekan_kerja' => ['rekan kerja', 'kolega', 'coworker', 'teman kantor'],
            'pacar' => ['pacar', 'mantan', 'gebetan', 'doi', 'pasangan'],
            'kerabat' => ['kerabat', 'saudara', 'paman', 'om', 'tante', 'kakak', 'adik', 'sepupu'],
            'ayah_kandung' => ['ayah', 'bapak', 'papa', 'abah'],
            'ibu_kandung' => ['ibu', 'mama', 'emak', 'bunda'],
            'kenalan_baru' => ['kenalan', 'baru kenal', 'kenalan baru', 'match'],
            'petugas_layanan' => ['ojol', 'driver', 'kurir', 'satpam', 'security'],
            'tetangga_teman_keluarga' => ['tetangga', 'neighbor', 'teman ortu', 'teman ayah', 'teman ibu']
        ];
        
        foreach ($mappings as $formValue => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($p, $keyword) !== false) {
                    return $formValue;
                }
            }
        }
        
        // If it already matches a form value
        $validValues = ['orang_tidak_dikenal', 'diri_sendiri', 'kenalan_baru', 'pengurus_rumah_tangga', 'guru', 'petugas_layanan', 'petugas_sekolah', 'teman', 'suami_istri', 'tetangga_teman_keluarga', 'kerabat', 'ayah_kandung', 'ibu_kandung', 'pengasuh_utama', 'anak', 'pacar', 'rekan_kerja', 'atasan_majikan', 'lainnya'];
        if (in_array($pelaku, $validValues)) {
            return $pelaku;
        }
        
        return 'lainnya';
    }

    /**
     * ============================================================
     * 😟 CONCERN LEVEL NORMALIZER
     * ============================================================
     */
    private static function normalizeKekhawatiran($value) {
        if (empty($value) || $value === 'null') return 'khawatir'; // Default
        
        $v = strtolower(trim($value));
        
        // Very worried
        if (preg_match('/(sangat|banget|parah|tinggi|berat|trauma)/i', $v)) {
            return 'sangat';
        }
        
        // Slightly worried
        if (preg_match('/(sedikit|biasa|ringan|kecil)/i', $v)) {
            return 'sedikit';
        }
        
        // Default moderate
        return 'khawatir';
    }

    /**
     * ============================================================
     * 👫 GENDER NORMALIZER
     * ============================================================
     */
    private static function normalizeGender($value) {
        if (empty($value) || $value === 'null') return null;
        
        $v = strtolower(trim($value));
        
        if (preg_match('/(perempuan|wanita|cewek|female|cewe)/i', $v)) {
            return 'perempuan';
        }
        
        if (preg_match('/(laki|pria|cowok|male|cowo)/i', $v)) {
            return 'lakilaki';
        }
        
        return null;
    }

    /**
     * ============================================================
     * 🎂 AGE NORMALIZER
     * ============================================================
     */
    private static function normalizeUsia($value) {
        if (empty($value) || $value === 'null') return null;
        
        // If it's already a valid range
        $validRanges = ['12-17', '18-25', '26-35', '36-45', '46-55', '56+'];
        if (in_array($value, $validRanges)) {
            return $value;
        }
        
        // Try to extract number
        if (preg_match('/(\d+)/', $value, $matches)) {
            $age = (int)$matches[1];
            
            if ($age >= 12 && $age <= 17) return '12-17';
            if ($age >= 18 && $age <= 25) return '18-25';
            if ($age >= 26 && $age <= 35) return '26-35';
            if ($age >= 36 && $age <= 45) return '36-45';
            if ($age >= 46 && $age <= 55) return '46-55';
            if ($age >= 56) return '56+';
        }
        
        return $value;
    }

    /**
     * ============================================================
     * 📊 PHASE DETERMINATION
     * ============================================================
     */
    public static function determinePhase($labels, $messageCount, $consentAsked, $lastUserMessage) {
        // Check if asking about reporting
        if (self::isAskingAboutReporting($lastUserMessage)) {
            return 'consent';
        }
        
        // Check for explicit report intent
        if (self::detectReportIntent($lastUserMessage)) {
            return $consentAsked ? 'report' : 'consent';
        }
        
        // Phase 1: Curhat (first 6 messages - allow venting)
        if ($messageCount < 6) {
            return 'curhat';
        }
        
        // Check labels filled
        $filled = self::countFilledLabels($labels);
        
        // Phase 2: Collect (gathering info naturally)
        if ($filled < 3 && $messageCount < 12) {
            return 'collect';
        }
        
        // Phase 3: Consent (ask permission if enough info)
        if ($filled >= 3 && !$consentAsked) {
            return 'consent';
        }
        
        // Phase 4: Report (after consent)
        if ($consentAsked) {
            return 'report';
        }
        
        return 'curhat';
    }

    /**
     * ============================================================
     * 🤝 CONSENT DETECTION
     * ============================================================
     */
    public static function detectConsent($message) {
        $msg = strtolower(trim($message));
        
        // Check for NO first (takes priority)
        $noPatterns = [
            'tidak', 'enggak', 'gak', 'ga ', 'nggak', 'jangan',
            'belum', 'nanti aja', 'nanti saja', 'pikir-pikir',
            'takut', 'ragu', 'bingung', 'gak dulu', 'nggak dulu'
        ];
        
        foreach ($noPatterns as $pattern) {
            if (strpos($msg, $pattern) !== false) {
                return 'no';
            }
        }
        
        // Check for YES
        $yesPatterns = [
            'ya', 'iya', 'boleh', 'mau', 'setuju', 'bersedia',
            'ok', 'oke', 'siap', 'yuk', 'ayo', 'lanjut',
            'baik', 'silakan', 'tolong', 'bantu'
        ];
        
        foreach ($yesPatterns as $pattern) {
            if (strpos($msg, $pattern) !== false) {
                return 'yes';
            }
        }
        
        return 'unclear';
    }

    /**
     * ============================================================
     * 📝 REPORT INTENT DETECTION
     * ============================================================
     */
    public static function detectReportIntent($message) {
        $keywords = [
            'mau lapor', 'ingin melapor', 'bantu lapor', 
            'catat laporan', 'buat laporan', 'laporkan',
            'masalah selesai', 'ingin melaporkan'
        ];
        
        $msg = strtolower($message);
        
        foreach ($keywords as $keyword) {
            if (strpos($msg, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * ============================================================
     * ❓ REPORTING QUESTIONS DETECTION
     * ============================================================
     */
    public static function isAskingAboutReporting($message) {
        $keywords = [
            'aman?', 'aman gak', 'aman ga', 
            'rahasia?', 'rahasia gak', 'rahasia ga',
            'ketahuan?', 'ketahuan gak',
            'gimana caranya', 'bagaimana caranya',
            'prosesnya gimana', 'prosesnya bagaimana',
            'takut dendam', 'takut balas',
            'identitas', 'nama saya'
        ];
        
        $msg = strtolower($message);
        
        foreach ($keywords as $keyword) {
            if (strpos($msg, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * ============================================================
     * 🚫 OFF-TOPIC DETECTION
     * ============================================================
     */
    public static function isOffTopic($message) {
        $keywords = [
            'buatkan kode', 'buat kode', 'coding',
            'python', 'javascript', 'java', 'php',
            'tugas kuliah', 'tugas sekolah', 'pr sekolah',
            'resep masak', 'cara masak', 'rekomendasi film',
            'cuaca hari ini', 'harga bitcoin', 'nilai tukar'
        ];
        
        $msg = strtolower($message);
        
        foreach ($keywords as $keyword) {
            if (strpos($msg, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * ============================================================
     * 📊 COUNT FILLED LABELS
     * ============================================================
     */
    public static function countFilledLabels($labels) {
        $criticalFields = [
            'pelaku_kekerasan',
            'waktu_kejadian', 
            'lokasi_kejadian',
            'detail_kejadian',
            'tingkat_kekhawatiran'
        ];
        
        $count = 0;
        foreach ($criticalFields as $field) {
            if (!empty($labels[$field]) && $labels[$field] !== null && $labels[$field] !== 'null') {
                $count++;
            }
        }
        
        return $count;
    }

    /**
     * ============================================================
     * 🔀 MERGE LABELS
     * ============================================================
     */
    public static function mergeLabels($existingLabels, $newLabels) {
        // Handle nested structure from autofill
        if (isset($newLabels['extracted_data'])) {
            $newLabels = $newLabels['extracted_data'];
        }
        
        foreach ($newLabels as $key => $value) {
            // Only update if new value is meaningful
            if (!empty($value) && $value !== null && $value !== 'null') {
                // Only overwrite if existing is empty OR new is longer
                if (empty($existingLabels[$key]) || strlen($value) > strlen($existingLabels[$key] ?? '')) {
                    $existingLabels[$key] = $value;
                }
            }
        }
        
        return $existingLabels;
    }

    /**
     * ============================================================
     * 📜 GET CONVERSATION TEXT (for AI extraction)
     * ============================================================
     */
    public static function getConversationText($history) {
        $text = "";
        foreach ($history as $msg) {
            if ($msg['role'] === 'user') {
                $text .= "User: " . $msg['content'] . "\n";
            }
        }
        return $text;
    }
    
    /**
     * ============================================================
     * ✅ CHECK LABELS COMPLETENESS
     * ============================================================
     */
    public static function isLabelsComplete($labels) {
        $required = [
            'pelaku_kekerasan',
            'detail_kejadian'
        ];
        
        foreach ($required as $field) {
            if (empty($labels[$field]) || $labels[$field] === null || $labels[$field] === 'null') {
                return false;
            }
        }
        
        return true;
    }
}
?>