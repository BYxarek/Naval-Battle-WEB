<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/game.php';

try {
    $pdo = pdo_connect($config);
} catch (Throwable $exception) {
    fail('Не удалось подключиться к базе данных.', 500);
}

function load_room(PDO $pdo, string $code, bool $forUpdate = false): ?array
{
    $sql = 'SELECT * FROM rooms WHERE code = :code';
    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['code' => $code]);
    $room = $stmt->fetch();
    if (!$room) {
        return null;
    }

    $playerStmt = $pdo->prepare('SELECT * FROM room_players WHERE room_code = :room_code ORDER BY created_at ASC' . ($forUpdate ? ' FOR UPDATE' : ''));
    $playerStmt->execute(['room_code' => $code]);
    $players = [];
    foreach ($playerStmt->fetchAll() as $player) {
        $players[] = [
            'id' => $player['id'],
            'name' => $player['name'],
            'player_token' => $player['player_token'],
            'ready' => (bool) $player['ready'],
            'shotsFired' => (int) $player['shots_fired'],
            'board' => json_decode($player['board_json'], true, 512, JSON_THROW_ON_ERROR),
            'targetBoard' => json_decode($player['target_board_json'], true, 512, JSON_THROW_ON_ERROR),
        ];
    }

    $room['players'] = $players;
    return $room;
}

