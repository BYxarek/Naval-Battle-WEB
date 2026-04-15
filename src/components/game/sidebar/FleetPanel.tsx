import {
  faArrowsRotate,
  faCircleCheck,
  faDoorOpen,
  faFlag,
  faRotate,
  faShip,
  faSpinner,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SHIPS, type SanitizedRoomState } from '../../../../shared/game';
import { useI18n } from '../../../i18n';

type ShipGroupView = {
  key: string;
  label: string;
  total: number;
  remaining: number;
  nextShipId?: string;
  isActive: boolean;
};

type FleetPanelProps = {
  room: SanitizedRoomState;
  currentPlayer: SanitizedRoomState['players'][number];
  opponents: SanitizedRoomState['players'];
  shipGroups: ShipGroupView[];
  placementInstruction: string;
  isSetupBusy: boolean;
  busyAction: 'clear' | 'auto' | null;
  onSelectShip: (shipId: string) => void;
  onAutoPlaceShips: () => void;
  onClearDraft: () => void;
  onSubmitPlacements: () => void;
  onCancelGame: () => void;
  onSurrender: () => void;
};

function buildRemainingFleet(opponent: SanitizedRoomState['players'][number], t: (key: string, params?: Record<string, string | number>) => string) {
  return [
    { key: 'deck4', label: t('ship.deck4'), total: 1, remaining: SHIPS.filter((ship) => ship.length === 4 && !opponent.sunkShips.includes(ship.id)).length },
    { key: 'deck3', label: t('ship.deck3'), total: 2, remaining: SHIPS.filter((ship) => ship.length === 3 && !opponent.sunkShips.includes(ship.id)).length },
    { key: 'deck2', label: t('ship.deck2'), total: 3, remaining: SHIPS.filter((ship) => ship.length === 2 && !opponent.sunkShips.includes(ship.id)).length },
    { key: 'deck1', label: t('ship.deck1'), total: 4, remaining: SHIPS.filter((ship) => ship.length === 1 && !opponent.sunkShips.includes(ship.id)).length },
  ];
}

export function FleetPanel(props: FleetPanelProps) {
  const { t } = useI18n();
  const {
    room,
    currentPlayer,
    opponents,
    shipGroups,
    placementInstruction,
    isSetupBusy,
    busyAction,
    onSelectShip,
    onAutoPlaceShips,
    onClearDraft,
    onSubmitPlacements,
    onCancelGame,
    onSurrender,
  } = props;

  if (room.phase === 'battle') {
    return (
      <div className="panel ship-panel">
        <div className="panel-row">
          <h3 className="section-title"><FontAwesomeIcon icon={faShip} />{t('game.fleet')}</h3>
        </div>
        <div className="battle-fleet-stack">
          <button className="danger-button" onClick={onSurrender} data-testid="surrender-button">
            <FontAwesomeIcon icon={faFlag} />
            {t('game.surrender')}
          </button>
          {opponents.map((opponent, index) => (
            <div key={opponent.id} className="battle-fleet-card" data-testid={`opponent-fleet-card-${index}`}>
              <div className="battle-fleet-header">
                <strong>{t('game.enemyFleetRemaining', { count: SHIPS.length - opponent.sunkShips.length })}</strong>
              </div>
              <div className="battle-fleet-list">
                {buildRemainingFleet(opponent, t).map((group) => (
                  <div key={group.key} className="battle-fleet-line">
                    <span>{t(`ship.remaining.${group.key}`)}</span>
                    <strong>{group.remaining}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel ship-panel">
      <div className="panel-row">
        <h3 className="section-title"><FontAwesomeIcon icon={faShip} />{t('game.fleet')}</h3>
        <div className="ghost-button ship-hint"><FontAwesomeIcon icon={faRotate} />{placementInstruction}</div>
      </div>
      <div className="ship-list">
        {shipGroups.map((group) => {
          const complete = group.remaining === 0;
          return (
            <button
              key={group.key}
              className={`ship-chip ship-group-chip ${group.isActive ? 'active' : ''} ${complete ? 'placed' : ''}`}
              onClick={() => group.nextShipId && onSelectShip(group.nextShipId)}
              disabled={currentPlayer.ready || room.phase !== 'setup' || !group.nextShipId || isSetupBusy}
            >
              <span>{group.label}</span>
              <strong>{t('game.remainingShips', { remaining: group.remaining, total: group.total })}</strong>
            </button>
          );
        })}
      </div>
      <div className="panel-actions">
        <button className="secondary-button" onClick={onAutoPlaceShips} disabled={currentPlayer.ready || isSetupBusy} data-testid="auto-place-button">
          <FontAwesomeIcon icon={isSetupBusy && busyAction === 'auto' ? faSpinner : faWandMagicSparkles} spin={isSetupBusy && busyAction === 'auto'} />
          {isSetupBusy && busyAction === 'auto' ? t('game.autoArranging') : t('game.autoArrange')}
        </button>
        <button className="secondary-button" onClick={onClearDraft} disabled={currentPlayer.ready || isSetupBusy} data-testid="clear-draft-button">
          <FontAwesomeIcon icon={isSetupBusy && busyAction === 'clear' ? faSpinner : faArrowsRotate} spin={isSetupBusy && busyAction === 'clear'} />
          {isSetupBusy && busyAction === 'clear' ? t('game.clearing') : t('game.clear')}
        </button>
        <button className="primary-button" onClick={onSubmitPlacements} disabled={currentPlayer.ready || isSetupBusy} data-testid="confirm-setup-button">
          <FontAwesomeIcon icon={faCircleCheck} />
          {currentPlayer.ready ? t('game.ready') : t('game.confirm')}
        </button>
        {room.phase === 'setup' ? (
          <button className="danger-button" onClick={onCancelGame} data-testid="cancel-game-button">
            <FontAwesomeIcon icon={faDoorOpen} />
            {t('game.cancelGame')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
