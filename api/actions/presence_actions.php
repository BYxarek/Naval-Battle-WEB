<?php

declare(strict_types=1);

function handle_presence_ping(PDO $pdo, array $input): never
{
    $playerToken = (string) ($input['playerToken'] ?? '');
    if ($playerToken === '') {
        fail('Не передан токен игрока.');
    }

    touch_site_presence($pdo, $playerToken);
    respond(['ok' => true]);
}

function handle_online_count(PDO $pdo): never
{
    respond(['count' => count_online_visitors($pdo)]);
}