function save_room(PDO $pdo, array $room): void
{
    $stmt = $pdo->prepare('
        UPDATE rooms
        SET phase = :phase,
            current_turn_player_id = :current_turn_player_id,
            winner_id = :winner_id,
            rematch_requester_id = :rematch_requester_id,
            last_action = :last_action,
            updated_at = NOW()
        WHERE code = :code
    ');
    $stmt->execute([
        'phase' => $room['phase'],
        'current_turn_player_id' => $room['current_turn_player_id'],
        'winner_id' => $room['winner_id'],
        'rematch_requester_id' => $room['rematch_requester_id'],
        'last_action' => $room['last_action'],
        'code' => $room['code'],
    ]);

    $playerStmt = $pdo->prepare('
        UPDATE room_players
        SET name = :name,
            ready = :ready,
            shots_fired = :shots_fired,
            board_json = :board_json,
            target_board_json = :target_board_json,
            updated_at = NOW(),
            last_seen_at = NOW()
        WHERE id = :id
    ');

    foreach ($room['players'] as $player) {
        $playerStmt->execute([
            'id' => $player['id'],
            'name' => $player['name'],
            'ready' => $player['ready'] ? 1 : 0,
            'shots_fired' => $player['shotsFired'],
            'board_json' => json_encode($player['board'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'target_board_json' => json_encode($player['targetBoard'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }
}

function find_player_index(array $room, string $playerToken): ?int
{
    foreach ($room['players'] as $index => $player) {
        if ($player['player_token'] === $playerToken) {
            return $index;
        }
    }
    return null;
}

function player_name(array $room, ?string $playerId): ?string
{
    foreach ($room['players'] as $player) {
        if ($player['id'] === $playerId) {
            return $player['name'];
        }
    }
    return null;
}

function other_player_index(array $room, int $playerIndex): ?int
{
    foreach ($room['players'] as $index => $_player) {
        if ($index !== $playerIndex) {
            return $index;
        }
    }

    return null;
}

function sanitize_name(mixed $value): string
{
    $name = trim((string) $value);
    return mb_substr($name !== '' ? $name : 'Капитан', 0, 24);
}

$action = (string) ($_GET['action'] ?? '');
$input = json_input();

try {
    switch ($action) {
        case 'create-room':
            $name = sanitize_name($input['name'] ?? '');
            $playerToken = (string) ($input['playerToken'] ?? '');
            if ($playerToken === '') {
                fail('Не передан токен игрока.');
            }

            $pdo->beginTransaction();
            do {
                $code = room_code();
                $existsStmt = $pdo->prepare('SELECT code FROM rooms WHERE code = :code');
                $existsStmt->execute(['code' => $code]);
            } while ($existsStmt->fetch());

            $playerId = app_uuid();
            $player = create_player($playerId, $name, $playerToken);

            $roomStmt = $pdo->prepare('
                INSERT INTO rooms (code, phase, host_player_id, current_turn_player_id, winner_id, rematch_requester_id, last_action, created_at, updated_at)
                VALUES (:code, :phase, :host_player_id, NULL, NULL, NULL, :last_action, NOW(), NOW())
            ');
            $roomStmt->execute([
                'code' => $code,
                'phase' => 'setup',
                'host_player_id' => $playerId,
                'last_action' => $name . ' создал комнату ' . $code . '.',
            ]);

            $playerStmt = $pdo->prepare('
                INSERT INTO room_players
                (id, room_code, player_token, name, ready, shots_fired, board_json, target_board_json, created_at, updated_at, last_seen_at)
                VALUES
                (:id, :room_code, :player_token, :name, 0, 0, :board_json, :target_board_json, NOW(), NOW(), NOW())
            ');
            $playerStmt->execute([
                'id' => $playerId,
                'room_code' => $code,
                'player_token' => $playerToken,
                'name' => $name,
                'board_json' => json_encode($player['board'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'target_board_json' => json_encode($player['targetBoard'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            $room = load_room($pdo, $code, true);
            $pdo->commit();
            respond(['room' => sanitize_room_for_player($room, $playerId)]);

        case 'join-room':
            $name = sanitize_name($input['name'] ?? '');
            $code = strtoupper(trim((string) ($input['code'] ?? '')));
            $playerToken = (string) ($input['playerToken'] ?? '');
            if ($code === '' || $playerToken === '') {
                fail('Нужны код комнаты и токен игрока.');
            }

            $pdo->beginTransaction();
            $room = load_room($pdo, $code, true);
            if ($room === null) {
                $pdo->rollBack();
                fail('Комната не найдена.', 404);
            }

            $existingIndex = find_player_index($room, $playerToken);
            if ($existingIndex !== null) {
                $room['players'][$existingIndex]['name'] = $name;
                save_room($pdo, $room);
                $pdo->commit();
                respond(['room' => sanitize_room_for_player($room, $room['players'][$existingIndex]['id'])]);
            }

            if (count($room['players']) >= 2) {
                $pdo->rollBack();
                fail('Комната уже заполнена.');
            }
            if (!in_array($room['phase'], ['setup', 'lobby'], true)) {
                $pdo->rollBack();
                fail('Матч уже начался.');
            }

            $playerId = app_uuid();
            $player = create_player($playerId, $name, $playerToken);

            $playerStmt = $pdo->prepare('
                INSERT INTO room_players
                (id, room_code, player_token, name, ready, shots_fired, board_json, target_board_json, created_at, updated_at, last_seen_at)
                VALUES
                (:id, :room_code, :player_token, :name, 0, 0, :board_json, :target_board_json, NOW(), NOW(), NOW())
            ');
            $playerStmt->execute([
                'id' => $playerId,
                'room_code' => $code,
                'player_token' => $playerToken,
                'name' => $name,
                'board_json' => json_encode($player['board'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'target_board_json' => json_encode($player['targetBoard'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            $updateStmt = $pdo->prepare('UPDATE rooms SET phase = :phase, last_action = :last_action, updated_at = NOW() WHERE code = :code');
            $updateStmt->execute([
                'phase' => 'setup',
                'last_action' => $name . ' присоединился к комнате ' . $code . '.',
                'code' => $code,
            ]);

            $room = load_room($pdo, $code, true);
            $pdo->commit();
            respond(['room' => sanitize_room_for_player($room, $playerId)]);

        case 'state':
            $code = strtoupper(trim((string) ($_GET['code'] ?? '')));
            $playerToken = (string) ($_GET['playerToken'] ?? '');
            if ($code === '' || $playerToken === '') {
                fail('Нужны код комнаты и токен игрока.');
            }

            $room = load_room($pdo, $code);
            if ($room === null) {
                respond(['room' => null, 'error' => 'Комната не найдена.']);
            }

            $playerIndex = find_player_index($room, $playerToken);
            if ($playerIndex === null) {
                fail('Игрок не найден в комнате.', 403);
            }

            $touchStmt = $pdo->prepare('UPDATE room_players SET last_seen_at = NOW() WHERE id = :id');
            $touchStmt->execute(['id' => $room['players'][$playerIndex]['id']]);

            respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);

        case 'submit-setup':
            $code = strtoupper(trim((string) ($input['code'] ?? '')));
            $playerToken = (string) ($input['playerToken'] ?? '');
            $placements = is_array($input['placements'] ?? null) ? $input['placements'] : [];
            if ($code === '' || $playerToken === '') {
                fail('Нужны код комнаты и токен игрока.');
            }

            $validation = validate_placements($placements);
            if (!$validation['valid']) {
                fail($validation['reason'] ?? 'Некорректная расстановка.');
            }

            $pdo->beginTransaction();
            $room = load_room($pdo, $code, true);
            if ($room === null) {
                $pdo->rollBack();
                fail('Комната не найдена.', 404);
            }

            $playerIndex = find_player_index($room, $playerToken);
            if ($playerIndex === null) {
                $pdo->rollBack();
                fail('Игрок не найден в комнате.', 403);
            }

            $room['players'][$playerIndex]['board'] = build_board_from_placements($placements);
            $room['players'][$playerIndex]['ready'] = true;
            $room['last_action'] = $room['players'][$playerIndex]['name'] . ' подтвердил расстановку.';

            if (count($room['players']) === 2 && array_reduce($room['players'], static fn(bool $carry, array $player): bool => $carry && $player['ready'], true)) {
                $room['phase'] = 'battle';
                $room['current_turn_player_id'] = $room['host_player_id'];
                $room['last_action'] = 'Оба игрока готовы. Ход: ' . player_name($room, $room['current_turn_player_id']) . '.';
            }

            save_room($pdo, $room);
            $pdo->commit();
            respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);

        case 'fire':
            $code = strtoupper(trim((string) ($input['code'] ?? '')));
            $playerToken = (string) ($input['playerToken'] ?? '');
            $coord = ['x' => (int) ($input['x'] ?? -1), 'y' => (int) ($input['y'] ?? -1)];
            if ($code === '' || $playerToken === '') {
                fail('Нужны код комнаты и токен игрока.');
            }

            $pdo->beginTransaction();
            $room = load_room($pdo, $code, true);
            if ($room === null) {
                $pdo->rollBack();
                fail('Комната не найдена.', 404);
            }
            if ($room['phase'] !== 'battle') {
                $pdo->rollBack();
                fail('Матч ещё не начался.');
            }

            $attackerIndex = find_player_index($room, $playerToken);
            if ($attackerIndex === null) {
                $pdo->rollBack();
                fail('Игрок не найден в комнате.', 403);
            }

            $attackerId = $room['players'][$attackerIndex]['id'];
            if ($room['current_turn_player_id'] !== $attackerId) {
                $pdo->rollBack();
                fail('Сейчас ход другого игрока.');
            }

            $defenderIndex = $attackerIndex === 0 ? 1 : 0;
            if (!isset($room['players'][$defenderIndex])) {
                $pdo->rollBack();
                fail('Ожидается второй игрок.');
            }

            $result = apply_shot($room['players'][$attackerIndex], $room['players'][$defenderIndex], $coord);
            if (!$result['ok']) {
                $pdo->rollBack();
                fail($result['message'] ?? 'Некорректный выстрел.');
            }

            if (fleet_destroyed($room['players'][$defenderIndex]['board'])) {
                $room['phase'] = 'finished';
                $room['winner_id'] = $room['players'][$attackerIndex]['id'];
                $room['last_action'] = $room['players'][$attackerIndex]['name'] . ' потопил последний корабль и победил.';
            } else {
                $cell = chr(65 + $coord['x']) . (string) ($coord['y'] + 1);
                if ($result['result'] === 'miss') {
                    $room['current_turn_player_id'] = $room['players'][$defenderIndex]['id'];
                    $room['last_action'] = $room['players'][$attackerIndex]['name'] . ' выстрелил в ' . $cell . ': мимо. Ход переходит к ' . $room['players'][$defenderIndex]['name'] . '.';
                } else {
                    $room['current_turn_player_id'] = $room['players'][$attackerIndex]['id'];
                    $resultLabel = $result['result'] === 'hit' ? 'попадание' : 'корабль потоплен';
                    $room['last_action'] = $room['players'][$attackerIndex]['name'] . ' выстрелил в ' . $cell . ': ' . $resultLabel . '. Он ходит ещё раз.';
                }
            }

            save_room($pdo, $room);
            $pdo->commit();
            respond(['room' => sanitize_room_for_player($room, $attackerId)]);

        case 'request-rematch':
            $code = strtoupper(trim((string) ($input['code'] ?? '')));
            $playerToken = (string) ($input['playerToken'] ?? '');
            if ($code === '' || $playerToken === '') {
                fail('Нужны код комнаты и токен игрока.');
            }

            $pdo->beginTransaction();
            $room = load_room($pdo, $code, true);
            if ($room === null) {
                $pdo->rollBack();
                fail('Комната не найдена.', 404);
            }
            if ($room['phase'] !== 'finished') {
                $pdo->rollBack();
                fail('Реванш доступен только после завершения матча.');
            }

            $playerIndex = find_player_index($room, $playerToken);
            if ($playerIndex === null) {
                $pdo->rollBack();
                fail('Игрок не найден в комнате.', 403);
            }

            if (!empty($room['rematch_requester_id'])) {
                $pdo->rollBack();
                fail('Запрос на реванш уже отправлен.');
            }

            $room['rematch_requester_id'] = $room['players'][$playerIndex]['id'];
            $room['last_action'] = $room['players'][$playerIndex]['name'] . ' хочет реванш.';

            save_room($pdo, $room);
            $pdo->commit();
            respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);

        case 'respond-rematch':
            $code = strtoupper(trim((string) ($input['code'] ?? '')));
            $playerToken = (string) ($input['playerToken'] ?? '');
            $decision = (string) ($input['decision'] ?? '');
            if ($code === '' || $playerToken === '' || !in_array($decision, ['accept', 'decline'], true)) {
                fail('Нужны код комнаты, токен игрока и корректное решение.');
            }

            $pdo->beginTransaction();
            $room = load_room($pdo, $code, true);
            if ($room === null) {
                $pdo->rollBack();
                fail('Комната не найдена.', 404);
            }
            if ($room['phase'] !== 'finished' || empty($room['rematch_requester_id'])) {
                $pdo->rollBack();
                fail('Активного запроса на реванш нет.');
            }

            $playerIndex = find_player_index($room, $playerToken);
            if ($playerIndex === null) {
                $pdo->rollBack();
                fail('Игрок не найден в комнате.', 403);
            }

            $requesterId = (string) $room['rematch_requester_id'];
            if ($room['players'][$playerIndex]['id'] === $requesterId) {
                $pdo->rollBack();
                fail('Запросивший игрок не может сам подтвердить реванш.');
            }

            if ($decision === 'accept') {
                $room['phase'] = 'setup';
                $room['current_turn_player_id'] = null;
                $room['winner_id'] = null;
                $room['rematch_requester_id'] = null;
                $room['last_action'] = $room['players'][$playerIndex]['name'] . ' согласился на реванш. Расставьте флот заново.';

                foreach ($room['players'] as &$player) {
                    $player['ready'] = false;
                    $player['shotsFired'] = 0;
                    $player['board'] = create_empty_board();
                    $player['targetBoard'] = create_empty_target_board();
                }
                unset($player);
            } else {
                $room['phase'] = 'closed';
                $room['current_turn_player_id'] = null;
                $room['rematch_requester_id'] = null;
                $room['last_action'] = $room['players'][$playerIndex]['name'] . ' отказался от реванша. Возврат в главное меню.';
            }

            save_room($pdo, $room);
            $pdo->commit();
            respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);

        case 'restart-room':
            $code = strtoupper(trim((string) ($input['code'] ?? '')));
            $playerToken = (string) ($input['playerToken'] ?? '');
            if ($code === '' || $playerToken === '') {
                fail('Нужны код комнаты и токен игрока.');
            }

            $pdo->beginTransaction();
            $room = load_room($pdo, $code, true);
            if ($room === null) {
                $pdo->rollBack();
                fail('Комната не найдена.', 404);
            }

            $playerIndex = find_player_index($room, $playerToken);
            if ($playerIndex === null) {
                $pdo->rollBack();
                fail('Игрок не найден в комнате.', 403);
            }

            $room['phase'] = 'setup';
            $room['current_turn_player_id'] = null;
            $room['winner_id'] = null;
            $room['rematch_requester_id'] = null;
            $room['last_action'] = 'Матч перезапущен. Расставьте флот заново.';

            foreach ($room['players'] as &$player) {
                $player['ready'] = false;
                $player['shotsFired'] = 0;
                $player['board'] = create_empty_board();
                $player['targetBoard'] = create_empty_target_board();
            }
            unset($player);

            save_room($pdo, $room);
            $pdo->commit();
            respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);

        case 'surrender-room':
            $code = strtoupper(trim((string) ($input['code'] ?? '')));
            $playerToken = (string) ($input['playerToken'] ?? '');
            if ($code === '' || $playerToken === '') {
                fail('Нужны код комнаты и токен игрока.');
            }

            $pdo->beginTransaction();
            $room = load_room($pdo, $code, true);
            if ($room === null) {
                $pdo->rollBack();
                fail('Комната не найдена.', 404);
            }
            if ($room['phase'] !== 'battle') {
                $pdo->rollBack();
                fail('Сдаться можно только во время боя.');
            }

            $playerIndex = find_player_index($room, $playerToken);
            if ($playerIndex === null) {
                $pdo->rollBack();
                fail('Игрок не найден в комнате.', 403);
            }

            $opponentIndex = other_player_index($room, $playerIndex);
            if ($opponentIndex === null) {
                $pdo->rollBack();
                fail('Нет соперника для завершения матча.');
            }

            $room['phase'] = 'finished';
            $room['winner_id'] = $room['players'][$opponentIndex]['id'];
            $room['last_action'] = $room['players'][$playerIndex]['name'] . ' сдался. Победа: ' . $room['players'][$opponentIndex]['name'] . '.';

            save_room($pdo, $room);
            $pdo->commit();
            respond(['room' => sanitize_room_for_player($room, $room['players'][$playerIndex]['id'])]);

        case 'cancel-room':
            $code = strtoupper(trim((string) ($input['code'] ?? '')));
            $playerToken = (string) ($input['playerToken'] ?? '');
            if ($code === '' || $playerToken === '') {
                fail('Нужны код комнаты и токен игрока.');
            }

            $pdo->beginTransaction();
            $room = load_room($pdo, $code, true);
            if ($room === null) {
                $pdo->rollBack();
                fail('Комната не найдена.', 404);
            }
            if ($room['phase'] !== 'setup') {
                $pdo->rollBack();
                fail('Отменить игру можно только во время расстановки.');
            }

            $playerIndex = find_player_index($room, $playerToken);
            if ($playerIndex === null) {
                $pdo->rollBack();
                fail('Игрок не найден в комнате.', 403);
            }

            $deleteStmt = $pdo->prepare('DELETE FROM rooms WHERE code = :code');
            $deleteStmt->execute(['code' => $code]);
            $pdo->commit();
            respond(['ok' => true]);

        default:
            fail('Неизвестное действие.', 404);
    }
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fail('Внутренняя ошибка сервера: ' . $exception->getMessage(), 500);
}
