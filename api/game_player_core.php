<?php

declare(strict_types=1);

function create_player(string $id, string $name, string $token): array
{
    return [
        'id' => $id,
        'name' => $name,
        'player_token' => $token,
        'ready' => false,
        'shotsFired' => 0,
        'board' => create_empty_board(),
        'targetBoards' => [],
    ];
}

function stable_uuid_from_seed(string $seed): string
{
    $hash = substr(md5($seed), 0, 32);
    return substr($hash, 0, 8) . '-' . substr($hash, 8, 4) . '-' . substr($hash, 12, 4) . '-' . substr($hash, 16, 4) . '-' . substr($hash, 20, 12);
}

function bot_player_token_for_room(string $roomCode): string
{
    return stable_uuid_from_seed('bot-token-' . $roomCode);
}

function bot_player_id_for_room(string $roomCode): string
{
    return stable_uuid_from_seed('bot-player-' . $roomCode);
}

function create_bot_player(string $roomCode): array
{
    return create_player(
        bot_player_id_for_room($roomCode),
        tr('bot.name'),
        bot_player_token_for_room($roomCode),
    );
}

function is_bot_player(array $room, array $player): bool
{
    return ($player['player_token'] ?? null) === bot_player_token_for_room((string) $room['code']);
}

function room_has_bot(array $room): bool
{
    foreach ($room['players'] as $player) {
        if (is_bot_player($room, $player)) {
            return true;
        }
    }

    return false;
}

function bot_player_index(array $room): ?int
{
    foreach ($room['players'] as $index => $player) {
        if (is_bot_player($room, $player)) {
            return $index;
        }
    }

    return null;
}

function mark_water_around_sunk_ship(array &$attacker, array &$defender, array $shipCells): void
{
    $targetBoard = $attacker['targetBoards'][$defender['id']] ?? null;
    if ($targetBoard === null) {
        return;
    }

    $shipKeys = [];
    foreach ($shipCells as $cell) {
        $shipKeys[$cell['x'] . ':' . $cell['y']] = true;
    }

    foreach ($shipCells as $cell) {
        foreach (neighbor_coords($cell) as $neighbor) {
            $key = $neighbor['x'] . ':' . $neighbor['y'];
            if (isset($shipKeys[$key])) {
                continue;
            }

            if ($targetBoard[$neighbor['y']][$neighbor['x']]['state'] === 'unknown') {
                $targetBoard[$neighbor['y']][$neighbor['x']]['state'] = 'miss';
            }

            if ($defender['board']['cells'][$neighbor['y']][$neighbor['x']]['state'] === 'empty') {
                $defender['board']['cells'][$neighbor['y']][$neighbor['x']]['state'] = 'miss';
            }
        }
    }

    $attacker['targetBoards'][$defender['id']] = $targetBoard;
}

function ensure_room_target_boards(array &$room): void
{
    foreach ($room['players'] as &$player) {
        if (!isset($player['targetBoards']) || !is_array($player['targetBoards'])) {
            $player['targetBoards'] = [];
        }

        foreach ($room['players'] as $opponent) {
            if ($opponent['id'] === $player['id']) {
                continue;
            }
            if (!isset($player['targetBoards'][$opponent['id']])) {
                $player['targetBoards'][$opponent['id']] = create_empty_target_board();
            }
        }

        foreach (array_keys($player['targetBoards']) as $opponentId) {
            $exists = false;
            foreach ($room['players'] as $candidate) {
                if ($candidate['id'] === $opponentId && $candidate['id'] !== $player['id']) {
                    $exists = true;
                    break;
                }
            }
            if (!$exists) {
                unset($player['targetBoards'][$opponentId]);
            }
        }
    }
    unset($player);
}
