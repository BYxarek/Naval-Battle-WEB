<?php

declare(strict_types=1);

function find_ship(array $board, string $shipId): ?array
{
    foreach ($board['ships'] as $ship) {
        if ($ship['shipId'] === $shipId) {
            return $ship;
        }
    }

    return null;
}

function apply_shot(array &$attacker, array &$defender, array $coord): array
{
    $targetBoard = $attacker['targetBoards'][$defender['id']] ?? null;
    if ($targetBoard === null) {
        return ['ok' => false, 'message' => tr('battle.no_radar')];
    }

    if (!in_bounds($coord)) {
        return ['ok' => false, 'message' => tr('battle.out_of_bounds')];
    }

    if ($targetBoard[$coord['y']][$coord['x']]['state'] !== 'unknown') {
        return ['ok' => false, 'message' => tr('battle.already_shot')];
    }

    $defendingCell = $defender['board']['cells'][$coord['y']][$coord['x']];
    if ($defendingCell['state'] === 'empty' || $defendingCell['state'] === 'miss') {
        $targetBoard[$coord['y']][$coord['x']]['state'] = 'miss';
        $defender['board']['cells'][$coord['y']][$coord['x']]['state'] = 'miss';
        $attacker['shotsFired']++;
        $attacker['targetBoards'][$defender['id']] = $targetBoard;
        return ['ok' => true, 'result' => 'miss'];
    }

    if ($defendingCell['state'] === 'ship' || $defendingCell['state'] === 'hit') {
        $shipId = $defendingCell['shipId'] ?? null;
        if ($shipId === null) {
            return ['ok' => false, 'message' => tr('battle.missing_ship_id')];
        }

        $defender['board']['cells'][$coord['y']][$coord['x']]['state'] = 'hit';
        $targetBoard[$coord['y']][$coord['x']]['state'] = 'hit';
        $attacker['shotsFired']++;

        $ship = find_ship($defender['board'], $shipId);
        if ($ship === null) {
            return ['ok' => false, 'message' => tr('battle.ship_not_found')];
        }

        $shipCells = placement_cells($ship);
        $allHit = true;
        foreach ($shipCells as $cell) {
            $state = $defender['board']['cells'][$cell['y']][$cell['x']]['state'];
            if ($state !== 'hit' && $state !== 'sunk') {
                $allHit = false;
                break;
            }
        }

        if ($allHit) {
            foreach ($shipCells as $cell) {
                $defender['board']['cells'][$cell['y']][$cell['x']]['state'] = 'sunk';
                $targetBoard[$cell['y']][$cell['x']]['state'] = 'sunk';
            }
            $attacker['targetBoards'][$defender['id']] = $targetBoard;
            mark_water_around_sunk_ship($attacker, $defender, $shipCells);
            if (!in_array($shipId, $defender['board']['sunkShips'], true)) {
                $defender['board']['sunkShips'][] = $shipId;
            }
            return ['ok' => true, 'result' => 'sunk'];
        }

        $attacker['targetBoards'][$defender['id']] = $targetBoard;
        return ['ok' => true, 'result' => 'hit'];
    }

    return ['ok' => false, 'message' => tr('battle.invalid_cell_state')];
}

function fleet_destroyed(array $board): bool
{
    return count($board['sunkShips']) === count(SHIPS);
}

function active_players(array $room): array
{
    return array_values(array_filter(
        $room['players'],
        static fn(array $player): bool => !fleet_destroyed($player['board'])
    ));
}

function next_active_player_id(array $room, string $currentPlayerId): ?string
{
    $startIndex = null;
    foreach ($room['players'] as $index => $player) {
        if ($player['id'] === $currentPlayerId) {
            $startIndex = $index;
            break;
        }
    }

    if ($startIndex === null) {
        return null;
    }

    $count = count($room['players']);
    for ($offset = 1; $offset <= $count; $offset++) {
        $player = $room['players'][($startIndex + $offset) % $count];
        if (!fleet_destroyed($player['board'])) {
            return $player['id'];
        }
    }

    return null;
}

function allowed_target_player_id(array $room, string $attackerId): ?string
{
    return next_active_player_id($room, $attackerId);
}
