<?php
/**
 * SIGAP PPKS - Chat Helpers
 * Fungsi utilitas untuk pemrosesan chat dan ekstraksi data
 */

class ChatHelpers {
    
    /**
     * Normalisasi data AI untuk form autofill
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

    private static function sanitize($input) {
        if ($input === null || $input === 'null') return null;
        return htmlspecialchars(trim(strip_tags($input)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
    
    /**
     * Parser tanggal dengan dukungan bahasa Indonesia
     */
    public static function normalizeDate($dateString) {
        if (empty($dateString) || $dateString === 'null') return null;
        
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateString)) return $dateString;
        
        $text = strtolower(trim($dateString));
        $today = date('Y-m-d');
        
        $mappings = [
            'hari ini' => $today, 'hr ini' => $today, 'sekarang' => $today,
            'barusan' => $today, 'tadi' => $today, 'tadi pagi' => $today,
            'tadi malam' => date('Y-m-d', strtotime('-1 day')),
            'kemarin' => date('Y-m-d', strtotime('-1 day')),
            'kmrn' => date('Y-m-d', strtotime('-1 day')),
            'kemaren' => date('Y-m-d', strtotime('-1 day')),
            'semalam' => date('Y-m-d', strtotime('-1 day')),
            'lusa' => date('Y-m-d', strtotime('-2 days')),
            'minggu lalu' => date('Y-m-d', strtotime('-7 days')),
            'bulan lalu' => date('Y-m-d', strtotime('-30 days'))
        ];

        foreach ($mappings as $keyword => $date) {
            if (strpos($text, $keyword) !== false) return $date;
        }
        
        $relativePatterns = [
            '/(\d+)\s*(hari|hr)\s*(lalu)/i' => 'days',
            '/(\d+)\s*(minggu|mg)\s*(lalu)/i' => 'weeks',
            '/(\d+)\s*(bulan|bln)\s*(lalu)/i' => 'months'
        ];

        foreach ($relativePatterns as $pattern => $unit) {
            if (preg_match($pattern, $text, $matches)) {
                return date('Y-m-d', strtotime("-{$matches[1]} $unit"));
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
     * Deteksi kondisi darurat
     */
    public static function isEmergency($message) {
        $cleanMsg = strtolower(preg_replace('/[^\w\s]/u', ' ', $message));
        $cleanMsg = preg_replace('/\s+/', ' ', trim($cleanMsg));
        
        $patterns = [
            'bunuh\s+diri', 'ingin\s+mati', 'mau\s+mati', 'pengen\s+mati',
            'akhiri\s+hidup', 'gantung\s+diri', 'minum\s+racun',
            'gak\s+kuat\s+hidup', 'lebih\s+baik\s+mati', 'capek\s+hidup'
        ];
        
        // Cek negasi dulu
        if (preg_match('/tidak\s+(mau|ingin)\s+mati/i', $cleanMsg)) return false;
        if (preg_match('/ga(k)?\s+(mau|ingin)\s+mati/i', $cleanMsg)) return false;
        
        foreach ($patterns as $pattern) {
            if (preg_match('/\b' . $pattern . '\b/iu', $cleanMsg)) {
                error_log("[EMERGENCY] Pattern: $pattern");
                return true;
            }
        }
        
        return false;
    }

    private static function normalizeLocation($location) {
        if (empty($location) || $location === 'null') return null;
        
        $loc = strtolower(trim($location));
        
        $mappings = [
            'sekolah_kampus' => ['kelas', 'kampus', 'kuliah', 'lab', 'perpus', 'fakultas'],
            'rumah_tangga' => ['rumah', 'kos', 'kost', 'asrama', 'kontrakan', 'apartemen'],
            'tempat_kerja' => ['kantor', 'tempat kerja', 'office', 'gudang'],
            'sarana_umum' => ['jalan', 'angkot', 'bus', 'kereta', 'mall', 'cafe', 'taman'],
            'daring_elektronik' => ['online', 'chat', 'wa', 'whatsapp', 'dm', 'medsos']
        ];
        
        foreach ($mappings as $formValue => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($loc, $keyword) !== false) return $formValue;
            }
        }
        
        return null;
    }

    private static function normalizePerpetrator($pelaku) {
        if (empty($pelaku) || $pelaku === 'null') return null;
        
        $p = strtolower(trim($pelaku));
        
        $mappings = [
            'orang_tidak_dikenal' => ['tidak kenal', 'asing', 'gak kenal'],
            'dosen' => ['dosen', 'guru', 'pengajar', 'profesor'],
            'teman' => ['teman', 'kawan', 'sahabat'],
            'senior' => ['senior', 'kakak tingkat', 'kating'],
            'atasan_majikan' => ['atasan', 'bos', 'majikan'],
            'pacar' => ['pacar', 'mantan', 'gebetan', 'pasangan'],
            'kerabat' => ['kerabat', 'saudara', 'paman', 'om', 'tante']
        ];
        
        foreach ($mappings as $formValue => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($p, $keyword) !== false) return $formValue;
            }
        }
        
        return 'lainnya';
    }

    private static function normalizeKekhawatiran($value) {
        if (empty($value) || $value === 'null') return 'khawatir';
        
        $v = strtolower(trim($value));
        
        if (preg_match('/(sangat|banget|parah|tinggi|trauma)/i', $v)) return 'sangat';
        if (preg_match('/(sedikit|biasa|ringan|kecil)/i', $v)) return 'sedikit';
        
        return 'khawatir';
    }

    private static function normalizeGender($value) {
        if (empty($value) || $value === 'null') return null;
        
        $v = strtolower(trim($value));
        
        if (preg_match('/(perempuan|wanita|cewek)/i', $v)) return 'perempuan';
        if (preg_match('/(laki|pria|cowok)/i', $v)) return 'lakilaki';
        
        return null;
    }

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
     * Tentukan fase percakapan
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

    public static function detectConsent($message) {
        $msg = strtolower(trim($message));
        
        $noPatterns = ['tidak', 'enggak', 'gak', 'nggak', 'jangan', 'belum', 'nanti', 'takut', 'ragu'];
        foreach ($noPatterns as $pattern) {
            if (strpos($msg, $pattern) !== false) return 'no';
        }
        
        $yesPatterns = ['ya', 'iya', 'boleh', 'mau', 'setuju', 'ok', 'oke', 'siap', 'yuk', 'ayo', 'lanjut', 'tolong', 'bantu'];
        foreach ($yesPatterns as $pattern) {
            if (strpos($msg, $pattern) !== false) return 'yes';
        }
        
        return 'unclear';
    }

    public static function detectReportIntent($message) {
        $keywords = ['mau lapor', 'ingin melapor', 'bantu lapor', 'buat laporan'];
        $msg = strtolower($message);
        
        foreach ($keywords as $keyword) {
            if (strpos($msg, $keyword) !== false) return true;
        }
        return false;
    }

    public static function isAskingAboutReporting($message) {
        $keywords = ['aman?', 'rahasia?', 'ketahuan?', 'gimana caranya', 'prosesnya'];
        $msg = strtolower($message);
        
        foreach ($keywords as $keyword) {
            if (strpos($msg, $keyword) !== false) return true;
        }
        return false;
    }

    public static function isOffTopic($message) {
        $msg = strtolower($message);
        
        // PENTING: Jika ada kata kunci PPKS, JANGAN anggap off-topic
        // Ini untuk menghindari false positive seperti "saya dilecehkan dengan program python"
        $ppksKeywords = [
            'dilecehkan', 'diperkosa', 'disentuh', 'dipaksa', 'kekerasan',
            'pelecehan', 'cabul', 'asusila', 'harassment', 'abuse',
            'takut', 'trauma', 'curhat', 'cerita', 'lapor', 'bantuan'
        ];
        
        foreach ($ppksKeywords as $ppksWord) {
            if (strpos($msg, $ppksWord) !== false) {
                error_log("[OFF-TOPIC] PPKS keyword found ('$ppksWord'), NOT off-topic");
                return false; // Ada kata PPKS, bukan off-topic
            }
        }
        
        // Kata kunci yang JELAS off-topic
        $offTopicKeywords = [
            // Programming
            'buatkan kode', 'buat program', 'coding', 'python', 'javascript', 'java ', 
            'c++', 'php ', 'html', 'css', 'sql', 'react', 'node', 'flutter',
            'compile', 'syntax', 'function', 'variable', 'loop', 'array',
            
            // Tugas/akademik
            'tugas kuliah', 'tugas sekolah', 'pr ', 'homework', 'jawab soal',
            'kerjakan tugas', 'bantu kerjain',
            
            // Hacking/ilegal
            'ddos', 'hack', 'hacking', 'crack', 'bypass', 'exploit', 'malware',
            'judi', 'gambling', 'slot', 'togel', 'poker', 'casino',
            'virus', 'trojan', 'phishing', 'inject', 'brute force',
            
            // Umum off-topic
            'resep masak', 'lirik lagu', 'cuaca', 'bola', 'sepak bola',
            'game', 'film', 'artis', 'gosip', 'zodiak', 'ramalan',
            'translate', 'terjemahkan', 'bahasa inggris'
        ];
        
        foreach ($offTopicKeywords as $keyword) {
            if (strpos($msg, $keyword) !== false) {
                error_log("[OFF-TOPIC] Detected keyword: $keyword");
                return true;
            }
        }
        
        // Pattern untuk request membuat sesuatu yang bukan laporan
        $offTopicPatterns = [
            '/buatkan\s+(saya|aku|gue)?\s*(program|kode|script|bot|website)/i',
            '/buat(in|kan)?\s*(aplikasi|game|tools)/i',
            '/ajarin?\s*(coding|programming|hacking)/i',
            '/cara\s+(hack|ddos|crack|cheat)/i'
        ];
        
        foreach ($offTopicPatterns as $pattern) {
            if (preg_match($pattern, $msg)) {
                error_log("[OFF-TOPIC] Detected pattern: $pattern");
                return true;
            }
        }
        
        return false;
    }

    public static function countFilledLabels($labels) {
        $fields = ['pelaku_kekerasan', 'waktu_kejadian', 'lokasi_kejadian', 'detail_kejadian', 'tingkat_kekhawatiran'];
        $count = 0;
        
        foreach ($fields as $field) {
            if (!empty($labels[$field]) && $labels[$field] !== null && $labels[$field] !== 'null') {
                $count++;
            }
        }
        return $count;
    }

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
     * Cek kelengkapan label - wajib ada kontak
     */
    public static function isLabelsComplete($labels) {
        $required = ['pelaku_kekerasan', 'detail_kejadian'];
        
        foreach ($required as $field) {
            if (empty($labels[$field]) || $labels[$field] === null || $labels[$field] === 'null') {
                return false;
            }
        }
        
        // Wajib ada minimal 1 kontak
        $hasEmail = !empty($labels['email_korban']) && $labels['email_korban'] !== 'null';
        $hasWhatsapp = !empty($labels['whatsapp_korban']) && $labels['whatsapp_korban'] !== 'null';
        
        return $hasEmail || $hasWhatsapp;
    }
    
    public static function getMissingFields($labels) {
        $missing = [];
        
        $requiredFields = [
            'pelaku_kekerasan' => 'Siapa pelaku',
            'detail_kejadian' => 'Detail kejadian',
            'waktu_kejadian' => 'Kapan terjadi',
            'lokasi_kejadian' => 'Di mana terjadi'
        ];
        
        foreach ($requiredFields as $field => $label) {
            if (empty($labels[$field]) || $labels[$field] === 'null') {
                $missing[] = $label;
            }
        }
        
        $hasEmail = !empty($labels['email_korban']) && $labels['email_korban'] !== 'null';
        $hasWhatsapp = !empty($labels['whatsapp_korban']) && $labels['whatsapp_korban'] !== 'null';
        
        if (!$hasEmail && !$hasWhatsapp) {
            $missing[] = 'Kontak (WA/Email) untuk tindak lanjut';
        }
        
        return $missing;
    }
    
    public static function hasContactInfo($labels) {
        $hasEmail = !empty($labels['email_korban']) && $labels['email_korban'] !== 'null';
        $hasWhatsapp = !empty($labels['whatsapp_korban']) && $labels['whatsapp_korban'] !== 'null';
        return $hasEmail || $hasWhatsapp;
    }
}