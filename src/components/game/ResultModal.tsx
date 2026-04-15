import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowsRotate, faBullseye, faChartColumn, faSkullCrossbones } from '@fortawesome/free-solid-svg-icons';
import type { SanitizedRoomState } from '../../../shared/game';
import { useI18n } from '../../i18n';

type Stats = { hits: number; misses: number; shots: number; accuracy: number };

type ResultModalProps = {
  room: SanitizedRoomState;
  currentPlayer: SanitizedRoomState['players'][number];
  opponents: SanitizedRoomState['players'];
  winner?: SanitizedRoomState['players'][number];
  youStats: Stats;
  isRematchRequester: boolean;
  hasIncomingRematchRequest: boolean;
  rematchRequester?: SanitizedRoomState['players'][number];
  getOpponentStats: (opponentId: string) => Stats;
  onAcceptRematch: () => void;
  onDeclineRematch: () => void;
  onRequestRematch: () => void;
  onExitToMenu: () => void;
};

export function ResultModal(props: ResultModalProps) {
  const { t } = useI18n();
  const {
    room,
    currentPlayer,
    opponents,
    winner,
    youStats,
    isRematchRequester,
    hasIncomingRematchRequest,
    rematchRequester,
    getOpponentStats,
    onAcceptRematch,
    onDeclineRematch,
    onRequestRematch,
    onExitToMenu,
  } = props;

  return (
    <div className="modal-backdrop" data-testid="result-modal">
      <div className="modal-card result-modal">
        <p className="eyebrow">{t('result.final')}</p>
        <h3 className="result-title">
          <FontAwesomeIcon icon={winner?.isYou ? faBullseye : faSkullCrossbones} />
          {winner?.isYou ? t('result.victory') : t('result.defeat')}
        </h3>
        <p>{winner ? t('result.winner', { name: winner.name }) : t('result.matchFinished')}</p>
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stats-title"><FontAwesomeIcon icon={faChartColumn} />{currentPlayer.name}</div>
            <span>{t('result.turns', { count: youStats.shots })}</span>
            <span>{t('result.hits', { count: youStats.hits })}</span>
            <span>{t('result.misses', { count: youStats.misses })}</span>
            <span>{t('result.status', { status: currentPlayer.eliminated ? t('result.eliminated') : t('result.inGame') })}</span>
            <span>{t('result.accuracy', { count: youStats.accuracy })}</span>
          </div>
          {opponents.map((opponent) => {
            const stats = getOpponentStats(opponent.id);
            return (
              <div key={opponent.id} className="stats-card">
                <div className="stats-title"><FontAwesomeIcon icon={faChartColumn} />{opponent.name}</div>
                <span>{t('result.turns', { count: stats.shots })}</span>
                <span>{t('result.hits', { count: stats.hits })}</span>
                <span>{t('result.misses', { count: stats.misses })}</span>
                <span>{t('result.status', { status: opponent.eliminated ? t('result.eliminated') : t('result.inGame') })}</span>
                <span>{t('result.accuracy', { count: stats.accuracy })}</span>
              </div>
            );
          })}
        </div>
        {hasIncomingRematchRequest && rematchRequester ? (
          <>
            <div className="result-divider" />
            <p className="eyebrow">{t('result.rematch')}</p>
            <p>{t('result.rematchOffer', { name: rematchRequester.name })}</p>
            <div className="modal-actions">
              <button className="primary-button" onClick={onAcceptRematch} data-testid="accept-rematch-button">{t('result.accept')}</button>
              <button className="danger-button" onClick={onDeclineRematch} data-testid="decline-rematch-button">{t('result.decline')}</button>
            </div>
          </>
        ) : (
          <>
            <div className="result-divider" />
            <div className="modal-actions">
              <button className="primary-button" onClick={onRequestRematch} disabled={!!room.rematchRequesterId} data-testid="request-rematch-button">
                <FontAwesomeIcon icon={faArrowsRotate} />
                {isRematchRequester ? t('result.waitingAnswer') : room.rematchRequesterId ? t('result.rematchRequested') : t('result.requestRematch')}
              </button>
              <button className="secondary-button" onClick={onExitToMenu} data-testid="exit-to-menu-button">{t('result.mainMenu')}</button>
            </div>
            {isRematchRequester ? <p className="muted">{t('result.waitingApprove')}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
