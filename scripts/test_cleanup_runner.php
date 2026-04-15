<?php

declare(strict_types=1);

require __DIR__ . '/../api/bootstrap.php';
require __DIR__ . '/../api/game.php';
require __DIR__ . '/../api/room_repository.php';

$config = require __DIR__ . '/../api/config.php';
$pdo = pdo_connect($config);

$fixtureId = 'cleanup-' . bin2hex(random_bytes(4));
$suffix = strtoupper(substr(md5($fixtureId), 0, 4));
$staleCode = 'S' . $suffix;
$freshCode = 'F' . $suffix;
$staleToken = fixture_token('stale-' . $fixtureId);
$freshToken = fixture_token('fresh-' . $fixtureId);
$stalePlayerId = fixture_token('player-stale-' . $fixtureId);
$freshPlayerId = fixture_token('player-fresh-' . $fixtureId);

try {
    teardown_fixture($pdo, $staleCode, $freshCode, $staleToken, $freshToken);

    insert_fixture_room($pdo, $staleCode, $stalePlayerId, $staleToken, 'Cleanup stale');
    insert_fixture_room($pdo, $freshCode, $freshPlayerId, $freshToken, 'Cleanup fresh');

    $pdo->prepare('UPDATE rooms SET phase = :phase, updated_at = DATE_SUB(NOW(), INTERVAL 72 HOUR) WHERE code = :code')
        ->execute([
            'phase' => 'finished',
            'code' => $staleCode,
        ]);
    $pdo->prepare('UPDATE room_players SET updated_at = DATE_SUB(NOW(), INTERVAL 72 HOUR), last_seen_at = DATE_SUB(NOW(), INTERVAL 72 HOUR) WHERE room_code = :room_code')
        ->execute(['room_code' => $staleCode]);
    $pdo->prepare('UPDATE site_presence SET updated_at = DATE_SUB(NOW(), INTERVAL 24 HOUR), last_seen_at = DATE_SUB(NOW(), INTERVAL 24 HOUR) WHERE player_token = :player_token')
        ->execute(['player_token' => $staleToken]);

    assert_counts($pdo, $staleCode, $staleToken, ['rooms' => 1, 'players' => 1, 'presence' => 1], 'Stale fixture should exist before cleanup.');
    assert_counts($pdo, $freshCode, $freshToken, ['rooms' => 1, 'players' => 1, 'presence' => 1], 'Fresh fixture should exist before cleanup.');

    run_storage_cleanup($pdo, $config['maintenance'] ?? []);

    assert_counts($pdo, $staleCode, $staleToken, ['rooms' => 0, 'players' => 0, 'presence' => 0], 'Stale fixture should be deleted after cleanup.');
    assert_counts($pdo, $freshCode, $freshToken, ['rooms' => 1, 'players' => 1, 'presence' => 1], 'Fresh fixture should remain after cleanup.');

    echo "Cleanup maintenance test passed.\n";
} finally {
    teardown_fixture($pdo, $staleCode, $freshCode, $staleToken, $freshToken);
}

function insert_fixture_room(PDO $pdo, string $roomCode, string $playerId, string $playerToken, string $playerName): void
{
    $boardJson = json_encode(create_empty_board(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $targetBoardsJson = json_encode([], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

    $pdo->prepare('
        INSERT INTO rooms (code, phase, max_players, setup_version, host_player_id, current_turn_player_id, turn_started_at, winner_id, rematch_requester_id, last_action, created_at, updated_at)
        VALUES (:code, :phase, 2, 1, :host_player_id, NULL, NULL, NULL, NULL, :last_action, NOW(), NOW())
    ')->execute([
        'code' => $roomCode,
        'phase' => 'setup',
        'host_player_id' => $playerId,
        'last_action' => 'Cleanup fixture',
    ]);

    $pdo->prepare('
        INSERT INTO room_players (id, room_code, player_token, name, ready, shots_fired, board_json, target_board_json, created_at, updated_at, last_seen_at)
        VALUES (:id, :room_code, :player_token, :name, 0, 0, :board_json, :target_board_json, NOW(), NOW(), NOW())
    ')->execute([
        'id' => $playerId,
        'room_code' => $roomCode,
        'player_token' => $playerToken,
        'name' => $playerName,
        'board_json' => $boardJson,
        'target_board_json' => $targetBoardsJson,
    ]);

    $pdo->prepare('
        INSERT INTO site_presence (player_token, last_seen_at, created_at, updated_at)
        VALUES (:player_token, NOW(), NOW(), NOW())
        ON DUPLICATE KEY UPDATE last_seen_at = NOW(), updated_at = NOW()
    ')->execute(['player_token' => $playerToken]);
}

function fixture_counts(PDO $pdo, string $roomCode, string $playerToken): array
{
    $roomStmt = $pdo->prepare('SELECT COUNT(*) FROM rooms WHERE code = :code');
    $roomStmt->execute(['code' => $roomCode]);

    $playerStmt = $pdo->prepare('SELECT COUNT(*) FROM room_players WHERE room_code = :room_code OR player_token = :player_token');
    $playerStmt->execute([
        'room_code' => $roomCode,
        'player_token' => $playerToken,
    ]);

    $presenceStmt = $pdo->prepare('SELECT COUNT(*) FROM site_presence WHERE player_token = :player_token');
    $presenceStmt->execute(['player_token' => $playerToken]);

    return [
        'rooms' => (int) $roomStmt->fetchColumn(),
        'players' => (int) $playerStmt->fetchColumn(),
        'presence' => (int) $presenceStmt->fetchColumn(),
    ];
}

function assert_counts(PDO $pdo, string $roomCode, string $playerToken, array $expected, string $message): void
{
    $actual = fixture_counts($pdo, $roomCode, $playerToken);
    if ($actual !== $expected) {
        throw new RuntimeException($message . ' Actual: ' . json_encode($actual, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}

function teardown_fixture(PDO $pdo, string $staleCode, string $freshCode, string $staleToken, string $freshToken): void
{
    $pdo->prepare('DELETE FROM site_presence WHERE player_token = :player_token')->execute(['player_token' => $staleToken]);
    $pdo->prepare('DELETE FROM site_presence WHERE player_token = :player_token')->execute(['player_token' => $freshToken]);
    $pdo->prepare('DELETE FROM rooms WHERE code = :code')->execute(['code' => $staleCode]);
    $pdo->prepare('DELETE FROM rooms WHERE code = :code')->execute(['code' => $freshCode]);
}

function fixture_token(string $seed): string
{
    $hash = substr(md5($seed), 0, 32);
    return substr($hash, 0, 8) . '-' . substr($hash, 8, 4) . '-' . substr($hash, 12, 4) . '-' . substr($hash, 16, 4) . '-' . substr($hash, 20, 12);
}
