<?php

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/db.php';

try {
    load_local_env(__DIR__ . '/.env');
    load_local_env(dirname(__DIR__) . '/.env');
    
    $account = firebase_service_account();
    $now = time();
    
    // Build JWT manually with logging
    $header = firebase_base64url_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_UNESCAPED_SLASHES));
    $payload = [
        'iss' => $account['client_email'],
        'scope' => 'https://www.googleapis.com/auth/cloud-platform',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ];
    $claim = firebase_base64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES));
    $unsignedJwt = $header . '.' . $claim;
    
    $privateKey = openssl_pkey_get_private($account['private_key']);
    $signature = '';
    openssl_sign($unsignedJwt, $signature, $privateKey, OPENSSL_ALGO_SHA256);
    $jwt = $unsignedJwt . '.' . firebase_base64url_encode($signature);
    
    echo "=== JWT Details ===\n";
    
    // Helper to decode JWT parts
    $decodeJwtPart = function($part) {
        $data = strtr($part, '-_', '+/');
        $padded = str_pad($data, strlen($data) % 4 ? strlen($data) + 4 - strlen($data) % 4 : strlen($data), '=', STR_PAD_RIGHT);
        return base64_decode($padded, true);
    };
    
    echo "Header (decoded): " . json_encode(json_decode($decodeJwtPart($header), true), JSON_PRETTY_PRINT) . "\n\n";
    
    echo "Payload (decoded):\n";
    $decodedPayload = json_decode($decodeJwtPart($claim), true);
    echo json_encode($decodedPayload, JSON_PRETTY_PRINT) . "\n\n";
    
    echo "Full JWT:\n";
    echo $jwt . "\n\n";
    
    echo "JWT Parts:\n";
    echo "  Header (first 50): " . substr($header, 0, 50) . "...\n";
    echo "  Payload (first 50): " . substr($claim, 0, 50) . "...\n";
    echo "  Signature (first 50): " . substr(firebase_base64url_encode($signature), 0, 50) . "...\n\n";
    
    // Test with Google
    echo "=== Testing with Google ===\n";
    $body = http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt,
    ]);
    
    echo "POST body (first 100): " . substr($body, 0, 100) . "...\n\n";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", [
                'Accept: application/json',
                'Content-Type: application/x-www-form-urlencoded',
            ]),
            'content' => $body,
            'ignore_errors' => true,
        ],
    ]);
    
    $response = file_get_contents('https://oauth2.googleapis.com/token', false, $context);
    $decoded = json_decode($response, true);
    
    echo "Google Response:\n";
    echo json_encode($decoded, JSON_PRETTY_PRINT) . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
