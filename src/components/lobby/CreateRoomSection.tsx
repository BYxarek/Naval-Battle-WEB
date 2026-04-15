import { faRobot, faShip, faUserAstronaut } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useI18n } from '../../i18n';

type CreateRoomSectionProps = {
  name: string;
  createRoomPlayerCount: 2 | 3 | 4;
  onNameChange: (value: string) => void;
  onPlayerCountChange: (value: 2 | 3 | 4) => void;
  onCreateRoom: () => void;
  onCreateBotRoom: () => void;
};

export function CreateRoomSection(props: CreateRoomSectionProps) {
  const { t } = useI18n();
  const { name, createRoomPlayerCount, onNameChange, onPlayerCountChange, onCreateRoom, onCreateBotRoom } = props;

  return (
    <>
      <label className="field" htmlFor="captain-name">
        <span>{t('lobby.name')}</span>
        <div className="input-shell">
          <FontAwesomeIcon icon={faUserAstronaut} className="field-icon" />
          <input
            id="captain-name"
            name="captain_name"
            autoComplete="name"
            data-testid="captain-name-input"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={t('lobby.namePlaceholder')}
            maxLength={24}
          />
        </div>
      </label>

      <div className="actions">
        <div className="field">
          <span>{t('lobby.playerCount')}</span>
          <div className="player-count-row">
            <div className="player-count-panel" role="radiogroup" aria-label={t('lobby.playerCount')}>
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  data-testid={`player-count-${count}`}
                  className={`player-count-option ${createRoomPlayerCount === count ? 'active' : ''}`}
                  aria-pressed={createRoomPlayerCount === count}
                  aria-label={t('lobby.playerCountAria', { count })}
                  onClick={() => onPlayerCountChange(count as 2 | 3 | 4)}
                >
                  <span className="player-count-number">{count}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="secondary-button bot-room-button"
              onClick={onCreateBotRoom}
              data-testid="create-bot-room-button"
              aria-label={t('lobby.createBotRoom')}
              title={t('lobby.createBotRoom')}
            >
              <FontAwesomeIcon icon={faRobot} />
            </button>
          </div>
        </div>
        <button className="primary-button create-room-button" onClick={onCreateRoom} data-testid="create-room-button">
          <FontAwesomeIcon icon={faShip} />
          {t('lobby.createRoom')}
        </button>
      </div>
    </>
  );
}
