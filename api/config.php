<?php

declare(strict_types=1);

$env = static function (string $name, string $fallback): string {
    $value = getenv($name);
    return $value === false || $value === '' ? $fallback : $value;
};

return [
    'db' => [
        'host' => $env('MORSKOY_BOY_DB_HOST', 'localhost'),
        'port' => (int) $env('MORSKOY_BOY_DB_PORT', '3306'),
        'database' => $env('MORSKOY_BOY_DB_NAME', 'morskoy_boy'),
        'username' => $env('MORSKOY_BOY_DB_USER', 'morskoy_boy'),
        'password' => $env('MORSKOY_BOY_DB_PASSWORD', 'morskoy_boy'),
        'charset' => $env('MORSKOY_BOY_DB_CHARSET', 'utf8mb4'),
    ],
    'maintenance' => [
        'enabled' => true,
        'cleanup_chance_percent' => 100,
        'cleanup_min_interval_seconds' => 300,
        'setup_room_ttl_hours' => 6,
        'battle_room_ttl_hours' => 6,
        'finished_room_ttl_hours' => 6,
        'presence_token_ttl_minutes' => 360,
    ],
];
