<?php
/**
 * Security: Prevent directory listing
 */
http_response_code(403);
header('Content-Type: text/plain');
exit('403 Forbidden - Access Denied');
