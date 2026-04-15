<?php

declare(strict_types=1);

function handle_request_rematch(PDO $pdo, array $input): never
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
    if ($room['phase'] !== 'finished') {
        $pdo->rollBack();
        fail(tr('error.rematch_only_finished'));
    }

    $playerIndex = find_player_index($room, $playerToken);
    if ($playerIndex === null) {
        $pdo->rollBack();
        fail(tr('error.player_not_found'), 403);
    }
    if (room_has_bot($room)) {
        reset_room_for_setup($room, tr('last.bot_rematch_ready', ['name' => $room['players'][$playerIndex]['name'], 'bot' => tr('bot.name')]));
        prepare_bot_for_battle($room);
        save_room($pdo, $room);
        $pdo->commit();
        respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);
    }
    if (!empty($room['rematch_requester_id'])) {
        $pdo->rollBack();
        fail(tr('error.rematch_already_sent'));
    }

    $room['rematch_requester_id'] = $room['players'][$playerIndex]['id'];
    $room['last_action'] = tr('last.rematch_wants', ['name' => $room['players'][$playerIndex]['name']]);

    save_room($pdo, $room);
    $pdo->commit();

    respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);
}

function handle_respond_rematch(PDO $pdo, array $input): never
{
    $code = strtoupper(trim((string) ($input['code'] ?? '')));
    $playerToken = (string) ($input['playerToken'] ?? '');
    $decision = (string) ($input['decision'] ?? '');
    if ($code === '' || $playerToken === '' || !in_array($decision, ['accept', 'decline'], true)) {
        fail(tr('error.rematch_decision_required'));
    }

    $pdo->beginTransaction();
    $room = load_room($pdo, $code, true);
    if ($room === null) {
        $pdo->rollBack();
        fail(tr('error.room_not_found'), 404);
    }
    if ($room['phase'] !== 'finished' || empty($room['rematch_requester_id'])) {
        $pdo->rollBack();
        fail(tr('error.rematch_request_missing'));
    }

    $playerIndex = find_player_index($room, $playerToken);
    if ($playerIndex === null) {
        $pdo->rollBack();
        fail(tr('error.player_not_found'), 403);
    }

    $requesterId = (string) $room['rematch_requester_id'];
    if ($room['players'][$playerIndex]['id'] === $requesterId) {
        $pdo->rollBack();
        fail(tr('error.rematch_self_accept'));
    }

    if ($decision === 'accept') {
        reset_room_for_setup($room, tr('last.rematch_accept', ['name' => $room['players'][$playerIndex]['name']]));
    } else {
        $room['phase'] = 'closed';
        $room['current_turn_player_id'] = null;
        $room['turn_started_at'] = null;
        $room['rematch_requester_id'] = null;
        $room['last_action'] = tr('last.rematch_decline', ['name' => $room['players'][$playerIndex]['name']]);
    }

    save_room($pdo, $room);
    $pdo->commit();

    respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);
}

function handle_restart_room(PDO $pdo, array $input): never
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

    $playerIndex = find_player_index($room, $playerToken);
    if ($playerIndex === null) {
        $pdo->rollBack();
        fail(tr('error.player_not_found'), 403);
    }

    reset_room_for_setup($room, tr('last.restart_room'));
    if (room_has_bot($room)) {
        prepare_bot_for_battle($room);
    }
    save_room($pdo, $room);
    $pdo->commit();

    respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);
}
