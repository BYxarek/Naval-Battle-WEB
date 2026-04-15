import type { BoardOverlay } from './types';
import { faShip } from '@fortawesome/free-solid-svg-icons';
import type { Coord, SanitizedRoomState } from '../../../shared/game';
import { useI18n } from '../../i18n';
import { Board } from './Board';

type ShipGroupView = {
  length: number;
  label: string;
};

type PlayerBoardPanelProps = {
  room: SanitizedRoomState;
  currentPlayer: SanitizedRoomState['players'][number];
  activeShip: { length: number; label?: string } | null;
  shipGroups: ShipGroupView[];
  pendingPlacementStart?: Coord;
  isSetupBusy: boolean;
  yourBoardCells: { state: string; className?: string; shipId?: string }[][];
  onCellHover?: (coord?: Coord) => void;
  onCellClick?: (x: number, y: number) => void;
  onCellMouseDown?: (x: number, y: number) => void;
  overlay?: BoardOverlay;
};

function buildSubtitle(
  currentPlayer: SanitizedRoomState['players'][number],
  isSetupBusy: boolean,
  activeShip: PlayerBoardPanelProps['activeShip'],
  pendingPlacementStart: Coord | undefined,
  shipGroups: ShipGroupView[],
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (currentPlayer.ready) {
    return t('game.boardFleetConfirmed');
  }
  if (isSetupBusy) {
    return t('game.boardClearing');
  }
  if (activeShip?.length === 1) {
    return t('game.boardPlaceSingle');
  }
  if (pendingPlacementStart) {
    return t('game.boardChooseDirection');
  }
  if (activeShip) {
    return t('game.boardSelected', { label: shipGroups.find((group) => group.length === activeShip.length)?.label ?? activeShip.label ?? '' });
  }
  return t('game.boardSelectShipFirst');
}

export function PlayerBoardPanel(props: PlayerBoardPanelProps) {
  const { t } = useI18n();
  const {
    room,
    currentPlayer,
    activeShip,
    shipGroups,
    pendingPlacementStart,
    isSetupBusy,
    yourBoardCells,
    onCellHover,
    onCellClick,
    onCellMouseDown,
  } = props;

  return (
    <Board
      boardTestId="player-board"
      title={t('game.yourBoard')}
      icon={faShip}
      subtitle={buildSubtitle(currentPlayer, isSetupBusy, activeShip, pendingPlacementStart, shipGroups, t)}
      activeCell={pendingPlacementStart}
      cells={yourBoardCells}
      disabled={isSetupBusy}
      loadingText={isSetupBusy ? t('game.boardClearing') : undefined}
      onCellHover={onCellHover}
      onCellMouseDown={onCellMouseDown}
      onCellClick={onCellClick}
      overlay={props.overlay}
    />
  );
}
