import { faArrowLeft, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import type { AppLocale, BattleGraphicsStyle } from '../types';

export function SettingsScreen({
  theme,
  battleGraphicsStyle,
  locale,
  onBack,
  onToggleTheme,
  onChangeBattleGraphicsStyle,
  onChangeLocale,
}: {
  theme: 'light' | 'dark';
  battleGraphicsStyle: BattleGraphicsStyle;
  locale: AppLocale;
  onBack: () => void;
  onToggleTheme: () => void;
  onChangeBattleGraphicsStyle: (style: BattleGraphicsStyle) => void;
  onChangeLocale: (locale: AppLocale) => void;
}) {
  const { t } = useI18n();
  const graphicsOptions: BattleGraphicsStyle[] = ['notebook'];

  return (
    <motion.section
      className="settings-shell"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="settings-card">
        <div className="panel-row">
          <div>
            <p className="eyebrow">{t('settings.eyebrow')}</p>
            <h2 className="panel-title">{t('settings.title')}</h2>
          </div>
          <button className="ghost-button settings-back-button" onClick={onBack} data-testid="settings-back">
            <FontAwesomeIcon icon={faArrowLeft} />
            {t('settings.back')}
          </button>
        </div>

        <div className="settings-option">
          <div>
            <strong>{t('settings.themeTitle')}</strong>
            <p className="muted">{t('settings.themeDescription')}</p>
          </div>
          <button className="secondary-button settings-theme-button" onClick={onToggleTheme} data-testid="settings-toggle-theme">
            <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
            {theme === 'light' ? t('settings.themeDark') : t('settings.themeLight')}
          </button>
        </div>

        <div className="settings-option">
          <div>
            <strong>{t('settings.graphicsTitle')}</strong>
            <p className="muted">{t('settings.graphicsDescription')}</p>
          </div>
          <div className="graphics-switcher" role="radiogroup" aria-label={t('settings.graphicsTitle')}>
            {graphicsOptions.map((style) => (
              <button
                key={style}
                type="button"
                data-testid={`graphics-style-${style}`}
                className={`language-option ${battleGraphicsStyle === style ? 'active' : ''}`}
                aria-pressed={battleGraphicsStyle === style}
                onClick={() => onChangeBattleGraphicsStyle(style)}
              >
                {t(`settings.graphics.${style}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-option">
          <div>
            <strong>{t('settings.languageTitle')}</strong>
            <p className="muted">{t('settings.languageDescription')}</p>
          </div>
          <div className="language-switcher" role="radiogroup" aria-label={t('settings.languageTitle')}>
            {(['ru', 'en', 'uk'] as AppLocale[]).map((language) => (
              <button
                key={language}
                type="button"
                data-testid={`language-${language}`}
                className={`language-option ${locale === language ? 'active' : ''}`}
                aria-pressed={locale === language}
                onClick={() => onChangeLocale(language)}
              >
                {t(`settings.language.${language}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
