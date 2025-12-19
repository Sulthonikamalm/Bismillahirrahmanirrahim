<?php
/**
 * Chat API - Smart Autofill v3.1
 * Handles chatbot conversation with AI-powered data extraction
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/chat_error.log');
ini_set('memory_limit', '256M');
ini_set('max_execution_time', '60');

ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Load config FIRST (before session_start) to apply session settings
require_once __DIR__ . '/../config/config.php';

// Custom error handler - but ignore session-related warnings
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Ignore session-related warnings that happen after session_start
    if (strpos($errstr, 'session') !== false && $errno === E_WARNING) {
        return true; // Suppress this warning
    }
    error_log("PHP Error [$errno]: $errstr in $errfile:$errline");
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

session_start();

// Load remaining dependencies
try {
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/groq_client.php';
    require_once __DIR__ . '/chat_helpers.php';
} catch (Exception $e) {
    error_log("Failed to load dependencies: " . $e->getMessage());
    http_response_code(500);
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Server configuration error']);
    exit();
}

if (!defined('GROQ_API_KEY') || empty(GROQ_API_KEY)) {
    error_log("CRITICAL: GROQ_API_KEY not defined");
    http_response_code(500);
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'API configuration missing']);
    exit();
}

try {
    error_log("=== CHAT REQUEST START ===");
    $requestStartTime = microtime(true);
    
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
        $_SESSION = [];
        session_destroy();
        ob_clean();
        echo json_encode(['success' => true, 'message' => 'Session reset']);
        exit();
    }
    
    if (!isset($data['message']) || empty(trim($data['message']))) {
        throw new Exception('Message is required');
    }
    
    $userMessage = trim($data['message']);
    error_log("User message: " . substr($userMessage, 0, 100));
    
    // Database session management
    if (!isset($_SESSION['db_session_id'])) {
        try {
            $sessionIdUnik = 'session_' . uniqid() . '_' . time();
            $stmt = $pdo->prepare("INSERT INTO ChatSession (session_id_unik) VALUES (:session_id)");
            $stmt->execute([':session_id' => $sessionIdUnik]);
            $_SESSION['db_session_id'] = $pdo->lastInsertId();
            $_SESSION['session_id_unik'] = $sessionIdUnik;
            error_log("Created DB session: " . $_SESSION['db_session_id']);
        } catch (Exception $e) {
            error_log("Failed to create DB session: " . $e->getMessage());
        }
    }
    
    // Initialize session variables
    if (!isset($_SESSION['conversation_history'])) {
        $_SESSION['conversation_history'] = [];
        $_SESSION['extracted_labels'] = [
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
        $_SESSION['consent_asked'] = false;
        $_SESSION['consent_given'] = false;
        $_SESSION['consent_timestamp'] = null;
        $_SESSION['extraction_done'] = false;
        $_SESSION['message_count'] = 0;
    }
    
    if (count($_SESSION['conversation_history']) > 20) {
        $_SESSION['conversation_history'] = array_slice($_SESSION['conversation_history'], -10);
    }
    
    $_SESSION['message_count']++;
    
    // Off-topic detection
    if (ChatHelpers::isOffTopic($userMessage)) {
        error_log("Off-topic message detected");
        
        $offTopicResponse = "Maaf ya, aku khusus untuk membantu kamu yang mengalami atau menyaksikan kekerasan seksual. Untuk pertanyaan lain, aku nggak bisa bantu.\n\nKalau kamu ada cerita atau butuh bantuan terkait PPKPT, aku di sini mendengarkan.";
        
        $_SESSION['conversation_history'][] = [
            'role' => 'user',
            'content' => $userMessage,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        $_SESSION['conversation_history'][] = [
            'role' => 'assistant',
            'content' => $offTopicResponse,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        if (isset($_SESSION['db_session_id'])) {
            try {
                $stmt = $pdo->prepare("INSERT INTO ChatMessage (session_id, role, content) VALUES (:sid, 'user', :content)");
                $stmt->execute([':sid' => $_SESSION['db_session_id'], ':content' => $userMessage]);
                
                $stmt = $pdo->prepare("INSERT INTO ChatMessage (session_id, role, content) VALUES (:sid, 'bot', :content)");
                $stmt->execute([':sid' => $_SESSION['db_session_id'], ':content' => $offTopicResponse]);
            } catch (Exception $e) {
                error_log("DB save error: " . $e->getMessage());
            }
        }
        
        ob_clean();
        echo json_encode([
            'success' => true,
            'response' => $offTopicResponse,
            'phase' => 'off_topic',
            'session_id' => $_SESSION['session_id_unik'] ?? null
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // Add user message
    $_SESSION['conversation_history'][] = [
        'role' => 'user',
        'content' => $userMessage,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    // Save user message to database
    if (isset($_SESSION['db_session_id'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO ChatMessage (session_id, role, content) VALUES (:session_id, 'user', :content)");
            $stmt->execute([
                ':session_id' => $_SESSION['db_session_id'],
                ':content' => $userMessage
            ]);
        } catch (Exception $e) {
            error_log("Failed to save user message: " . $e->getMessage());
        }
    }
    
    $groq = new GroqClient(GROQ_API_KEY);
    
    // Emergency detection
    if (ChatHelpers::isEmergency($userMessage)) {
        error_log("Emergency detected");
        
        $emergencyResponse = "Saya melihat Anda sedang dalam kesulitan yang sangat berat. Tolong jangan sendirian.\n\nMari saya bantu Anda:\n- Latihan Napas: Menenangkan diri sebentar\n- Hubungi Profesional: Terhubung dengan ahli 24/7\n- Lanjut Chat: Terus berbicara dengan saya\n\nPilih yang paling nyaman untuk Anda saat ini.";
        
        $_SESSION['conversation_history'][] = [
            'role' => 'assistant',
            'content' => $emergencyResponse,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        if (isset($_SESSION['db_session_id'])) {
            try {
                $stmt = $pdo->prepare("INSERT INTO ChatMessage (session_id, role, content) VALUES (:session_id, 'bot', :content)");
                $stmt->execute([
                    ':session_id' => $_SESSION['db_session_id'],
                    ':content' => $emergencyResponse
                ]);
            } catch (Exception $e) {
                error_log("DB save error: " . $e->getMessage());
            }
        }
        
        ob_clean();
        echo json_encode([
            'success' => true,
            'response' => $emergencyResponse,
            'phase' => 'emergency',
            'session_id' => $_SESSION['session_id_unik'] ?? null
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
    
    // Phase determination
    $currentPhase = ChatHelpers::determinePhase(
        $_SESSION['extracted_labels'],
        $_SESSION['message_count'],
        $_SESSION['consent_asked'],
        $userMessage
    );
    
    error_log("Current phase: $currentPhase");
    
    // Consent handling
    if ($currentPhase === 'consent' && !$_SESSION['consent_asked']) {
        $_SESSION['consent_asked'] = true;
        error_log("Asking for consent");
    }
    
    if ($_SESSION['consent_asked'] && !$_SESSION['consent_given']) {
        $consentResponse = ChatHelpers::detectConsent($userMessage);
        error_log("Consent detection: $consentResponse");
        
        if ($consentResponse === 'yes') {
            $_SESSION['consent_given'] = true;
            $_SESSION['consent_timestamp'] = date('Y-m-d H:i:s');
            
            error_log("Consent given - entering report phase");
            
            // Enter report phase, continue chatting to collect data
            $currentPhase = 'report';
            
        } elseif ($consentResponse === 'no') {
            $currentPhase = 'rejected';
            
            $rejectResponse = "Tidak apa-apa kok, keputusan ada di kamu. Yang penting kamu udah berani cerita.\n\nAku tetap di sini kalau kamu butuh teman ngobrol atau suatu saat berubah pikiran.";
            
            $_SESSION['conversation_history'][] = [
                'role' => 'assistant',
                'content' => $rejectResponse,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            if (isset($_SESSION['db_session_id'])) {
                try {
                    $stmt = $pdo->prepare("INSERT INTO ChatMessage (session_id, role, content) VALUES (:session_id, 'bot', :content)");
                    $stmt->execute([
                        ':session_id' => $_SESSION['db_session_id'],
                        ':content' => $rejectResponse
                    ]);
                } catch (Exception $e) {
                    error_log("DB save error: " . $e->getMessage());
                }
            }
            
            ob_clean();
            echo json_encode([
                'success' => true,
                'response' => $rejectResponse,
                'phase' => 'rejected',
                'session_id' => $_SESSION['session_id_unik'] ?? null
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
    }
    
    // If consent given, always be in report phase
    if ($_SESSION['consent_given']) {
        $currentPhase = 'report';
        
        // Progressive extraction: extract from EVERY message
        try {
            $conversationText = ChatHelpers::getConversationText($_SESSION['conversation_history']);
            $extractedData = $groq->extractLabelsForAutofill($conversationText);
            
            if ($extractedData) {
                $_SESSION['extracted_labels'] = ChatHelpers::mergeLabels(
                    $_SESSION['extracted_labels'],
                    $extractedData
                );
                error_log("Updated labels: " . json_encode($_SESSION['extracted_labels']));
            }
        } catch (Exception $e) {
            error_log("Extraction error (continuing): " . $e->getMessage());
        }
    }
    
    // Report completion
    if ($currentPhase === 'report' && $_SESSION['consent_given']) {
        if (ChatHelpers::isLabelsComplete($_SESSION['extracted_labels'])) {
            try {
                error_log("Creating report...");
                
                $kodeLaporan = 'PPKPT' . date('ymd') . rand(100, 999);
                $labels = $_SESSION['extracted_labels'];
                
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
                
                $finalResponse = "Terima kasih atas keberanianmu. Laporan kamu udah aku catatkan dengan aman.\n\nKode Laporan: {$kodeLaporan}\n\nKamu bisa cek status laporan di halaman Monitoring pakai kode ini ya.\n\nTim Satgas PPKPT akan follow up dengan penuh kerahasiaan dan profesionalisme.";
                
                $_SESSION['conversation_history'][] = [
                    'role' => 'assistant',
                    'content' => $finalResponse,
                    'timestamp' => date('Y-m-d H:i:s')
                ];
                
                if (isset($_SESSION['db_session_id'])) {
                    try {
                        $stmt = $pdo->prepare("INSERT INTO ChatMessage (session_id, role, content) VALUES (:session_id, 'bot', :content)");
                        $stmt->execute([
                            ':session_id' => $_SESSION['db_session_id'],
                            ':content' => $finalResponse
                        ]);
                    } catch (Exception $e) {
                        error_log("DB save error: " . $e->getMessage());
                    }
                }
                
                ob_clean();
                echo json_encode([
                    'success' => true,
                    'response' => $finalResponse,
                    'phase' => 'completed',
                    'kode_laporan' => $kodeLaporan,
                    'session_id' => $_SESSION['session_id_unik'] ?? null
                ], JSON_UNESCAPED_UNICODE);
                exit();
                
            } catch (Exception $e) {
                error_log("Database error: " . $e->getMessage());
                throw new Exception("Gagal menyimpan laporan. Silakan coba lagi.");
            }
        }
    }
    
    // Generate bot response
    error_log("Generating bot response for phase: $currentPhase");
    
    try {
        $botResponse = $groq->generateEmpathyResponse(
            $_SESSION['conversation_history'],
            $currentPhase
        );
        error_log("Bot response OK: " . strlen($botResponse) . " chars");
    } catch (Exception $e) {
        error_log("Groq API error: " . $e->getMessage());
        throw new Exception("Koneksi ke AI terputus: " . $e->getMessage());
    }
    
    $_SESSION['conversation_history'][] = [
        'role' => 'assistant',
        'content' => $botResponse,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    if (isset($_SESSION['db_session_id'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO ChatMessage (session_id, role, content) VALUES (:session_id, 'bot', :content)");
            $stmt->execute([
                ':session_id' => $_SESSION['db_session_id'],
                ':content' => $botResponse
            ]);
        } catch (Exception $e) {
            error_log("Failed to save bot response: " . $e->getMessage());
        }
    }
    
    ob_clean();
    
    $executionTime = microtime(true) - $requestStartTime;
    
    echo json_encode([
        'success' => true,
        'response' => $botResponse,
        'phase' => $currentPhase,
        'message_count' => $_SESSION['message_count'],
        'session_id' => $_SESSION['session_id_unik'] ?? null,
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
?>