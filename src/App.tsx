import { AnimatePresence, motion } from 'motion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { useRoomSync } from './hooks/useRoomSync';
import { useAppStore } from './store';

function ToastStack() {
  const notifications = useAppStore((state) => state.notifications);
  const dismissNotification = useAppStore((state) => state.dismissNotification);

  useEffect(() => {
    if (notifications.length === 0) {
      return;
    }

    const timers = notifications.map((notification) =>
      window.setTimeout(() => {
        dismissNotification(notification.id);
      }, 4500),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [dismissNotification, notifications]);

  return (
    <div className="toast-stack">
      <AnimatePresence>
        {notifications.map((notification) => (
        <motion.aside
          key={notification.id}
          className={`toast toast-${notification.tone}`}
          initial={{ opacity: 0, x: 10, y: 6 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 10, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          <span>{notification.message}</span>
          <button
            className="toast-close"
            onClick={() => dismissNotification(notification.id)}
            title="Закрыть уведомление"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </motion.aside>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = window.localStorage.getItem('theme-preference');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const room = useAppStore((state) => state.room);

  useRoomSync();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme-preference', theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <div className="ambient ambient-left ambient-orb" />
      <div className="ambient ambient-right ambient-orb" />

      {!room ? (
        <header className="topbar">
          <div>
            <h1>Морской Бой</h1>
          </div>
          <div className="topbar-actions">
            <button
              className="theme-toggle"
              onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
              title={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
            >
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
              {theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            </button>
          </div>
        </header>
      ) : null}

      <motion.main
        className="main-stage"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        {room ? <GameScreen room={room} /> : <LobbyScreen />}
      </motion.main>

      <ToastStack />
    </div>
  );
}
