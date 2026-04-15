import { faDoorOpen, faHashtag } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useI18n } from '../../i18n';

type JoinRoomSectionProps = {
  roomCodeInput: string;
  onRoomCodeChange: (value: string) => void;
  onJoinRoom: () => void;
};

export function JoinRoomSection(props: JoinRoomSectionProps) {
  const { t } = useI18n();
  const { roomCodeInput, onRoomCodeChange, onJoinRoom } = props;

  return (
    <div className="join-row">
      <label className="field compact" htmlFor="room-code">
        <span>{t('lobby.roomCode')}</span>
        <div className="input-shell">
          <FontAwesomeIcon icon={faHashtag} className="field-icon" />
          <input
            id="room-code"
            name="room_code"
            autoComplete="off"
            data-testid="room-code-input"
            value={roomCodeInput}
            onChange={(event) => onRoomCodeChange(event.target.value)}
            placeholder="ABCDE"
            maxLength={5}
          />
        </div>
      </label>

      <button className="secondary-button" onClick={onJoinRoom} data-testid="join-room-button">
        <FontAwesomeIcon icon={faDoorOpen} />
        {t('lobby.joinRoom')}
      </button>
    </div>
  );
}
