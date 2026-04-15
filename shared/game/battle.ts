import { SHIPS } from './constants';
import { inBounds } from './board';
import { placementCells } from './placement';
import type { Coord, PlayerBoard, PlayerState, RoomState, ShipId, ShipPlacement, ShotResult } from './types';

function neighborCoords(coord: Coord): Coord[] {
  const coords: Coord[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const next = { x: coord.x + dx, y: coord.y + dy };
      if (inBounds(next)) {
        coords.push(next);
      }
    }
  }
  return coords;
}

function markWaterAroundSunkShip(attacker: PlayerState, defender: PlayerState, shipCells: Coord[]) {
  const targetBoard = attacker.targetBoards[defender.id];
  if (!targetBoard) {
    return;
  }

  const shipKeys = new Set(shipCells.map((cell) => `${cell.x}:${cell.y}`));
  for (const cell of shipCells) {
    for (const neighbor of neighborCoords(cell)) {
      const key = `${neighbor.x}:${neighbor.y}`;
      if (shipKeys.has(key)) {
        continue;
      }

      if (targetBoard[neighbor.y][neighbor.x].state === 'unknown') {
        targetBoard[neighbor.y][neighbor.x].state = 'miss';
      }

      if (defender.board.cells[neighbor.y][neighbor.x].state === 'empty') {
        defender.board.cells[neighbor.y][neighbor.x].state = 'miss';
      }
    }
  }
}

function findShip(board: PlayerBoard, shipId: ShipId): ShipPlacement | undefined {
  return board.ships.find((ship) => ship.shipId === shipId);
}

export function applyShot(
  attacker: PlayerState,
  defender: PlayerState,
  coord: Coord,
): { ok: boolean; result?: ShotResult; message?: string } {
  const targetBoard = attacker.targetBoards[defender.id];
  if (!targetBoard) {
    return { ok: false, message: 'Нет радара для выбранного соперника.' };
  }

  if (!inBounds(coord)) {
    return { ok: false, message: 'Выстрел за пределами поля.' };
  }

  if (targetBoard[coord.y][coord.x].state !== 'unknown') {
    return { ok: false, message: 'По этой клетке уже стреляли.' };
  }

  const defendingCell = defender.board.cells[coord.y][coord.x];
  if (defendingCell.state === 'empty' || defendingCell.state === 'miss') {
    targetBoard[coord.y][coord.x].state = 'miss';
    defender.board.cells[coord.y][coord.x].state = 'miss';
    attacker.shotsFired += 1;
    return { ok: true, result: 'miss' };
  }

  if (defendingCell.state === 'ship' || defendingCell.state === 'hit') {
    const shipId = defendingCell.shipId;
    if (!shipId) {
      return { ok: false, message: 'У клетки нет shipId.' };
    }

    defender.board.cells[coord.y][coord.x].state = 'hit';
    targetBoard[coord.y][coord.x].state = 'hit';
    attacker.shotsFired += 1;

    const ship = findShip(defender.board, shipId);
    if (!ship) {
      return { ok: false, message: 'Корабль не найден.' };
    }

    const shipCells = placementCells(ship);
    const allHit = shipCells.every((cell) => {
      const state = defender.board.cells[cell.y][cell.x].state;
      return state === 'hit' || state === 'sunk';
    });

    if (allHit) {
      for (const cell of shipCells) {
        defender.board.cells[cell.y][cell.x].state = 'sunk';
        targetBoard[cell.y][cell.x].state = 'sunk';
      }
      markWaterAroundSunkShip(attacker, defender, shipCells);
      if (!defender.board.sunkShips.includes(shipId)) {
        defender.board.sunkShips.push(shipId);
      }
      return { ok: true, result: 'sunk' };
    }

    return { ok: true, result: 'hit' };
  }

  return { ok: false, message: 'Некорректное состояние клетки.' };
}

export function fleetDestroyed(board: PlayerBoard): boolean {
  return board.sunkShips.length === SHIPS.length;
}

export function activePlayers(room: RoomState): PlayerState[] {
  return room.players.filter((player) => !fleetDestroyed(player.board));
}

export function nextActivePlayerId(room: RoomState, currentPlayerId: string): string | undefined {
  const startIndex = room.players.findIndex((player) => player.id === currentPlayerId);
  if (startIndex < 0) {
    return undefined;
  }

  for (let offset = 1; offset <= room.players.length; offset += 1) {
    const next = room.players[(startIndex + offset) % room.players.length];
    if (!fleetDestroyed(next.board)) {
      return next.id;
    }
  }

  return undefined;
}

export function allowedTargetPlayerId(room: RoomState, attackerId: string): string | undefined {
  return nextActivePlayerId(room, attackerId);
}
