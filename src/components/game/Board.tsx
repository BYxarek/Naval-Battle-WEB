import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { BoardProps } from './types';
import { coordLabel } from './utils';

export function Board({
  boardTestId,
  title,
  subtitle,
  icon,
  cells,
  activeCell,
  onCellClick,
  onCellMouseDown,
  onCellHover,
  disabled = false,
  loadingText,
  overlay,
}: BoardProps) {
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
    <div className="board-panel" data-testid={boardTestId ? `${boardTestId}-panel` : undefined}>
      <div className="board-header">
        <h3>
          <FontAwesomeIcon icon={icon as never} />
          {title}
        </h3>
        <p>{subtitle}</p>
      </div>

      <div className={`board ${disabled ? 'board-disabled' : ''}`} data-testid={boardTestId}>
        {cells.flatMap((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              type="button"
              data-testid={boardTestId ? `${boardTestId}-cell-${x}-${y}` : undefined}
              className={`cell cell-${cell.state} ${cell.className ?? ''} ${activeCell?.x === x && activeCell?.y === y ? 'cell-anchor' : ''}`}
              onMouseDown={() => onCellMouseDown?.(x, y)}
              onClick={() => onCellClick?.(x, y)}
              onMouseEnter={() => onCellHover?.({ x, y })}
              onMouseLeave={() => onCellHover?.(undefined)}
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
        {overlay ? (
          <div
            className="board-overlay-menu"
            style={{
              left: `calc(${(overlay.coord.x + 0.5) * 10}% )`,
              top: `calc(${(overlay.coord.y + 0.5) * 10}% )`,
            }}
          >
            {overlay.content}
          </div>
        ) : null}
      </div>
    </div>
  );
}
