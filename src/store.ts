import { create } from 'zustand';
import type { AppStore } from './types';

export const useAppStore = create<AppStore>((set) => ({
  name: '',
  roomCodeInput: '',
  room: undefined,
  connectionStatus: 'idle',
  notifications: [],
  draftPlacements: [],
  selectedShipId: undefined,
  pendingPlacementStart: undefined,
  setName: (name) => set({ name }),
  setRoomCodeInput: (roomCodeInput) => set({ roomCodeInput }),
  setRoom: (room) => set({ room }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setError: (error) =>
    set((state) =>
      error
        ? {
            notifications: [
              ...state.notifications,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                message: error,
                tone: 'error',
              },
            ],
          }
        : state,
    ),
  notifySuccess: (message) =>
    set((state) =>
      message
        ? {
            notifications: [
              ...state.notifications,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                message,
                tone: 'success',
              },
            ],
          }
        : state,
    ),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),
  setDraftPlacements: (draftPlacements) => set({ draftPlacements }),
  setSelectedShipId: (selectedShipId) => set({ selectedShipId }),
  setPendingPlacementStart: (pendingPlacementStart) => set({ pendingPlacementStart }),
  resetDraft: () =>
    set({
      draftPlacements: [],
      selectedShipId: undefined,
      pendingPlacementStart: undefined,
    }),
}));
