import type { Coord, SanitizedRoomState, ShipPlacement } from '../../shared/game';
import {
  cancelSetupRoomRequest,
  createBotRoomRequest,
  createRoomRequest,
  fireShotRequest,
  joinRoomRequest,
  loadOnlineCountRequest,
  loadRoomStateRequest,
  pingPresenceRequest,
  requestRematchRequest,
  respondRematchRequest,
  restartRoomRequest,
  submitSetupRequest,
  surrenderRoomRequest,
} from './roomRequests';

export function createRoom(name: string, maxPlayers: 2 | 3 | 4): Promise<SanitizedRoomState> {
  return createRoomRequest(name, maxPlayers);
}

export function createBotRoom(name: string): Promise<SanitizedRoomState> {
  return createBotRoomRequest(name);
}

export function joinRoom(name: string, code: string): Promise<SanitizedRoomState> {
  return joinRoomRequest(name, code);
}

export function loadRoomState(code: string, signal?: AbortSignal): Promise<SanitizedRoomState> {
  return loadRoomStateRequest(code, signal);
}

export function submitSetup(code: string, placements: ShipPlacement[]): Promise<SanitizedRoomState> {
  return submitSetupRequest(code, placements);
}

export function fireShot(code: string, coord: Coord, targetPlayerId: string): Promise<SanitizedRoomState> {
  return fireShotRequest(code, coord, targetPlayerId);
}

export function restartRoom(code: string): Promise<SanitizedRoomState> {
  return restartRoomRequest(code);
}

export function requestRematch(code: string): Promise<SanitizedRoomState> {
  return requestRematchRequest(code);
}

export function respondRematch(code: string, decision: 'accept' | 'decline'): Promise<SanitizedRoomState> {
  return respondRematchRequest(code, decision);
}

export function surrenderRoom(code: string): Promise<SanitizedRoomState> {
  return surrenderRoomRequest(code);
}

export function cancelSetupRoom(code: string): Promise<void> {
  return cancelSetupRoomRequest(code);
}

export function pingPresence(): Promise<void> {
  return pingPresenceRequest();
}

export function loadOnlineCount(): Promise<number> {
  return loadOnlineCountRequest();
}
