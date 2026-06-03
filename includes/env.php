<?php

declare(strict_types=1);

function load_local_env(string $filePath): array
{
    $values = [];

    if (!is_file($filePath) || !is_readable($filePath)) {
        return $values;
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return $values;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = array_map('trim', explode('=', $line, 2));
        $value = trim($value, "\"' ");
        $values[$key] = $value;
        if (getenv($key) === false) {
            putenv($key . '=' . $value);
        }
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }

    return $values;
}

function env_value(string $key, string $default = ''): string
{
    if (array_key_exists($key, $_SERVER) && $_SERVER[$key] !== '') {
        return trim((string) $_SERVER[$key]);
    }

    if (array_key_exists($key, $_ENV) && $_ENV[$key] !== '') {
        return trim((string) $_ENV[$key]);
    }

    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }

    return trim((string) $value);
}
