<?php

declare(strict_types=1);

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

    $playerStmt = $pdo->prepare(
        'SELECT * FROM room_players WHERE room_code = :room_code ORDER BY created_at ASC' . ($forUpdate ? ' FOR UPDATE' : '')
    );
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
            'targetBoards' => json_decode($player['target_board_json'], true, 512, JSON_THROW_ON_ERROR),
        ];
    }

    $room['players'] = $players;
    $room['setup_version'] = (int) ($room['setup_version'] ?? 1);
    return $room;
}

function save_room(PDO $pdo, array $room): void
{
    $stmt = $pdo->prepare('
        UPDATE rooms
        SET phase = :phase,
            max_players = :max_players,
            setup_version = :setup_version,
            current_turn_player_id = :current_turn_player_id,
            turn_started_at = :turn_started_at,
            winner_id = :winner_id,
            rematch_requester_id = :rematch_requester_id,
            last_action = :last_action,
            updated_at = NOW()
        WHERE code = :code
    ');
    $stmt->execute([
        'phase' => $room['phase'],
        'max_players' => $room['max_players'],
        'setup_version' => (int) ($room['setup_version'] ?? 1),
        'current_turn_player_id' => $room['current_turn_player_id'],
        'turn_started_at' => $room['turn_started_at'],
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
            'target_board_json' => json_encode($player['targetBoards'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }
}

function room_code_exists(PDO $pdo, string $code): bool
{
    $stmt = $pdo->prepare('SELECT code FROM rooms WHERE code = :code');
    $stmt->execute(['code' => $code]);
    return (bool) $stmt->fetch();
}

function insert_room(PDO $pdo, string $code, int $maxPlayers, string $hostPlayerId, string $lastAction): void
{
    $stmt = $pdo->prepare('
        INSERT INTO rooms (code, phase, max_players, setup_version, host_player_id, current_turn_player_id, turn_started_at, winner_id, rematch_requester_id, last_action, created_at, updated_at)
        VALUES (:code, :phase, :max_players, :setup_version, :host_player_id, NULL, NULL, NULL, NULL, :last_action, NOW(), NOW())
    ');
    $stmt->execute([
        'code' => $code,
        'phase' => 'setup',
        'max_players' => $maxPlayers,
        'setup_version' => 1,
        'host_player_id' => $hostPlayerId,
        'last_action' => $lastAction,
    ]);
}

function insert_room_player(PDO $pdo, string $roomCode, array $player): void
{
    $stmt = $pdo->prepare('
        INSERT INTO room_players
        (id, room_code, player_token, name, ready, shots_fired, board_json, target_board_json, created_at, updated_at, last_seen_at)
        VALUES
        (:id, :room_code, :player_token, :name, 0, 0, :board_json, :target_board_json, NOW(), NOW(), NOW())
    ');
    $stmt->execute([
        'id' => $player['id'],
        'room_code' => $roomCode,
        'player_token' => $player['player_token'],
        'name' => $player['name'],
        'board_json' => json_encode($player['board'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'target_board_json' => json_encode($player['targetBoards'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
}

function update_room_phase_and_action(PDO $pdo, string $code, string $phase, string $lastAction): void
{
    $stmt = $pdo->prepare('UPDATE rooms SET phase = :phase, last_action = :last_action, updated_at = NOW() WHERE code = :code');
    $stmt->execute([
        'phase' => $phase,
        'last_action' => $lastAction,
        'code' => $code,
    ]);
}

function touch_room_player(PDO $pdo, string $playerId): void
{
    $stmt = $pdo->prepare('UPDATE room_players SET last_seen_at = NOW() WHERE id = :id');
    $stmt->execute(['id' => $playerId]);
}

function delete_room(PDO $pdo, string $code): void
{
    $stmt = $pdo->prepare('DELETE FROM rooms WHERE code = :code');
    $stmt->execute(['code' => $code]);
}

function touch_site_presence(PDO $pdo, string $playerToken): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO site_presence (player_token, last_seen_at, created_at, updated_at)
         VALUES (:player_token, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE last_seen_at = NOW(), updated_at = NOW()'
    );
    $stmt->execute(['player_token' => $playerToken]);
}

function count_online_visitors(PDO $pdo): int
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM site_presence WHERE last_seen_at >= DATE_SUB(NOW(), INTERVAL 120 SECOND)'
    );
    $stmt->execute();
    return (int) $stmt->fetchColumn();
}

function maybe_run_storage_cleanup(PDO $pdo, array $config): void
{
    $maintenance = $config['maintenance'] ?? [];
    if (($maintenance['enabled'] ?? true) !== true) {
        return;
    }

    $forceCleanup = getenv('APP_FORCE_STORAGE_CLEANUP') === '1';
    $chancePercent = max(0, min(100, (int) ($maintenance['cleanup_chance_percent'] ?? 0)));

    if (!$forceCleanup && ($chancePercent === 0 || random_int(1, 100) > $chancePercent)) {
        return;
    }

    if (!$forceCleanup && !storage_cleanup_due((int) ($maintenance['cleanup_min_interval_seconds'] ?? 300))) {
        return;
    }

    if (!acquire_storage_cleanup_lock($pdo)) {
        return;
    }

    try {
        run_storage_cleanup($pdo, $maintenance);
        mark_storage_cleanup_ran();
    } finally {
        release_storage_cleanup_lock($pdo);
    }
}

function run_storage_cleanup(PDO $pdo, array $maintenance): void
{
    $setupCutoff = cleanup_cutoff_datetime((int) ($maintenance['setup_room_ttl_hours'] ?? 24));
    $battleCutoff = cleanup_cutoff_datetime((int) ($maintenance['battle_room_ttl_hours'] ?? 48));
    $finishedCutoff = cleanup_cutoff_datetime((int) ($maintenance['finished_room_ttl_hours'] ?? 12));
    $presenceCutoff = cleanup_cutoff_datetime_minutes((int) ($maintenance['presence_token_ttl_minutes'] ?? 180));

    $pdo->beginTransaction();

    try {
        $deletePresenceStmt = $pdo->prepare('DELETE FROM site_presence WHERE last_seen_at < :presence_cutoff');
        $deletePresenceStmt->execute(['presence_cutoff' => $presenceCutoff]);

        $deleteOrphanPlayersStmt = $pdo->prepare('
            DELETE room_players
            FROM room_players
            LEFT JOIN rooms ON rooms.code = room_players.room_code
            WHERE rooms.code IS NULL
        ');
        $deleteOrphanPlayersStmt->execute();

        $deleteRoomsStmt = $pdo->prepare('
            DELETE FROM rooms
            WHERE (phase = :setup_phase AND updated_at < :setup_cutoff)
               OR (phase = :battle_phase AND updated_at < :battle_cutoff)
               OR (phase IN (:finished_phase, :closed_phase) AND updated_at < :finished_cutoff)
        ');
        $deleteRoomsStmt->execute([
            'setup_phase' => 'setup',
            'setup_cutoff' => $setupCutoff,
            'battle_phase' => 'battle',
            'battle_cutoff' => $battleCutoff,
            'finished_phase' => 'finished',
            'closed_phase' => 'closed',
            'finished_cutoff' => $finishedCutoff,
        ]);

        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $exception;
    }
}

function cleanup_cutoff_datetime(int $hoursAgo): string
{
    $hoursAgo = max(1, $hoursAgo);
    return (new DateTimeImmutable(sprintf('-%d hours', $hoursAgo)))->format('Y-m-d H:i:s');
}

function cleanup_cutoff_datetime_minutes(int $minutesAgo): string
{
    $minutesAgo = max(1, $minutesAgo);
    return (new DateTimeImmutable(sprintf('-%d minutes', $minutesAgo)))->format('Y-m-d H:i:s');
}

function storage_cleanup_due(int $intervalSeconds): bool
{
    $intervalSeconds = max(30, $intervalSeconds);
    $markerPath = storage_cleanup_marker_path();
    if (!is_file($markerPath)) {
        return true;
    }

    $lastRun = (int) @filemtime($markerPath);
    return $lastRun <= 0 || (time() - $lastRun) >= $intervalSeconds;
}

function mark_storage_cleanup_ran(): void
{
    $markerPath = storage_cleanup_marker_path();
    @touch($markerPath);
}

function storage_cleanup_marker_path(): string
{
    return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'morskoy_boy_cleanup.marker';
}

function acquire_storage_cleanup_lock(PDO $pdo): bool
{
    $stmt = $pdo->query("SELECT GET_LOCK('morskoy_boy_storage_cleanup', 0)");
    return (int) $stmt->fetchColumn() === 1;
}

function release_storage_cleanup_lock(PDO $pdo): void
{
    $pdo->query("SELECT RELEASE_LOCK('morskoy_boy_storage_cleanup')");
}
