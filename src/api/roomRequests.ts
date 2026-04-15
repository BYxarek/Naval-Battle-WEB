import {
  createEmptyBoard,
  type Coord,
  type SanitizedRoomState,
  type ShipPlacement,
} from '../../shared/game';
import { request } from './client';
import {
  clearPersistedRoomCode,
  persistActiveRoomCode,
  roomPayloadBase,
} from './roomSession';

export type RoomPayload = {
  room: SanitizedRoomState | null;
  error?: string;
};

type SuccessPayload = {
  ok: true;
};

type OnlineCountPayload = {
  count: number;
};

function normalizeRoom(room: SanitizedRoomState): SanitizedRoomState {
  return {
    ...room,
    players: room.players.map((player) => {
      const safeOwnBoard = {
        ...createEmptyBoard(),
        ...player.ownBoard,
        ships: Array.isArray(player.ownBoard?.ships) ? player.ownBoard.ships : [],
        sunkShips: Array.isArray(player.ownBoard?.sunkShips) ? player.ownBoard.sunkShips : [],
        cells: Array.isArray(player.ownBoard?.cells) ? player.ownBoard.cells : createEmptyBoard().cells,
      };

      return {
        ...player,
        sunkShips: Array.isArray(player.sunkShips) ? player.sunkShips : safeOwnBoard.sunkShips,
        ownBoard: safeOwnBoard,
        targetBoards: player.targetBoards ?? {},
      };
    }),
  };
}

function requireRoom(data: RoomPayload, fallbackMessage: string) {
  if (!data.room) {
    throw new Error(data.error || fallbackMessage);
  }

  return normalizeRoom(data.room);
}

export async function postRoomAction(action: string, body: Record<string, unknown>, fallbackMessage: string) {
  const data = await request<RoomPayload>(action, {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      ...roomPayloadBase(),
    }),
  });

  return requireRoom(data, fallbackMessage);
}

export async function loadRoomStateRequest(code: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    code,
    ...roomPayloadBase(),
  });
  const data = await request<RoomPayload>(`state&${params.toString()}`, {
    method: 'GET',
    signal,
  });

  if (!data.room) {
    clearPersistedRoomCode();
    throw new Error(data.error || 'Комната не найдена.');
  }

  const room = normalizeRoom(data.room);
  persistActiveRoomCode(room.code);
  return room;
}

export async function createRoomRequest(name: string, maxPlayers: 2 | 3 | 4) {
  const room = await postRoomAction('create-room', { name, maxPlayers }, 'Не удалось создать комнату.');
  persistActiveRoomCode(room.code);
  return room;
}

export async function createBotRoomRequest(name: string) {
  const room = await postRoomAction('create-bot-room', { name }, 'Не удалось начать игру с ботом.');
  persistActiveRoomCode(room.code);
  return room;
}

export async function joinRoomRequest(name: string, code: string) {
  const room = await postRoomAction('join-room', { name, code }, 'Не удалось войти в комнату.');
  persistActiveRoomCode(room.code);
  return room;
}

export async function submitSetupRequest(code: string, placements: ShipPlacement[]) {
  return postRoomAction('submit-setup', { code, placements }, 'Не удалось подтвердить расстановку.');
}

export async function fireShotRequest(code: string, coord: Coord, targetPlayerId: string) {
  return postRoomAction('fire', { code, x: coord.x, y: coord.y, targetPlayerId }, 'Не удалось выполнить выстрел.');
}

export async function restartRoomRequest(code: string) {
  return postRoomAction('restart-room', { code }, 'Не удалось перезапустить матч.');
}

export async function requestRematchRequest(code: string) {
  return postRoomAction('request-rematch', { code }, 'Не удалось запросить реванш.');
}

export async function respondRematchRequest(code: string, decision: 'accept' | 'decline') {
  return postRoomAction('respond-rematch', { code, decision }, 'Не удалось обработать реванш.');
}

export async function surrenderRoomRequest(code: string) {
  return postRoomAction('surrender-room', { code }, 'Не удалось сдаться.');
}

export async function cancelSetupRoomRequest(code: string) {
  await request<SuccessPayload>('cancel-room', {
    method: 'POST',
    body: JSON.stringify({
      code,
      ...roomPayloadBase(),
    }),
  });
  clearPersistedRoomCode();
}

export async function pingPresenceRequest() {
  await request<SuccessPayload>('presence-ping', {
    method: 'POST',
    body: JSON.stringify({
      ...roomPayloadBase(),
    }),
  });
}

export async function loadOnlineCountRequest() {
  const data = await request<OnlineCountPayload>('online-count', {
    method: 'GET',
  });

  return data.count;
}
