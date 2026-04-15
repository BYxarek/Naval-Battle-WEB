import { createEmptyBoard, type SanitizedRoomState } from '../../../shared/game';

export const POLL_INTERVAL_MS = 1800;
export const MAX_SYNC_FAILURES = 3;

export function countBoardStates(room: SanitizedRoomState | undefined, playerId: string | undefined) {
  const player = room?.players.find((entry) => entry.id === playerId);
  if (!player) {
    return { hit: 0, sunk: 0 };
  }

  const cells = (player.ownBoard ?? createEmptyBoard()).cells.flat();
  return {
    hit: cells.filter((cell) => cell.state === 'hit').length,
    sunk: cells.filter((cell) => cell.state === 'sunk').length,
  };
}
