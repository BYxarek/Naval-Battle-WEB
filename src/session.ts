const PLAYER_TOKEN_KEY = 'morskoy-boy-player-token';
const ACTIVE_ROOM_KEY = 'morskoy-boy-room-code';

function hasWindow() {
  return typeof window !== 'undefined';
}

export function getPlayerToken(): string {
  if (!hasWindow()) {
    return 'server-render';
  }

  const existing = window.localStorage.getItem(PLAYER_TOKEN_KEY);
  if (existing) {
    return existing;
  }

  const token = crypto.randomUUID();
  window.localStorage.setItem(PLAYER_TOKEN_KEY, token);
  return token;
}

export function getActiveRoomCode(): string | undefined {
  if (!hasWindow()) {
    return undefined;
  }
  return window.localStorage.getItem(ACTIVE_ROOM_KEY) ?? undefined;
}

export function setActiveRoomCode(roomCode?: string) {
  if (!hasWindow()) {
    return;
  }
  if (roomCode) {
    window.localStorage.setItem(ACTIVE_ROOM_KEY, roomCode);
  } else {
    window.localStorage.removeItem(ACTIVE_ROOM_KEY);
  }
}

export function clearActiveRoomCode() {
  setActiveRoomCode(undefined);
}
