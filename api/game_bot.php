<?php

declare(strict_types=1);

function generate_random_bot_placements(): array
{
    $placements = [];
    $occupied = [];
    $forbidden = [];
    $ships = SHIPS;
    usort($ships, static fn(array $left, array $right): int => $right['length'] <=> $left['length']);

    foreach ($ships as $ship) {
        $placed = false;
        for ($attempt = 0; $attempt < 2000; $attempt++) {
            $orientation = random_int(0, 1) === 0 ? 'horizontal' : 'vertical';
            $placement = [
                'shipId' => $ship['id'],
                'length' => $ship['length'],
                'orientation' => $orientation,
                'start' => [
                    'x' => random_int(0, BOARD_SIZE - 1),
                    'y' => random_int(0, BOARD_SIZE - 1),
                ],
            ];
            $cells = placement_cells($placement);
            $valid = true;
            foreach ($cells as $cell) {
                if (!in_bounds($cell)) {
                    $valid = false;
                    break;
                }
                $key = $cell['x'] . ':' . $cell['y'];
                if (isset($occupied[$key]) || isset($forbidden[$key])) {
                    $valid = false;
                    break;
                }
            }
            if (!$valid) {
                continue;
            }

            $placements[] = $placement;
            foreach ($cells as $cell) {
                $occupied[$cell['x'] . ':' . $cell['y']] = true;
            }
            foreach ($cells as $cell) {
                foreach (neighbor_keys($cell) as $neighborKey) {
                    if (!isset($occupied[$neighborKey])) {
                        $forbidden[$neighborKey] = true;
                    }
                }
            }
            $placed = true;
            break;
        }

        if (!$placed) {
            throw new RuntimeException('Failed to place bot fleet.');
        }
    }

    return $placements;
}

function prepare_bot_for_battle(array &$room): void
{
    $botIndex = bot_player_index($room);
    if ($botIndex === null) {
        return;
    }

    $room['players'][$botIndex]['board'] = build_board_from_placements(generate_random_bot_placements());
    $room['players'][$botIndex]['ready'] = true;
    ensure_room_target_boards($room);
}

function process_bot_turns(array &$room): void
{
    $iterations = 0;
    while ($room['phase'] === 'battle' && ($botIndex = bot_player_index($room)) !== null && $room['current_turn_player_id'] === $room['players'][$botIndex]['id']) {
        $targetPlayerId = allowed_target_player_id($room, $room['players'][$botIndex]['id']);
        if ($targetPlayerId === null) {
            return;
        }

        $defenderIndex = null;
        foreach ($room['players'] as $index => $player) {
            if ($player['id'] === $targetPlayerId) {
                $defenderIndex = $index;
                break;
            }
        }
        if ($defenderIndex === null) {
            return;
        }

        $coord = choose_bot_shot($room['players'][$botIndex], $room['players'][$defenderIndex]);
        $result = apply_shot($room['players'][$botIndex], $room['players'][$defenderIndex], $coord);
        if (!$result['ok']) {
            throw new RuntimeException((string) ($result['message'] ?? 'Bot shot failed.'));
        }

        finalize_shot_turn($room, $botIndex, $defenderIndex, $coord, (string) $result['result']);

        $iterations += 1;
        if ($iterations > 100) {
            throw new RuntimeException('Bot move loop exceeded safety limit.');
        }
    }
}

function choose_bot_shot(array $bot, array $defender): array
{
    $targetBoard = $bot['targetBoards'][$defender['id']] ?? create_empty_target_board();
    $priorityTargets = bot_priority_targets($targetBoard);
    if ($priorityTargets !== []) {
        return $priorityTargets[array_rand($priorityTargets)];
    }

    $checkerTargets = [];
    $fallbackTargets = [];
    for ($y = 0; $y < BOARD_SIZE; $y++) {
        for ($x = 0; $x < BOARD_SIZE; $x++) {
            if (($targetBoard[$y][$x]['state'] ?? 'unknown') !== 'unknown') {
                continue;
            }
            $coord = ['x' => $x, 'y' => $y];
            $fallbackTargets[] = $coord;
            if ((($x + $y) % 2) === 0) {
                $checkerTargets[] = $coord;
            }
        }
    }

    $pool = $checkerTargets !== [] ? $checkerTargets : $fallbackTargets;
    if ($pool === []) {
        throw new RuntimeException('Bot has no valid targets left.');
    }

    return $pool[array_rand($pool)];
}

