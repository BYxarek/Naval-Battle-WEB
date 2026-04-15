import type { SanitizedRoomState } from '../../../shared/game';
import { translate } from '../../i18n';
import { fireShot, requestRematch, respondRematch, surrenderRoom } from '../../api';
import { clearActiveRoomCode } from '../../session';
import { useAppStore } from '../../store';

export function useBattleActions(room: SanitizedRoomState) {
  const locale = useAppStore((state) => state.locale);
  const setError = useAppStore((state) => state.setError);
  const resetDraft = useAppStore((state) => state.resetDraft);
  const notifySuccess = useAppStore((state) => state.notifySuccess);

  async function handleFire(opponent: SanitizedRoomState['players'][number], x: number, y: number) {
    try {
      const nextRoom = await fireShot(room.code, { x, y }, opponent.id);
      useAppStore.getState().setRoom(nextRoom);
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.fireShot'));
    }
  }

  async function handleSurrender() {
    try {
      useAppStore.getState().setRoom(await surrenderRoom(room.code));
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.surrender'));
    }
  }

  async function handleAcceptRematch() {
    try {
      useAppStore.getState().setRoom(await respondRematch(room.code, 'accept'));
      resetDraft();
      notifySuccess(translate(locale, 'success.rematchAccepted'));
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.rematchAccept'));
    }
  }

  async function handleDeclineRematch() {
    try {
      const nextRoom = await respondRematch(room.code, 'decline');
      notifySuccess(nextRoom.lastAction ?? translate(locale, 'success.rematchDeclined'));
      clearActiveRoomCode();
      useAppStore.getState().setRoom(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.rematchDecline'));
    }
  }

  async function handleRequestRematch() {
    try {
      useAppStore.getState().setRoom(await requestRematch(room.code));
      notifySuccess(translate(locale, 'success.rematchRequested'));
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.rematchRequest'));
    }
  }

  return {
    handleFire,
    handleSurrender,
    handleAcceptRematch,
    handleDeclineRematch,
    handleRequestRematch,
  };
}
