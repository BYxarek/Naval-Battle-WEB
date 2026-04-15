import { faLink, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { SanitizedRoomState } from '../../../../shared/game';
import { useI18n } from '../../../i18n';
import { useAppStore } from '../../../store';

export function RoomInfoPanel({ room, onInviteFriend }: { room: SanitizedRoomState; onInviteFriend: () => void }) {
  const { t } = useI18n();
  const pingMs = useAppStore((state) => state.pingMs);
  const hasBot = room.players.some((player) => player.isBot);
  return (
    <div className="panel cardless">
      <p className="eyebrow">{t('game.room')}</p>
      <h2 className="panel-title" data-testid="room-code-display"><FontAwesomeIcon icon={faUsers} />{room.code}</h2>
      <p className="muted">
        {room.players.length < room.maxPlayers
          ? t('game.waitingPlayers', { current: room.players.length, max: room.maxPlayers })
          : t('game.playersInRoom', { current: room.players.length, max: room.maxPlayers })}
      </p>
      <p className="muted">{pingMs !== undefined ? t('app.ping', { count: pingMs }) : t('app.pingUpdating')}</p>
      <p className="event-line">{room.lastAction ?? t('game.prepareFleet')}</p>
      {room.phase === 'setup' && !hasBot ? (
        <button className="ghost-button room-invite-button" onClick={onInviteFriend} data-testid="invite-button">
          <FontAwesomeIcon icon={faLink} />
          {t('game.inviteFriend')}
        </button>
      ) : null}
    </div>
  );
}
