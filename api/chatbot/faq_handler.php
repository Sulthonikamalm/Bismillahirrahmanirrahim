<?php
/**
 * SIGAP PPKS - FAQ Handler
 * 
 * Handler untuk menjawab pertanyaan umum (FAQ) tanpa menggunakan AI.
 * Ini mengurangi beban API dan mempercepat respons untuk pertanyaan standar.
 * 
 * RASIONAL:
 * - FAQ dijawab secara instan tanpa API call
 * - Mengurangi biaya dan latensi
 * - Konsistensi jawaban untuk pertanyaan standar
 * - Fallback jika AI tidak tersedia
 * 
 * @package SIGAP_PPPS
 * @subpackage ChatBot
 */

class FAQHandler {
    
    /**
     * Database FAQ dengan pattern matching dan respons
     * Format: ['patterns' => [...], 'response' => '...', 'category' => '...']
     */
    private static $faqDatabase = [
        
        // === TENTANG SIGAP PPKPT ===
        [
            'patterns' => [
                'apa itu ppkpt', 'apa itu sigap', 'ppkpt itu apa',
                'sigap itu apa', 'ppkpt adalah', 'satgas ppkpt',
                'kepanjangan ppkpt', 'singkatan ppkpt'
            ],
            'response' => "SIGAP PPKPT adalah Satuan Tugas Pencegahan dan Penanganan Kekerasan di Perguruan Tinggi.\n\nKami bertugas untuk:\n• Mencegah kekerasan seksual di lingkungan kampus\n• Menangani laporan kekerasan dengan rahasia\n• Memberikan pendampingan kepada korban\n• Mengedukasi civitas akademika\n\nKamu aman bercerita di sini. Semua informasi dijaga kerahasiaannya. 🤝",
            'category' => 'about'
        ],
        
        // === CARA MELAPOR ===
        [
            'patterns' => [
                'cara melapor', 'bagaimana cara melapor', 'gimana cara lapor',
                'mau lapor gimana', 'prosedur lapor', 'langkah melapor',
                'step melapor', 'proses pelaporan'
            ],
            'response' => "Ada beberapa cara untuk melapor:\n\n1️⃣ **Melalui Chat Ini**\nCeritakan pengalamanmu, dan aku akan bantu membuat laporan.\n\n2️⃣ **Formulir Online**\nKamu bisa langsung isi formulir di halaman Lapor.\n\n3️⃣ **WhatsApp Satgas**\nHubungi langsung tim Satgas PPKPT.\n\nPilih cara yang paling nyaman untukmu. Identitasmu akan dijaga kerahasiaannya. 💪",
            'category' => 'reporting'
        ],
        
        // === KERAHASIAAN ===
        [
            'patterns' => [
                'apakah rahasia', 'identitas aman', 'dijaga kerahasiaan',
                'orang lain tahu', 'ketahuan', 'privasi', 'privacy',
                'siapa yang tahu', 'dirahasiakan', 'anonim'
            ],
            'response' => "Tentu saja, kerahasiaanmu adalah prioritas utama kami! 🔒\n\n✅ **Yang Kami Jamin:**\n• Identitasmu hanya diketahui tim Satgas yang menangani\n• Tidak ada informasi yang dibagikan tanpa izinmu\n• Kamu bisa melapor secara anonim jika mau\n• Data tersimpan dengan enkripsi yang aman\n\nKamu bisa bercerita dengan tenang di sini. 💙",
            'category' => 'privacy'
        ],
        
        // === DURASI PROSES ===
        [
            'patterns' => [
                'berapa lama', 'kapan selesai', 'proses berapa lama',
                'timeline', 'waktu penanganan', 'ditindaklanjuti kapan',
                'menunggu berapa lama'
            ],
            'response' => "Setiap laporan akan ditindaklanjuti dalam waktu:\n\n⏱️ **Timeline Penanganan:**\n• Laporan diterima: Konfirmasi dalam 1x24 jam\n• Verifikasi awal: 2-3 hari kerja\n• Investigasi: Tergantung kompleksitas kasus\n• Tindak lanjut: Diinformasikan secara berkala\n\nKamu bisa cek status laporanmu di halaman Monitoring dengan kode laporan yang diberikan. 📋",
            'category' => 'timeline'
        ],
        
        // === SIAPA YANG MENANGANI ===
        [
            'patterns' => [
                'siapa yang menangani', 'tim satgas', 'yang handle',
                'ditangani siapa', 'anggota satgas', 'personil',
                'siapa saja yang terlibat'
            ],
            'response' => "Laporanmu akan ditangani oleh Tim Satgas PPKPT yang terdiri dari:\n\n👥 **Tim Profesional:**\n• Koordinator Satgas\n• Konselor/Psikolog terlatih\n• Tim investigasi independen\n• Perwakilan unit terkait\n\nSemua anggota tim telah menandatangani perjanjian kerahasiaan dan terlatih menangani kasus kekerasan seksual dengan sensitif. 💼",
            'category' => 'team'
        ],
        
        // === GRATIS ===
        [
            'patterns' => [
                'bayar', 'gratis', 'biaya', 'berbayar', 'free',
                'ada biaya', 'berapa biaya', 'harus bayar'
            ],
            'response' => "Semua layanan SIGAP PPKPT **100% GRATIS**! 🆓\n\n✅ **Yang gratis:**\n• Pelaporan\n• Konseling awal\n• Pendampingan proses\n• Rujukan ke layanan lanjutan\n\nJangan ragu untuk menggunakan layanan kami. Tidak ada biaya tersembunyi apapun. 💯",
            'category' => 'cost'
        ],
        
        // === JENIS KEKERASAN ===
        [
            'patterns' => [
                'jenis kekerasan', 'apa saja yang bisa dilaporkan',
                'yang termasuk kekerasan', 'bentuk kekerasan',
                'contoh kekerasan', 'kategori kekerasan'
            ],
            'response' => "Berikut jenis kekerasan yang bisa dilaporkan:\n\n📋 **Kategori Kekerasan:**\n• Pelecehan seksual verbal (catcalling, komentar cabul)\n• Pelecehan non-verbal (gesture, tatapan tidak pantas)\n• Pelecehan fisik (sentuhan tidak diinginkan)\n• Pemaksaan seksual\n• Eksploitasi (revenge porn, dll)\n• Perundungan berbasis gender\n• Perkosaan\n\nJika kamu mengalami atau menyaksikan hal-hal di atas, jangan ragu untuk melapor. 🤝",
            'category' => 'types'
        ],
        
        // === CEK STATUS ===
        [
            'patterns' => [
                'cek status', 'status laporan', 'tracking', 'monitor laporan',
                'lihat progress', 'udah sampai mana', 'sudah ditindaklanjuti'
            ],
            'response' => "Untuk mengecek status laporanmu:\n\n📍 **Cara Cek Status:**\n1. Buka halaman Monitoring\n2. Masukkan kode laporan yang kamu terima\n3. Lihat status terkini\n\nStatus yang mungkin muncul:\n• 🟡 Diterima - Laporan masuk ke sistem\n• 🔵 Diproses - Sedang diverifikasi\n• 🟢 Selesai - Sudah ditindaklanjuti\n\nSimpan baik-baik kode laporanmu! 📋",
            'category' => 'monitoring'
        ],
        
        // === SAKSI ===
        [
            'patterns' => [
                'sebagai saksi', 'saya saksi', 'melihat kejadian',
                'teman saya', 'bukan saya yang', 'melaporkan orang lain',
                'lapor untuk orang lain'
            ],
            'response' => "Kamu juga bisa melapor sebagai saksi atau pihak ketiga! 👁️\n\n✅ **Yang bisa melapor:**\n• Korban langsung\n• Saksi (orang yang melihat/mengetahui kejadian)\n• Keluarga atau kerabat korban\n• Teman yang dipercaya korban\n\nLaporanmu sama pentingnya. Terima kasih sudah peduli dan berani berbicara! 💪",
            'category' => 'witness'
        ],
        
        // === EMERGENCY ===
        [
            'patterns' => [
                'darurat', 'emergency', 'urgent', 'sedang terjadi',
                'tolong sekarang', 'bahaya', 'segera'
            ],
            'response' => "🚨 **JIKA KAMU DALAM BAHAYA SEKARANG:**\n\n1. Pastikan keselamatanmu terlebih dahulu\n2. Hubungi langsung:\n   📞 WhatsApp Satgas: 082188467793\n   📞 Hotline: 119 ext 8\n\n3. Jika memungkinkan, pergi ke tempat yang aman\n\nKamu tidak sendirian. Bantuan sedang dalam perjalanan! 🆘",
            'category' => 'emergency'
        ],
        
        // === GREETING ===
        [
            'patterns' => [
                'halo', 'hai', 'hi', 'hello', 'selamat pagi',
                'selamat siang', 'selamat sore', 'selamat malam',
                'pagi', 'siang', 'sore', 'malam', 'assalamualaikum'
            ],
            'response' => "Halo! 👋 Selamat datang di TemanKu.\n\nAku di sini untuk mendengarkan dan membantumu. Ruang ini aman dan rahasia.\n\nAda yang bisa aku bantu hari ini? 💙",
            'category' => 'greeting'
        ],
        
        // === TERIMA KASIH ===
        [
            'patterns' => [
                'terima kasih', 'makasih', 'thanks', 'thank you',
                'thx', 'tq', 'makasi'
            ],
            'response' => "Sama-sama! 😊\n\nAku senang bisa membantu. Jika kamu butuh sesuatu lagi, jangan ragu untuk kembali.\n\nJaga dirimu baik-baik ya! 💪",
            'category' => 'thanks'
        ]
    ];
    
