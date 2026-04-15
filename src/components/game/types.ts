import type { ReactNode } from 'react';
import type { Coord } from '../../../shared/game';

export type BoardViewCell = {
  state: string;
  className?: string;
  shipId?: string;
};

export type BoardOverlay = {
  coord: Coord;
  content: ReactNode;
};

export type BoardProps = {
  boardTestId?: string;
  title: string;
  subtitle: string;
  icon: unknown;
  cells: BoardViewCell[][];
  activeCell?: Coord;
  onCellClick?: (x: number, y: number) => void;
  onCellMouseDown?: (x: number, y: number) => void;
  onCellHover?: (coord?: Coord) => void;
  disabled?: boolean;
  loadingText?: string;
  overlay?: BoardOverlay;
};
