<?php

declare(strict_types=1);

return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'database' => 'morskoy_boy',
        'username' => 'morskoy_boy',
        'password' => 'morskoy_boy',
        'charset' => 'utf8mb4',
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
