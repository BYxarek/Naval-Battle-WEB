import { faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import {
  SHIPS,
  type SanitizedRoomState,
  type ShipPlacement,
} from '../../shared/game';
import { useI18n } from '../i18n';
import { useAppStore } from '../store';
import { buildInviteLink } from '../session';
import { BattleHeader } from './game/BattleHeader';
import { GameSidebar } from './game/GameSidebar';
import { OpponentBoards } from './game/OpponentBoards';
import { PlayerBoardPanel } from './game/PlayerBoardPanel';
import { ResultModal } from './game/ResultModal';
import { summarizeTargetBoards } from './game/utils';
import { useGameActions } from './game/useGameActions';
import { useGameScreenState } from './game/useGameScreenState';
import type { BattleGraphicsStyle } from '../types';

type FlashTone = 'miss' | 'hit' | 'sunk';

export function GameScreen({ room, battleGraphicsStyle }: { room: SanitizedRoomState; battleGraphicsStyle: BattleGraphicsStyle }) {
  const { t } = useI18n();
  const [shipMenu, setShipMenu] = useState<{ x: number; y: number; shipId: ShipPlacement['shipId'] } | undefined>(undefined);
  const [cellFlashes, setCellFlashes] = useState<Record<string, FlashTone>>({});
  const ignoreNextCellClickRef = useRef(false);
  const previousRoomRef = useRef<SanitizedRoomState | undefined>(undefined);
  const {
    busyAction,
    setBusyAction,
    directionHintShown,
    setDirectionHintShown,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    setHoveredCell,
    draftPlacements,
    pendingPlacementStart,
    setPendingPlacementStart,
    currentPlayer,
    opponents,
    activeShip,
    shipGroups,
    isSetupBusy,
    isYourTurn,
    allowedTargetId,
    allowedTarget,
    youStats,
    placementInstruction,
    turnTimerLabel,
    isTimerDanger,
    yourBoardCells,
  } = useGameScreenState(room);
  const setSelectedShipId = useAppStore((state) => state.setSelectedShipId);
  const setError = useAppStore((state) => state.setError);
  const winner = room.players.find((player) => player.id === room.winnerId);
  const isRematchRequester = room.rematchRequesterId === currentPlayer.id;
  const hasIncomingRematchRequest = room.phase === 'finished' && !!room.rematchRequesterId && room.rematchRequesterId !== currentPlayer.id;
  const rematchRequester = room.players.find((player) => player.id === room.rematchRequesterId);
  const {
    leaveToMenu,
    handlePlaceShip,
    handleSubmitPlacements,
    handleAutoPlaceShips,
    handleFire,
    handleClearDraft,
    handleCancelGame,
    handleSurrender,
    handleAcceptRematch,
    handleDeclineRematch,
    handleRequestRematch,
    handleRemovePlacedShip,
  } = useGameActions({
    room,
    currentPlayer,
    activeShip,
    draftPlacements,
    pendingPlacementStart,
    directionHintShown,
    setBusyAction,
    setDirectionHintShown,
    setPendingPlacementStart,
  });

  useEffect(() => {
    const previousRoom = previousRoomRef.current;
    const nextPlayer = room.players.find((player) => player.isYou) ?? room.players.find((player) => player.id === room.youPlayerId);
    const previousPlayer = previousRoom?.players.find((player) => player.id === nextPlayer?.id);

    if (!previousRoom || !nextPlayer || !previousPlayer) {
      previousRoomRef.current = room;
      return;
    }

    const pendingFlashes: Array<{ key: string; tone: FlashTone }> = [];

    const registerBoardDiff = (
      boardKey: string,
      previousCells: Array<Array<{ state: string }>> | undefined,
      nextCells: Array<Array<{ state: string }>> | undefined,
    ) => {
      if (!previousCells || !nextCells) {
        return;
      }

      for (let y = 0; y < nextCells.length; y += 1) {
        for (let x = 0; x < nextCells[y].length; x += 1) {
          const previousState = previousCells[y]?.[x]?.state;
          const nextState = nextCells[y]?.[x]?.state;
          if (previousState === nextState) {
            continue;
          }
          if (nextState === 'miss' || nextState === 'hit' || nextState === 'sunk') {
            pendingFlashes.push({
              key: `${boardKey}:${x}:${y}`,
              tone: nextState,
            });
          }
        }
      }
    };

    registerBoardDiff('self', previousPlayer.ownBoard.cells, nextPlayer.ownBoard.cells);

    for (const opponent of room.players.filter((player) => !player.isYou)) {
      registerBoardDiff(
        opponent.id,
        previousPlayer.targetBoards[opponent.id],
        nextPlayer.targetBoards[opponent.id],
      );
    }

    if (pendingFlashes.length > 0) {
      const nextFlashes = Object.fromEntries(pendingFlashes.map((flash) => [flash.key, flash.tone])) as Record<string, FlashTone>;
      setCellFlashes((current) => ({ ...current, ...nextFlashes }));

      const keys = pendingFlashes.map((flash) => flash.key);
      window.setTimeout(() => {
        setCellFlashes((current) => {
          const next = { ...current };
          for (const key of keys) {
            delete next[key];
          }
          return next;
        });
      }, 900);
    }

    previousRoomRef.current = room;
  }, [room]);

  function closeMobileSidebar() {
    setMobileSidebarOpen(false);
  }

  function closeMobileSidebarIfNeeded() {
    if (window.matchMedia('(max-width: 640px)').matches) {
      closeMobileSidebar();
    }
  }

  async function handleInviteFriend() {
    const inviteLink = buildInviteLink(room.code);

    try {
      await navigator.clipboard.writeText(inviteLink);
      useAppStore.getState().notifySuccess(t('game.inviteCopied'));
    } catch {
      useAppStore.getState().setError(t('game.inviteCopyFailed', { link: inviteLink }));
    }
  }

  function maybeOpenShipMenu(x: number, y: number) {
    if (room.phase !== 'setup' || currentPlayer.ready) {
      return false;
    }

    const clickedCell = yourBoardCells[y]?.[x];
    if (!clickedCell?.shipId) {
      return false;
    }

    setShipMenu((current) =>
      current?.x === x && current?.y === y
        ? undefined
        : { x, y, shipId: clickedCell.shipId as ShipPlacement['shipId'] },
    );
    setPendingPlacementStart(undefined);
    setError(undefined);
    return true;
  }

  const enhancedYourBoardCells = yourBoardCells.map((row, y) =>
    row.map((cell, x) => ({
      ...cell,
      className: [cell.className, cellFlashes[`self:${x}:${y}`] ? `cell-flash-${cellFlashes[`self:${x}:${y}`]}` : undefined]
        .filter(Boolean)
        .join(' ') || undefined,
    })),
  );

  return (
    <section className="game-layout" data-battle-style={battleGraphicsStyle}>
      <GameSidebar
        room={room}
        currentPlayer={currentPlayer}
        shipGroups={shipGroups}
        mobileSidebarOpen={mobileSidebarOpen}
        placementInstruction={placementInstruction}
        isSetupBusy={isSetupBusy}
        busyAction={busyAction}
        onInviteFriend={() => void handleInviteFriend()}
        onCloseMenu={closeMobileSidebar}
        onSelectShip={(shipId) => {
          if (!isSetupBusy) {
            setSelectedShipId(shipId as ShipPlacement['shipId']);
            setPendingPlacementStart(undefined);
            setError(undefined);
            setShipMenu(undefined);
            closeMobileSidebarIfNeeded();
          }
        }}
        onAutoPlaceShips={() => void handleAutoPlaceShips()}
        onClearDraft={async () => {
          await handleClearDraft();
          setShipMenu(undefined);
          closeMobileSidebarIfNeeded();
        }}
        onSubmitPlacements={() => void handleSubmitPlacements()}
        onCancelGame={() => void handleCancelGame()}
        onSurrender={() => void handleSurrender()}
      />

      <motion.div className="battlefield" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.03 }}>
        <BattleHeader room={room} isYourTurn={isYourTurn} turnTimerLabel={turnTimerLabel} isTimerDanger={isTimerDanger} onOpenMenu={() => setMobileSidebarOpen(true)} />

        <div className="boards-grid">
          <PlayerBoardPanel
            room={room}
            currentPlayer={currentPlayer}
            activeShip={activeShip}
            shipGroups={shipGroups}
            pendingPlacementStart={pendingPlacementStart}
            isSetupBusy={isSetupBusy}
            yourBoardCells={enhancedYourBoardCells}
            onCellHover={room.phase === 'setup' && !currentPlayer.ready ? setHoveredCell : undefined}
            onCellMouseDown={room.phase === 'setup' && !currentPlayer.ready ? (x, y) => {
              if (maybeOpenShipMenu(x, y)) {
                ignoreNextCellClickRef.current = true;
              }
            } : undefined}
            onCellClick={room.phase === 'setup' && !currentPlayer.ready ? (x, y) => {
              if (ignoreNextCellClickRef.current) {
                ignoreNextCellClickRef.current = false;
                return;
              }

              if (maybeOpenShipMenu(x, y)) {
                return;
              }

              setShipMenu(undefined);
              void handlePlaceShip(x, y, isSetupBusy);
            } : undefined}
            overlay={shipMenu ? {
              coord: shipMenu,
              content: (
                <div className="ship-context-menu" role="dialog" aria-label={t('game.shipMenuLabel')}>
                  <button
                    className="ghost-button ship-context-close"
                    onClick={() => setShipMenu(undefined)}
                    aria-label={t('game.closeShipMenu')}
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                  <button
                    className="danger-button ship-context-action"
                    aria-label={t('game.removeShip')}
                    onClick={() => {
                      handleRemovePlacedShip(shipMenu.shipId);
                      setShipMenu(undefined);
                    }}
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              ),
            } : undefined}
          />
          {room.phase === 'setup' && !currentPlayer.ready && draftPlacements.length === SHIPS.length ? (
            <button
              type="button"
              className="primary-button mobile-ready-button"
              onClick={() => void handleSubmitPlacements()}
            >
              {t('game.done')}
            </button>
          ) : null}
          <OpponentBoards
            room={room}
            currentPlayer={currentPlayer}
            opponents={opponents}
            isYourTurn={isYourTurn}
            allowedTargetId={allowedTargetId}
            allowedTarget={allowedTarget}
            flashCells={cellFlashes}
            onFire={(opponent, x, y) => void handleFire(opponent, x, y)}
          />
        </div>
      </motion.div>

      {room.phase === 'finished' ? (
        <ResultModal
          room={room}
          currentPlayer={currentPlayer}
          opponents={opponents}
          winner={winner}
          youStats={youStats}
          isRematchRequester={isRematchRequester}
          hasIncomingRematchRequest={hasIncomingRematchRequest}
          rematchRequester={rematchRequester}
          getOpponentStats={(opponentId) => summarizeTargetBoards(room.players.find((player) => player.id === opponentId)?.targetBoards ?? {})}
          onAcceptRematch={() => void handleAcceptRematch()}
          onDeclineRematch={() => void handleDeclineRematch()}
          onRequestRematch={() => void handleRequestRematch()}
          onExitToMenu={leaveToMenu}
        />
      ) : null}

      {mobileSidebarOpen ? <button className="mobile-sidebar-backdrop" onClick={closeMobileSidebar} aria-label={t('game.closeMatchMenu')} /> : null}
    </section>
  );
}
