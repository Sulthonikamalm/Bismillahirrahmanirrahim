<?php
/**
 * ============================================================
 * MAINTENANCE MODE TOGGLE
 * ============================================================
 * Script untuk mengaktifkan/menonaktifkan maintenance mode
 * 
 * CARA PAKAI:
 * Browser: /maintenance/toggle.php?action=on&key=YOUR_SECRET_KEY
 * Browser: /maintenance/toggle.php?action=off&key=YOUR_SECRET_KEY
 * 
 * CLI: php maintenance/toggle.php on
 * CLI: php maintenance/toggle.php off
 * ============================================================
 */

// Secret key dari environment variable
require_once __DIR__ . '/../config/env_loader.php';
$secretKey = env('MAINTENANCE_SECRET_KEY', 'sigap_admin_' . date('Y'));

// File marker untuk maintenance mode
$maintenanceFile = __DIR__ . '/../.maintenance';

// Cek apakah dijalankan via CLI atau browser
$isCLI = (php_sapi_name() === 'cli');

if ($isCLI) {
    // Mode CLI
    $action = $argv[1] ?? null;
} else {
    // Mode Browser - perlu autentikasi
    $providedKey = $_GET['key'] ?? '';
    $action = $_GET['action'] ?? null;
    
    // Validasi key
    if ($providedKey !== $secretKey) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized. Invalid key.'
        ]);
        exit;
    }
}

// Proses action
$result = ['success' => false, 'message' => ''];

switch ($action) {
    case 'on':
    case 'enable':
    case '1':
        // Aktifkan maintenance mode
        $data = [
            'enabled' => true,
            'started_at' => date('Y-m-d H:i:s'),
            'started_by' => $isCLI ? 'CLI' : ($_SERVER['REMOTE_ADDR'] ?? 'unknown'),
            'reason' => $_GET['reason'] ?? 'Scheduled maintenance'
        ];
        
        if (file_put_contents($maintenanceFile, json_encode($data, JSON_PRETTY_PRINT))) {
            $result = [
                'success' => true,
                'message' => 'Maintenance mode ACTIVATED',
                'data' => $data
            ];
        } else {
            $result = [
                'success' => false,
                'message' => 'Failed to create maintenance file'
            ];
        }
        break;
        
    case 'off':
    case 'disable':
    case '0':
        // Nonaktifkan maintenance mode
        if (file_exists($maintenanceFile)) {
            if (unlink($maintenanceFile)) {
                $result = [
                    'success' => true,
                    'message' => 'Maintenance mode DEACTIVATED'
                ];
            } else {
                $result = [
                    'success' => false,
                    'message' => 'Failed to remove maintenance file'
                ];
            }
        } else {
            $result = [
                'success' => true,
                'message' => 'Maintenance mode was already off'
            ];
        }
        break;
        
    case 'status':
    case 'check':
        // Cek status
        if (file_exists($maintenanceFile)) {
            $data = json_decode(file_get_contents($maintenanceFile), true);
            $result = [
                'success' => true,
                'message' => 'Maintenance mode is ACTIVE',
                'data' => $data
            ];
        } else {
            $result = [
                'success' => true,
                'message' => 'Maintenance mode is OFF'
            ];
        }
        break;
        
    default:
        $result = [
            'success' => false,
            'message' => 'Invalid action. Use: on, off, or status',
            'usage' => $isCLI 
                ? 'php toggle.php [on|off|status]'
                : '/maintenance/toggle.php?action=[on|off|status]&key=YOUR_KEY'
        ];
}

// Output result
if ($isCLI) {
    echo "\n";
    echo "=================================\n";
    echo "SIGAP Maintenance Mode Toggle\n";
    echo "=================================\n";
    echo "Status: " . ($result['success'] ? '✅' : '❌') . " " . $result['message'] . "\n";
    if (isset($result['data'])) {
        echo "Data: " . json_encode($result['data'], JSON_PRETTY_PRINT) . "\n";
    }
    echo "\n";
} else {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
