import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDoorOpen,
  faHashtag,
  faShip,
  faUserAstronaut,
} from '@fortawesome/free-solid-svg-icons';
import { motion } from 'motion/react';
import { createRoom, joinRoom } from '../api';
import { useAppStore } from '../store';

export function LobbyScreen() {
  const name = useAppStore((state) => state.name);
  const roomCodeInput = useAppStore((state) => state.roomCodeInput);
  const setName = useAppStore((state) => state.setName);
  const setRoomCodeInput = useAppStore((state) => state.setRoomCodeInput);
  const setError = useAppStore((state) => state.setError);

  const safeName = name.trim();

  function ensureName(): boolean {
    if (!safeName) {
      setError('Введите имя капитана.');
      return false;
    }
    return true;
  }

  return (
    <section className="hero-grid">
      <motion.div
        className="hero-copy"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, delay: 0.02 }}
      >
        <p className="eyebrow">Правила игры</p>
        <h2>Как проходит матч</h2>
        <div className="rules-list">
          <p><strong>1.</strong> Каждый игрок расставляет флот на поле 10x10, не касаясь другими кораблями даже по диагонали.</p>
          <p><strong>2.</strong> Состав флота: 1 корабль на 4 клетки, 2 на 3 клетки, 3 на 2 клетки и 4 на 1 клетку.</p>
          <p><strong>3.</strong> После расстановки игроки по очереди стреляют по полю соперника.</p>
          <p><strong>4.</strong> Если вы попали или потопили корабль, ход остаётся у вас. После промаха ход переходит сопернику.</p>
          <p><strong>5.</strong> Побеждает тот, кто первым уничтожит весь вражеский флот.</p>
        </div>
      </motion.div>

      <motion.div
        className="control-panel"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, delay: 0.05 }}
      >
        <label className="field" htmlFor="captain-name">
          <span>Имя капитана</span>
          <div className="input-shell">
            <FontAwesomeIcon icon={faUserAstronaut} className="field-icon" />
            <input
              id="captain-name"
              name="captain_name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например, Нахимов"
              maxLength={24}
            />
          </div>
        </label>

        <div className="actions">
          <button
            className="primary-button"
            onClick={async () => {
              if (!ensureName()) return;
              try {
                const room = await createRoom(safeName);
                useAppStore.getState().setRoom(room);
                useAppStore.getState().setConnectionStatus('connected');
                setError(undefined);
              } catch (error) {
                setError(error instanceof Error ? error.message : 'Не удалось создать комнату.');
              }
            }}
          >
            <FontAwesomeIcon icon={faShip} />
            Создать комнату
          </button>
        </div>

        <div className="join-row">
          <label className="field compact" htmlFor="room-code">
            <span>Код комнаты</span>
            <div className="input-shell">
              <FontAwesomeIcon icon={faHashtag} className="field-icon" />
              <input
                id="room-code"
                name="room_code"
                autoComplete="off"
                value={roomCodeInput}
                onChange={(event) =>
                  setRoomCodeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                }
                placeholder="ABCDE"
                maxLength={5}
              />
            </div>
          </label>

          <button
            className="secondary-button"
            onClick={async () => {
              if (!ensureName()) return;
              try {
                const room = await joinRoom(safeName, roomCodeInput);
                useAppStore.getState().setRoom(room);
                useAppStore.getState().setConnectionStatus('connected');
                setError(undefined);
              } catch (error) {
                setError(error instanceof Error ? error.message : 'Не удалось войти в комнату.');
              }
            }}
          >
            <FontAwesomeIcon icon={faDoorOpen} />
            Войти
          </button>
        </div>
      </motion.div>
    </section>
  );
}
