import { useEffect, useState } from 'react';
import {
  SHIPS,
  TURN_DURATION_MS,
  buildBoardFromPlacements,
  canPlaceShip,
  createEmptyBoard,
  placementCells,
  type Coord,
  type SanitizedRoomState,
  type ShipPlacement,
} from '../../../shared/game';
import { useI18n } from '../../i18n';
import { clearPersistedDraftPlacements, getPersistedDraftPlacements, setPersistedDraftPlacements } from '../../session';
import { useAppStore } from '../../store';
import { allowedTargetPlayerIdForView, buildPlacementFromDirection, getShipGroups, summarizeTargetBoards } from './utils';

export function useGameScreenState(room: SanitizedRoomState) {
  const { locale, t } = useI18n();
  const [busyAction, setBusyAction] = useState<'clear' | 'auto' | null>(null);
  const [directionHintShown, setDirectionHintShown] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<Coord | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  const draftPlacements = useAppStore((state) => state.draftPlacements);
  const selectedShipId = useAppStore((state) => state.selectedShipId);
  const pendingPlacementStart = useAppStore((state) => state.pendingPlacementStart);
  const setDraftPlacements = useAppStore((state) => state.setDraftPlacements);
  const setPendingPlacementStart = useAppStore((state) => state.setPendingPlacementStart);
  const resetDraft = useAppStore((state) => state.resetDraft);
  const currentPlayer = room.players.find((player) => player.isYou)
    ?? room.players.find((player) => player.id === room.youPlayerId)
    ?? room.players[0];

  if (!currentPlayer) {
    throw new Error('В комнате нет игроков.');
  }

  const currentPlayerBoard = currentPlayer.ownBoard ?? createEmptyBoard();
  const opponents = room.players.filter((player) => !player.isYou);
  const localBoard = draftPlacements.length > 0 ? buildBoardFromPlacements(draftPlacements) : createEmptyBoard();
  const activeShip = SHIPS.find((ship) => ship.id === selectedShipId) ?? null;
  const shipGroups = getShipGroups(locale).map((group) => {
    const remainingShips = SHIPS.filter((ship) => ship.length === group.length && !draftPlacements.some((placement) => placement.shipId === ship.id));
    return { ...group, remaining: remainingShips.length, nextShipId: remainingShips[0]?.id, isActive: activeShip?.length === group.length };
  });

  useEffect(() => {
    resetDraft();

    if (currentPlayer.ready && currentPlayerBoard.ships.length > 0) {
      setDraftPlacements(currentPlayerBoard.ships);
      return;
    }

    if (room.phase === 'setup' && !currentPlayer.ready && currentPlayerBoard.ships.length === 0) {
      const persistedDraft = getPersistedDraftPlacements(room.code, room.setupVersion);
      setDraftPlacements(Array.isArray(persistedDraft) ? persistedDraft as ShipPlacement[] : []);
      return;
    }

    clearPersistedDraftPlacements(room.code, room.setupVersion);
  }, [currentPlayer.ready, currentPlayerBoard.ships.length, resetDraft, room.code, room.phase, room.setupVersion, setDraftPlacements]);

  useEffect(() => {
    if (room.phase !== 'setup' || currentPlayer.ready) {
      clearPersistedDraftPlacements(room.code, room.setupVersion);
      return;
    }

    setPersistedDraftPlacements(room.code, room.setupVersion, draftPlacements);
  }, [currentPlayer.ready, draftPlacements, room.code, room.phase, room.setupVersion]);

  useEffect(() => {
    if (!selectedShipId) setPendingPlacementStart(undefined);
  }, [selectedShipId, setPendingPlacementStart]);
  useEffect(() => setDirectionHintShown(false), [room.code]);
  useEffect(() => setMobileSidebarOpen(false), [room.code, room.phase]);
  useEffect(() => setHoveredCell(undefined), [pendingPlacementStart, room.code, room.phase, selectedShipId]);
  useEffect(() => {
    if (room.phase !== 'battle' || !room.turnStartedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [room.phase, room.turnStartedAt]);

  const isSetupBusy = room.phase === 'setup' && busyAction !== null;
  const isYourTurn = room.currentTurnPlayerId === currentPlayer.id;
  const allowedTargetId = room.phase === 'battle' ? allowedTargetPlayerIdForView(room, currentPlayer.id) : undefined;
  const allowedTarget = allowedTargetId ? room.players.find((player) => player.id === allowedTargetId) : undefined;
  const youStats = summarizeTargetBoards(currentPlayer.targetBoards);
  const placementInstruction = activeShip?.length === 1 ? t('game.placeSingleHint') : t('game.placeMultiHint');
  const turnDeadline = room.turnStartedAt ? room.turnStartedAt + TURN_DURATION_MS : undefined;
  const remainingTurnMs = turnDeadline ? Math.max(0, turnDeadline - now) : undefined;
  const turnSecondsLeft = remainingTurnMs !== undefined ? Math.ceil(remainingTurnMs / 1000) : undefined;
  const turnTimerLabel = turnSecondsLeft !== undefined ? `${String(Math.floor(turnSecondsLeft / 60)).padStart(2, '0')}:${String(turnSecondsLeft % 60).padStart(2, '0')}` : undefined;
  const isTimerDanger = remainingTurnMs !== undefined && remainingTurnMs <= 10_000;

  let previewPlacement: ShipPlacement | undefined;
  if (room.phase === 'setup' && !currentPlayer.ready && activeShip && hoveredCell) {
    previewPlacement = activeShip.length === 1
      ? { shipId: activeShip.id, length: activeShip.length, orientation: 'horizontal', start: hoveredCell }
      : pendingPlacementStart
        ? buildPlacementFromDirection(activeShip, pendingPlacementStart, hoveredCell)
        : undefined;
  }

  const previewValidation = previewPlacement ? canPlaceShip(draftPlacements, previewPlacement) : undefined;
  const previewCellKeys = new Set(previewPlacement ? placementCells(previewPlacement).map((cell) => `${cell.x}:${cell.y}`) : []);
  const yourBoardCells = (room.phase === 'setup' && !currentPlayer.ready ? localBoard.cells : currentPlayerBoard.cells).map((row) =>
    row.map((cell) => ({
      state: cell.state,
      shipId: cell.shipId,
      className: previewCellKeys.has(`${cell.x}:${cell.y}`) ? (previewValidation?.valid ? 'cell-preview-valid' : 'cell-preview-invalid') : undefined,
    })),
  );

  return {
    busyAction,
    setBusyAction,
    directionHintShown,
    setDirectionHintShown,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    hoveredCell,
    setHoveredCell,
    draftPlacements,
    selectedShipId,
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
  };
}
