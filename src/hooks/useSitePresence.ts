import { useEffect, useState } from 'react';
import { loadOnlineCount, pingPresence } from '../api';
import { useAppStore } from '../store';

const PRESENCE_PING_MS = 30_000;
const ONLINE_REFRESH_MS = 20_000;

export function useSitePresence() {
  const [onlineCount, setOnlineCount] = useState<number | undefined>(undefined);
  const setPingMs = useAppStore((state) => state.setPingMs);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        await pingPresence();
      } catch {
        // Presence heartbeat is best-effort only.
      }
    }

    async function refreshCount() {
      try {
        const startedAt = performance.now();
        const nextCount = await loadOnlineCount();
        if (!cancelled) {
          setOnlineCount(nextCount);
          setPingMs(Math.max(1, Math.round(performance.now() - startedAt)));
        }
      } catch {
        if (!cancelled) {
          setOnlineCount(undefined);
          setPingMs(undefined);
        }
      }
    }

    void ping();
    void refreshCount();

    const pingTimer = window.setInterval(() => {
      void ping();
    }, PRESENCE_PING_MS);

    const countTimer = window.setInterval(() => {
      void refreshCount();
    }, ONLINE_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(pingTimer);
      window.clearInterval(countTimer);
    };
  }, [setPingMs]);

  return onlineCount;
}
