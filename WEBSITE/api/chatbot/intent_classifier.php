<?php
/**
 * SIGAP PPKS - Intent Classifier
 * 
 * Sistem klasifikasi intent multi-layer untuk mendeteksi apakah user
 * ingin curhat, bertanya FAQ, atau memiliki niat melapor kekerasan.
 * 
 * ARSITEKTUR MULTI-LAYER:
 * Layer 1: Keyword-based detection (cepat, tanpa AI)
 * Layer 2: Semantic pattern detection (regex dengan konteks)
 * Layer 3: AI classification (untuk kasus ambigu)
 * 
 * @package SIGAP_PPKS
 * @subpackage ChatBot
 */

require_once __DIR__ . '/../../config/chatbot_config.php';

class IntentClassifier {
    
    /**
     * Kata-kata yang menunjukkan kekerasan seksual (Layer 1)
     * Bobot tinggi karena sangat eksplisit
     */
    private static $violenceKeywords = [
        // Kata-kata eksplisit kekerasan seksual
        'dilecehkan', 'pelecehan', 'lecehkan', 'melecehkan',
        'diperkosa', 'pemerkosaan', 'memperkosa', 'perkosa',
        'dicabuli', 'pencabulan', 'mencabuli', 'cabul',
        'kekerasan seksual', 'sexual harassment',
        'disentuh', 'meraba', 'diraba', 'pegang-pegang',
        'dipaksa', 'memaksa berhubungan',
        'catcalling', 'cat calling',
        'eksploitasi', 'dieksploitasi',
        'revenge porn', 'foto bugil', 'video intim',
        'incest', 'sodomi'
    ];
    
    /**
     * Kata-kata pelaku potensial (Layer 1)
     */
    private static $perpetratorKeywords = [
        'dosen', 'guru', 'pengajar', 'profesor', 'ustadz',
        'atasan', 'bos', 'majikan', 'manager',
        'teman', 'sahabat', 'kawan',
        'senior', 'kakak tingkat', 'kating',
        'pacar', 'mantan', 'gebetan', 'pasangan', 'suami', 'istri',
        'om', 'paman', 'tante', 'bibi', 'sepupu', 'kerabat',
        'tetangga', 'orang asing', 'tidak dikenal',
        'ayah', 'bapak', 'ibu', 'kakak', 'adik',
        'ojol', 'driver', 'sopir', 'satpam', 'security'
    ];
    
    /**
     * Referensi waktu kejadian (Layer 1)
     */
    private static $timeKeywords = [
        'kemarin', 'kemaren', 'kmrn',
        'tadi', 'barusan', 'baru saja',
        'minggu lalu', 'bulan lalu', 'tahun lalu',
        'semalam', 'tadi malam', 'tadi pagi',
        'beberapa hari', 'beberapa minggu',
        'waktu itu', 'dulu', 'pernah'
    ];
    
    /**
     * Referensi lokasi (Layer 1)
     */
    private static $locationKeywords = [
        'kampus', 'kelas', 'lab', 'perpustakaan', 'fakultas', 'gedung',
        'kos', 'kost', 'kontrakan', 'asrama', 'apartemen',
        'rumah', 'kamar',
        'kantor', 'tempat kerja', 'office',
        'jalan', 'gang', 'angkot', 'bus', 'kereta', 'ojek',
        'mall', 'cafe', 'taman', 'parkir',
        'toilet', 'kamar mandi', 'ruang ganti'
    ];
    
    /**
     * Indikator distress/tekanan emosional (Layer 1)
     */
    private static $distressKeywords = [
        'takut', 'takutku', 'ketakutan',
        'sedih', 'sedihku',
        'trauma', 'traumatis',
        'malu', 'merasa malu',
        'bingung', 'tidak tahu',
        'stress', 'stres', 'tertekan',
        'cemas', 'kecemasan', 'anxiety',
        'depresi', 'putus asa',
        'mimpi buruk', 'tidak bisa tidur',
        'flashback', 'teringat terus',
        'jijik', 'kotor', 'merasa kotor'
    ];
    
    /**
     * Kata-kata pencarian bantuan (Layer 1)
     */
    private static $helpSeekingKeywords = [
        'tolong', 'tolongin', 'minta tolong',
        'bantu', 'bantuin', 'minta bantuan',
        'harus gimana', 'harus bagaimana',
        'bisa lapor', 'mau lapor', 'ingin lapor',
        'gimana caranya', 'bagaimana caranya',
        'apa yang harus', 'aku harus apa'
    ];
    
