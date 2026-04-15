<?php

declare(strict_types=1);

require __DIR__ . '/../api/bootstrap.php';
require __DIR__ . '/../api/game.php';

set_app_lang('ru');

$fixturePath = $argv[1] ?? '';
if ($fixturePath === '' || !is_file($fixturePath)) {
    fwrite(STDERR, "Fixture file not found.\n");
    exit(1);
}

$fixtures = json_decode((string) file_get_contents($fixturePath), true, 512, JSON_THROW_ON_ERROR);

$validations = [];
foreach ($fixtures['validations'] as $placements) {
    $validations[] = validate_placements($placements);
}

$shots = [];
foreach ($fixtures['shots'] as $shotFixture) {
    $attacker = create_player('alpha', 'Alpha', 'token-alpha');
    $defender = create_player('bravo', 'Bravo', 'token-bravo');
    $attacker['board'] = build_board_from_placements($shotFixture['attackerPlacements']);
    $defender['board'] = build_board_from_placements($shotFixture['defenderPlacements']);

    $room = [
        'code' => 'TEST1',
        'phase' => 'battle',
        'host_player_id' => 'alpha',
        'max_players' => 2,
        'setup_version' => 1,
        'players' => [$attacker, $defender],
        'current_turn_player_id' => 'alpha',
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
    ];

    ensure_room_target_boards($room);
    $attacker = $room['players'][0];
    $defender = $room['players'][1];

    $result = apply_shot($attacker, $defender, $shotFixture['coord']);

    $shots[] = [
        'result' => $result,
        'state' => [
            'attacker' => [
                'shotsFired' => $attacker['shotsFired'],
                'targetBoard' => $attacker['targetBoards'][$defender['id']],
            ],
            'defender' => [
                'sunkShips' => $defender['board']['sunkShips'],
                'board' => $defender['board']['cells'],
            ],
        ],
    ];
}

echo json_encode([
    'validations' => $validations,
    'shots' => $shots,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
