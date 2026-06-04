<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

load_local_env(__DIR__ . '/.env');
load_local_env(dirname(__DIR__) . '/.env');

function firebase_project_id(): string
{
    static $projectId = null;
    if ($projectId !== null) {
        return $projectId;
    }

    $projectId = env_value('FIREBASE_PROJECT_ID');
    if ($projectId === '') {
        throw new RuntimeException('FIREBASE_PROJECT_ID is missing.');
    }

    return $projectId;
}

function firebase_credentials_path(): string
{
    static $credentialsPath = null;
    if ($credentialsPath !== null) {
        return $credentialsPath;
    }

    $credentialsPath = env_value('GOOGLE_APPLICATION_CREDENTIALS');
    if ($credentialsPath === '') {
        throw new RuntimeException('GOOGLE_APPLICATION_CREDENTIALS is missing.');
    }

    if (!is_file($credentialsPath)) {
        $fileName = basename($credentialsPath);
        $fallbackPaths = [
            __DIR__ . '/' . $fileName,
            dirname(__DIR__) . '/' . $fileName,
        ];

        foreach ($fallbackPaths as $fallbackPath) {
            if (is_file($fallbackPath)) {
                $credentialsPath = $fallbackPath;
                break;
            }
        }
    }

    return $credentialsPath;
}

function firebase_service_account(): array
{
    static $serviceAccount = null;
    if ($serviceAccount !== null) {
        return $serviceAccount;
    }

    $path = firebase_credentials_path();
    if (!is_file($path)) {
        throw new RuntimeException('Firebase service account file not found: ' . $path);
    }

    $contents = (string) file_get_contents($path);
    $contents = preg_replace('/^\xEF\xBB\xBF/', '', $contents);
    $json = json_decode($contents, true);
    if (!is_array($json) || empty($json['client_email']) || empty($json['private_key'])) {
        throw new RuntimeException('Firebase service account JSON is invalid.');
    }

    $serviceAccount = $json;
    return $serviceAccount;
}

function firebase_base_url(): string
{
    return 'https://firestore.googleapis.com/v1/projects/' . rawurlencode(firebase_project_id()) . '/databases/(default)/documents';
}

