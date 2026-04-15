<?php

declare(strict_types=1);

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

function neighbor_coords(array $coord): array
{
    $coords = [];
    for ($dy = -1; $dy <= 1; $dy++) {
        for ($dx = -1; $dx <= 1; $dx++) {
            $next = ['x' => $coord['x'] + $dx, 'y' => $coord['y'] + $dy];
            if (in_bounds($next)) {
                $coords[] = $next;
            }
        }
    }

    return $coords;
}
