<?php

declare(strict_types=1);

function find_player_index(array $room, string $playerToken): ?int
{
    foreach ($room['players'] as $index => $player) {
        if ($player['player_token'] === $playerToken) {
            return $index;
        }
    }

    return null;
}

function sanitize_name(mixed $value): string
{
    $name = trim((string) $value);
    return mb_substr($name !== '' ? $name : tr('default.captain'), 0, 24);
}

function sanitize_max_players(mixed $value): int
{
    $maxPlayers = (int) $value;
    return in_array($maxPlayers, [2, 3, 4], true) ? $maxPlayers : 2;
}

function reset_room_for_setup(array &$room, string $lastAction): void
{
    $room['phase'] = 'setup';
    $room['setup_version'] = ((int) ($room['setup_version'] ?? 0)) + 1;
    $room['current_turn_player_id'] = null;
    $room['turn_started_at'] = null;
    $room['winner_id'] = null;
    $room['rematch_requester_id'] = null;
    $room['last_action'] = $lastAction;

    foreach ($room['players'] as &$player) {
        $player['ready'] = false;
        $player['shotsFired'] = 0;
        $player['board'] = create_empty_board();
        $player['targetBoards'] = [];
    }
    unset($player);

    ensure_room_target_boards($room);
}

function start_battle_if_everyone_ready(array &$room): void
{
    if (
        count($room['players']) === (int) ($room['max_players'] ?? 2)
        && array_reduce($room['players'], static fn(bool $carry, array $player): bool => $carry && $player['ready'], true)
    ) {
        $room['phase'] = 'battle';
        $room['current_turn_player_id'] = $room['host_player_id'];
        $room['turn_started_at'] = now_mysql_datetime();
        $room['last_action'] = tr('last.all_ready_turn', ['name' => player_name($room, $room['current_turn_player_id'])]);
    }
}
