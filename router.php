<?php

declare(strict_types=1);

$requestUri = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$requestUri = '/' . ltrim($requestUri, '/');

$projectRoot = __DIR__;
$publicRoot = $projectRoot . '/public_html';

$publicFile = $projectRoot . $requestUri;
if ($requestUri !== '/' && is_file($publicFile)) {
    return false;
}

$staticPublicFile = $publicRoot . $requestUri;
if ($requestUri !== '/' && is_file($staticPublicFile)) {
    return false;
}

if (preg_match('#^/api(?:/index\.php)?(?:/.*)?$#', $requestUri) === 1) {
    require $publicRoot . '/api/index.php';
    return true;
}

return false;