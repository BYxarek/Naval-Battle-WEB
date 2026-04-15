import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faDownload, faGear } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ToastStack } from './components/app/ToastStack';
import { LobbyRulesModal } from './components/lobby/LobbyRulesModal';
import { useI18n } from './i18n';
import { useBattleGraphicsPreference } from './hooks/useBattleGraphicsPreference';
import { useLocalePreference } from './hooks/useLocalePreference';
import { useRoomSync } from './hooks/useRoomSync';
import { useSitePresence } from './hooks/useSitePresence';
import { useThemePreference } from './hooks/useThemePreference';
import { useAppStore } from './store';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function App() {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { theme, setTheme } = useThemePreference();
  const { battleGraphicsStyle, setBattleGraphicsStyle } = useBattleGraphicsPreference();
  const { locale, setLocale } = useLocalePreference();
  const { t } = useI18n();
  const room = useAppStore((state) => state.room);
  const screen = useAppStore((state) => state.screen);
  const pingMs = useAppStore((state) => state.pingMs);
  const setScreen = useAppStore((state) => state.setScreen);
  const onlineCount = useSitePresence();

  useRoomSync();

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome !== 'accepted') {
      return;
    }

    setInstallPrompt(null);
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left ambient-orb" />
      <div className="ambient ambient-right ambient-orb" />

      {!room ? (
        <header className="topbar">
          <div>
            <h1>{t('app.title')}</h1>
          </div>
          <div className="topbar-actions">
            {screen === 'lobby' ? (
              <button
                className="theme-toggle topbar-action-button topbar-mobile-only"
                onClick={() => setRulesOpen(true)}
                title={t('app.openRules')}
                data-testid="open-rules"
              >
                <FontAwesomeIcon icon={faBookOpen} />
                {t('app.rules')}
              </button>
            ) : null}
            {screen === 'lobby' ? (
              <button
                className="theme-toggle topbar-action-button"
                onClick={() => setScreen('settings')}
                title={t('app.openSettings')}
                data-testid="open-settings"
              >
                <FontAwesomeIcon icon={faGear} />
                {t('app.settings')}
              </button>
            ) : null}
          </div>
        </header>
      ) : null}

      <motion.main
        className="main-stage"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        {room ? <GameScreen room={room} battleGraphicsStyle={battleGraphicsStyle} /> : screen === 'settings' ? (
          <SettingsScreen
            theme={theme}
            battleGraphicsStyle={battleGraphicsStyle}
            locale={locale}
            onBack={() => setScreen('lobby')}
            onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            onChangeBattleGraphicsStyle={setBattleGraphicsStyle}
            onChangeLocale={setLocale}
          />
        ) : (
          <>
            <LobbyScreen onlineCount={onlineCount} />
            {installPrompt ? (
              <div className="lobby-install-row">
                <button className="secondary-button lobby-install-button" onClick={() => void handleInstallApp()} data-testid="install-pwa-button">
                  <FontAwesomeIcon icon={faDownload} />
                  {t('app.install')}
                </button>
              </div>
            ) : null}
          </>
        )}
      </motion.main>

      {!room && screen === 'lobby' && rulesOpen ? <LobbyRulesModal onClose={() => setRulesOpen(false)} /> : null}
      <ToastStack />
    </div>
  );
}
