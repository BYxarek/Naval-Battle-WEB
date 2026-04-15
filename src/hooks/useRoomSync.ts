import { useEffect } from 'react';
import { translate } from '../i18n';
import { getActiveRoomCode } from '../session';
import { useAppStore } from '../store';
import { syncRoomState } from './roomSync/syncRoomState';
import { MAX_SYNC_FAILURES, POLL_INTERVAL_MS } from './roomSync/utils';

export function useRoomSync() {
  const locale = useAppStore((state) => state.locale);
  const room = useAppStore((state) => state.room);
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus);

  useEffect(() => {
    const roomCode = room?.code ?? getActiveRoomCode();
    if (!roomCode) {
      setConnectionStatus('idle');
      return;
    }

    let cancelled = false;
    let firstSync = true;
    let failedAttempts = 0;
    let stopped = false;
    let activeController: AbortController | undefined;
    let timer: number | undefined;

    async function runSync() {
      if (cancelled || stopped) {
        return;
      }

      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      const result = await syncRoomState({
        roomCode,
        signal: controller.signal,
        firstSync,
        setFirstSync: (value) => {
          firstSync = value;
        },
        cancelled: () => cancelled,
      });

      if (result.aborted || cancelled || stopped) {
        return;
      }

      if (result.ok) {
        failedAttempts = 0;
        return;
      }

      failedAttempts += 1;
      if (failedAttempts < MAX_SYNC_FAILURES) {
        return;
      }

      stopped = true;
      activeController?.abort();
      if (timer !== undefined) {
        window.clearInterval(timer);
      }
      useAppStore.getState().setConnectionStatus('idle');
      useAppStore.getState().setError(translate(locale, 'sync.stopped'));
    }

    void runSync();
    timer = window.setInterval(() => {
      void runSync();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      activeController?.abort();
      window.clearInterval(timer);
    };
  }, [locale, room?.code, setConnectionStatus]);
}
