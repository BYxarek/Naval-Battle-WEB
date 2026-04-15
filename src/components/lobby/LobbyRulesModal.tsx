import { faBookOpen, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LobbyRules } from './LobbyRules';
import { useI18n } from '../../i18n';

export function LobbyRulesModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="rules-modal-backdrop">
      <div className="modal-card rules-modal" role="dialog" aria-modal="true" aria-label={t('lobby.rulesTitle')} onClick={(event) => event.stopPropagation()}>
        <div className="rules-modal-header">
          <div className="panel-title">
            <FontAwesomeIcon icon={faBookOpen} />
            {t('lobby.rulesTitle')}
          </div>
          <button className="ghost-button rules-modal-close" onClick={onClose} aria-label={t('app.closeRules')} data-testid="close-rules">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <LobbyRules className="rules-modal-content" showHeader={false} />
      </div>
    </div>
  );
}
