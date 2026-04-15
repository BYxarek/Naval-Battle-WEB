<?php

declare(strict_types=1);

function player_name(array $room, ?string $playerId): ?string
{
    foreach ($room['players'] as $player) {
        if ($player['id'] === $playerId) {
            return $player['name'];
        }
    }

    return null;
}

function now_mysql_datetime(): string
{
    return date('Y-m-d H:i:s');
}

function room_turn_started_at_ms(array $room): ?int
{
    if (empty($room['turn_started_at'])) {
        return null;
    }

    $timestamp = strtotime((string) $room['turn_started_at']);
    return $timestamp === false ? null : $timestamp * 1000;
}

function sync_turn_timeout(array &$room): bool
{
    if ($room['phase'] !== 'battle' || empty($room['current_turn_player_id']) || empty($room['turn_started_at'])) {
        return false;
    }

    $expiresAt = strtotime((string) $room['turn_started_at']);
    if ($expiresAt === false || time() < $expiresAt + TURN_DURATION_SECONDS) {
        return false;
    }

    $timedOutPlayerId = (string) $room['current_turn_player_id'];
    $nextPlayerId = next_active_player_id($room, $timedOutPlayerId);
    if ($nextPlayerId === null || $nextPlayerId === $timedOutPlayerId) {
        $room['turn_started_at'] = now_mysql_datetime();
        return true;
    }

    $room['current_turn_player_id'] = $nextPlayerId;
    $room['turn_started_at'] = now_mysql_datetime();
    $room['last_action'] = tr('last.timeout_next', [
        'timedOut' => player_name($room, $timedOutPlayerId),
        'next' => player_name($room, $nextPlayerId),
    ]);

    return true;
}

function sanitize_room_for_player(array $room, string $playerId): array
{
    ensure_room_target_boards($room);

    return [
        'code' => $room['code'],
        'phase' => $room['phase'],
        'maxPlayers' => (int) ($room['max_players'] ?? 2),
        'setupVersion' => (int) ($room['setup_version'] ?? 1),
        'currentTurnPlayerId' => $room['current_turn_player_id'],
        'turnStartedAt' => room_turn_started_at_ms($room),
        'winnerId' => $room['winner_id'],
        'lastAction' => $room['last_action'],
        'rematchRequesterId' => $room['rematch_requester_id'] ?? null,
        'createdAt' => isset($room['created_at']) ? strtotime((string) $room['created_at']) * 1000 : null,
        'updatedAt' => isset($room['updated_at']) ? strtotime((string) $room['updated_at']) * 1000 : null,
        'youAreHost' => $room['host_player_id'] === $playerId,
        'youPlayerId' => $playerId,
        'players' => array_map(static function (array $player) use ($playerId, $room): array {
            $ownBoard = $player['board'];
            if ($player['id'] !== $playerId) {
                $ownBoard['ships'] = [];
                $ownBoard['cells'] = array_map(
                    static fn(array $row): array => array_map(
                        static fn(array $cell): array => [
                            'x' => $cell['x'],
                            'y' => $cell['y'],
                            'state' => in_array($cell['state'], ['hit', 'miss', 'sunk'], true)
                                ? $cell['state']
                                : 'empty',
                        ],
                        $row
                    ),
                    $player['board']['cells']
                );
            }

            return [
                'id' => $player['id'],
                'name' => $player['name'],
                'ready' => $player['ready'],
                'isBot' => is_bot_player($room, $player),
                'shotsFired' => $player['shotsFired'],
                'sunkShips' => $player['board']['sunkShips'],
                'ownBoard' => $ownBoard,
                'targetBoards' => $player['targetBoards'],
                'isYou' => $player['id'] === $playerId,
                'eliminated' => fleet_destroyed($player['board']),
            ];
        }, $room['players']),
    ];
}

function room_code(): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 5; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }

    return $code;
}

function app_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}
