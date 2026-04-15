import { faSignal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';
import { getInviteRoomCode } from '../../session';
import { useAppStore } from '../../store';
import { CreateRoomSection } from './CreateRoomSection';
import { JoinRoomSection } from './JoinRoomSection';
import { useLobbyActions } from './useLobbyActions';

export function LobbyControls({ onlineCount }: { onlineCount?: number }) {
  const { t } = useI18n();
  const pingMs = useAppStore((state) => state.pingMs);
  const name = useAppStore((state) => state.name);
  const roomCodeInput = useAppStore((state) => state.roomCodeInput);
  const createRoomPlayerCount = useAppStore((state) => state.createRoomPlayerCount);
  const setName = useAppStore((state) => state.setName);
  const setRoomCodeInput = useAppStore((state) => state.setRoomCodeInput);
  const setCreateRoomPlayerCount = useAppStore((state) => state.setCreateRoomPlayerCount);
  const notifySuccess = useAppStore((state) => state.notifySuccess);
  const { handleCreateRoom, handleCreateBotRoom, handleJoinRoom } = useLobbyActions();
  const inviteAutoJoinDone = useRef(false);
  const inviteNoticeShown = useRef(false);

  useEffect(() => {
    const inviteCode = getInviteRoomCode();
    if (!inviteCode) {
      return;
    }

    setRoomCodeInput(inviteCode);
    if (!inviteAutoJoinDone.current && name.trim()) {
      inviteAutoJoinDone.current = true;
      void handleJoinRoom(name, inviteCode);
      return;
    }

    if (!name.trim()) {
      if (inviteNoticeShown.current) {
        return;
      }

      inviteNoticeShown.current = true;
      notifySuccess(t('lobby.inviteLoaded'));
    }
  }, [handleJoinRoom, name, notifySuccess, setRoomCodeInput, t]);

  return (
    <motion.div
      className="control-panel"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: 0.05 }}
    >
      <div className="online-pill" aria-live="polite">
        <FontAwesomeIcon icon={faSignal} />
        {onlineCount !== undefined ? t('lobby.onlineNow', { count: onlineCount }) : t('lobby.onlineCounting')}
        {' · '}
        {pingMs !== undefined ? t('app.ping', { count: pingMs }) : t('app.pingUpdating')}
      </div>
      <CreateRoomSection
        name={name}
        createRoomPlayerCount={createRoomPlayerCount}
        onNameChange={setName}
        onPlayerCountChange={setCreateRoomPlayerCount}
        onCreateRoom={() => void handleCreateRoom(name, createRoomPlayerCount)}
        onCreateBotRoom={() => void handleCreateBotRoom(name)}
      />
      <JoinRoomSection
        roomCodeInput={roomCodeInput}
        onRoomCodeChange={(value) => setRoomCodeInput(value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        onJoinRoom={() => void handleJoinRoom(name, roomCodeInput)}
      />
    </motion.div>
  );
}
