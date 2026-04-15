import type { Coord, SanitizedRoomState, ShipPlacement } from '../shared/game';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected';
export type AppScreen = 'lobby' | 'settings';
export type AppLocale = 'ru' | 'en' | 'uk';
export type BattleGraphicsStyle = 'notebook';
export type AppNotification = {
  id: string;
  message: string;
  tone: 'success' | 'error';
};

export type AppStore = {
  name: string;
  screen: AppScreen;
  locale: AppLocale;
  roomCodeInput: string;
  createRoomPlayerCount: 2 | 3 | 4;
  room?: SanitizedRoomState;
  connectionStatus: ConnectionStatus;
  pingMs?: number;
  notifications: AppNotification[];
  draftPlacements: ShipPlacement[];
  selectedShipId?: ShipPlacement['shipId'];
  pendingPlacementStart?: Coord;
  setName: (name: string) => void;
  setScreen: (screen: AppScreen) => void;
  setLocale: (locale: AppLocale) => void;
  setRoomCodeInput: (code: string) => void;
  setRoom: (room?: SanitizedRoomState) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setPingMs: (pingMs?: number) => void;
  setError: (error?: string) => void;
  notifySuccess: (message?: string) => void;
  dismissNotification: (id: string) => void;
  setDraftPlacements: (placements: ShipPlacement[]) => void;
  setSelectedShipId: (shipId?: ShipPlacement['shipId']) => void;
  setPendingPlacementStart: (coord?: Coord) => void;
  resetDraft: () => void;
  setCreateRoomPlayerCount: (count: 2 | 3 | 4) => void;
};
