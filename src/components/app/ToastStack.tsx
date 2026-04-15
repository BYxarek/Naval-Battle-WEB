import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store';

export function ToastStack() {
  const { t } = useI18n();
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
              title={t('toast.close')}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </motion.aside>
        ))}
      </AnimatePresence>
    </div>
  );
}
