import { translate } from '../../i18n';
import type { AppLocale } from '../../types';
import type { PublicBoardCell, SanitizedRoomState, ShipPlacement } from '../../../shared/game';

export function publicCellState(cell: PublicBoardCell) {
  return cell.state;
}

export function summarizeTargetBoards(boards: Record<string, PublicBoardCell[][]>) {
  const merged = Object.values(boards).flatMap((board) => board.flat());
  const hits = merged.filter((cell) => cell.state === 'hit' || cell.state === 'sunk').length;
  const misses = merged.filter((cell) => cell.state === 'miss').length;
  const shots = hits + misses;
  return {
    hits,
    misses,
    shots,
    accuracy: shots > 0 ? Math.round((hits / shots) * 100) : 0,
  };
}

export function coordLabel(x: number, y: number) {
  return `${String.fromCharCode(65 + x)}${y + 1}`;
}

export function getShipGroups(locale: AppLocale) {
  return [
    { key: 'deck4', label: translate(locale, 'ship.deck4'), length: 4, total: 1 },
    { key: 'deck3', label: translate(locale, 'ship.deck3'), length: 3, total: 2 },
    { key: 'deck2', label: translate(locale, 'ship.deck2'), length: 2, total: 3 },
    { key: 'deck1', label: translate(locale, 'ship.deck1'), length: 1, total: 4 },
  ] as const;
}

export function allowedTargetPlayerIdForView(room: SanitizedRoomState, attackerId: string) {
  const startIndex = room.players.findIndex((player) => player.id === attackerId);
  if (startIndex < 0) {
    return undefined;
  }

  for (let offset = 1; offset <= room.players.length; offset += 1) {
    const next = room.players[(startIndex + offset) % room.players.length];
    if (!next.eliminated) {
      return next.id;
    }
  }

  return undefined;
}

export function buildPlacementFromDirection(
  ship: { id: ShipPlacement['shipId']; length: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): ShipPlacement | undefined {
  if (start.x === end.x && Math.abs(start.y - end.y) === 1) {
    return {
      shipId: ship.id,
      length: ship.length,
      orientation: 'vertical',
      start: end.y > start.y ? start : { x: start.x, y: start.y - (ship.length - 1) },
    };
  }

  if (start.y === end.y && Math.abs(start.x - end.x) === 1) {
    return {
      shipId: ship.id,
      length: ship.length,
      orientation: 'horizontal',
      start: end.x > start.x ? start : { x: start.x - (ship.length - 1), y: start.y },
    };
  }

  return undefined;
}
