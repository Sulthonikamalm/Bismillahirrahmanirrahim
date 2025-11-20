<?php
// Simple test to check if POST method works
header('Content-Type: application/json');

$response = [
    'test' => 'ok',
    'method' => $_SERVER['REQUEST_METHOD'],
    'post_data' => $_POST,
    'raw_input' => file_get_contents('php://input'),
    'timestamp' => date('Y-m-d H:i:s')
];

echo json_encode($response);