    /**
     * Cek apakah pesan adalah FAQ dan kembalikan respons jika cocok
     * 
     * @param string $message Pesan dari user
     * @return array|null [matched => bool, response => string, category => string] atau null jika bukan FAQ
     */
    public static function checkFAQ($message) {
        $normalizedMsg = self::normalizeForMatching($message);
        
        foreach (self::$faqDatabase as $faq) {
            foreach ($faq['patterns'] as $pattern) {
                // Cek exact match atau partial match
                if (self::matchesPattern($normalizedMsg, $pattern)) {
                    return [
                        'matched' => true,
                        'response' => $faq['response'],
                        'category' => $faq['category']
                    ];
                }
            }
        }
        
        return null;
    }
    
    /**
     * Cek apakah pesan hanya greeting sederhana
     */
    public static function isSimpleGreeting($message) {
        $result = self::checkFAQ($message);
        return $result !== null && $result['category'] === 'greeting';
    }
    
    /**
     * Cek apakah pesan termasuk case emergency
     */
    public static function isEmergencyFAQ($message) {
        $result = self::checkFAQ($message);
        return $result !== null && $result['category'] === 'emergency';
    }
    
    /**
     * Normalisasi pesan untuk matching
     */
    private static function normalizeForMatching($message) {
        $message = strtolower(trim($message));
        $message = preg_replace('/[^\w\s]/u', ' ', $message);
        $message = preg_replace('/\s+/', ' ', $message);
        return $message;
    }
    
