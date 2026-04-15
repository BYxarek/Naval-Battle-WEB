import { createEmptyBoard } from './board';
import { fleetDestroyed } from './battle';
import { ensureRoomTargetBoards } from './targetBoards';
import type { PlayerState, RoomState, SanitizedRoomState } from './types';

export function createRoom(code: string, host: PlayerState, maxPlayers: 2 | 3 | 4): RoomState {
  return {
    code,
    phase: 'lobby',
    hostId: host.id,
    maxPlayers,
    setupVersion: 1,
    players: [host],
    createdAt: Date.now(),
  };
}

export function sanitizeRoomForPlayer(room: RoomState, playerId?: string): SanitizedRoomState {
  ensureRoomTargetBoards(room);
  return {
    code: room.code,
    phase: room.phase,
    maxPlayers: room.maxPlayers,
    setupVersion: room.setupVersion,
    currentTurnPlayerId: room.currentTurnPlayerId,
    turnStartedAt: room.turnStartedAt,
    winnerId: room.winnerId,
    lastAction: room.lastAction,
    rematchRequesterId: (room as RoomState & { rematchRequesterId?: string }).rematchRequesterId,
    createdAt: room.createdAt,
    youAreHost: room.hostId === playerId,
    youPlayerId: playerId,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      ready: player.ready,
      shotsFired: player.shotsFired,
      sunkShips: [...player.board.sunkShips],
      ownBoard:
        player.id === playerId
          ? player.board
          : {
              ...createEmptyBoard(),
              ...player.board,
              ships: [],
              cells: player.board.cells.map((row) =>
                row.map((cell) => ({
                  x: cell.x,
                  y: cell.y,
                  state:
                    cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk'
                      ? cell.state
                      : 'empty',
                })),
              ),
            },
      targetBoards: player.targetBoards,
      isYou: player.id === playerId,
      eliminated: fleetDestroyed(player.board),
    })),
  };
}
