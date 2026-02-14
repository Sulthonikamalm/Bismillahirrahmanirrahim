<?php
/**
 * SIGAP PPKS - Chat API v4.0 (Smart Intent-Based Persistence)
 * 
 * API endpoint untuk chatbot dengan arsitektur baru:
 * - Intent-based data persistence (tidak semua chat disimpan ke DB)
 * - Multi-layer intent classification
 * - FAQ responses tanpa AI
 * - Quota management dengan failover
 * - Emergency logging untuk compliance
 * 
 * FLOW BARU:
 * 1. Cek FAQ → Jika match, respons langsung tanpa AI atau DB
 * 2. Klasifikasi intent (multi-layer scoring)
 * 3. Score < 7 → Session only, TIDAK simpan ke DB
 * 4. Score >= 7 → Buffer, siapkan untuk consent
 * 5. Consent given → Batch persist ke DB
 * 6. Emergency → Log untuk compliance
 * 
 * @package SIGAP_PPKS
 * @subpackage ChatBot
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/chat_error.log');
ini_set('memory_limit', '256M');
ini_set('max_execution_time', '60');

ob_start();

// Load dependencies
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../config/chatbot_config.php';

// CORS headers
header('Content-Type: application/json; charset=utf-8');
if (handlePublicCors()) {
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Custom error handler
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    if (strpos($errstr, 'session') !== false && $errno === E_WARNING) {
        return true;
    }
    error_log("PHP Error [$errno]: $errstr in $errfile:$errline");
    return false;
});

session_start();

// Load remaining dependencies
try {
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/groq_client.php';
    require_once __DIR__ . '/chat_helpers.php';
    require_once __DIR__ . '/intent_classifier.php';
    require_once __DIR__ . '/faq_handler.php';
    require_once __DIR__ . '/emergency_logger.php';
} catch (Exception $e) {
    error_log("Failed to load dependencies: " . $e->getMessage());
    http_response_code(500);
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Server configuration error']);
    exit();
}

// Validasi API key tersedia
if (empty(GROQ_API_KEY_PRIMARY) && empty(GROQ_API_KEY_SECONDARY)) {
    error_log("CRITICAL: No GROQ API key configured");
    // Lanjutkan dengan fallback mode
}

try {
    error_log("=== CHAT REQUEST START ===");
    $requestStartTime = microtime(true);
    
    // Parse input
    $input = file_get_contents('php://input');
    
    if (empty($input)) {
        throw new Exception('Empty request body');
    }
    
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    $action = $data['action'] ?? 'chat';
    
    // Handle reset
    if ($action === 'reset') {
        resetSession();
        ob_clean();
        echo json_encode(['success' => true, 'message' => 'Session reset']);
        exit();
    }
    
    // Handle restore (untuk melanjutkan chat dari localStorage)
    if ($action === 'restore') {
        handleRestore($data);
        exit();
    }
    
    // Validasi message
    if (!isset($data['message']) || empty(trim($data['message']))) {
        throw new Exception('Message is required');
    }
    
    $userMessage = trim($data['message']);
    error_log("User message: " . substr($userMessage, 0, 100));
    
    // ============================================
    // STEP 1: INISIALISASI SESSION
    // ============================================
    initializeSession();
    $_SESSION['message_count']++;
    
    // ============================================
    // STEP 2: CEK FAQ (Tanpa AI, Tanpa DB)
    // ============================================
    $faqResult = FAQHandler::checkFAQ($userMessage);
    
    if ($faqResult !== null) {
        error_log("FAQ matched: " . $faqResult['category']);
        
        // Simpan ke session history saja (bukan DB)
        addToSessionHistory('user', $userMessage);
        addToSessionHistory('assistant', $faqResult['response']);
        
        ob_clean();
        echo json_encode([
            'success' => true,
            'response' => $faqResult['response'],
            'phase' => 'faq',
            'tier' => TIER_FAQ,
            'category' => $faqResult['category'],
            'session_id' => $_SESSION['session_id_unik'] ?? null,
            'persisted' => false  // Menandakan tidak disimpan ke DB
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // ============================================
    // STEP 3: INTENT CLASSIFICATION (Multi-Layer)
    // ============================================
    $intentResult = IntentClassifier::classify($userMessage);
    $currentScore = $intentResult['score'];
    $currentTier = $intentResult['tier'];
    
    error_log("Intent score: $currentScore, Tier: $currentTier, Signals: " . implode(', ', $intentResult['signals']));
    
    // PERBAIKAN: AKUMULASI skor dari semua pesan
    // Ini memungkinkan cerita berbelit-belit akhirnya mencapai threshold
    if (!isset($_SESSION['cumulative_score'])) {
        $_SESSION['cumulative_score'] = 0;
        $_SESSION['detected_signals'] = [];
    }
    
    // Hanya tambahkan skor dari sinyal yang BELUM terdeteksi sebelumnya
    $newSignals = array_diff($intentResult['signals'], $_SESSION['detected_signals']);
    if (!empty($newSignals)) {
        // Hitung skor hanya dari sinyal baru
        $newScore = 0;
        foreach ($newSignals as $signal) {
            $parts = explode(':', $signal);
            $type = $parts[0];
            // Berikan poin berdasarkan tipe sinyal
            switch ($type) {
                case 'violence': $newScore += 5; break;
                case 'perpetrator': $newScore += 3; break;
                case 'time': $newScore += 2; break;
                case 'location': $newScore += 2; break;
                case 'distress': $newScore += 1; break;
                case 'help': $newScore += 3; break;
                case 'self_reference': $newScore += 2; break;
                case 'implicit_violence': $newScore += 3; break;
            }
        }
        $_SESSION['cumulative_score'] += $newScore;
        $_SESSION['detected_signals'] = array_merge($_SESSION['detected_signals'], $newSignals);
        error_log("New signals detected: " . implode(', ', $newSignals) . " | Added $newScore points");
    }
    
    // Update max_score dengan nilai kumulatif
    $_SESSION['max_score'] = $_SESSION['cumulative_score'];
    $_SESSION['max_tier'] = IntentClassifier::getTierFromScore($_SESSION['cumulative_score']);
    
    error_log("Cumulative score: {$_SESSION['cumulative_score']}, Max tier: {$_SESSION['max_tier']}");
    
    // ============================================
    // STEP 4: CEK EMERGENCY
    // ============================================
    if (ChatHelpers::isEmergency($userMessage)) {
        handleEmergency($userMessage);
        exit();
    }
    
    // ============================================
    // STEP 5: SIMPAN KE SESSION HISTORY
    // ============================================
    addToSessionHistory('user', $userMessage);
    
    // ============================================
    // STEP 6: TENTUKAN FASE PERCAKAPAN
    // ============================================
    $currentPhase = determinePhase($intentResult);
    error_log("Current phase: $currentPhase");
    
    // ============================================
    // STEP 7: HANDLE OFF-TOPIC (Tetap di session, tidak ke DB)
    // ============================================
    if (ChatHelpers::isOffTopic($userMessage)) {
        $offTopicResponse = "Hmm, aku khusus bantu soal curhat atau laporan PPKS aja nih. Ada yang mau kamu ceritain terkait itu? 😊";
        
        addToSessionHistory('assistant', $offTopicResponse);
        
        ob_clean();
        echo json_encode([
            'success' => true,
            'response' => $offTopicResponse,
            'phase' => 'off_topic',
            'tier' => TIER_CASUAL,
            'session_id' => $_SESSION['session_id_unik'] ?? null,
            'persisted' => false
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // ============================================
    // STEP 8: HANDLE CONSENT FLOW
    // ============================================
    if ($_SESSION['consent_asked'] && !$_SESSION['consent_given']) {
        $consentResponse = ChatHelpers::detectConsent($userMessage);
        error_log("Consent detection: $consentResponse");
        
        if ($consentResponse === 'yes') {
            $_SESSION['consent_given'] = true;
            $_SESSION['consent_timestamp'] = date('Y-m-d H:i:s');
            
            // SEKARANG baru create DB session
            createDBSession();
            
            // Persist semua history yang sudah terkumpul
            persistConversationHistory();
            
            $currentPhase = 'report';
            error_log("Consent given - entering report phase, DB session created");
            
        } elseif ($consentResponse === 'no') {
            $rejectResponse = "Tidak apa-apa kok, keputusan ada di kamu. Yang penting kamu udah berani cerita.\n\nAku tetap di sini kalau kamu butuh teman ngobrol atau suatu saat berubah pikiran.";
            
            addToSessionHistory('assistant', $rejectResponse);
            
            ob_clean();
            echo json_encode([
                'success' => true,
                'response' => $rejectResponse,
                'phase' => 'rejected',
                'tier' => TIER_CURHAT,
                'session_id' => $_SESSION['session_id_unik'] ?? null,
                'persisted' => false
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
    }
    
    // ============================================
    // STEP 9: PROGRESSIVE EXTRACTION (Jika sudah consent)
    // ============================================
    if ($_SESSION['consent_given']) {
        $currentPhase = 'report';
        
        try {
            $groq = new GroqClient();
            $conversationText = ChatHelpers::getConversationText($_SESSION['conversation_history']);
            $extractedData = $groq->extractLabelsForAutofill($conversationText);
            
            if ($extractedData && isset($extractedData['extracted_data'])) {
                $_SESSION['extracted_labels'] = ChatHelpers::mergeLabels(
                    $_SESSION['extracted_labels'],
                    $extractedData['extracted_data']
                );
                error_log("Updated labels: " . json_encode($_SESSION['extracted_labels']));
            }
        } catch (Exception $e) {
            error_log("Extraction error: " . $e->getMessage());
        }
        
        // Cek apakah sudah lengkap untuk membuat laporan
        if (ChatHelpers::isLabelsComplete($_SESSION['extracted_labels'])) {
            handleReportCompletion();
            exit();
        }
    }
    
    // ============================================
    // STEP 10: GENERATE AI RESPONSE
    // ============================================
    $groq = new GroqClient();
    
    // PERBAIKAN: Gunakan KUMULATIF max_score dari session, bukan per-pesan
    // Jika kumulatif score >= 7 dan belum minta consent, trigger consent
    $cumulativeScore = $_SESSION['max_score'] ?? 0;
    $cumulativeTier = $_SESSION['max_tier'] ?? TIER_CASUAL;
    $messageCount = $_SESSION['message_count'] ?? 0;
    
    // PERBAIKAN: Consent hanya muncul jika:
    // 1. Skor kumulatif sudah cukup tinggi (tier >= POTENTIAL)
    // 2. Sudah ada minimal 4 pesan (biar sempat tanya detail dulu)
    // 3. Belum pernah diminta consent
    $minMessagesForConsent = 4;
    
    if ($cumulativeTier >= TIER_POTENTIAL && 
        !$_SESSION['consent_asked'] && 
        $messageCount >= $minMessagesForConsent) {
        $_SESSION['consent_asked'] = true;
        $currentPhase = 'consent';
        error_log("CONSENT TRIGGERED - Cumulative score: $cumulativeScore, Tier: $cumulativeTier, Messages: $messageCount");
    } elseif ($cumulativeTier >= TIER_POTENTIAL && $messageCount < $minMessagesForConsent) {
        // Skor tinggi tapi pesan masih sedikit, lanjut collect info
        $currentPhase = 'collect';
        error_log("HIGH SCORE but need more context - Messages: $messageCount/$minMessagesForConsent");
    }
    
    try {
        $botResponse = $groq->generateEmpathyResponse(
            $_SESSION['conversation_history'],
            $currentPhase
        );
        error_log("Bot response generated: " . strlen($botResponse) . " chars");
        
        // PERBAIKAN: Jika phase consent tapi AI tidak kasih pertanyaan consent yang jelas
        // Tambahkan suffix consent question
        if ($currentPhase === 'consent' && strpos(strtolower($botResponse), 'lapor') === false) {
            $botResponse .= "\n\n💬 Aku memahami ceritamu. Apakah kamu ingin aku bantu membuat laporan resmi ke Satgas PPKPT? Identitasmu akan dijaga kerahasiaannya.";
        }
        
    } catch (Exception $e) {
        error_log("Groq API error: " . $e->getMessage());
        $botResponse = getFallbackResponse($currentPhase);
    }
    
    // Simpan respons bot ke session
    addToSessionHistory('assistant', $botResponse);
    
    // ============================================
    // STEP 11: PERSIST KE DB (Hanya jika consent sudah diberikan)
    // ============================================
    $persisted = false;
    if ($_SESSION['consent_given'] && isset($_SESSION['db_session_id'])) {
        try {
            persistMessage('user', $userMessage);
            persistMessage('bot', $botResponse);
            $persisted = true;
        } catch (Exception $e) {
            error_log("DB persist error: " . $e->getMessage());
        }
    }
    
    // ============================================
    // STEP 12: KIRIM RESPONSE
    // ============================================
    ob_clean();
    
    $executionTime = microtime(true) - $requestStartTime;
    
    echo json_encode([
        'success' => true,
        'response' => $botResponse,
        'phase' => $currentPhase,
        'tier' => $currentTier,
        'score' => $currentScore,
        'message_count' => $_SESSION['message_count'],
        'session_id' => $_SESSION['session_id_unik'] ?? null,
        'persisted' => $persisted,
        'consent_given' => $_SESSION['consent_given'] ?? false,
        'execution_time' => round($executionTime, 2)
    ], JSON_UNESCAPED_UNICODE);
    
    error_log(sprintf("=== CHAT REQUEST SUCCESS (%.2fs) ===", $executionTime));
    
} catch (Exception $e) {
    error_log("=== CHAT REQUEST FAILED ===");
    error_log("Error: " . $e->getMessage());
    
    ob_clean();
    http_response_code(500);
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'response' => 'Maaf, terjadi kesalahan: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

ob_end_flush();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Reset session secara lengkap
 */
