import { clearActiveRoomCode, getPlayerToken, getPreferredLocale, setActiveRoomCode } from '../session';

export function roomPayloadBase() {
  return {
    playerToken: getPlayerToken(),
    lang: getPreferredLocale(),
  };
}

export function persistActiveRoomCode(code: string) {
  setActiveRoomCode(code);
}

export function clearPersistedRoomCode() {
  clearActiveRoomCode();
}
