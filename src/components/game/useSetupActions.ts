import type { Coord, SanitizedRoomState, ShipPlacement } from '../../../shared/game';
import { SHIPS, canPlaceShip, generateRandomPlacements } from '../../../shared/game';
import { translate } from '../../i18n';
import { cancelSetupRoom, submitSetup } from '../../api';
import { clearActiveRoomCode, clearPersistedDraftPlacements } from '../../session';
import { useAppStore } from '../../store';
import { buildPlacementFromDirection } from './utils';

type UseSetupActionsArgs = {
  room: SanitizedRoomState;
  currentPlayer: SanitizedRoomState['players'][number];
  activeShip: { id: ShipPlacement['shipId']; length: number } | null;
  draftPlacements: ShipPlacement[];
  pendingPlacementStart?: Coord;
  directionHintShown: boolean;
  setBusyAction: (value: 'clear' | 'auto' | null) => void;
  setDirectionHintShown: (value: boolean) => void;
  setPendingPlacementStart: (value: Coord | undefined) => void;
};

function localizePlacementReason(locale: 'ru' | 'en' | 'uk', reason?: string) {
  switch (reason) {
    case 'Корабль выходит за пределы поля.':
      return translate(locale, 'server.placement.outOfBounds');
    case 'Корабли не могут пересекаться.':
      return translate(locale, 'server.placement.intersection');
    case 'Между кораблями должна быть минимум одна клетка.':
      return translate(locale, 'server.placement.spacing');
    case 'Некорректная длина корабля.':
      return translate(locale, 'server.placement.invalidLength');
    default:
      return reason;
  }
}

function canStartPlacementAt(
  draftPlacements: ShipPlacement[],
  ship: { id: ShipPlacement['shipId']; length: number },
  start: Coord,
) {
  if (ship.length === 1) {
    return canPlaceShip(draftPlacements, {
      shipId: ship.id,
      length: ship.length,
      orientation: 'horizontal',
      start,
    });
  }

  const candidates: ShipPlacement[] = [
    {
      shipId: ship.id,
      length: ship.length,
      orientation: 'horizontal',
      start,
    },
    {
      shipId: ship.id,
      length: ship.length,
      orientation: 'horizontal',
      start: { x: start.x - (ship.length - 1), y: start.y },
    },
    {
      shipId: ship.id,
      length: ship.length,
      orientation: 'vertical',
      start,
    },
    {
      shipId: ship.id,
      length: ship.length,
      orientation: 'vertical',
      start: { x: start.x, y: start.y - (ship.length - 1) },
    },
  ];

  for (const placement of candidates) {
    const validation = canPlaceShip(draftPlacements, placement);
    if (validation.valid) {
      return validation;
    }
  }

  return canPlaceShip(draftPlacements, candidates[0]);
}

export function useSetupActions(args: UseSetupActionsArgs) {
  const {
    room,
    currentPlayer,
    activeShip,
    draftPlacements,
    pendingPlacementStart,
    directionHintShown,
    setBusyAction,
    setDirectionHintShown,
    setPendingPlacementStart,
  } = args;
  const locale = useAppStore((state) => state.locale);
  const setError = useAppStore((state) => state.setError);
  const notifySuccess = useAppStore((state) => state.notifySuccess);
  const resetDraft = useAppStore((state) => state.resetDraft);
  const setDraftPlacements = useAppStore((state) => state.setDraftPlacements);
  const setSelectedShipId = useAppStore((state) => state.setSelectedShipId);

  function leaveToMenu() {
    clearActiveRoomCode();
    clearPersistedDraftPlacements(room.code, room.setupVersion);
    resetDraft();
    useAppStore.getState().setRoom(undefined);
  }

  async function handlePlaceShip(x: number, y: number, isSetupBusy: boolean) {
    if (room.phase !== 'setup' || currentPlayer.ready || isSetupBusy || !activeShip) {
      if (!activeShip) {
        setError(translate(locale, 'error.selectShipFirst'));
      }
      return;
    }

    const startValidation = canStartPlacementAt(draftPlacements, activeShip, { x, y });
    if (!pendingPlacementStart && !startValidation.valid) {
      setError(localizePlacementReason(locale, startValidation.reason));
      setPendingPlacementStart(undefined);
      return;
    }

    const placement = activeShip.length === 1
      ? { shipId: activeShip.id, length: activeShip.length, orientation: 'horizontal' as const, start: { x, y } }
      : !pendingPlacementStart
        ? undefined
        : buildPlacementFromDirection(activeShip, pendingPlacementStart, { x, y });

    if (activeShip.length > 1 && !pendingPlacementStart) {
      setPendingPlacementStart({ x, y });
      if (!directionHintShown) {
        notifySuccess(translate(locale, 'success.chooseDirection'));
        setDirectionHintShown(true);
      }
      return;
    }

    if (pendingPlacementStart && pendingPlacementStart.x === x && pendingPlacementStart.y === y) {
      setPendingPlacementStart(undefined);
      setError(undefined);
      return;
    }

    if (!placement) {
      setError(translate(locale, 'error.secondCellNeighbor'));
      return;
    }

    const validation = canPlaceShip(draftPlacements, placement);
    if (!validation.valid) {
      setError(localizePlacementReason(locale, validation.reason));
      setPendingPlacementStart(undefined);
      return;
    }

    const next = [...draftPlacements.filter((entry) => entry.shipId !== activeShip.id), placement];
    const nextSameTypeShip = SHIPS.find(
      (ship) => ship.length === activeShip.length && !next.some((entry) => entry.shipId === ship.id),
    );
    setDraftPlacements(next);
    setSelectedShipId(nextSameTypeShip?.id);
    setPendingPlacementStart(undefined);
    setError(undefined);
  }

  async function handleSubmitPlacements() {
    if (draftPlacements.length !== SHIPS.length) {
      setError(translate(locale, 'error.placeAllShips', { count: SHIPS.length }));
      return;
    }

    try {
      useAppStore.getState().setRoom(await submitSetup(room.code, draftPlacements));
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.confirmPlacement'));
    }
  }

  async function handleAutoPlaceShips() {
    try {
      setBusyAction('auto');
      setError(undefined);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      setDraftPlacements(generateRandomPlacements());
      setSelectedShipId(undefined);
      setPendingPlacementStart(undefined);
      notifySuccess(translate(locale, 'success.autoArrangeReady'));
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.confirmPlacement'));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleClearDraft() {
    setBusyAction('clear');
    setError(undefined);
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    clearPersistedDraftPlacements(room.code, room.setupVersion);
    resetDraft();
    setBusyAction(null);
  }

  function handleRemovePlacedShip(shipId: ShipPlacement['shipId']) {
    const next = draftPlacements.filter((entry) => entry.shipId !== shipId);
    setDraftPlacements(next);
    setSelectedShipId(shipId);
    setPendingPlacementStart(undefined);
    setError(undefined);
  }

  async function handleCancelGame() {
    try {
      await cancelSetupRoom(room.code);
      leaveToMenu();
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : translate(locale, 'error.cancelGame'));
    }
  }

  return {
    leaveToMenu,
    handlePlaceShip,
    handleSubmitPlacements,
    handleAutoPlaceShips,
    handleClearDraft,
    handleCancelGame,
    handleRemovePlacedShip,
  };
}
