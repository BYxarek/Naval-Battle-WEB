<?php

declare(strict_types=1);

const BOARD_SIZE = 10;
const SHIPS = [
    ['id' => 'deck4-1', 'label' => 'Четырёхпалубный', 'length' => 4],
    ['id' => 'deck3-1', 'label' => 'Трёхпалубный #1', 'length' => 3],
    ['id' => 'deck3-2', 'label' => 'Трёхпалубный #2', 'length' => 3],
    ['id' => 'deck2-1', 'label' => 'Двухпалубный #1', 'length' => 2],
    ['id' => 'deck2-2', 'label' => 'Двухпалубный #2', 'length' => 2],
    ['id' => 'deck2-3', 'label' => 'Двухпалубный #3', 'length' => 2],
    ['id' => 'deck1-1', 'label' => 'Однопалубный #1', 'length' => 1],
    ['id' => 'deck1-2', 'label' => 'Однопалубный #2', 'length' => 1],
    ['id' => 'deck1-3', 'label' => 'Однопалубный #3', 'length' => 1],
    ['id' => 'deck1-4', 'label' => 'Однопалубный #4', 'length' => 1],
];

function create_empty_board(): array
{
    $cells = [];
    for ($y = 0; $y < BOARD_SIZE; $y++) {
        $row = [];
        for ($x = 0; $x < BOARD_SIZE; $x++) {
            $row[] = ['x' => $x, 'y' => $y, 'state' => 'empty'];
        }
        $cells[] = $row;
    }

    return [
        'cells' => $cells,
        'ships' => [],
        'sunkShips' => [],
    ];
}

function create_empty_target_board(): array
{
    $cells = [];
    for ($y = 0; $y < BOARD_SIZE; $y++) {
        $row = [];
        for ($x = 0; $x < BOARD_SIZE; $x++) {
            $row[] = ['x' => $x, 'y' => $y, 'state' => 'unknown'];
        }
        $cells[] = $row;
    }
    return $cells;
}

function create_player(string $id, string $name, string $token): array
{
    return [
        'id' => $id,
        'name' => $name,
        'player_token' => $token,
        'ready' => false,
        'shotsFired' => 0,
        'board' => create_empty_board(),
        'targetBoard' => create_empty_target_board(),
    ];
}

function in_bounds(array $coord): bool
{
    return $coord['x'] >= 0
        && $coord['x'] < BOARD_SIZE
        && $coord['y'] >= 0
        && $coord['y'] < BOARD_SIZE;
}

function placement_cells(array $placement): array
{
    $cells = [];
    for ($index = 0; $index < $placement['length']; $index++) {
        $cells[] = [
            'x' => $placement['start']['x'] + ($placement['orientation'] === 'horizontal' ? $index : 0),
            'y' => $placement['start']['y'] + ($placement['orientation'] === 'vertical' ? $index : 0),
        ];
    }
    return $cells;
}

function neighbor_keys(array $coord): array
{
    $keys = [];
    for ($dy = -1; $dy <= 1; $dy++) {
        for ($dx = -1; $dx <= 1; $dx++) {
            $next = ['x' => $coord['x'] + $dx, 'y' => $coord['y'] + $dy];
            if (in_bounds($next)) {
                $keys[] = $next['x'] . ':' . $next['y'];
            }
        }
    }

    return $keys;
}

function validate_placements(array $placements): array
{
    if (count($placements) !== count(SHIPS)) {
        return ['valid' => false, 'reason' => 'Нужно расставить все корабли.'];
    }

    $requiredIds = array_map(static fn(array $ship): string => $ship['id'], SHIPS);
    sort($requiredIds);
    $ids = array_map(static fn(array $ship): string => (string) $ship['shipId'], $placements);
    sort($ids);
    if ($ids !== $requiredIds) {
        return ['valid' => false, 'reason' => 'Состав флота не совпадает с правилами.'];
    }

    $occupied = [];
    $forbidden = [];
    foreach ($placements as $placement) {
        $shipDef = null;
        foreach (SHIPS as $ship) {
            if ($ship['id'] === $placement['shipId']) {
                $shipDef = $ship;
                break;
            }
        }
        if ($shipDef === null || $shipDef['length'] !== $placement['length']) {
            return ['valid' => false, 'reason' => 'Некорректная длина корабля.'];
        }

        $cells = placement_cells($placement);
        foreach ($cells as $cell) {
            if (!in_bounds($cell)) {
                return ['valid' => false, 'reason' => 'Корабль выходит за пределы поля.'];
            }
            $key = $cell['x'] . ':' . $cell['y'];
            if (isset($occupied[$key])) {
                return ['valid' => false, 'reason' => 'Корабли не могут пересекаться.'];
            }
            if (isset($forbidden[$key])) {
                return ['valid' => false, 'reason' => 'Между кораблями должна быть минимум одна клетка.'];
            }
        }

        foreach ($cells as $cell) {
            $key = $cell['x'] . ':' . $cell['y'];
            $occupied[$key] = true;
        }

        foreach ($cells as $cell) {
            foreach (neighbor_keys($cell) as $neighborKey) {
                if (!isset($occupied[$neighborKey])) {
                    $forbidden[$neighborKey] = true;
                }
            }
        }
    }

    return ['valid' => true];
}

