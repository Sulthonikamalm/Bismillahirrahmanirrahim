<?php
/**
 * SIGAP PPKS - Emergency Log Cleanup CRON Job
 * 
 * Script ini harus dijalankan secara berkala untuk:
 * 1. Membersihkan emergency logs yang sudah expired
 * 2. Reset availability API key yang sempat unavailable
 * 
 * Rekomendasi jadwal CRON: Setiap 6 jam
 * Contoh crontab:
 * 0 0,6,12,18 * * * php /path/to/cleanup_cron.php 
 * 
 * @package SIGAP_PPKS
 * @subpackage ChatBot
 */

// CLI only
if (PHP_SAPI !== 'cli') {
    die('This script can only be run from command line');
}

echo "[" . date('Y-m-d H:i:s') . "] Starting cleanup job...\n";

// Load dependencies
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/chatbot/emergency_logger.php';
require_once __DIR__ . '/chatbot/quota_manager.php';

try {
    // 1. Cleanup expired emergency logs
    echo "Cleaning up expired emergency logs...\n";
    
    $logger = new EmergencyLogger($pdo);
    $deletedCount = $logger->cleanupExpiredLogs();
    
    echo "  - Deleted: $deletedCount expired logs\n";
    
    // 2. Reset API key availability (optional - uncomment if needed)
    // Ini akan me-reset key yang ditandai unavailable
    // Berguna jika rate limit sudah di-lift
    
    // echo "Resetting API key availability...\n";
    // $quotaManager = new QuotaManager();
    // $quotaManager->resetAvailability();
    // echo "  - API keys availability reset\n";
    
    // 3. Get current quota status
    echo "Current quota status:\n";
    $quotaManager = new QuotaManager();
    $status = $quotaManager->getQuotaStatus();
    
    echo "  - Date: " . $status['date'] . "\n";
    echo "  - Primary: " . $status['primary']['usage_percent'] . "% (" . $status['primary']['requests'] . " requests)\n";
    echo "  - Secondary: " . $status['secondary']['usage_percent'] . "% (" . $status['secondary']['requests'] . " requests)\n";
    echo "  - Fallback used: " . $status['fallback_used'] . " times\n";
    echo "  - Current active: " . $status['current_active'] . "\n";
    
    echo "[" . date('Y-m-d H:i:s') . "] Cleanup completed successfully!\n";
    
} catch (Exception $e) {
    echo "[ERROR] " . $e->getMessage() . "\n";
    exit(1);
}
