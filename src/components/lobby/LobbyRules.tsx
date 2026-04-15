import { motion } from 'motion/react';
import { useI18n } from '../../i18n';

export function LobbyRules({ className = '', showHeader = true }: { className?: string; showHeader?: boolean }) {
  const { t } = useI18n();
  return (
    <motion.div
      className={['hero-copy', className].filter(Boolean).join(' ')}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: 0.02 }}
    >
      {showHeader ? <p className="eyebrow">{t('lobby.rulesEyebrow')}</p> : null}
      {showHeader ? <h2>{t('lobby.rulesTitle')}</h2> : null}
      <div className="rules-list">
        <p><strong>1.</strong> {t('lobby.rule1')}</p>
        <p><strong>2.</strong> {t('lobby.rule2')}</p>
        <p><strong>3.</strong> {t('lobby.rule3')}</p>
        <p><strong>4.</strong> {t('lobby.rule4')}</p>
        <p><strong>5.</strong> {t('lobby.rule5')}</p>
      </div>
    </motion.div>
  );
}
