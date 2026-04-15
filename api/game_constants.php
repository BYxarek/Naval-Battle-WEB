<?php

declare(strict_types=1);

const BOARD_SIZE = 10;
const TURN_DURATION_SECONDS = 60;
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
