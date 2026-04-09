import type { Coord, SanitizedRoomState, ShipPlacement } from '../shared/game';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected';
export type AppNotification = {
  id: string;
  message: string;
  tone: 'success' | 'error';
};

export type AppStore = {
  name: string;
  roomCodeInput: string;
  room?: SanitizedRoomState;
  connectionStatus: ConnectionStatus;
  notifications: AppNotification[];
  draftPlacements: ShipPlacement[];
  selectedShipId?: ShipPlacement['shipId'];
  pendingPlacementStart?: Coord;
  setName: (name: string) => void;
  setRoomCodeInput: (code: string) => void;
  setRoom: (room?: SanitizedRoomState) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setError: (error?: string) => void;
  notifySuccess: (message?: string) => void;
  dismissNotification: (id: string) => void;
  setDraftPlacements: (placements: ShipPlacement[]) => void;
  setSelectedShipId: (shipId?: ShipPlacement['shipId']) => void;
  setPendingPlacementStart: (coord?: Coord) => void;
  resetDraft: () => void;
};
