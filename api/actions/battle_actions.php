<?php

declare(strict_types=1);

function handle_fire(PDO $pdo, array $input): void
{
    $code = strtoupper(trim((string) ($input['code'] ?? '')));
    $playerToken = (string) ($input['playerToken'] ?? '');
    $coord = ['x' => (int) ($input['x'] ?? -1), 'y' => (int) ($input['y'] ?? -1)];
    $targetPlayerId = (string) ($input['targetPlayerId'] ?? '');
    if ($code === '' || $playerToken === '') {
        fail(tr('error.room_token_required'));
    }

    $pdo->beginTransaction();
    $room = load_room($pdo, $code, true);
    if ($room === null) {
        $pdo->rollBack();
        fail(tr('error.room_not_found'), 404);
    }
    if ($room['phase'] !== 'battle') {
        $pdo->rollBack();
        fail(tr('error.match_not_started'));
    }

    if (sync_turn_timeout($room)) {
        save_room($pdo, $room);
    }

    $attackerIndex = find_player_index($room, $playerToken);
    if ($attackerIndex === null) {
        $pdo->rollBack();
        fail(tr('error.player_not_found'), 403);
    }

    $attackerId = $room['players'][$attackerIndex]['id'];
    if ($room['current_turn_player_id'] !== $attackerId) {
        $pdo->rollBack();
        fail(tr('error.other_turn'));
    }

    $defenderIndex = null;
    foreach ($room['players'] as $index => $player) {
        if ($player['id'] === $targetPlayerId) {
            $defenderIndex = $index;
            break;
        }
    }
    if ($defenderIndex === null || $defenderIndex === $attackerIndex) {
        $pdo->rollBack();
        fail(tr('error.choose_opponent'));
    }
    if (fleet_destroyed($room['players'][$defenderIndex]['board'])) {
        $pdo->rollBack();
        fail(tr('error.opponent_eliminated'));
    }

    $allowedTargetPlayerId = allowed_target_player_id($room, $attackerId);
    if ($allowedTargetPlayerId === null || $targetPlayerId !== $allowedTargetPlayerId) {
        $pdo->rollBack();
        fail(tr('error.target_order_only'));
    }

    $result = apply_shot($room['players'][$attackerIndex], $room['players'][$defenderIndex], $coord);
    if (!$result['ok']) {
        $pdo->rollBack();
        fail($result['message'] ?? tr('error.invalid_shot'));
    }

    finalize_shot_turn($room, $attackerIndex, $defenderIndex, $coord, (string) $result['result']);
    process_bot_turns($room);

    save_room($pdo, $room);
    $pdo->commit();

    respond(['room' => sanitize_room_for_player($room, $attackerId)]);
}

function handle_surrender_room(PDO $pdo, array $input): void
{
    $code = strtoupper(trim((string) ($input['code'] ?? '')));
    $playerToken = (string) ($input['playerToken'] ?? '');
    if ($code === '' || $playerToken === '') {
        fail(tr('error.room_token_required'));
    }

    $pdo->beginTransaction();
    $room = load_room($pdo, $code, true);
    if ($room === null) {
        $pdo->rollBack();
        fail(tr('error.room_not_found'), 404);
    }
    if ($room['phase'] !== 'battle') {
        $pdo->rollBack();
        fail(tr('error.surrender_only_battle'));
    }

    $playerIndex = find_player_index($room, $playerToken);
    if ($playerIndex === null) {
        $pdo->rollBack();
        fail(tr('error.player_not_found'), 403);
    }

    foreach ($room['players'][$playerIndex]['board']['ships'] as $ship) {
        foreach (placement_cells($ship) as $cell) {
            $room['players'][$playerIndex]['board']['cells'][$cell['y']][$cell['x']]['state'] = 'sunk';
        }
        if (!in_array($ship['shipId'], $room['players'][$playerIndex]['board']['sunkShips'], true)) {
            $room['players'][$playerIndex]['board']['sunkShips'][] = $ship['shipId'];
        }
    }

    $activePlayers = active_players($room);
    if (count($activePlayers) === 0) {
        $pdo->rollBack();
        fail(tr('error.no_opponents_finish'));
    }

    if (count($activePlayers) === 1) {
        $room['phase'] = 'finished';
        $room['current_turn_player_id'] = null;
        $room['turn_started_at'] = null;
        $room['winner_id'] = $activePlayers[0]['id'];
        $room['last_action'] = tr('last.surrender_win', [
            'name' => $room['players'][$playerIndex]['name'],
            'winner' => $activePlayers[0]['name'],
        ]);
    } else {
        $room['phase'] = 'battle';
        $room['winner_id'] = null;
        $room['current_turn_player_id'] = next_active_player_id($room, $room['players'][$playerIndex]['id']);
        $room['turn_started_at'] = $room['current_turn_player_id'] ? now_mysql_datetime() : null;
        $room['last_action'] = tr('last.surrender_out', [
            'name' => $room['players'][$playerIndex]['name'],
            'next' => player_name($room, $room['current_turn_player_id']),
        ]);
    }

    save_room($pdo, $room);
    $pdo->commit();

    respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);
}
