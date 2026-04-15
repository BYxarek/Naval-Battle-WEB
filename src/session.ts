const PLAYER_TOKEN_KEY = 'morskoy-boy-player-token';
const ACTIVE_ROOM_KEY = 'morskoy-boy-room-code';
const CAPTAIN_NAME_KEY = 'morskoy-boy-captain-name';
const LOCALE_KEY = 'morskoy-boy-locale';
const DRAFT_KEY_PREFIX = 'morskoy-boy-draft';

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

export function getCaptainName(): string {
  if (!hasWindow()) {
    return '';
  }

  return window.localStorage.getItem(CAPTAIN_NAME_KEY) ?? '';
}

export function setCaptainName(name: string) {
  if (!hasWindow()) {
    return;
  }

  const safeName = name.trim();
  if (safeName) {
    window.localStorage.setItem(CAPTAIN_NAME_KEY, safeName);
  } else {
    window.localStorage.removeItem(CAPTAIN_NAME_KEY);
  }
}

export function getPreferredLocale(): 'ru' | 'en' | 'uk' {
  if (!hasWindow()) {
    return 'ru';
  }

  const saved = window.localStorage.getItem(LOCALE_KEY);
  if (saved === 'ru' || saved === 'en' || saved === 'uk') {
    return saved;
  }

  const browserLocale = window.navigator.language.toLowerCase();
  if (browserLocale.startsWith('uk')) {
    return 'uk';
  }
  if (browserLocale.startsWith('en')) {
    return 'en';
  }

  return 'ru';
}

export function setPreferredLocale(locale: 'ru' | 'en' | 'uk') {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(LOCALE_KEY, locale);
}

function draftKey(roomCode: string, setupVersion: number) {
  return `${DRAFT_KEY_PREFIX}:${roomCode}:${setupVersion}`;
}

export function getPersistedDraftPlacements(roomCode: string, setupVersion: number) {
  if (!hasWindow()) {
    return undefined;
  }

  const raw = window.localStorage.getItem(draftKey(roomCode, setupVersion));
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function setPersistedDraftPlacements(roomCode: string, setupVersion: number, placements: unknown) {
  if (!hasWindow()) {
    return;
  }

  if (!Array.isArray(placements) || placements.length === 0) {
    window.localStorage.removeItem(draftKey(roomCode, setupVersion));
    return;
  }

  window.localStorage.setItem(draftKey(roomCode, setupVersion), JSON.stringify(placements));
}

export function clearPersistedDraftPlacements(roomCode: string, setupVersion: number) {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(draftKey(roomCode, setupVersion));
}

export function getInviteRoomCode(): string | undefined {
  if (!hasWindow()) {
    return undefined;
  }

  const value = new URLSearchParams(window.location.search).get('invite') ?? '';
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  return code || undefined;
}

export function clearInviteRoomCode() {
  if (!hasWindow()) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  window.history.replaceState({}, '', url.toString());
}

export function buildInviteLink(roomCode: string) {
  if (!hasWindow()) {
    return `?invite=${roomCode}`;
  }

  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('invite', roomCode);
  return url.toString();
}
