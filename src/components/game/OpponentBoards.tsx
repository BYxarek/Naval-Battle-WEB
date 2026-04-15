import { faBomb } from '@fortawesome/free-solid-svg-icons';
import {
  createEmptyTargetBoard,
  type SanitizedRoomState,
} from '../../../shared/game';
import { useI18n } from '../../i18n';
import { Board } from './Board';
import { publicCellState } from './utils';

type OpponentBoardsProps = {
  room: SanitizedRoomState;
  currentPlayer: SanitizedRoomState['players'][number];
  opponents: SanitizedRoomState['players'];
  isYourTurn: boolean;
  allowedTargetId?: string;
  allowedTarget?: SanitizedRoomState['players'][number];
  flashCells: Record<string, 'miss' | 'hit' | 'sunk'>;
  onFire: (opponent: SanitizedRoomState['players'][number], x: number, y: number) => void;
};

export function OpponentBoards(props: OpponentBoardsProps) {
  const { t } = useI18n();
  const { room, currentPlayer, opponents, isYourTurn, allowedTargetId, allowedTarget, flashCells, onFire } = props;

  return opponents.map((opponent) => {
    const isCurrentRingTarget = allowedTargetId === opponent.id;
    const isRadarDisabled = room.phase !== 'battle' || !isYourTurn || opponent.eliminated || !isCurrentRingTarget;
    const boardSubtitle = opponent.eliminated
      ? t('game.opponentEliminated')
      : room.phase === 'battle'
        ? isYourTurn
          ? isCurrentRingTarget
            ? t('game.currentTarget')
            : allowedTarget
              ? t('game.attackTargetNow', { name: allowedTarget.name })
              : t('game.waitingTarget')
          : t('game.opponentShooting')
        : t('game.waitMatchStart');
    const boardLoadingText = opponent.eliminated
      ? t('game.opponentEliminatedShort')
      : room.phase === 'setup'
        ? t('game.waitMatchStart')
        : room.phase === 'battle' && !isYourTurn
          ? t('game.opponentTurnNow')
          : room.phase === 'battle' && isYourTurn && !isCurrentRingTarget
            ? allowedTarget
              ? t('game.targetInOrder', { name: allowedTarget.name })
              : t('game.unavailableTarget')
            : undefined;

    return (
      <Board
        key={opponent.id}
        boardTestId={`opponent-board-${opponents.indexOf(opponent)}`}
        title={t('game.radarTitle', { name: opponent.name })}
        icon={faBomb}
        subtitle={boardSubtitle}
        cells={(currentPlayer.targetBoards[opponent.id] ?? createEmptyTargetBoard()).map((row) =>
          row.map((cell) => ({
            state: publicCellState(cell),
            className: flashCells[`${opponent.id}:${cell.x}:${cell.y}`]
              ? `cell-flash-${flashCells[`${opponent.id}:${cell.x}:${cell.y}`]}`
              : undefined,
          })),
        )}
        disabled={isRadarDisabled}
        loadingText={boardLoadingText}
        onCellClick={(x, y) => {
          if (room.phase !== 'battle' || !isYourTurn || opponent.eliminated || !isCurrentRingTarget) {
            return;
          }
          onFire(opponent, x, y);
        }}
      />
    );
  });
}
