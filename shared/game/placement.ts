import { SHIPS } from './constants';
import { createEmptyBoard, inBounds } from './board';
import { neighborKeys } from './placementHelpers';
import { ensureRoomTargetBoards } from './targetBoards';
import type { Coord, PlacementValidation, PlayerBoard, ShipPlacement } from './types';

export function placementCells(placement: ShipPlacement): Coord[] {
  return Array.from({ length: placement.length }, (_, index) => ({
    x: placement.start.x + (placement.orientation === 'horizontal' ? index : 0),
    y: placement.start.y + (placement.orientation === 'vertical' ? index : 0),
  }));
}

export function validatePlacements(placements: ShipPlacement[]): PlacementValidation {
  if (placements.length !== SHIPS.length) {
    return { valid: false, reason: 'Нужно расставить все корабли.' };
  }

  const sortedIds = [...placements.map((ship) => ship.shipId)].sort();
  const requiredIds = [...SHIPS.map((ship) => ship.id)].sort();
  if (JSON.stringify(sortedIds) !== JSON.stringify(requiredIds)) {
    return { valid: false, reason: 'Состав флота не совпадает с правилами.' };
  }

  const occupied = new Set<string>();
  const forbidden = new Set<string>();
  for (const placement of placements) {
    const definition = SHIPS.find((ship) => ship.id === placement.shipId);
    if (!definition || definition.length !== placement.length) {
      return { valid: false, reason: 'Некорректная длина корабля.' };
    }

    const cells = placementCells(placement);
    for (const cell of cells) {
      if (!inBounds(cell)) {
        return { valid: false, reason: 'Корабль выходит за пределы поля.' };
      }
      const key = `${cell.x}:${cell.y}`;
      if (occupied.has(key)) {
        return { valid: false, reason: 'Корабли не могут пересекаться.' };
      }
      if (forbidden.has(key)) {
        return { valid: false, reason: 'Между кораблями должна быть минимум одна клетка.' };
      }
    }

    for (const cell of cells) {
      occupied.add(`${cell.x}:${cell.y}`);
    }

    for (const cell of cells) {
      for (const neighbor of neighborKeys(cell)) {
        if (!occupied.has(neighbor)) {
          forbidden.add(neighbor);
        }
      }
    }
  }

  return { valid: true };
}

export function canPlaceShip(
  currentPlacements: ShipPlacement[],
  nextPlacement: ShipPlacement,
): PlacementValidation {
  for (const cell of placementCells(nextPlacement)) {
    if (!inBounds(cell)) {
      return { valid: false, reason: 'Корабль выходит за пределы поля.' };
    }
  }

  const rest = currentPlacements.filter((item) => item.shipId !== nextPlacement.shipId);
  const occupied = new Set<string>();
  const forbidden = new Set<string>();
  for (const placement of rest) {
    for (const cell of placementCells(placement)) {
      const key = `${cell.x}:${cell.y}`;
      occupied.add(key);
      for (const neighbor of neighborKeys(cell)) {
        forbidden.add(neighbor);
      }
    }
  }

  for (const cell of placementCells(nextPlacement)) {
    const key = `${cell.x}:${cell.y}`;
    if (occupied.has(key)) {
      return { valid: false, reason: 'Корабли не могут пересекаться.' };
    }
    if (forbidden.has(key)) {
      return { valid: false, reason: 'Между кораблями должна быть минимум одна клетка.' };
    }
  }

  return { valid: true };
}

export function buildBoardFromPlacements(placements: ShipPlacement[]): PlayerBoard {
  const board = createEmptyBoard();
  board.ships = placements.map((ship) => ({ ...ship, start: { ...ship.start } }));

  for (const ship of board.ships) {
    for (const cell of placementCells(ship)) {
      board.cells[cell.y][cell.x] = {
        x: cell.x,
        y: cell.y,
        state: 'ship',
        shipId: ship.shipId,
      };
    }
  }

  return board;
}
