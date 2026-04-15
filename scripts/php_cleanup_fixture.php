<?php

declare(strict_types=1);

require __DIR__ . '/../api/bootstrap.php';
require __DIR__ . '/../api/game.php';
require __DIR__ . '/../api/room_repository.php';

$command = $argv[1] ?? '';
$fixtureId = $argv[2] ?? '';

if ($command === '' || $fixtureId === '') {
    fwrite(STDERR, "Usage: php_cleanup_fixture.php <seed|assert|run-cleanup|teardown> <fixture-id>\n");
    exit(1);
}

$config = require __DIR__ . '/../api/config.php';
$pdo = pdo_connect($config);

$suffix = strtoupper(substr(md5($fixtureId), 0, 4));
$staleCode = 'S' . $suffix;
$freshCode = 'F' . $suffix;
$staleToken = fixture_token('stale-' . $fixtureId);
$freshToken = fixture_token('fresh-' . $fixtureId);
$stalePlayerId = fixture_token('player-stale-' . $fixtureId);
$freshPlayerId = fixture_token('player-fresh-' . $fixtureId);

switch ($command) {
    case 'seed':
        teardown_fixture($pdo, $staleCode, $freshCode, $staleToken, $freshToken);
        seed_fixture($pdo, $staleCode, $freshCode, $staleToken, $freshToken, $stalePlayerId, $freshPlayerId);
        break;
    case 'assert':
        echo json_encode([
            'stale' => fixture_counts($pdo, $staleCode, $staleToken),
            'fresh' => fixture_counts($pdo, $freshCode, $freshToken),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        break;
    case 'run-cleanup':
        run_storage_cleanup($pdo, $config['maintenance'] ?? []);
        break;
    case 'teardown':
        teardown_fixture($pdo, $staleCode, $freshCode, $staleToken, $freshToken);
        break;
    default:
        fwrite(STDERR, "Unknown command.\n");
        exit(1);
}

function seed_fixture(PDO $pdo, string $staleCode, string $freshCode, string $staleToken, string $freshToken, string $stalePlayerId, string $freshPlayerId): void
{
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
