<?php

declare(strict_types=1);

function handle_state(PDO $pdo): never
{
    $code = strtoupper(trim((string) ($_GET['code'] ?? '')));
    $playerToken = (string) ($_GET['playerToken'] ?? '');
    if ($code === '' || $playerToken === '') {
        fail(tr('error.room_token_required'));
    }

    $pdo->beginTransaction();
    $room = load_room($pdo, $code, true);
    if ($room === null) {
        $pdo->rollBack();
        respond(['room' => null, 'error' => tr('error.room_not_found')]);
    }

    $playerIndex = find_player_index($room, $playerToken);
    if ($playerIndex === null) {
        $pdo->rollBack();
        fail(tr('error.player_not_found'), 403);
    }

    if (sync_turn_timeout($room)) {
        process_bot_turns($room);
        save_room($pdo, $room);
    }

    touch_room_player($pdo, $room['players'][$playerIndex]['id']);
    $pdo->commit();

    respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);
}

function handle_submit_setup(PDO $pdo, array $input): never
{
    $code = strtoupper(trim((string) ($input['code'] ?? '')));
    $playerToken = (string) ($input['playerToken'] ?? '');
    $placements = is_array($input['placements'] ?? null) ? $input['placements'] : [];
    if ($code === '' || $playerToken === '') {
        fail(tr('error.room_token_required'));
    }

    $validation = validate_placements($placements);
    if (!$validation['valid']) {
        fail($validation['reason'] ?? tr('error.invalid_placement'));
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

    $room['players'][$playerIndex]['board'] = build_board_from_placements($placements);
    $room['players'][$playerIndex]['ready'] = true;
    $room['last_action'] = tr('last.confirm_setup', ['name' => $room['players'][$playerIndex]['name']]);
    if (room_has_bot($room)) {
        prepare_bot_for_battle($room);
    }
    start_battle_if_everyone_ready($room);
    process_bot_turns($room);

    save_room($pdo, $room);
    $pdo->commit();

    respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);
}

function handle_cancel_room(PDO $pdo, array $input): never
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
    if ($room['phase'] !== 'setup') {
        $pdo->rollBack();
        fail(tr('error.cancel_only_setup'));
    }

    $playerIndex = find_player_index($room, $playerToken);
    if ($playerIndex === null) {
        $pdo->rollBack();
        fail(tr('error.player_not_found'), 403);
    }

    delete_room($pdo, $code);
    $pdo->commit();

    respond(['ok' => true]);
}