function firebase_base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function firebase_http_request(string $method, string $url, ?string $body = null, array $headers = []): array
{
    $requestHeaders = ['Accept: application/json'];
    if ($body !== null && !array_filter($headers, static fn ($header) => stripos($header, 'content-type:') === 0)) {
        $requestHeaders[] = 'Content-Type: application/json';
    }

    $context = stream_context_create([
        'http' => [
            'method' => strtoupper($method),
            'header' => implode("\r\n", array_merge($requestHeaders, $headers)),
            'content' => $body ?? '',
            'ignore_errors' => true,
            'timeout' => 60,
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);

    $lastError = null;
    set_error_handler(static function (int $severity, string $message) use (&$lastError): bool {
        $lastError = $message;
        return true;
    });
    $response = file_get_contents($url, false, $context);
    restore_error_handler();
    $responseHeaders = $http_response_header ?? [];
    $status = 0;
    foreach ($responseHeaders as $headerLine) {
        if (preg_match('/^HTTP\/\d(?:\.\d)?\s+(\d{3})/', $headerLine, $matches)) {
            $status = (int) $matches[1];
            break;
        }
    }

    if ($response === false) {
        $detail = $lastError ?? ($status > 0 ? 'HTTP ' . $status : 'unknown error');
        throw new RuntimeException('Firebase request failed: ' . $detail);
    }

    $decoded = json_decode($response, true);
    if ($status >= 400) {
        $message = is_array($decoded) ? json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : $response;
        throw new RuntimeException('Firebase request failed (' . $status . '): ' . $message);
    }

    return is_array($decoded) ? $decoded : [];
}

function firebase_access_token(): string
{
    $externalToken = env_value('FIREBASE_ACCESS_TOKEN');
    if ($externalToken !== '') {
        return $externalToken;
    }

    static $token = null;
    static $expiresAt = 0;

    if ($token !== null && time() < $expiresAt) {
        return $token;
    }

    $account = firebase_service_account();
    $now = time();
    $header = firebase_base64url_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'], JSON_UNESCAPED_SLASHES));
    $claim = firebase_base64url_encode(json_encode([
        'iss' => $account['client_email'],
        'scope' => 'https://www.googleapis.com/auth/cloud-platform',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ], JSON_UNESCAPED_SLASHES));

    $unsignedJwt = $header . '.' . $claim;
    $privateKey = openssl_pkey_get_private((string) $account['private_key']);
    if ($privateKey === false) {
        throw new RuntimeException('Unable to load Firebase private key.');
    }

    $signature = '';
    if (!openssl_sign($unsignedJwt, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
        throw new RuntimeException('Unable to sign Firebase JWT.');
    }

    $jwt = $unsignedJwt . '.' . firebase_base64url_encode($signature);
    $body = http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt,
    ]);

    $response = firebase_http_request(
        'POST',
        'https://oauth2.googleapis.com/token',
        $body,
        ['Content-Type: application/x-www-form-urlencoded']
    );

    if (empty($response['access_token'])) {
        throw new RuntimeException('Firebase access token could not be obtained.');
    }

    $token = (string) $response['access_token'];
    $expiresAt = $now + max(300, (int) ($response['expires_in'] ?? 3600) - 60);

    return $token;
}

function firestore_is_assoc(array $value): bool
{
    if ($value === []) {
        return true;
    }

    return array_keys($value) !== range(0, count($value) - 1);
}

function firestore_encode_value(mixed $value): array
{
    if ($value === null) {
        return ['nullValue' => null];
    }

    if (is_bool($value)) {
        return ['booleanValue' => $value];
    }

    if (is_int($value)) {
        return ['integerValue' => (string) $value];
    }

    if (is_float($value)) {
        return ['doubleValue' => $value];
    }

    if ($value instanceof DateTimeInterface) {
        return ['timestampValue' => $value->format('c')];
    }

    if (is_array($value)) {
        if (firestore_is_assoc($value)) {
            $fields = [];
            foreach ($value as $key => $item) {
                $fields[(string) $key] = firestore_encode_value($item);
            }
            return ['mapValue' => ['fields' => $fields]];
        }

        return ['arrayValue' => ['values' => array_map('firestore_encode_value', $value)]];
    }

    return ['stringValue' => (string) $value];
}

function firestore_encode_fields(array $data): array
{
    $fields = [];
    foreach ($data as $key => $value) {
        if ($value === null) {
            continue;
        }
        $fields[(string) $key] = firestore_encode_value($value);
    }

    return $fields;
}

function firestore_decode_value(array $value): mixed
{
    if (array_key_exists('nullValue', $value)) {
        return null;
    }
    if (array_key_exists('booleanValue', $value)) {
        return (bool) $value['booleanValue'];
    }
    if (array_key_exists('integerValue', $value)) {
        return (int) $value['integerValue'];
    }
    if (array_key_exists('doubleValue', $value)) {
        return (float) $value['doubleValue'];
    }
    if (array_key_exists('stringValue', $value)) {
        return (string) $value['stringValue'];
    }
    if (array_key_exists('timestampValue', $value)) {
        return (string) $value['timestampValue'];
    }
    if (array_key_exists('referenceValue', $value)) {
        return (string) $value['referenceValue'];
    }
    if (array_key_exists('mapValue', $value)) {
        $map = $value['mapValue']['fields'] ?? [];
        $decoded = [];
        foreach ($map as $key => $nestedValue) {
            $decoded[$key] = is_array($nestedValue) ? firestore_decode_value($nestedValue) : null;
        }
        return $decoded;
    }
    if (array_key_exists('arrayValue', $value)) {
        $decoded = [];
        foreach (($value['arrayValue']['values'] ?? []) as $nestedValue) {
            $decoded[] = is_array($nestedValue) ? firestore_decode_value($nestedValue) : null;
        }
        return $decoded;
    }

    return null;
}

function firestore_decode_document(array $document): array
{
    $data = [];
    foreach (($document['fields'] ?? []) as $key => $value) {
        $data[$key] = is_array($value) ? firestore_decode_value($value) : null;
    }

    $name = (string) ($document['name'] ?? '');
    if ($name !== '') {
        $parts = explode('/', $name);
        $data['id'] = (string) end($parts);
        $data['__name__'] = $name;
    }

    return $data;
}

function firestore_query(string $collection, array $filters = [], int $limit = 1): array
{
    $query = [
        'from' => [[
            'collectionId' => $collection,
        ]],
        'limit' => $limit,
    ];

    if ($filters !== []) {
        $filterNodes = [];
        foreach ($filters as $filter) {
            $filterNodes[] = [
                'fieldFilter' => [
                    'field' => ['fieldPath' => (string) ($filter['field'] ?? '')],
                    'op' => (string) ($filter['op'] ?? 'EQUAL'),
                    'value' => firestore_encode_value($filter['value'] ?? null),
                ],
            ];
        }

        $query['where'] = count($filterNodes) === 1
            ? $filterNodes[0]
            : ['compositeFilter' => ['op' => 'AND', 'filters' => $filterNodes]];
    }

    $response = firebase_http_request(
        'POST',
        firebase_base_url() . ':runQuery',
        json_encode(['structuredQuery' => $query], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ['Authorization: Bearer ' . firebase_access_token()]
    );

    $documents = [];
    foreach ($response as $item) {
        if (!empty($item['document']) && is_array($item['document'])) {
            $documents[] = firestore_decode_document($item['document']);
        }
    }

    return $documents;
}

function firestore_add_document(string $collection, array $data): array
{
    // Defensive: strip reserved/internal keys that Firestore rejects
    foreach (array_keys($data) as $k) {
        if ($k === 'id' || str_starts_with((string) $k, '__')) {
            unset($data[$k]);
        }
    }

    $response = firebase_http_request(
        'POST',
        firebase_base_url() . '/' . rawurlencode($collection),
        json_encode(['fields' => firestore_encode_fields($data)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ['Authorization: Bearer ' . firebase_access_token()]
    );

    return firestore_decode_document($response);
}

function firestore_set_document(string $collection, string $documentId, array $data): array
{
    // Defensive: strip reserved/internal keys that Firestore rejects
    foreach (array_keys($data) as $k) {
        if ($k === 'id' || str_starts_with((string) $k, '__')) {
            unset($data[$k]);
        }
    }

    $response = firebase_http_request(
        'PATCH',
        firebase_base_url() . '/' . rawurlencode($collection) . '/' . rawurlencode($documentId),
        json_encode(['fields' => firestore_encode_fields($data)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ['Authorization: Bearer ' . firebase_access_token()]
    );

    return firestore_decode_document($response);
}
