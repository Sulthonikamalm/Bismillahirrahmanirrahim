<?php
/**
 * SIGAP PPKS - CORS Helper
 * Mengatur header CORS untuk API
 */

if (!function_exists('env')) {
    require_once __DIR__ . '/env_loader.php';
}

/**
 * Ambil daftar origin yang diizinkan
 */
function getCorsAllowedOrigins() {
    if (defined('CORS_ALLOWED_ORIGINS')) {
        return CORS_ALLOWED_ORIGINS;
    }
    
    $origins = env('CORS_ALLOWED_ORIGINS', '*');
    
    if ($origins === '*') {
        return ['*'];
    }
    
    return array_map('trim', explode(',', $origins));
}

/**
 * Cek apakah origin diizinkan
 */
function isOriginAllowed($origin) {
    $allowedOrigins = getCorsAllowedOrigins();
    
    if (in_array('*', $allowedOrigins)) {
        return true;
    }
    
    return in_array($origin, $allowedOrigins);
}

/**
 * Set header CORS
 */
function setCorsHeadersHelper($allowCredentials = false) {
    $allowedOrigins = getCorsAllowedOrigins();
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (in_array('*', $allowedOrigins)) {
        if ($allowCredentials && !empty($requestOrigin)) {
            header('Access-Control-Allow-Origin: ' . $requestOrigin);
        } else {
            header('Access-Control-Allow-Origin: *');
        }
    } elseif (!empty($requestOrigin) && isOriginAllowed($requestOrigin)) {
        header('Access-Control-Allow-Origin: ' . $requestOrigin);
        header('Vary: Origin');
    }
    
    if ($allowCredentials) {
        header('Access-Control-Allow-Credentials: true');
    }
}

/**
 * Handle CORS untuk API endpoint
 * Return true jika ini preflight request (caller harus exit)
 */
function handleCors(
    array $allowedMethods = ['GET', 'POST', 'OPTIONS'],
    array $allowedHeaders = ['Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token'],
    $allowCredentials = false
) {
    setCorsHeadersHelper($allowCredentials);
    header('Access-Control-Allow-Methods: ' . implode(', ', $allowedMethods));
    header('Access-Control-Allow-Headers: ' . implode(', ', $allowedHeaders));
    header('Access-Control-Max-Age: 3600');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        return true;
    }
    
    return false;
}

/**
 * CORS untuk endpoint publik
 */
function handlePublicCors() {
    return handleCors(['GET', 'POST', 'OPTIONS'], ['Content-Type', 'Accept'], false);
}

/**
 * CORS untuk endpoint yang butuh autentikasi
 */
function handleAuthenticatedCors() {
    return handleCors(
        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        ['Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token'],
        true
    );
}
