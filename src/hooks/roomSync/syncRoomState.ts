import { loadRoomState } from '../../api';
import { translate } from '../../i18n';
import { setActiveRoomCode } from '../../session';
import { useAppStore } from '../../store';
import { countBoardStates } from './utils';

type SyncRoomParams = {
  roomCode: string;
  signal: AbortSignal;
  firstSync: boolean;
  setFirstSync: (value: boolean) => void;
  cancelled: () => boolean;
};

type SyncRoomResult = {
  ok: boolean;
  aborted?: boolean;
};

export async function syncRoomState({
  roomCode,
  signal,
  firstSync,
  setFirstSync,
  cancelled,
}: SyncRoomParams): Promise<SyncRoomResult> {
  const { setRoom, setError, notifySuccess, setConnectionStatus, setPingMs } = useAppStore.getState();
  const locale = useAppStore.getState().locale;

  try {
    if (firstSync) {
      setConnectionStatus('connecting');
    }

    const startedAt = performance.now();
    const nextRoom = await loadRoomState(roomCode, signal);
    setPingMs(Math.max(1, Math.round(performance.now() - startedAt)));
    if (cancelled()) {
      return { ok: false, aborted: true };
    }

    const previousRoom = useAppStore.getState().room;
    const previousCounts = countBoardStates(previousRoom, previousRoom?.youPlayerId);
    const nextCounts = countBoardStates(nextRoom, nextRoom.youPlayerId);

    if (nextRoom.phase === 'closed') {
      setActiveRoomCode(undefined);
      setRoom(undefined);
      setConnectionStatus('idle');
      notifySuccess(nextRoom.lastAction ?? translate(locale, 'sync.gameClosed'));
      return { ok: true };
    }

    setFirstSync(false);
    if (previousRoom?.code === nextRoom.code && previousRoom.phase === 'battle' && nextRoom.phase === 'battle') {
      if (nextCounts.sunk > previousCounts.sunk) {
        notifySuccess(nextRoom.lastAction ?? translate(locale, 'sync.enemySunkShip'));
      } else if (nextCounts.hit > previousCounts.hit) {
        notifySuccess(nextRoom.lastAction ?? translate(locale, 'sync.enemyHitShip'));
      }
    }

    setRoom(nextRoom);
    setConnectionStatus('connected');
    setError(undefined);
    return { ok: true };
  } catch (error) {
    if (cancelled()) {
      return { ok: false, aborted: true };
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, aborted: true };
    }

    const message = error instanceof Error ? error.message : translate(locale, 'sync.updateFailed');
    if (message === translate(locale, 'server.error.roomNotFound') || message === 'Комната не найдена.' || message === 'Room not found.' || message === 'Кімнату не знайдено.') {
      setActiveRoomCode(undefined);
      setRoom(undefined);
      setConnectionStatus('idle');
    }
    setPingMs(undefined);
    setError(message);
    return { ok: false };
  }
}
