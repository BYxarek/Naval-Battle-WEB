import type { Coord, SanitizedRoomState, ShipPlacement } from '../shared/game';
import { clearActiveRoomCode, getPlayerToken, setActiveRoomCode } from './session';

type RoomPayload = {
  room: SanitizedRoomState | null;
  error?: string;
};

type SuccessPayload = {
  ok: true;
};

type ApiError = {
  error: string;
};

function apiUrl(action: string) {
  return `${import.meta.env.BASE_URL}api/index.php?action=${action}`;
}

async function request<T>(action: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(action), {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = (await response.json()) as T | ApiError;
  if (!response.ok) {
    throw new Error((data as ApiError).error || 'Ошибка запроса.');
  }
  return data as T;
}

export async function createRoom(name: string): Promise<SanitizedRoomState> {
  const data = await request<RoomPayload>('create-room', {
    method: 'POST',
    body: JSON.stringify({
      name,
      playerToken: getPlayerToken(),
    }),
  });
  setActiveRoomCode(data.room.code);
  return data.room;
}

export async function joinRoom(name: string, code: string): Promise<SanitizedRoomState> {
  const data = await request<RoomPayload>('join-room', {
    method: 'POST',
    body: JSON.stringify({
      name,
      code,
      playerToken: getPlayerToken(),
    }),
  });
  setActiveRoomCode(data.room.code);
  return data.room;
}

export async function loadRoomState(code: string, signal?: AbortSignal): Promise<SanitizedRoomState> {
  const params = new URLSearchParams({
    code,
    playerToken: getPlayerToken(),
  });
  const data = await request<RoomPayload>(`state&${params.toString()}`, {
    method: 'GET',
    signal,
  });
  if (!data.room) {
    clearActiveRoomCode();
    throw new Error(data.error || 'Комната не найдена.');
  }
  setActiveRoomCode(data.room.code);
  return data.room;
}

export async function submitSetup(
  code: string,
  placements: ShipPlacement[],
): Promise<SanitizedRoomState> {
  const data = await request<RoomPayload>('submit-setup', {
    method: 'POST',
    body: JSON.stringify({
      code,
      placements,
      playerToken: getPlayerToken(),
    }),
  });
  return data.room;
}

export async function fireShot(code: string, coord: Coord): Promise<SanitizedRoomState> {
  const data = await request<RoomPayload>('fire', {
    method: 'POST',
    body: JSON.stringify({
      code,
      x: coord.x,
      y: coord.y,
      playerToken: getPlayerToken(),
    }),
  });
  return data.room;
}

export async function restartRoom(code: string): Promise<SanitizedRoomState> {
  const data = await request<RoomPayload>('restart-room', {
    method: 'POST',
    body: JSON.stringify({
      code,
      playerToken: getPlayerToken(),
    }),
  });
  return data.room;
}

export async function requestRematch(code: string): Promise<SanitizedRoomState> {
  const data = await request<RoomPayload>('request-rematch', {
    method: 'POST',
    body: JSON.stringify({
      code,
      playerToken: getPlayerToken(),
    }),
  });
  if (!data.room) {
    throw new Error(data.error || 'Не удалось запросить реванш.');
  }
  return data.room;
}

export async function respondRematch(
  code: string,
  decision: 'accept' | 'decline',
): Promise<SanitizedRoomState> {
  const data = await request<RoomPayload>('respond-rematch', {
    method: 'POST',
    body: JSON.stringify({
      code,
      decision,
      playerToken: getPlayerToken(),
    }),
  });
  if (!data.room) {
    throw new Error(data.error || 'Не удалось обработать реванш.');
  }
  return data.room;
}

export async function surrenderRoom(code: string): Promise<SanitizedRoomState> {
  const data = await request<RoomPayload>('surrender-room', {
    method: 'POST',
    body: JSON.stringify({
      code,
      playerToken: getPlayerToken(),
    }),
  });
  return data.room;
}

export async function cancelSetupRoom(code: string): Promise<void> {
  await request<SuccessPayload>('cancel-room', {
    method: 'POST',
    body: JSON.stringify({
      code,
      playerToken: getPlayerToken(),
    }),
  });
  clearActiveRoomCode();
}
