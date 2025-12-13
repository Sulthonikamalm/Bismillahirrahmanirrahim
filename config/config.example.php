<?php
/**
 * Application Configuration - Template
 * Copy this file to config.php and update with your actual values
 */

function getConfig($key, $default = null) {
    $envValue = getenv($key);
    if ($envValue !== false && !empty($envValue)) return $envValue;
    if (isset($_ENV[$key]) && !empty($_ENV[$key])) return $_ENV[$key];
    if (isset($_SERVER[$key]) && !empty($_SERVER[$key])) return $_SERVER[$key];
    return $default;
}

// Groq AI Configuration
define('GROQ_API_KEY', getConfig('GROQ_API_KEY', 'YOUR_API_KEY_HERE'));

if (empty(GROQ_API_KEY) || GROQ_API_KEY === 'YOUR_API_KEY_HERE') {
    error_log("CRITICAL: GROQ_API_KEY not configured");
}

// Application Settings
define('APP_NAME', 'Sigap PPKPT');
define('APP_VERSION', '3.0');
define('APP_ENV', getConfig('APP_ENV', 'development'));
define('DEBUG_MODE', APP_ENV === 'development');

// Autofill Settings
define('AUTOFILL_DATA_EXPIRY_SECONDS', 300);
define('AUTOFILL_ENCRYPTION_ENABLED', true);

// Logging
define('LOG_DIR', __DIR__ . '/../api/logs');
define('LOG_ERRORS', true);
define('LOG_PERFORMANCE', true);

if (!is_dir(LOG_DIR)) {
    @mkdir(LOG_DIR, 0755, true);
}
?>
