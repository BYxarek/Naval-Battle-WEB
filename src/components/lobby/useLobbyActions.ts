import { createBotRoom, createRoom, joinRoom } from '../../api';
import { translate } from '../../i18n';
import { clearInviteRoomCode } from '../../session';
import { useAppStore } from '../../store';

export function useLobbyActions() {
  const locale = useAppStore((state) => state.locale);
  const setError = useAppStore((state) => state.setError);

  function ensureName(name: string) {
    if (!name.trim()) {
      setError(translate(locale, 'error.enterCaptainName'));
      return false;
    }
    return true;
  }

  async function handleCreateRoom(name: string, maxPlayers: 2 | 3 | 4) {
    if (!ensureName(name)) {
      return;
    }

    try {
      const room = await createRoom(name.trim(), maxPlayers);
      useAppStore.getState().setRoom(room);
      useAppStore.getState().setConnectionStatus('connected');
      clearInviteRoomCode();
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.createRoom'));
    }
  }

  async function handleJoinRoom(name: string, roomCode: string) {
    if (!ensureName(name)) {
      return;
    }

    try {
      const room = await joinRoom(name.trim(), roomCode);
      useAppStore.getState().setRoom(room);
      useAppStore.getState().setConnectionStatus('connected');
      clearInviteRoomCode();
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.joinRoom'));
    }
  }

  async function handleCreateBotRoom(name: string) {
    if (!ensureName(name)) {
      return;
    }

    try {
      const room = await createBotRoom(name.trim());
      useAppStore.getState().setRoom(room);
      useAppStore.getState().setConnectionStatus('connected');
      clearInviteRoomCode();
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.createBotRoom'));
    }
  }

  return {
    handleCreateRoom,
    handleCreateBotRoom,
    handleJoinRoom,
  };
}
