import { createEmptyTargetBoard } from './board';
import type { RoomState } from './types';

export function ensureRoomTargetBoards(room: RoomState) {
  for (const player of room.players) {
    if (!player.targetBoards) {
      player.targetBoards = {};
    }
    for (const opponent of room.players) {
      if (opponent.id === player.id) {
        continue;
      }
      if (!player.targetBoards[opponent.id]) {
        player.targetBoards[opponent.id] = createEmptyTargetBoard();
      }
    }
    for (const opponentId of Object.keys(player.targetBoards)) {
      if (!room.players.some((entry) => entry.id === opponentId && entry.id !== player.id)) {
        delete player.targetBoards[opponentId];
      }
    }
  }
}
