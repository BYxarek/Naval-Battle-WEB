<?php

declare(strict_types=1);

function validate_placements(array $placements): array
{
    if (count($placements) !== count(SHIPS)) {
        return ['valid' => false, 'reason' => tr('placement.place_all')];
    }

    $requiredIds = array_map(static fn(array $ship): string => $ship['id'], SHIPS);
    sort($requiredIds);
    $ids = array_map(static fn(array $ship): string => (string) $ship['shipId'], $placements);
    sort($ids);
    if ($ids !== $requiredIds) {
        return ['valid' => false, 'reason' => tr('placement.fleet_mismatch')];
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
            return ['valid' => false, 'reason' => tr('placement.invalid_length')];
        }

        $cells = placement_cells($placement);
        foreach ($cells as $cell) {
            if (!in_bounds($cell)) {
                return ['valid' => false, 'reason' => tr('placement.out_of_bounds')];
            }
            $key = $cell['x'] . ':' . $cell['y'];
            if (isset($occupied[$key])) {
                return ['valid' => false, 'reason' => tr('placement.intersection')];
            }
            if (isset($forbidden[$key])) {
                return ['valid' => false, 'reason' => tr('placement.spacing')];
            }
        }

        foreach ($cells as $cell) {
            $occupied[$cell['x'] . ':' . $cell['y']] = true;
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
