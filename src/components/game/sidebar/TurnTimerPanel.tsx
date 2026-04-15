import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useI18n } from '../../../i18n';

type TurnTimerPanelProps = {
  isYourTurn: boolean;
  turnTimerLabel?: string;
  isTimerDanger: boolean;
};

export function TurnTimerPanel({ isYourTurn, turnTimerLabel, isTimerDanger }: TurnTimerPanelProps) {
  const { t } = useI18n();
  if (!turnTimerLabel) {
    return null;
  }

  return (
    <div className="panel timer-panel">
      <div className="panel-row">
        <h3 className="section-title"><FontAwesomeIcon icon={faSpinner} />{t('game.turnTimer')}</h3>
        <strong className={`turn-timer ${isTimerDanger ? 'turn-timer-danger' : ''}`}>{turnTimerLabel}</strong>
      </div>
      <p className="muted">
        {isYourTurn
          ? t('game.turnTimerYours')
          : t('game.turnTimerOther')}
      </p>
    </div>
  );
}
