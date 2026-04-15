<?php

declare(strict_types=1);

function handle_create_room(PDO $pdo, array $input): void
{
    $name = sanitize_name($input['name'] ?? '');
    $maxPlayers = sanitize_max_players($input['maxPlayers'] ?? 2);
    $playerToken = (string) ($input['playerToken'] ?? '');
    if ($playerToken === '') {
        fail(tr('error.player_token_missing'));
    }

    $pdo->beginTransaction();
    do {
        $code = room_code();
    } while (room_code_exists($pdo, $code));

    $playerId = app_uuid();
    $player = create_player($playerId, $name, $playerToken);

    insert_room($pdo, $code, $maxPlayers, $playerId, tr('last.create_room', ['name' => $name, 'code' => $code]));
    insert_room_player($pdo, $code, $player);

    $room = load_room($pdo, $code, true);
    ensure_room_target_boards($room);
    save_room($pdo, $room);
    $pdo->commit();

    respond(['room' => sanitize_room_for_player($room, $playerId)]);
}

function handle_create_bot_room(PDO $pdo, array $input): void
{
    $name = sanitize_name($input['name'] ?? '');
    $playerToken = (string) ($input['playerToken'] ?? '');
    if ($playerToken === '') {
        fail(tr('error.player_token_missing'));
    }

    $pdo->beginTransaction();
    do {
        $code = room_code();
    } while (room_code_exists($pdo, $code));

    $playerId = app_uuid();
    $player = create_player($playerId, $name, $playerToken);
    $bot = create_bot_player($code);

    insert_room($pdo, $code, 2, $playerId, tr('last.create_bot_room', ['name' => $name, 'bot' => $bot['name']]));
    insert_room_player($pdo, $code, $player);
    insert_room_player($pdo, $code, $bot);

    $room = load_room($pdo, $code, true);
    ensure_room_target_boards($room);
    prepare_bot_for_battle($room);
    save_room($pdo, $room);
    $pdo->commit();

    respond(['room' => sanitize_room_for_player($room, $playerId)]);
}

function handle_join_room(PDO $pdo, array $input): void
{
    $name = sanitize_name($input['name'] ?? '');
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

    $existingIndex = find_player_index($room, $playerToken);
    if ($existingIndex !== null) {
        $room['players'][$existingIndex]['name'] = $name;
        ensure_room_target_boards($room);
        save_room($pdo, $room);
        $pdo->commit();
        respond(['room' => sanitize_room_for_player($room, $room['players'][$existingIndex]['id'])]);
    }

    if (count($room['players']) >= (int) ($room['max_players'] ?? 2)) {
        $pdo->rollBack();
        fail(tr('error.room_full'));
    }
    if (!in_array($room['phase'], ['setup', 'lobby'], true)) {
        $pdo->rollBack();
        fail(tr('error.match_started'));
    }

    $playerId = app_uuid();
    $player = create_player($playerId, $name, $playerToken);
    insert_room_player($pdo, $code, $player);
    update_room_phase_and_action($pdo, $code, 'setup', tr('last.join_room', ['name' => $name, 'code' => $code]));

    $room = load_room($pdo, $code, true);
    ensure_room_target_boards($room);
    save_room($pdo, $room);
    $pdo->commit();

    respond(['room' => sanitize_room_for_player($room, $playerId)]);
}