function resetSession() {
    $_SESSION = [];
    session_destroy();
}

/**
 * Handle restore dari localStorage
 */
function handleRestore($data) {
    $history = $data['history'] ?? [];
    
    if (!empty($history)) {
        initializeSession();
        $_SESSION['conversation_history'] = $history;
        $_SESSION['message_count'] = count($history);
    }
    
    ob_clean();
    echo json_encode([
        'success' => true,
        'message' => 'Session restored',
        'message_count' => count($history)
    ]);
}

/**
 * Inisialisasi session variables
 */
function initializeSession() {
    if (!isset($_SESSION['conversation_history'])) {
        $_SESSION['conversation_history'] = [];
        $_SESSION['extracted_labels'] = getEmptyLabels();
        $_SESSION['consent_asked'] = false;
        $_SESSION['consent_given'] = false;
        $_SESSION['consent_timestamp'] = null;
        $_SESSION['message_count'] = 0;
        $_SESSION['max_score'] = 0;
        $_SESSION['max_tier'] = TIER_FAQ;
        $_SESSION['cumulative_score'] = 0;          // Skor akumulatif dari semua pesan
        $_SESSION['detected_signals'] = [];          // Sinyal yang sudah terdeteksi
        $_SESSION['session_id_unik'] = 'session_' . uniqid() . '_' . time();
        $_SESSION['db_session_id'] = null;
    }
    
    // Limit history size
    if (count($_SESSION['conversation_history']) > 30) {
        $_SESSION['conversation_history'] = array_slice($_SESSION['conversation_history'], -20);
    }
}

