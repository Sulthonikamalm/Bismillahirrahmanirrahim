<?php
/**
 * SIGAP PPKS - Loader Environment Variable
 * Memuat konfigurasi dari file .env tanpa Composer
 */

$GLOBALS['_ENV_CACHE'] = [];
$GLOBALS['_ENV_LOADED'] = false;

/**
 * Muat variabel dari file .env
 */
function loadEnv($envPath = null, $override = false) {
    if ($GLOBALS['_ENV_LOADED'] && !$override) {
        return true;
    }
    
    if ($envPath === null) {
        $possiblePaths = [
            __DIR__ . '/../.env',
            __DIR__ . '/.env',
            dirname(__DIR__) . '/.env',
        ];
        
        foreach ($possiblePaths as $path) {
            if (file_exists($path) && is_readable($path)) {
                $envPath = $path;
                break;
            }
        }
    }
    
    if ($envPath === null || !file_exists($envPath)) {
        $GLOBALS['_ENV_LOADED'] = true;
        return false;
    }
    
    try {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        if ($lines === false) {
            return false;
        }
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || $line[0] === '#') {
                continue;
            }
            
            if (strpos($line, '=') === false) {
                continue;
            }
            
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            if (empty($key) || !preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $key)) {
                continue;
            }
            
            // Hapus quotes
            if (preg_match('/^([\'"])(.*)\1$/', $value, $matches)) {
                $value = $matches[2];
            }
            
            $GLOBALS['_ENV_CACHE'][$key] = $value;
            
            if ($override || getenv($key) === false) {
                putenv("$key=$value");
            }
            
            if ($override || !isset($_ENV[$key])) {
                $_ENV[$key] = $value;
            }
        }
        
        $GLOBALS['_ENV_LOADED'] = true;
        return true;
        
    } catch (Exception $e) {
        error_log('[ENV] Error: ' . $e->getMessage());
        return false;
    }
}

/**
 * Ambil nilai environment variable
 */
function env($key, $default = null) {
    if (!$GLOBALS['_ENV_LOADED']) {
        loadEnv();
    }
    
    // Cek cache
    if (isset($GLOBALS['_ENV_CACHE'][$key])) {
        return parseEnvValue($GLOBALS['_ENV_CACHE'][$key]);
    }
    
    // Cek getenv
    $value = getenv($key);
    if ($value !== false) {
        return parseEnvValue($value);
    }
    
    // Cek $_ENV
    if (isset($_ENV[$key])) {
        return parseEnvValue($_ENV[$key]);
    }
    
    return $default;
}

/**
 * Parse nilai khusus (true, false, null)
 */
function parseEnvValue($value) {
    $lowered = strtolower($value);
    
    switch ($lowered) {
        case 'true':
        case '(true)':
            return true;
        case 'false':
        case '(false)':
            return false;
        case 'null':
        case '(null)':
            return null;
        case 'empty':
        case '(empty)':
            return '';
    }
    
    if (is_numeric($value)) {
        return strpos($value, '.') !== false ? (float)$value : (int)$value;
    }
    
    return $value;
}

// Auto-load saat file di-include
loadEnv();
