import { useEffect } from 'react';
import { loadRoomState } from '../api';
import { getActiveRoomCode, setActiveRoomCode } from '../session';
import { useAppStore } from '../store';

const POLL_INTERVAL_MS = 1800;

export function useRoomSync() {
  const room = useAppStore((state) => state.room);
  const setRoom = useAppStore((state) => state.setRoom);
  const setError = useAppStore((state) => state.setError);
  const notifySuccess = useAppStore((state) => state.notifySuccess);
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus);

  useEffect(() => {
    const roomCode = room?.code ?? getActiveRoomCode();
    if (!roomCode) {
      setConnectionStatus('idle');
      return;
    }

    let cancelled = false;
    let firstSync = true;
    let activeController: AbortController | undefined;

    async function syncRoom() {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;

      try {
        if (firstSync) {
          setConnectionStatus('connecting');
        }
        const nextRoom = await loadRoomState(roomCode, controller.signal);
        if (cancelled) {
          return;
        }
        if (nextRoom.phase === 'closed') {
          setActiveRoomCode(undefined);
          setRoom(undefined);
          setConnectionStatus('idle');
          notifySuccess(nextRoom.lastAction ?? 'Игра завершена. Возврат в главное меню.');
          return;
        }
        firstSync = false;
        setRoom(nextRoom);
        setConnectionStatus('connected');
        setError(undefined);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        const message = error instanceof Error ? error.message : 'Не удалось обновить комнату.';
        if (message.includes('Комната не найдена')) {
          setActiveRoomCode(undefined);
          setRoom(undefined);
          setConnectionStatus('idle');
        }
        setError(message);
      }
    }

    void syncRoom();
    const timer = window.setInterval(() => {
      void syncRoom();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      activeController?.abort();
      window.clearInterval(timer);
    };
  }, [notifySuccess, room?.code, setConnectionStatus, setError, setRoom]);
}
