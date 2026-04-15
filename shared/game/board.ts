import { BOARD_SIZE } from './constants';
import type { Coord, PlayerBoard, PublicBoardCell, PlayerState } from './types';

export function createEmptyBoard(): PlayerBoard {
  return {
    cells: Array.from({ length: BOARD_SIZE }, (_, y) =>
      Array.from({ length: BOARD_SIZE }, (_, x) => ({
        x,
        y,
        state: 'empty' as const,
      })),
    ),
    ships: [],
    sunkShips: [],
  };
}

export function createEmptyTargetBoard(): PublicBoardCell[][] {
  return Array.from({ length: BOARD_SIZE }, (_, y) =>
    Array.from({ length: BOARD_SIZE }, (_, x) => ({
      x,
      y,
      state: 'unknown' as const,
    })),
  );
}

export function createPlayerState(id: string, name: string): PlayerState {
  return {
    id,
    name,
    ready: false,
    board: createEmptyBoard(),
    targetBoards: {},
    shotsFired: 0,
  };
}

export function inBounds(coord: Coord): boolean {
  return coord.x >= 0 && coord.x < BOARD_SIZE && coord.y >= 0 && coord.y < BOARD_SIZE;
}
