import type { Coord, SanitizedRoomState, ShipPlacement } from '../../../shared/game';
import { useBattleActions } from './useBattleActions';
import { useSetupActions } from './useSetupActions';

type UseGameActionsArgs = {
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

export function useGameActions(args: UseGameActionsArgs) {
  const { room } = args;
  const setupActions = useSetupActions(args);
  const battleActions = useBattleActions(room);

  return {
    ...setupActions,
    ...battleActions,
  };
}