function build_board_from_placements(array $placements): array
{
    $board = create_empty_board();
    $board['ships'] = $placements;

    foreach ($placements as $ship) {
        foreach (placement_cells($ship) as $cell) {
            $board['cells'][$cell['y']][$cell['x']] = [
                'x' => $cell['x'],
                'y' => $cell['y'],
                'state' => 'ship',
                'shipId' => $ship['shipId'],
            ];
        }
    }

    return $board;
}

function sanitize_room_for_player(array $room, string $playerId): array
{
    return [
        'code' => $room['code'],
        'phase' => $room['phase'],
        'currentTurnPlayerId' => $room['current_turn_player_id'],
        'winnerId' => $room['winner_id'],
        'lastAction' => $room['last_action'],
        'rematchRequesterId' => $room['rematch_requester_id'] ?? null,
        'createdAt' => isset($room['created_at']) ? strtotime((string) $room['created_at']) * 1000 : null,
        'updatedAt' => isset($room['updated_at']) ? strtotime((string) $room['updated_at']) * 1000 : null,
        'youAreHost' => $room['host_player_id'] === $playerId,
        'youPlayerId' => $playerId,
        'players' => array_map(static function (array $player) use ($playerId): array {
            $ownBoard = $player['board'];
            if ($player['id'] !== $playerId) {
                $ownBoard['ships'] = [];
                $ownBoard['cells'] = array_map(
                    static fn(array $row): array => array_map(
                        static fn(array $cell): array => [
                            'x' => $cell['x'],
                            'y' => $cell['y'],
                            'state' => in_array($cell['state'], ['hit', 'miss', 'sunk'], true)
                                ? $cell['state']
                                : 'empty',
                        ],
                        $row
                    ),
                    $player['board']['cells']
                );
            }

            return [
                'id' => $player['id'],
                'name' => $player['name'],
                'ready' => $player['ready'],
                'shotsFired' => $player['shotsFired'],
                'sunkShips' => $player['board']['sunkShips'],
                'ownBoard' => $ownBoard,
                'targetBoard' => $player['targetBoard'],
                'isYou' => $player['id'] === $playerId,
            ];
        }, $room['players']),
    ];
}

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
    if (!in_bounds($coord)) {
        return ['ok' => false, 'message' => 'Выстрел за пределами поля.'];
    }

    if ($attacker['targetBoard'][$coord['y']][$coord['x']]['state'] !== 'unknown') {
        return ['ok' => false, 'message' => 'По этой клетке уже стреляли.'];
    }

    $defendingCell = $defender['board']['cells'][$coord['y']][$coord['x']];
    if ($defendingCell['state'] === 'empty' || $defendingCell['state'] === 'miss') {
        $attacker['targetBoard'][$coord['y']][$coord['x']]['state'] = 'miss';
        $defender['board']['cells'][$coord['y']][$coord['x']]['state'] = 'miss';
        $attacker['shotsFired']++;
        return ['ok' => true, 'result' => 'miss'];
    }

    if ($defendingCell['state'] === 'ship' || $defendingCell['state'] === 'hit') {
        $shipId = $defendingCell['shipId'] ?? null;
        if ($shipId === null) {
            return ['ok' => false, 'message' => 'У клетки нет shipId.'];
        }

        $defender['board']['cells'][$coord['y']][$coord['x']]['state'] = 'hit';
        $attacker['targetBoard'][$coord['y']][$coord['x']]['state'] = 'hit';
        $attacker['shotsFired']++;

        $ship = find_ship($defender['board'], $shipId);
        if ($ship === null) {
            return ['ok' => false, 'message' => 'Корабль не найден.'];
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
                $attacker['targetBoard'][$cell['y']][$cell['x']]['state'] = 'sunk';
            }
            if (!in_array($shipId, $defender['board']['sunkShips'], true)) {
                $defender['board']['sunkShips'][] = $shipId;
            }
            return ['ok' => true, 'result' => 'sunk'];
        }

        return ['ok' => true, 'result' => 'hit'];
    }

    return ['ok' => false, 'message' => 'Некорректное состояние клетки.'];
}

function fleet_destroyed(array $board): bool
{
    return count($board['sunkShips']) === count(SHIPS);
}

function room_code(): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 5; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $code;
}

function app_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}
