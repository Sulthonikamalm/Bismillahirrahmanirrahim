<?php
/**
 * Chat Helpers v4.2
 * Utility functions for chat processing, normalization, and phase detection
 */

class ChatHelpers {
    
    /**
     * Normalize AI data for form autofill
     */
    public static function normalizeExtractedData($rawData) {
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
            'korbanSebagai'       => 'saya',
            'emailKorban'         => self::sanitize($extracted['email_korban'] ?? null),
            'whatsappKorban'      => self::sanitize($extracted['whatsapp_korban'] ?? null),
            'confidence'          => $confidence
        ];
    }

    /**
     * Sanitize output strings for XSS prevention
     */
    private static function sanitize($input) {
        if ($input === null || $input === 'null') return null;
        $clean = strip_tags($input);
        return htmlspecialchars(trim($clean), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
    
    /**
     * Smart date parser with slang support
     */
    public static function normalizeDate($dateString) {
        if (empty($dateString) || $dateString === 'null') return null;
        
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateString)) {
            return $dateString;
        }
        
        $text = strtolower(trim($dateString));
        $today = date('Y-m-d');
        
        $directMappings = [
            'hari ini' => $today, 'hr ini' => $today, 'sekarang' => $today,
            'barusan' => $today, 'tadi' => $today, 'tadi pagi' => $today,
            'tadi malam' => date('Y-m-d', strtotime('-1 day')),
            'kemarin' => date('Y-m-d', strtotime('-1 day')),
            'kmrn' => date('Y-m-d', strtotime('-1 day')),
            'kemaren' => date('Y-m-d', strtotime('-1 day')),
            'semalam' => date('Y-m-d', strtotime('-1 day')),
            'lusa' => date('Y-m-d', strtotime('-2 days')),
            'minggu lalu' => date('Y-m-d', strtotime('-7 days')),
            'mg lalu' => date('Y-m-d', strtotime('-7 days')),
            'bulan lalu' => date('Y-m-d', strtotime('-30 days')),
            'bln lalu' => date('Y-m-d', strtotime('-30 days'))
        ];

        foreach ($directMappings as $keyword => $date) {
            if (strpos($text, $keyword) !== false) return $date;
        }
        
        $relativePatterns = [
            '/(\d+)\s*(hari|hr|hri)\s*(lalu|yang\s*lalu)/i' => 'days',
            '/(\d+)\s*(minggu|mg|pekan)\s*(lalu|yang\s*lalu)/i' => 'weeks',
            '/(\d+)\s*(bulan|bln)\s*(lalu|yang\s*lalu)/i' => 'months'
        ];

        foreach ($relativePatterns as $pattern => $unit) {
            if (preg_match($pattern, $text, $matches)) {
                $num = (int)$matches[1];
                return date('Y-m-d', strtotime("-$num $unit"));
            }
        }
        
        $timestamp = strtotime($dateString);
        if ($timestamp !== false && $timestamp > 0) {
            $parsedDate = date('Y-m-d', $timestamp);
            if ($parsedDate <= $today) return $parsedDate;
        }
        
        return $dateString;
    }

    /**
     * Emergency detection with word boundaries
     */
    public static function isEmergency($message) {
        $cleanMsg = strtolower(preg_replace('/[^\w\s]/u', ' ', $message));
        $cleanMsg = preg_replace('/\s+/', ' ', trim($cleanMsg));
        
        $emergencyPatterns = [
            'bunuh\s+diri', 'ingin\s+mati', 'mau\s+mati', 'pengen\s+mati',
            'akhiri\s+hidup', 'gantung\s+diri', 'lompat\s+dari', 'minum\s+racun',
            'gores\s+tangan', 'iris\s+tangan', 'potong\s+urat',
            'gak\s+kuat\s+hidup', 'ga\s+kuat\s+hidup', 'lebih\s+baik\s+mati',
            'mending\s+mati', 'capek\s+hidup', 'males\s+hidup'
        ];
        
        $negationPatterns = [
            '/tidak\s+(mau|ingin|pengen)\s+mati/i',
            '/ga(k)?\s+(mau|ingin|pengen)\s+mati/i',
            '/bukan\s+bunuh\s+diri/i'
        ];
        
        foreach ($negationPatterns as $negPattern) {
            if (preg_match($negPattern, $cleanMsg)) return false;
        }
        
        foreach ($emergencyPatterns as $pattern) {
            if (preg_match('/\b' . $pattern . '\b/iu', $cleanMsg)) {
                error_log("[EMERGENCY] Pattern: $pattern");
                return true;
            }
        }
        
        return false;
    }

    /**
     * Location normalizer
     */
    private static function normalizeLocation($location) {
        if (empty($location) || $location === 'null') return null;
        
        $loc = strtolower(trim($location));
        
        $mappings = [
            'sekolah_kampus' => ['kelas', 'kampus', 'kuliah', 'lab', 'perpus', 'fakultas', 'gedung'],
            'rumah_tangga' => ['rumah', 'kos', 'kost', 'asrama', 'kontrakan', 'apartemen', 'kamar'],
            'tempat_kerja' => ['kantor', 'tempat kerja', 'office', 'gudang', 'pabrik', 'toko'],
            'sarana_umum' => ['jalan', 'angkot', 'bus', 'kereta', 'mall', 'cafe', 'taman', 'parkir'],
            'daring_elektronik' => ['online', 'chat', 'wa', 'whatsapp', 'dm', 'ig', 'medsos', 'telepon']
        ];
        
        foreach ($mappings as $formValue => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($loc, $keyword) !== false) return $formValue;
            }
        }
        
        $validValues = ['rumah_tangga', 'tempat_kerja', 'sekolah_kampus', 'sarana_umum', 'situasi_darurat', 'daring_elektronik'];
        if (in_array($location, $validValues)) return $location;
        
        return null;
    }

    /**
     * Perpetrator normalizer
     */
    private static function normalizePerpetrator($pelaku) {
        if (empty($pelaku) || $pelaku === 'null') return null;
        
        $p = strtolower(trim($pelaku));
        
        $mappings = [
            'orang_tidak_dikenal' => ['tidak kenal', 'asing', 'orang asing', 'gak kenal'],
            'dosen' => ['dosen', 'guru', 'pengajar', 'lecturer', 'profesor'],
            'teman' => ['teman', 'kawan', 'sahabat'],
            'senior' => ['senior', 'kakak tingkat', 'kating'],
            'atasan_majikan' => ['atasan', 'bos', 'majikan', 'manager'],
            'rekan_kerja' => ['rekan kerja', 'kolega', 'teman kantor'],
            'pacar' => ['pacar', 'mantan', 'gebetan', 'pasangan'],
            'kerabat' => ['kerabat', 'saudara', 'paman', 'om', 'tante', 'sepupu'],
            'ayah_kandung' => ['ayah', 'bapak', 'papa'],
            'ibu_kandung' => ['ibu', 'mama', 'emak']
        ];
        
        foreach ($mappings as $formValue => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($p, $keyword) !== false) return $formValue;
            }
        }
        
        $validValues = ['orang_tidak_dikenal', 'kenalan_baru', 'teman', 'kerabat', 'ayah_kandung', 'ibu_kandung', 'pacar', 'rekan_kerja', 'atasan_majikan', 'lainnya'];
        if (in_array($pelaku, $validValues)) return $pelaku;
        
        return 'lainnya';
    }

    /**
     * Concern level normalizer
     */
    private static function normalizeKekhawatiran($value) {
        if (empty($value) || $value === 'null') return 'khawatir';
        
        $v = strtolower(trim($value));
        
        if (preg_match('/(sangat|banget|parah|tinggi|berat|trauma)/i', $v)) return 'sangat';
        if (preg_match('/(sedikit|biasa|ringan|kecil)/i', $v)) return 'sedikit';
        
        return 'khawatir';
    }

    /**
     * Gender normalizer
     */
    private static function normalizeGender($value) {
        if (empty($value) || $value === 'null') return null;
        
        $v = strtolower(trim($value));
        
        if (preg_match('/(perempuan|wanita|cewek|female)/i', $v)) return 'perempuan';
        if (preg_match('/(laki|pria|cowok|male)/i', $v)) return 'lakilaki';
        
        return null;
    }

    /**
     * Age normalizer
     */
    private static function normalizeUsia($value) {
        if (empty($value) || $value === 'null') return null;
        
        $validRanges = ['12-17', '18-25', '26-35', '36-45', '46-55', '56+'];
        if (in_array($value, $validRanges)) return $value;
        
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
     * Phase determination
     */
    public static function determinePhase($labels, $messageCount, $consentAsked, $lastUserMessage) {
        if (self::isAskingAboutReporting($lastUserMessage)) return 'consent';
        if (self::detectReportIntent($lastUserMessage)) return $consentAsked ? 'report' : 'consent';
        if ($messageCount < 6) return 'curhat';
        
        $filled = self::countFilledLabels($labels);
        if ($filled < 3 && $messageCount < 12) return 'collect';
        if ($filled >= 3 && !$consentAsked) return 'consent';
        if ($consentAsked) return 'report';
        
        return 'curhat';
    }

    /**
     * Consent detection
     */
    public static function detectConsent($message) {
        $msg = strtolower(trim($message));
        
        $noPatterns = ['tidak', 'enggak', 'gak', 'ga ', 'nggak', 'jangan', 'belum', 'nanti aja', 'takut', 'ragu'];
        foreach ($noPatterns as $pattern) {
            if (strpos($msg, $pattern) !== false) return 'no';
        }
        
        $yesPatterns = ['ya', 'iya', 'boleh', 'mau', 'setuju', 'bersedia', 'ok', 'oke', 'siap', 'yuk', 'ayo', 'lanjut', 'baik', 'tolong', 'bantu'];
        foreach ($yesPatterns as $pattern) {
            if (strpos($msg, $pattern) !== false) return 'yes';
        }
        
        return 'unclear';
    }

    /**
     * Report intent detection
     */
    public static function detectReportIntent($message) {
        $keywords = ['mau lapor', 'ingin melapor', 'bantu lapor', 'catat laporan', 'buat laporan', 'laporkan'];
        $msg = strtolower($message);
        
        foreach ($keywords as $keyword) {
            if (strpos($msg, $keyword) !== false) return true;
        }
        return false;
    }

    /**
     * Reporting questions detection
     */
    public static function isAskingAboutReporting($message) {
        $keywords = ['aman?', 'aman gak', 'rahasia?', 'ketahuan?', 'gimana caranya', 'prosesnya', 'takut dendam', 'identitas'];
        $msg = strtolower($message);
        
        foreach ($keywords as $keyword) {
            if (strpos($msg, $keyword) !== false) return true;
        }
        return false;
    }

    /**
     * Off-topic detection
     */
    public static function isOffTopic($message) {
        $keywords = ['buatkan kode', 'buat kode', 'coding', 'python', 'javascript', 'java', 'php', 'tugas kuliah', 'tugas sekolah', 'resep masak', 'cara masak'];
        $msg = strtolower($message);
        
        foreach ($keywords as $keyword) {
            if (strpos($msg, $keyword) !== false) return true;
        }
        return false;
    }

    /**
     * Count filled labels
     */
    public static function countFilledLabels($labels) {
        $criticalFields = ['pelaku_kekerasan', 'waktu_kejadian', 'lokasi_kejadian', 'detail_kejadian', 'tingkat_kekhawatiran'];
        $count = 0;
        
        foreach ($criticalFields as $field) {
            if (!empty($labels[$field]) && $labels[$field] !== null && $labels[$field] !== 'null') {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Merge labels
     */
    public static function mergeLabels($existingLabels, $newLabels) {
        if (isset($newLabels['extracted_data'])) {
            $newLabels = $newLabels['extracted_data'];
        }
        
        foreach ($newLabels as $key => $value) {
            if (!empty($value) && $value !== null && $value !== 'null') {
                if (empty($existingLabels[$key]) || strlen($value) > strlen($existingLabels[$key] ?? '')) {
                    $existingLabels[$key] = $value;
                }
            }
        }
        return $existingLabels;
    }

    /**
     * Get conversation text for AI extraction
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
     * Check labels completeness - "No Contact, No Ticket" Policy
     * Requires at least one contact method (email OR whatsapp)
     */
    public static function isLabelsComplete($labels) {
        $required = ['pelaku_kekerasan', 'detail_kejadian'];
        
        foreach ($required as $field) {
            if (empty($labels[$field]) || $labels[$field] === null || $labels[$field] === 'null') {
                return false;
            }
        }
        
        // NO CONTACT, NO TICKET: Must have at least email OR whatsapp
        $hasEmail = !empty($labels['email_korban']) && $labels['email_korban'] !== null && $labels['email_korban'] !== 'null';
        $hasWhatsapp = !empty($labels['whatsapp_korban']) && $labels['whatsapp_korban'] !== null && $labels['whatsapp_korban'] !== 'null';
        
        if (!$hasEmail && !$hasWhatsapp) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get missing fields for report completion
     * Used by bot to ask specific questions
     */
    public static function getMissingFields($labels) {
        $missing = [];
        
        // Core required fields
        $requiredFields = [
            'pelaku_kekerasan' => 'Siapa pelaku kekerasan',
            'detail_kejadian' => 'Kronologi/detail kejadian',
            'waktu_kejadian' => 'Kapan kejadian terjadi',
            'lokasi_kejadian' => 'Di mana kejadian terjadi'
        ];
        
        foreach ($requiredFields as $field => $label) {
            if (empty($labels[$field]) || $labels[$field] === null || $labels[$field] === 'null') {
                $missing[] = $label;
            }
        }
        
        // NO CONTACT, NO TICKET: Check for at least one contact
        $hasEmail = !empty($labels['email_korban']) && $labels['email_korban'] !== null && $labels['email_korban'] !== 'null';
        $hasWhatsapp = !empty($labels['whatsapp_korban']) && $labels['whatsapp_korban'] !== null && $labels['whatsapp_korban'] !== 'null';
        
        if (!$hasEmail && !$hasWhatsapp) {
            $missing[] = 'Kontak (WA atau Email) untuk tindak lanjut';
        }
        
        return $missing;
    }
    
    /**
     * Check if contact info is available
     */
    public static function hasContactInfo($labels) {
        $hasEmail = !empty($labels['email_korban']) && $labels['email_korban'] !== null && $labels['email_korban'] !== 'null';
        $hasWhatsapp = !empty($labels['whatsapp_korban']) && $labels['whatsapp_korban'] !== null && $labels['whatsapp_korban'] !== 'null';
        return $hasEmail || $hasWhatsapp;
    }
}
?>