/**
 * Dapatkan empty labels
 */
function getEmptyLabels() {
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
 * Tambah pesan ke session history
 */
function addToSessionHistory($role, $content) {
    $_SESSION['conversation_history'][] = [
        'role' => $role,
        'content' => $content,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

/**
 * Tentukan fase berdasarkan intent result
 */
function determinePhase($intentResult) {
    // Jika sudah consent, selalu report phase
    if ($_SESSION['consent_given'] ?? false) {
        return 'report';
    }
    
    // Jika sudah ditanya consent tapi belum jawab
    if ($_SESSION['consent_asked'] ?? false) {
        return 'consent';
    }
    
    $tier = $intentResult['tier'];
    
    switch ($tier) {
        case TIER_REPORT:
            return 'consent'; // Trigger consent
        case TIER_POTENTIAL:
            return $_SESSION['message_count'] >= 3 ? 'consent' : 'collect';
        case TIER_CURHAT:
            return 'collect';
        default:
            return 'curhat';
    }
}

/**
 * Create DB session (hanya setelah consent)
 */
function createDBSession() {
    global $pdo;
    
    try {
        $sessionIdUnik = $_SESSION['session_id_unik'];
        $stmt = $pdo->prepare("INSERT INTO ChatSession (session_id_unik) VALUES (:session_id)");
        $stmt->execute([':session_id' => $sessionIdUnik]);
        $_SESSION['db_session_id'] = $pdo->lastInsertId();
        error_log("Created DB session: " . $_SESSION['db_session_id']);
    } catch (Exception $e) {
        error_log("Failed to create DB session: " . $e->getMessage());
    }
}

/**
 * Persist semua conversation history ke DB (batch)
 */
function persistConversationHistory() {
    global $pdo;
    
    if (!isset($_SESSION['db_session_id'])) return;
    
    try {
        $stmt = $pdo->prepare("INSERT INTO ChatMessage (session_id, role, content) VALUES (:sid, :role, :content)");
        
        foreach ($_SESSION['conversation_history'] as $msg) {
            $role = $msg['role'] === 'assistant' ? 'bot' : $msg['role'];
            $stmt->execute([
                ':sid' => $_SESSION['db_session_id'],
                ':role' => $role,
                ':content' => $msg['content']
            ]);
        }
        
        error_log("Persisted " . count($_SESSION['conversation_history']) . " messages to DB");
    } catch (Exception $e) {
        error_log("Failed to persist history: " . $e->getMessage());
    }
}

/**
 * Persist single message ke DB
 */
function persistMessage($role, $content) {
    global $pdo;
    
    if (!isset($_SESSION['db_session_id'])) return;
    
    $stmt = $pdo->prepare("INSERT INTO ChatMessage (session_id, role, content) VALUES (:sid, :role, :content)");
    $stmt->execute([
        ':sid' => $_SESSION['db_session_id'],
        ':role' => $role,
        ':content' => $content
    ]);
}

/**
 * Handle emergency dengan logging
 */
function handleEmergency($userMessage) {
    global $pdo;
    
    error_log("EMERGENCY DETECTED");
    
    $emergencyResponse = "Saya melihat kamu sedang dalam kesulitan yang sangat berat. Tolong jangan sendirian.\n\n🆘 Hubungi sekarang:\n📞 WhatsApp Satgas: 082188467793\n📞 Hotline Nasional: 119 ext 8\n\nAku tetap di sini menemanimu.";
    
    addToSessionHistory('user', $userMessage);
    addToSessionHistory('assistant', $emergencyResponse);
    
    // Log emergency untuk compliance
    try {
        $logger = new EmergencyLogger($pdo);
        $logger->logEmergency(
            $_SESSION['session_id_unik'] ?? 'unknown',
            'crisis',
            $userMessage,
            $emergencyResponse,
            ['score' => $_SESSION['max_score'] ?? 0]
        );
    } catch (Exception $e) {
        error_log("Emergency logging failed: " . $e->getMessage());
    }
    
    ob_clean();
    echo json_encode([
        'success' => true,
        'response' => $emergencyResponse,
        'phase' => 'emergency',
        'tier' => TIER_REPORT,
        'session_id' => $_SESSION['session_id_unik'] ?? null,
        'persisted' => false // Emergency tidak auto-persist ke ChatMessage
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Handle penyelesaian laporan
 */
function handleReportCompletion() {
    global $pdo;
    
    error_log("Creating report...");
    
    $kodeLaporan = 'PPKPT' . date('ymd') . rand(100, 999);
    $labels = $_SESSION['extracted_labels'];
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO Laporan (
                kode_pelaporan, pelaku_kekerasan, waktu_kejadian,
                lokasi_kejadian, tingkat_kekhawatiran, detail_kejadian,
                gender_korban, usia_korban, korban_sebagai,
                email_korban, whatsapp_korban, status_laporan, 
                chat_session_id, created_at
            ) VALUES (
                :kode, :pelaku, :waktu, :lokasi, :tingkat, :detail,
                :gender, :usia, :sebagai, :email, :wa, 'Process',
                :session_id, NOW()
            )
        ");
        
        $stmt->execute([
            ':kode' => $kodeLaporan,
            ':pelaku' => $labels['pelaku_kekerasan'],
            ':waktu' => $labels['waktu_kejadian'],
            ':lokasi' => $labels['lokasi_kejadian'],
            ':tingkat' => $labels['tingkat_kekhawatiran'] ?? 'Tidak disebutkan',
            ':detail' => $labels['detail_kejadian'],
            ':gender' => $labels['gender_korban'] ?? 'Tidak disebutkan',
            ':usia' => $labels['usia_korban'],
            ':sebagai' => $labels['korban_sebagai'] ?? 'Korban langsung',
            ':email' => $labels['email_korban'],
            ':wa' => $labels['whatsapp_korban'],
            ':session_id' => $_SESSION['db_session_id'] ?? null
        ]);
        
        error_log("Report created: $kodeLaporan");
        
        $finalResponse = "Terima kasih atas keberanianmu. Laporan kamu udah aku catatkan dengan aman.\n\n📋 Kode Laporan: {$kodeLaporan}\n\nKamu bisa cek status laporan di halaman Monitoring pakai kode ini ya.\n\nTim Satgas PPKPT akan follow up dengan penuh kerahasiaan. 💙";
        
        addToSessionHistory('assistant', $finalResponse);
        persistMessage('bot', $finalResponse);
        
        ob_clean();
        echo json_encode([
            'success' => true,
            'response' => $finalResponse,
            'phase' => 'completed',
            'kode_laporan' => $kodeLaporan,
            'tier' => TIER_REPORT,
            'session_id' => $_SESSION['session_id_unik'] ?? null,
            'persisted' => true
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        error_log("Report creation failed: " . $e->getMessage());
        throw new Exception("Gagal menyimpan laporan. Silakan coba lagi.");
    }
}

/**
 * Fallback response jika AI tidak tersedia
 */
function getFallbackResponse($phase) {
    $responses = [
        'curhat' => "Aku di sini mendengarkanmu. Ceritakan apa yang kamu rasakan... 💙",
        'collect' => "Terima kasih sudah berbagi. Bisa ceritakan lebih detail?",
        'consent' => "Aku memahami ceritamu. Apakah kamu ingin aku bantu membuat laporan resmi?",
        'report' => "Untuk melengkapi laporan, tolong beri tahu kontak yang bisa dihubungi (WA atau email).",
        'rejected' => "Tidak apa-apa, keputusan ada di tanganmu. Aku tetap di sini. 💪"
    ];
    
    return $responses[$phase] ?? $responses['curhat'];
}
?>