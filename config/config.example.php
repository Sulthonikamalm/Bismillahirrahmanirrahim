<?php
/**
 * ============================================================
 * APPLICATION CONFIGURATION - TEMPLATE
 * ============================================================
 * INSTRUCTIONS:
 * 1. Copy this file to config.php
 * 2. Replace 'YOUR_API_KEY_HERE' with your actual Groq API key
 * 3. NEVER commit config.php to version control!
 * 
 * For production, set environment variable: GROQ_API_KEY
 * 
 * @version 1.0
 * @date 2025-12-14
 */

// ============================================================
// API KEYS - Load from environment or use fallback
// ============================================================

function getConfig($key, $default = null) {
    $envValue = getenv($key);
    if ($envValue !== false && !empty($envValue)) {
        return $envValue;
    }
    
    if (isset($_ENV[$key]) && !empty($_ENV[$key])) {
        return $_ENV[$key];
    }
    
    if (isset($_SERVER[$key]) && !empty($_SERVER[$key])) {
        return $_SERVER[$key];
    }
    
    return $default;
}

// ============================================================
// GROQ AI CONFIGURATION
// ============================================================

// ⚠️ REPLACE THIS WITH YOUR ACTUAL API KEY!
define('GROQ_API_KEY', getConfig('GROQ_API_KEY', 'YOUR_API_KEY_HERE'));

// Validate API key
if (empty(GROQ_API_KEY) || GROQ_API_KEY === 'YOUR_API_KEY_HERE') {
    error_log("CRITICAL: GROQ_API_KEY not configured!");
}

// ============================================================
// APPLICATION SETTINGS
// ============================================================

define('APP_NAME', 'Sigap PPKPT');
define('APP_VERSION', '3.0');
define('APP_ENV', getConfig('APP_ENV', 'development'));
define('DEBUG_MODE', APP_ENV === 'development');

// ============================================================
// AUTOFILL SETTINGS
// ============================================================

define('AUTOFILL_DATA_EXPIRY_SECONDS', 300);
define('AUTOFILL_ENCRYPTION_ENABLED', true);

// ============================================================
// LOGGING
// ============================================================

define('LOG_DIR', __DIR__ . '/../logs');
define('LOG_ERRORS', true);
define('LOG_PERFORMANCE', true);

if (!is_dir(LOG_DIR)) {
    @mkdir(LOG_DIR, 0755, true);
}
?>