    /**
     * Cek apakah pesan cocok dengan pattern
     */
    private static function matchesPattern($message, $pattern) {
        // Normalisasi pattern
        $pattern = strtolower(trim($pattern));
        
        // Cek exact match
        if ($message === $pattern) {
            return true;
        }
        
        // Cek partial match (pattern ada di dalam message)
        if (strpos($message, $pattern) !== false) {
            return true;
        }
        
        // Cek word boundary match untuk pattern pendek
        if (strlen($pattern) < 15) {
            $patternWords = explode(' ', $pattern);
            $matched = 0;
            foreach ($patternWords as $word) {
                if (strpos($message, $word) !== false) {
                    $matched++;
                }
            }
            // 80% kata harus match
            if ($matched >= count($patternWords) * 0.8) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Dapatkan semua kategori FAQ yang tersedia
     */
    public static function getAvailableCategories() {
        $categories = [];
        foreach (self::$faqDatabase as $faq) {
            if (!in_array($faq['category'], $categories)) {
                $categories[] = $faq['category'];
            }
        }
        return $categories;
    }
    
    /**
     * Dapatkan semua FAQ dalam kategori tertentu
     */
    public static function getFAQsByCategory($category) {
        $faqs = [];
        foreach (self::$faqDatabase as $faq) {
            if ($faq['category'] === $category) {
                $faqs[] = $faq;
            }
        }
        return $faqs;
    }
}