function bot_priority_targets(array $targetBoard): array
{
    $hits = [];
    for ($y = 0; $y < BOARD_SIZE; $y++) {
        for ($x = 0; $x < BOARD_SIZE; $x++) {
            if (($targetBoard[$y][$x]['state'] ?? null) === 'hit') {
                $hits[] = ['x' => $x, 'y' => $y];
            }
        }
    }

    if ($hits === []) {
        return [];
    }

    $groups = [];
    $visited = [];
    foreach ($hits as $hit) {
        $key = $hit['x'] . ':' . $hit['y'];
        if (isset($visited[$key])) {
            continue;
        }

        $queue = [$hit];
        $group = [];
        while ($queue !== []) {
            $cell = array_pop($queue);
            $cellKey = $cell['x'] . ':' . $cell['y'];
            if (isset($visited[$cellKey])) {
                continue;
            }
            $visited[$cellKey] = true;
            $group[] = $cell;

            foreach ([[1, 0], [-1, 0], [0, 1], [0, -1]] as [$dx, $dy]) {
                $next = ['x' => $cell['x'] + $dx, 'y' => $cell['y'] + $dy];
                if (!in_bounds($next)) {
                    continue;
                }
                if (($targetBoard[$next['y']][$next['x']]['state'] ?? null) === 'hit') {
                    $queue[] = $next;
                }
            }
        }
        $groups[] = $group;
    }

    usort($groups, static fn(array $left, array $right): int => count($right) <=> count($left));

    foreach ($groups as $group) {
        $targets = [];
        if (count($group) > 1) {
            $sameX = count(array_unique(array_map(static fn(array $cell): int => $cell['x'], $group))) === 1;
            if ($sameX) {
                usort($group, static fn(array $left, array $right): int => $left['y'] <=> $right['y']);
                $targets[] = ['x' => $group[0]['x'], 'y' => $group[0]['y'] - 1];
                $targets[] = ['x' => $group[0]['x'], 'y' => $group[count($group) - 1]['y'] + 1];
            } else {
                usort($group, static fn(array $left, array $right): int => $left['x'] <=> $right['x']);
                $targets[] = ['x' => $group[0]['x'] - 1, 'y' => $group[0]['y']];
                $targets[] = ['x' => $group[count($group) - 1]['x'] + 1, 'y' => $group[0]['y']];
            }
        } else {
            $cell = $group[0];
            $targets[] = ['x' => $cell['x'], 'y' => $cell['y'] - 1];
            $targets[] = ['x' => $cell['x'] + 1, 'y' => $cell['y']];
            $targets[] = ['x' => $cell['x'], 'y' => $cell['y'] + 1];
            $targets[] = ['x' => $cell['x'] - 1, 'y' => $cell['y']];
        }

        $filtered = array_values(array_filter($targets, static function (array $coord) use ($targetBoard): bool {
            return in_bounds($coord) && (($targetBoard[$coord['y']][$coord['x']]['state'] ?? 'unknown') === 'unknown');
        }));
        if ($filtered !== []) {
            return $filtered;
        }
    }

    return [];
}

function finalize_shot_turn(array &$room, int $attackerIndex, int $defenderIndex, array $coord, string $result): void
{
    $cell = chr(65 + $coord['x']) . (string) ($coord['y'] + 1);
    $activePlayers = active_players($room);

    if (count($activePlayers) === 1) {
        $room['phase'] = 'finished';
        $room['winner_id'] = $activePlayers[0]['id'];
        $room['current_turn_player_id'] = null;
        $room['turn_started_at'] = null;
        $room['last_action'] = tr('last.win_destroyed_all', ['name' => $room['players'][$attackerIndex]['name']]);
        return;
    }

    if ($result === 'miss') {
        $nextPlayerId = next_active_player_id($room, $room['players'][$attackerIndex]['id']);
        $room['current_turn_player_id'] = $nextPlayerId;
        $room['turn_started_at'] = $nextPlayerId ? now_mysql_datetime() : null;
        $room['last_action'] = tr('last.shot_miss', [
            'name' => $room['players'][$attackerIndex]['name'],
            'cell' => $cell,
            'next' => player_name($room, $nextPlayerId),
        ]);
        return;
    }

    $room['current_turn_player_id'] = $room['players'][$attackerIndex]['id'];
    $room['turn_started_at'] = now_mysql_datetime();
    if ($result === 'sunk' && fleet_destroyed($room['players'][$defenderIndex]['board'])) {
        $room['last_action'] = tr('last.eliminated_and_turn', [
            'name' => $room['players'][$attackerIndex]['name'],
            'opponent' => $room['players'][$defenderIndex]['name'],
        ]);
        return;
    }

    $resultLabel = $result === 'hit' ? tr('last.result_hit') : tr('last.result_sunk');
    $room['last_action'] = tr('last.shot_repeat', [
        'name' => $room['players'][$attackerIndex]['name'],
        'cell' => $cell,
        'result' => $resultLabel,
    ]);
}