    /**
     * Pattern untuk self-reference dengan verb pasif (Layer 2)
     * Mendeteksi kalimat seperti "saya dilecehkan", "aku dipaksa"
     */
    private static $selfVerbPatterns = [
        '/\b(saya|aku|gue|gw|ane)\s+(di\w+kan|di\w+i)\b/iu',
        '/\b(saya|aku|gue|gw|ane)\s+(pernah|sudah|baru)\s+di\w+/iu',
        '/\b(ke\s*saya|ke\s*aku|sama\s*saya|sama\s*aku)\b/iu',
        '/\bdia\s+(melakukan|lakukan|lakuin)\s+\w+\s+(ke|sama)\s*(saya|aku)/iu'
    ];
    
    /**
     * Pattern untuk cerita kekerasan implisit (Layer 2)
     * Menangkap cerita yang tidak langsung menyebut "dilecehkan"
     */
    private static $implicitViolencePatterns = [
        '/\b(dia|beliau|orang\s+itu)\s+(sering|selalu|terus)\s+(pegang|sentuh|raba)/iu',
        '/\b(dipaksa|memaksa|maksa)\s+(untuk|buat|supaya)/iu',
        '/\btidak\s+(mau|ingin)\s+tapi\s+(dia|beliau)/iu',
        '/\baku\s+bilang\s+(tidak|nggak|gak)\s+tapi/iu',
        '/\b(ancam|mengancam|diancam)\s+(untuk|kalau|jika)/iu',
        '/\b(foto|video)\s+(intim|bugil|telanjang)/iu',
        '/\b(kirim|mengirim)\s+(foto|gambar)\s+(jorok|porno|mesum)/iu'
    ];
    
    /**
     * Klasifikasikan intent dari pesan user
     * 
     * @param string $message Pesan dari user
     * @param array $context Konteks percakapan sebelumnya (opsional)
     * @return array Hasil klasifikasi dengan score dan detail
     */
    public static function classify($message, $context = []) {
        $result = [
            'score' => 0,
            'tier' => TIER_CASUAL,
            'signals' => [],
            'requires_ai' => false,
            'breakdown' => [
                'violence' => 0,
                'perpetrator' => 0,
                'time' => 0,
                'location' => 0,
                'distress' => 0,
                'self_reference' => 0,
                'help_seeking' => 0
            ]
        ];
        
        // Normalisasi pesan
        $normalizedMsg = self::normalizeMessage($message);
        
        // Layer 1: Keyword-based detection
        $result = self::layerOneDetection($normalizedMsg, $result);
        
        // Layer 2: Semantic pattern detection
        $result = self::layerTwoDetection($normalizedMsg, $result);
        
        // Tentukan tier berdasarkan score
        $result['tier'] = self::determineTier($result['score']);
        
        // Tandai jika perlu verifikasi AI (kasus ambigu)
        if ($result['score'] >= 4 && $result['score'] <= 6) {
            $result['requires_ai'] = true;
        }
        
        return $result;
    }
    
    /**
     * Layer 1: Deteksi berbasis keyword
     * Cepat dan tidak memerlukan AI
     */
    private static function layerOneDetection($message, $result) {
        // Violence keywords (bobot tertinggi)
        foreach (self::$violenceKeywords as $keyword) {
            if (stripos($message, $keyword) !== false) {
                $result['breakdown']['violence'] += SCORE_VIOLENCE_KEYWORD;
                $result['signals'][] = "violence:$keyword";
                break; // Hanya hitung sekali per kategori
            }
        }
        
        // Perpetrator keywords
        foreach (self::$perpetratorKeywords as $keyword) {
            if (stripos($message, $keyword) !== false) {
                $result['breakdown']['perpetrator'] += SCORE_PERPETRATOR;
                $result['signals'][] = "perpetrator:$keyword";
                break;
            }
        }
        
        // Time keywords
        foreach (self::$timeKeywords as $keyword) {
            if (stripos($message, $keyword) !== false) {
                $result['breakdown']['time'] += SCORE_TIME_REFERENCE;
                $result['signals'][] = "time:$keyword";
                break;
            }
        }
        
        // Location keywords
        foreach (self::$locationKeywords as $keyword) {
            if (stripos($message, $keyword) !== false) {
                $result['breakdown']['location'] += SCORE_LOCATION_REFERENCE;
                $result['signals'][] = "location:$keyword";
                break;
            }
        }
        
        // Distress keywords
        foreach (self::$distressKeywords as $keyword) {
            if (stripos($message, $keyword) !== false) {
                $result['breakdown']['distress'] += SCORE_DISTRESS;
                $result['signals'][] = "distress:$keyword";
                break;
            }
        }
        
        // Help-seeking keywords
        foreach (self::$helpSeekingKeywords as $keyword) {
            if (stripos($message, $keyword) !== false) {
                $result['breakdown']['help_seeking'] += SCORE_HELP_SEEKING;
                $result['signals'][] = "help:$keyword";
                break;
            }
        }
        
        // Hitung total score
        $result['score'] = array_sum($result['breakdown']);
        
        return $result;
    }
    
