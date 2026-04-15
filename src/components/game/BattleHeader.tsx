import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faCompassDrafting, faCrosshairs, faSpinner } from '@fortawesome/free-solid-svg-icons';
import type { SanitizedRoomState } from '../../../shared/game';
import { useI18n } from '../../i18n';

type BattleHeaderProps = {
  room: SanitizedRoomState;
  isYourTurn: boolean;
  turnTimerLabel?: string;
  isTimerDanger: boolean;
  onOpenMenu: () => void;
};

export function BattleHeader({
  room,
  isYourTurn,
  turnTimerLabel,
  isTimerDanger,
  onOpenMenu,
}: BattleHeaderProps) {
  const { t } = useI18n();
  return (
    <div className="battle-state">
      <div className="battle-heading">
        <h2 data-testid="battle-title">
          <FontAwesomeIcon icon={room.phase === 'battle' ? faCrosshairs : faCompassDrafting} />
          {room.phase === 'battle'
            ? isYourTurn
              ? t('game.yourShot')
              : t('game.waitOpponentTurn')
            : room.phase === 'setup'
              ? t('game.placeShips')
              : t('game.matchFinished')}
        </h2>
        <div className="battle-heading-actions">
          {room.phase === 'battle' && turnTimerLabel ? (
            <div className={`ghost-button battle-pill ${isTimerDanger ? 'battle-pill-danger' : ''}`}>
              <FontAwesomeIcon icon={faSpinner} />
              {turnTimerLabel}
            </div>
          ) : null}
          <button className="ghost-button mobile-sidebar-toggle" onClick={onOpenMenu} aria-label={t('game.openMatchMenu')}>
            <FontAwesomeIcon icon={faBars} />
            {t('game.menu')}
          </button>
        </div>
      </div>
    </div>
  );
}
