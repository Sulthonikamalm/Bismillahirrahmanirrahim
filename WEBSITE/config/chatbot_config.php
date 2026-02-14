<?php
/**
 * SIGAP PPKS - Konfigurasi Chatbot
 * 
 * File ini berisi semua konstanta dan konfigurasi untuk sistem chatbot.
 * Dipisahkan dari config.php untuk separation of concerns.
 * 
 * @package SIGAP_PPKS
 * @subpackage ChatBot
 */

// Pastikan env loader sudah dimuat
if (!function_exists('env')) {
    require_once __DIR__ . '/env_loader.php';
}

// ============================================
// GROQ API CONFIGURATION
// ============================================

// API Keys - Primary dan Secondary untuk failover
if (!defined('GROQ_API_KEY_PRIMARY')) {
    define('GROQ_API_KEY_PRIMARY', env('GROQ_API_KEY', ''));
}

if (!defined('GROQ_API_KEY_SECONDARY')) {
    define('GROQ_API_KEY_SECONDARY', env('GROQ_API_KEY_SECONDARY', ''));
}

// Model AI yang digunakan
// Primary: Model besar untuk akurasi tinggi
// Secondary: Model lebih ringan untuk fallback
if (!defined('GROQ_MODEL_PRIMARY')) {
    define('GROQ_MODEL_PRIMARY', env('GROQ_MODEL_PRIMARY', 'llama-3.3-70b-versatile'));
}

if (!defined('GROQ_MODEL_SECONDARY')) {
    define('GROQ_MODEL_SECONDARY', env('GROQ_MODEL_SECONDARY', 'llama-3.1-8b-instant'));
}

// ============================================
// INTENT DETECTION THRESHOLDS
// ============================================

/**
 * Threshold Score untuk Intent Classification
 * 
 * RASIONAL:
 * - 0-3:  Casual/FAQ - Tidak ada indikasi sensitif
 * - 4-6:  Curhat potensial - Ada emotional distress tapi belum laporan
 * - 7-9:  Potential report - Ada indikasi kuat kejadian kekerasan
 * - 10+:  Strong report - Sangat jelas ada intent melapor
 * 
 * Threshold 7 dipilih karena:
 * 1. Cukup tinggi untuk menghindari false positive (curhat biasa)
 * 2. Cukup rendah untuk menangkap cerita implisit tentang kekerasan
 * 3. Berdasarkan testing dengan real-case scenarios
 */
if (!defined('INTENT_THRESHOLD_CASUAL')) {
    define('INTENT_THRESHOLD_CASUAL', 3);
}

if (!defined('INTENT_THRESHOLD_CURHAT')) {
    define('INTENT_THRESHOLD_CURHAT', 6);
}

if (!defined('INTENT_THRESHOLD_REPORT')) {
    define('INTENT_THRESHOLD_REPORT', env('CHATBOT_REPORT_THRESHOLD', 7));
}

if (!defined('INTENT_THRESHOLD_STRONG')) {
    define('INTENT_THRESHOLD_STRONG', 10);
}

// ============================================
// SCORING WEIGHTS
// ============================================

/**
 * Bobot scoring untuk deteksi intent
 * 
 * RASIONAL setiap bobot:
 * - Violence keywords (+5): Kata-kata eksplisit = confidence tinggi
 * - Perpetrator mention (+3): Menyebut pelaku = indikasi laporan
 * - Time reference (+2): Ada kronologi = bukan sekadar curhat
 * - Location reference (+2): Ada detail lokasi = cerita konkret
 * - Distress indicators (+1): Emosi = bisa curhat atau laporan
 * - Self-reference + verb (+2): "saya di-" = pengalaman personal
 * - Help-seeking (+3): Minta tolong = butuh tindak lanjut
 */
if (!defined('SCORE_VIOLENCE_KEYWORD')) {
    define('SCORE_VIOLENCE_KEYWORD', 5);
}

if (!defined('SCORE_PERPETRATOR')) {
    define('SCORE_PERPETRATOR', 3);
}

if (!defined('SCORE_TIME_REFERENCE')) {
    define('SCORE_TIME_REFERENCE', 2);
}

if (!defined('SCORE_LOCATION_REFERENCE')) {
    define('SCORE_LOCATION_REFERENCE', 2);
}

if (!defined('SCORE_DISTRESS')) {
    define('SCORE_DISTRESS', 1);
}

if (!defined('SCORE_SELF_REFERENCE')) {
    define('SCORE_SELF_REFERENCE', 2);
}

if (!defined('SCORE_HELP_SEEKING')) {
    define('SCORE_HELP_SEEKING', 3);
}

// ============================================
// SESSION & STORAGE CONFIGURATION
// ============================================

// Durasi penyimpanan chat history (hari)
if (!defined('CHAT_RETENTION_DAYS')) {
    define('CHAT_RETENTION_DAYS', env('CHATBOT_SESSION_RETENTION_DAYS', 7));
}

// Durasi penyimpanan emergency log (jam)
if (!defined('EMERGENCY_RETENTION_HOURS')) {
    define('EMERGENCY_RETENTION_HOURS', env('CHATBOT_EMERGENCY_RETENTION_HOURS', 168));
}

// ============================================
// QUOTA MANAGEMENT
// ============================================

// Batas quota harian per API key
if (!defined('DAILY_QUOTA_LIMIT')) {
    define('DAILY_QUOTA_LIMIT', env('CHATBOT_DAILY_QUOTA_LIMIT', 1000));
}

// Threshold untuk switch ke secondary (persentase)
if (!defined('QUOTA_WARNING_THRESHOLD')) {
    define('QUOTA_WARNING_THRESHOLD', 0.8); // 80%
}

if (!defined('QUOTA_CRITICAL_THRESHOLD')) {
    define('QUOTA_CRITICAL_THRESHOLD', 0.95); // 95%
}

// ============================================
// ENCRYPTION CONFIGURATION
// ============================================

// Kunci enkripsi untuk chat localStorage
if (!defined('CHAT_ENCRYPTION_KEY')) {
    define('CHAT_ENCRYPTION_KEY', env('CHAT_ENCRYPTION_KEY', ''));
}

// ============================================
// CONVERSATION TIERS
// ============================================

/**
 * Tier levels untuk conversation state
 * Menentukan bagaimana data disimpan pada setiap tier
 */
if (!defined('TIER_FAQ')) {
    define('TIER_FAQ', 0);           // In-memory only
}

if (!defined('TIER_CASUAL')) {
    define('TIER_CASUAL', 1);        // Session memory
}

if (!defined('TIER_CURHAT')) {
    define('TIER_CURHAT', 2);        // Session + localStorage
}

if (!defined('TIER_POTENTIAL')) {
    define('TIER_POTENTIAL', 3);     // Session + buffer
}

if (!defined('TIER_CONSENT')) {
    define('TIER_CONSENT', 4);       // Prepare for DB
}

if (!defined('TIER_REPORT')) {
    define('TIER_REPORT', 5);        // Full DB persist
}
