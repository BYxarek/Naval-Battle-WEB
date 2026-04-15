import { SHIPS } from './constants';

export type ShipId = (typeof SHIPS)[number]['id'];
export type Orientation = 'horizontal' | 'vertical';
export type MatchPhase = 'lobby' | 'setup' | 'battle' | 'finished' | 'closed';
export type ShotResult = 'miss' | 'hit' | 'sunk';
export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';

export type Coord = {
  x: number;
  y: number;
};

export type ShipPlacement = {
  shipId: ShipId;
  length: number;
  start: Coord;
  orientation: Orientation;
};

export type BoardCell = {
  x: number;
  y: number;
  state: CellState;
  shipId?: ShipId;
};

export type PlayerBoard = {
  cells: BoardCell[][];
  ships: ShipPlacement[];
  sunkShips: ShipId[];
};

export type PublicBoardCell = {
  x: number;
  y: number;
  state: 'unknown' | 'hit' | 'miss' | 'sunk';
};

export type TargetBoardsByOpponent = Record<string, PublicBoardCell[][]>;

export type PublicPlayerState = {
  id: string;
  name: string;
  ready: boolean;
  isBot?: boolean;
  board: PlayerBoard;
  targetBoards: TargetBoardsByOpponent;
  shotsFired: number;
};

export type PlayerState = PublicPlayerState & {
  socketId?: string;
};

export type RoomState = {
  code: string;
  phase: MatchPhase;
  hostId: string;
  maxPlayers: 2 | 3 | 4;
  setupVersion: number;
  players: PlayerState[];
  currentTurnPlayerId?: string;
  turnStartedAt?: number;
  winnerId?: string;
  rematchRequesterId?: string;
  lastAction?: string;
  createdAt: number;
};

export type SanitizedRoomState = {
  code: string;
  phase: MatchPhase;
  maxPlayers: 2 | 3 | 4;
  setupVersion: number;
  currentTurnPlayerId?: string;
  turnStartedAt?: number;
  winnerId?: string;
  lastAction?: string;
  rematchRequesterId?: string;
  createdAt?: number;
  updatedAt?: number;
  youAreHost: boolean;
  youPlayerId?: string;
  players: Array<{
    id: string;
    name: string;
    ready: boolean;
    isBot?: boolean;
    shotsFired: number;
    sunkShips: ShipId[];
    ownBoard: PlayerBoard;
    targetBoards: TargetBoardsByOpponent;
    isYou: boolean;
    eliminated: boolean;
  }>;
};

export type PlacementValidation = {
  valid: boolean;
  reason?: string;
};