    /**
     * Layer 2: Deteksi berbasis pola semantik
     * Menangkap cerita implisit yang tidak terdeteksi Layer 1
     */
    private static function layerTwoDetection($message, $result) {
        // Self-reference patterns
        foreach (self::$selfVerbPatterns as $pattern) {
            if (preg_match($pattern, $message, $matches)) {
                $result['breakdown']['self_reference'] += SCORE_SELF_REFERENCE;
                $result['signals'][] = "self_verb:" . ($matches[0] ?? 'match');
                break;
            }
        }
        
        // Implicit violence patterns
        foreach (self::$implicitViolencePatterns as $pattern) {
            if (preg_match($pattern, $message, $matches)) {
                // Tambah bobot violence jika belum ada
                if ($result['breakdown']['violence'] === 0) {
                    $result['breakdown']['violence'] += SCORE_VIOLENCE_KEYWORD - 1;
                    $result['signals'][] = "implicit_violence:" . ($matches[0] ?? 'match');
                }
                break;
            }
        }
        
        // Recalculate score
        $result['score'] = array_sum($result['breakdown']);
        
        return $result;
    }
    
    /**
     * Tentukan tier berdasarkan score
     */
    private static function determineTier($score) {
        if ($score >= INTENT_THRESHOLD_STRONG) {
            return TIER_REPORT; // 10+: Strong report intent
        } elseif ($score >= INTENT_THRESHOLD_REPORT) {
            return TIER_POTENTIAL; // 7-9: Potential report
        } elseif ($score >= INTENT_THRESHOLD_CURHAT + 1) {
            return TIER_CURHAT; // 4-6: Curhat dengan indikasi
        } elseif ($score >= INTENT_THRESHOLD_CASUAL + 1) {
            return TIER_CASUAL; // 1-3: Casual conversation
        }
        
        return TIER_FAQ; // 0: FAQ atau greeting
    }
    
    /**
     * Public wrapper untuk determineTier - untuk akses dari chat.php
     * @param int $score Skor kumulatif
     * @return int Tier level
     */
    public static function getTierFromScore($score) {
        return self::determineTier($score);
    }
    
    /**
     * Normalisasi pesan untuk deteksi yang lebih akurat
     */
    private static function normalizeMessage($message) {
        // Lowercase
        $message = strtolower($message);
        
        // Hapus multiple spaces
        $message = preg_replace('/\s+/', ' ', $message);
        
        // Normalisasi variasi penulisan umum
        $replacements = [
            'gw' => 'gue',
            'gua' => 'gue',
            'sy' => 'saya',
            'ak' => 'aku',
            'yg' => 'yang',
            'dgn' => 'dengan',
            'krn' => 'karena',
            'org' => 'orang',
            'ga' => 'tidak',
            'gak' => 'tidak',
            'nggak' => 'tidak',
            'enggak' => 'tidak',
            'tdk' => 'tidak',
            'blm' => 'belum',
            'udh' => 'sudah',
            'sdh' => 'sudah',
            'lg' => 'lagi',
            'br' => 'baru',
            'sm' => 'sama',
            'kyk' => 'kayak',
            'bgt' => 'banget',
            'bngt' => 'banget'
        ];
        
        foreach ($replacements as $from => $to) {
            $message = preg_replace('/\b' . preg_quote($from, '/') . '\b/i', $to, $message);
        }
        
        return trim($message);
    }
    
    /**
     * Cek apakah pesan memerlukan klasifikasi AI
     * Untuk kasus yang Layer 1 & 2 tidak bisa yakin
     */
    public static function requiresAIClassification($result) {
        return $result['requires_ai'];
    }
    
    /**
     * Gabungkan hasil multiple messages untuk context-aware scoring
     * Berguna untuk melihat pola dalam percakapan panjang
     */
    public static function aggregateScores($messageResults) {
        $aggregated = [
            'total_score' => 0,
            'max_single_score' => 0,
            'average_score' => 0,
            'all_signals' => [],
            'tier' => TIER_CASUAL
        ];
        
        if (empty($messageResults)) {
            return $aggregated;
        }
        
        foreach ($messageResults as $result) {
            $aggregated['total_score'] += $result['score'];
            $aggregated['max_single_score'] = max($aggregated['max_single_score'], $result['score']);
            $aggregated['all_signals'] = array_merge($aggregated['all_signals'], $result['signals']);
        }
        
        $aggregated['average_score'] = $aggregated['total_score'] / count($messageResults);
        
        // Tier berdasarkan max score (satu pesan strong sudah cukup)
        $aggregated['tier'] = self::determineTier($aggregated['max_single_score']);
        
        return $aggregated;
    }
}
