import { SHIPS, type SanitizedRoomState } from '../../../../shared/game';
import { useI18n } from '../../../i18n';

export function PlayerStatusPanel({ room }: { room: SanitizedRoomState }) {
  const { t } = useI18n();
  return (
    <div className="panel status-stack">
      {room.players.map((player) => (
        <div key={player.id} className="status-line">
          <strong>{player.name}</strong>
          <span>{player.ready ? t('game.playerReady') : t('game.playerPlacingFleet')}</span>
          <span>{t('game.sunkShips', { count: (player.sunkShips ?? player.ownBoard?.sunkShips ?? []).length, total: SHIPS.length })}</span>
        </div>
      ))}
    </div>
  );
}
