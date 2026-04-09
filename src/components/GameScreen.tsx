import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faBars,
  faBomb,
  faBullseye,
  faChartColumn,
  faDoorOpen,
  faCircleCheck,
  faCompassDrafting,
  faCrosshairs,
  faFlag,
  faRotate,
  faShip,
  faSkullCrossbones,
  faSpinner,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { motion } from 'motion/react';
import {
  SHIPS,
  buildBoardFromPlacements,
  canPlaceShip,
  createEmptyBoard,
  type Coord,
  type PublicBoardCell,
  type SanitizedRoomState,
  type ShipPlacement,
} from '../../shared/game';
import { cancelSetupRoom, fireShot, requestRematch, respondRematch, submitSetup, surrenderRoom } from '../api';
import { useAppStore } from '../store';
import { useEffect, useState } from 'react';
import { clearActiveRoomCode } from '../session';

function coordLabel(x: number, y: number) {
  return `${String.fromCharCode(65 + x)}${y + 1}`;
}

function Board({
  title,
  subtitle,
  icon,
  cells,
  activeCell,
  onCellClick,
  disabled = false,
  loadingText,
}: {
  title: string;
  subtitle: string;
  icon: Parameters<typeof FontAwesomeIcon>[0]['icon'];
  cells: Array<Array<{ state: string }>>;
  activeCell?: Coord;
  onCellClick?: (x: number, y: number) => void;
  disabled?: boolean;
  loadingText?: string;
}) {
  function markerForState(state: string) {
    if (state === 'miss') {
      return <span className="cell-mark cell-mark-miss" aria-hidden="true" />;
    }
    if (state === 'hit' || state === 'sunk') {
      return <span className="cell-mark cell-mark-cross" aria-hidden="true" />;
    }
    return null;
  }

  return (
    <div className="board-panel">
      <div className="board-header">
        <h3>
          <FontAwesomeIcon icon={icon} />
          {title}
        </h3>
        <p>{subtitle}</p>
      </div>

      <div className={`board ${disabled ? 'board-disabled' : ''}`}>
        {cells.flatMap((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              className={`cell cell-${cell.state} ${activeCell?.x === x && activeCell?.y === y ? 'cell-anchor' : ''}`}
              onClick={() => onCellClick?.(x, y)}
              disabled={disabled || !onCellClick}
              title={coordLabel(x, y)}
            >
              {markerForState(cell.state)}
              <span className="sr-only">{coordLabel(x, y)}</span>
            </button>
          )),
        )}
        {loadingText ? (
          <div className="board-loading">
            <span className="spinner" aria-hidden="true" />
            <span>{loadingText}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function publicCellState(cell: PublicBoardCell) {
  return cell.state;
}

function summarizeTargetBoard(board: PublicBoardCell[][]) {
  const flat = board.flat();
  const hits = flat.filter((cell) => cell.state === 'hit' || cell.state === 'sunk').length;
  const misses = flat.filter((cell) => cell.state === 'miss').length;
  const shots = hits + misses;
  const sunkDecks = flat.filter((cell) => cell.state === 'sunk').length;
  return {
    hits,
    misses,
    shots,
    sunkDecks,
    accuracy: shots > 0 ? Math.round((hits / shots) * 100) : 0,
  };
}

const SHIP_GROUPS = [
  { key: 'deck4', label: 'Четырёхпалубный', length: 4, total: 1 },
  { key: 'deck3', label: 'Трёхпалубный', length: 3, total: 2 },
  { key: 'deck2', label: 'Двухпалубный', length: 2, total: 3 },
  { key: 'deck1', label: 'Однопалубный', length: 1, total: 4 },
] as const;

export function GameScreen({ room }: { room: SanitizedRoomState }) {
  const [busyAction, setBusyAction] = useState<'clear' | null>(null);
  const [directionHintShown, setDirectionHintShown] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const draftPlacements = useAppStore((state) => state.draftPlacements);
  const selectedShipId = useAppStore((state) => state.selectedShipId);
  const pendingPlacementStart = useAppStore((state) => state.pendingPlacementStart);
  const setDraftPlacements = useAppStore((state) => state.setDraftPlacements);
  const setSelectedShipId = useAppStore((state) => state.setSelectedShipId);
  const setPendingPlacementStart = useAppStore((state) => state.setPendingPlacementStart);
  const setError = useAppStore((state) => state.setError);
  const notifySuccess = useAppStore((state) => state.notifySuccess);
  const resetDraft = useAppStore((state) => state.resetDraft);

  const you = room.players.find((player) => player.isYou);
  const opponent = room.players.find((player) => !player.isYou);

  if (!you) return null;
  const currentPlayer = you;

  const localBoard =
    draftPlacements.length > 0 ? buildBoardFromPlacements(draftPlacements) : createEmptyBoard();
  const activeShip = SHIPS.find((ship) => ship.id === selectedShipId) ?? null;
  const shipGroups = SHIP_GROUPS.map((group) => {
    const remainingShips = SHIPS.filter(
      (ship) =>
        ship.length === group.length && !draftPlacements.some((placement) => placement.shipId === ship.id),
    );

    return {
      ...group,
      remaining: remainingShips.length,
      nextShipId: remainingShips[0]?.id,
      isActive: activeShip?.length === group.length,
    };
  });

  useEffect(() => {
    if (room.phase === 'finished') {
      return;
    }

    if (currentPlayer.ready && currentPlayer.ownBoard.ships.length > 0) {
      setDraftPlacements(currentPlayer.ownBoard.ships);
      return;
    }

    if (
      room.phase === 'setup' &&
      !currentPlayer.ready &&
      currentPlayer.ownBoard.ships.length === 0 &&
      room.lastAction?.includes('перезапущен')
    ) {
      resetDraft();
    }
  }, [
    currentPlayer.ownBoard.ships,
    currentPlayer.ready,
    resetDraft,
    room.lastAction,
    room.phase,
    setDraftPlacements,
  ]);

  useEffect(() => {
    if (!selectedShipId) {
      setPendingPlacementStart(undefined);
    }
  }, [selectedShipId, setPendingPlacementStart]);

  useEffect(() => {
    setDirectionHintShown(false);
  }, [room.code]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [room.code, room.phase]);

  useEffect(() => {
    if (
      room.phase === 'setup' &&
      currentPlayer.ownBoard.ships.length === 0 &&
      (room.lastAction?.includes('перезапущен') || room.lastAction?.includes('согласился на реванш'))
    ) {
      setDirectionHintShown(false);
    }
  }, [currentPlayer.ownBoard.ships.length, room.lastAction, room.phase]);

  function directionFromClicks(start: Coord, end: Coord): ShipPlacement['orientation'] | 'left' | 'up' | undefined {
    if (start.x === end.x && Math.abs(start.y - end.y) === 1) {
      return end.y > start.y ? 'vertical' : 'up';
    }
    if (start.y === end.y && Math.abs(start.x - end.x) === 1) {
      return end.x > start.x ? 'horizontal' : 'left';
    }
    return undefined;
  }

  function buildPlacementFromDirection(ship: (typeof SHIPS)[number], start: Coord, end: Coord): ShipPlacement | undefined {
    const direction = directionFromClicks(start, end);
    if (!direction) {
      return undefined;
    }

    if (direction === 'horizontal') {
      return {
        shipId: ship.id,
        length: ship.length,
        orientation: 'horizontal',
        start,
      };
    }

    if (direction === 'vertical') {
      return {
        shipId: ship.id,
        length: ship.length,
        orientation: 'vertical',
        start,
      };
    }

    if (direction === 'left') {
      return {
        shipId: ship.id,
        length: ship.length,
        orientation: 'horizontal',
        start: { x: start.x - (ship.length - 1), y: start.y },
      };
    }

    return {
      shipId: ship.id,
      length: ship.length,
      orientation: 'vertical',
      start: { x: start.x, y: start.y - (ship.length - 1) },
    };
  }

  function handlePlaceShip(x: number, y: number) {
    if (room.phase !== 'setup' || currentPlayer.ready || isSetupBusy) return;
    if (!activeShip) {
      setError('Сначала выберите корабль слева.');
      return;
    }

    if (activeShip.length === 1) {
      const placement: ShipPlacement = {
        shipId: activeShip.id,
        length: activeShip.length,
        orientation: 'horizontal',
        start: { x, y },
      };
      const validation = canPlaceShip(draftPlacements, placement);
      if (!validation.valid) {
        setError(validation.reason);
        return;
      }

      const next = [...draftPlacements.filter((entry) => entry.shipId !== activeShip.id), placement];
      const nextSameTypeShip = SHIPS.find(
        (ship) =>
          ship.length === activeShip.length &&
          !next.some((entry) => entry.shipId === ship.id),
      );
      setDraftPlacements(next);
      setSelectedShipId(nextSameTypeShip?.id);
      setPendingPlacementStart(undefined);
      setError(undefined);
      return;
    }

    if (!pendingPlacementStart) {
      setPendingPlacementStart({ x, y });
      if (!directionHintShown) {
        notifySuccess('Выберите соседнюю клетку, чтобы задать направление корабля.');
        setDirectionHintShown(true);
      }
      return;
    }

    if (pendingPlacementStart.x === x && pendingPlacementStart.y === y) {
      setPendingPlacementStart(undefined);
      setError(undefined);
      return;
    }

    const placement = buildPlacementFromDirection(activeShip, pendingPlacementStart, { x, y });
    if (!placement) {
      setError('Вторая клетка должна быть соседней по вертикали или горизонтали.');
      return;
    }

    const validation = canPlaceShip(draftPlacements, placement);
    if (!validation.valid) {
      setError(validation.reason);
      setPendingPlacementStart(undefined);
      return;
    }

    const next = [...draftPlacements.filter((entry) => entry.shipId !== activeShip.id), placement];
    const nextSameTypeShip = SHIPS.find(
      (ship) =>
        ship.length === activeShip.length &&
        !next.some((entry) => entry.shipId === ship.id),
    );
    setError(undefined);
    setDraftPlacements(next);
    setSelectedShipId(nextSameTypeShip?.id);
    setPendingPlacementStart(undefined);
  }

  async function submitPlacements() {
    if (draftPlacements.length !== SHIPS.length) {
      setError('Нужно поставить все пять кораблей.');
      return;
    }
    try {
      const nextRoom = await submitSetup(room.code, draftPlacements);
      useAppStore.getState().setRoom(nextRoom);
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не удалось подтвердить расстановку.');
    }
  }

  const isYourTurn = room.currentTurnPlayerId === currentPlayer.id;
  const winner = room.players.find((player) => player.id === room.winnerId);
  const isSetupBusy = room.phase === 'setup' && busyAction !== null;
  const isRematchRequester = room.rematchRequesterId === currentPlayer.id;
  const hasIncomingRematchRequest =
    room.phase === 'finished' &&
    !!room.rematchRequesterId &&
    room.rematchRequesterId !== currentPlayer.id;
  const youStats = summarizeTargetBoard(currentPlayer.targetBoard);
  const opponentStats = opponent ? summarizeTargetBoard(opponent.targetBoard) : null;
  const placementInstruction = activeShip?.length === 1 ? 'Выберите тип, затем 1 клетку' : 'Выберите тип, затем 2 клетки';
  const phaseLabel =
    room.phase === 'setup'
      ? 'Расстановка флота'
      : room.phase === 'battle'
        ? 'Боевой раунд'
        : room.phase === 'finished'
          ? 'Матч завершён'
          : 'Комната';

  return (
    <section className="game-layout">
      <aside className={`sidebar ${mobileSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="mobile-sidebar-header">
          <p className="eyebrow">Меню матча</p>
          <button
            className="ghost-button mobile-sidebar-close"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Закрыть меню матча"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="panel cardless">
          <p className="eyebrow">Комната</p>
          <h2 className="panel-title">
            <FontAwesomeIcon icon={faUsers} />
            {room.code}
          </h2>
          <p className="muted">
            {opponent ? `Соперник: ${opponent.name}` : 'Ожидание второго игрока.'}
          </p>
          <p className="event-line">{room.lastAction ?? 'Подготовьте флот.'}</p>
        </div>

        <div className="panel ship-panel">
          <div className="panel-row">
            <h3 className="section-title">
              <FontAwesomeIcon icon={faShip} />
              Флот
            </h3>
            <div className="ghost-button ship-hint">
                <FontAwesomeIcon icon={faRotate} />
                {placementInstruction}
            </div>
          </div>

          <div className="ship-list">
            {shipGroups.map((group) => {
              const complete = group.remaining === 0;
              return (
                <button
                  key={group.key}
                  className={`ship-chip ship-group-chip ${group.isActive ? 'active' : ''} ${complete ? 'placed' : ''}`}
                  onClick={() => {
                    if (isSetupBusy) {
                      return;
                    }
                    if (!group.nextShipId) {
                      return;
                    }
                    setSelectedShipId(group.nextShipId);
                    setPendingPlacementStart(undefined);
                    setError(undefined);
                  }}
                  disabled={currentPlayer.ready || room.phase !== 'setup' || !group.nextShipId || isSetupBusy}
                >
                  <span>{group.label}</span>
                  <strong>{group.remaining} из {group.total}</strong>
                </button>
              );
            })}
          </div>

          <div className="panel-actions">
            <button
              className="secondary-button"
              onClick={async () => {
                setBusyAction('clear');
                setError(undefined);
                await new Promise((resolve) => window.setTimeout(resolve, 180));
                resetDraft();
                setBusyAction(null);
              }}
              disabled={currentPlayer.ready || isSetupBusy}
            >
              <FontAwesomeIcon icon={isSetupBusy && busyAction === 'clear' ? faSpinner : faArrowsRotate} spin={isSetupBusy && busyAction === 'clear'} />
              {isSetupBusy && busyAction === 'clear' ? 'Очищаем' : 'Очистить'}
            </button>
            <button className="primary-button" onClick={() => void submitPlacements()} disabled={currentPlayer.ready || isSetupBusy}>
              <FontAwesomeIcon icon={faCircleCheck} />
              {currentPlayer.ready ? 'Готов' : 'Подтвердить'}
            </button>
            {room.phase === 'setup' ? (
              <button
                className="danger-button"
                onClick={async () => {
                  if (isSetupBusy) {
                    return;
                  }
                  try {
                    await cancelSetupRoom(room.code);
                    clearActiveRoomCode();
                    resetDraft();
                    useAppStore.getState().setRoom(undefined);
                    setError(undefined);
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'Не удалось отменить игру.');
                  }
                }}
              >
                <FontAwesomeIcon icon={faDoorOpen} />
                Отменить игру
              </button>
            ) : null}
          </div>
        </div>

        <div className="panel status-stack">
          {room.players.map((player) => (
            <div key={player.id} className="status-line">
              <strong>{player.name}</strong>
              <span>{player.ready ? 'Готов' : 'Ставит флот'}</span>
              <span>Потоплено: {player.sunkShips.length}/5</span>
            </div>
          ))}
        </div>

        {room.phase === 'battle' ? (
          <div className="panel">
            <div className="panel-row panel-row-spread">
              <h3 className="section-title">
                <FontAwesomeIcon icon={faFlag} />
                Действия
              </h3>
              <button
                className="danger-button"
                onClick={async () => {
                  try {
                    const nextRoom = await surrenderRoom(room.code);
                    useAppStore.getState().setRoom(nextRoom);
                    setError(undefined);
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'Не удалось сдаться.');
                  }
                }}
              >
                <FontAwesomeIcon icon={faFlag} />
                Сдаться
              </button>
            </div>
          </div>
        ) : null}

      </aside>

      <motion.div
        className="battlefield"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.03 }}
      >
        <div className="battle-state">
          <div className="battle-heading">
            <h2>
              <FontAwesomeIcon icon={room.phase === 'battle' ? faCrosshairs : faCompassDrafting} />
              {room.phase === 'battle'
                ? isYourTurn
                  ? 'Ваш выстрел'
                  : 'Ожидайте ход соперника'
                : room.phase === 'setup'
                  ? 'Расставьте корабли'
                  : 'Матч завершён'}
            </h2>
            <div className="battle-heading-actions">
              <div className="status-pill battle-pill">
                {phaseLabel} • {room.code}
              </div>
              <button
                className="ghost-button mobile-sidebar-toggle"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Открыть меню матча"
              >
                <FontAwesomeIcon icon={faBars} />
                Меню
              </button>
            </div>
          </div>
          <p className="eyebrow">Статус хода</p>
        </div>

        <div className="boards-grid">
          <Board
            title="Ваше поле"
            icon={faShip}
            subtitle={
              currentPlayer.ready
                ? 'Флот подтверждён'
                : isSetupBusy
                  ? 'Очищаем поле'
                : activeShip?.length === 1
                  ? 'Нажмите на клетку, чтобы поставить корабль'
                : pendingPlacementStart
                  ? 'Выберите соседнюю клетку для направления'
                  : activeShip
                    ? `Выбран: ${shipGroups.find((group) => group.length === activeShip.length)?.label ?? activeShip.label}`
                    : 'Сначала выберите корабль слева'
            }
            activeCell={pendingPlacementStart}
            cells={(room.phase === 'setup' && !currentPlayer.ready ? localBoard.cells : currentPlayer.ownBoard.cells).map((row) =>
              row.map((cell) => ({ state: cell.state })),
            )}
            disabled={isSetupBusy || (room.phase === 'setup' && !currentPlayer.ready && !activeShip && !pendingPlacementStart)}
            loadingText={
              isSetupBusy
                ? 'Очищаем поле'
                : undefined
            }
            onCellClick={room.phase === 'setup' && !currentPlayer.ready ? handlePlaceShip : undefined}
          />

          <Board
            title="Радар"
            icon={faBomb}
            subtitle={
              room.phase === 'battle'
                ? isYourTurn
                  ? 'Выберите цель'
                  : 'Сейчас стреляет соперник'
                : 'Поле откроется после старта матча'
            }
            cells={currentPlayer.targetBoard.map((row) => row.map((cell) => ({ state: publicCellState(cell) })))}
            disabled={room.phase !== 'battle' || !isYourTurn}
            loadingText={
              room.phase === 'battle' && !isYourTurn
                ? 'Сейчас ход противника'
                : undefined
            }
            onCellClick={async (x, y) => {
              if (room.phase !== 'battle' || !isYourTurn) return;
              try {
                const nextRoom = await fireShot(room.code, { x, y });
                useAppStore.getState().setRoom(nextRoom);
                if (nextRoom.lastAction?.includes('корабль потоплен')) {
                  notifySuccess('Корабль противника потоплен.');
                }
                setError(undefined);
              } catch (error) {
                setError(error instanceof Error ? error.message : 'Не удалось выполнить выстрел.');
              }
            }}
          />
        </div>
      </motion.div>

      {room.phase === 'finished' ? (
        <div className="modal-backdrop">
          <div className="modal-card result-modal">
            <p className="eyebrow">Финал</p>
            <h3 className="result-title">
              <FontAwesomeIcon icon={winner?.isYou ? faBullseye : faSkullCrossbones} />
              {winner?.isYou ? 'Победа' : 'Поражение'}
            </h3>
            <p>{winner ? `Победитель: ${winner.name}` : 'Матч завершён.'}</p>
            <div className="stats-grid">
              <div className="stats-card">
                <div className="stats-title">
                  <FontAwesomeIcon icon={faChartColumn} />
                  {currentPlayer.name}
                </div>
                <span>Ходы: {youStats.shots}</span>
                <span>Попадания: {youStats.hits}</span>
                <span>Промахи: {youStats.misses}</span>
                <span>Потоплено кораблей: {opponent?.sunkShips.length ?? 0}</span>
                <span>Точность: {youStats.accuracy}%</span>
              </div>
              {opponent ? (
                <div className="stats-card">
                  <div className="stats-title">
                    <FontAwesomeIcon icon={faChartColumn} />
                    {opponent.name}
                  </div>
                  <span>Ходы: {opponentStats?.shots ?? 0}</span>
                  <span>Попадания: {opponentStats?.hits ?? 0}</span>
                  <span>Промахи: {opponentStats?.misses ?? 0}</span>
                  <span>Потоплено кораблей: {currentPlayer.sunkShips.length}</span>
                  <span>Точность: {opponentStats?.accuracy ?? 0}%</span>
                </div>
              ) : null}
            </div>

            {hasIncomingRematchRequest && opponent ? (
              <>
                <div className="result-divider" />
                <p className="eyebrow">Реванш</p>
                <p>{opponent.name} предлагает сыграть ещё раз.</p>
                <div className="modal-actions">
                  <button
                    className="primary-button"
                    onClick={async () => {
                      try {
                        const nextRoom = await respondRematch(room.code, 'accept');
                        useAppStore.getState().setRoom(nextRoom);
                        resetDraft();
                        notifySuccess('Реванш принят. Расставьте флот заново.');
                      } catch (error) {
                        setError(error instanceof Error ? error.message : 'Не удалось принять реванш.');
                      }
                    }}
                  >
                    Согласиться
                  </button>
                  <button
                    className="danger-button"
                    onClick={async () => {
                      try {
                        const nextRoom = await respondRematch(room.code, 'decline');
                        notifySuccess(nextRoom.lastAction ?? 'Реванш отклонён.');
                        clearActiveRoomCode();
                        useAppStore.getState().setRoom(undefined);
                      } catch (error) {
                        setError(error instanceof Error ? error.message : 'Не удалось отклонить реванш.');
                      }
                    }}
                  >
                    Отказаться
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="result-divider" />
                <button
                  className="primary-button"
                  onClick={async () => {
                    try {
                      const nextRoom = await requestRematch(room.code);
                      useAppStore.getState().setRoom(nextRoom);
                      notifySuccess('Запрос на реванш отправлен сопернику.');
                    } catch (error) {
                      setError(error instanceof Error ? error.message : 'Не удалось запросить реванш.');
                    }
                  }}
                  disabled={!!room.rematchRequesterId}
                >
                  <FontAwesomeIcon icon={faArrowsRotate} />
                  {isRematchRequester ? 'Ожидаем ответ' : room.rematchRequesterId ? 'Реванш запрошен' : 'Запросить реванш'}
                </button>
                {isRematchRequester ? <p className="muted">Ожидаем согласие соперника на новый матч.</p> : null}
              </>
            )}
          </div>
        </div>
      ) : null}

      {mobileSidebarOpen ? <button className="mobile-sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} aria-label="Закрыть меню матча" /> : null}
    </section>
  );
}
