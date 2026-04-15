import { create } from 'zustand';
import { getCaptainName, getPreferredLocale, setCaptainName, setPreferredLocale } from './session';
import type { AppStore } from './types';

export const useAppStore = create<AppStore>((set) => ({
  name: getCaptainName(),
  screen: 'lobby',
  locale: getPreferredLocale(),
  roomCodeInput: '',
  createRoomPlayerCount: 2,
  room: undefined,
  connectionStatus: 'idle',
  pingMs: undefined,
  notifications: [],
  draftPlacements: [],
  selectedShipId: undefined,
  pendingPlacementStart: undefined,
  setName: (name) => {
    setCaptainName(name);
    set({ name });
  },
  setScreen: (screen) => set({ screen }),
  setLocale: (locale) => {
    setPreferredLocale(locale);
    set({ locale });
  },
  setRoomCodeInput: (roomCodeInput) => set({ roomCodeInput }),
  setCreateRoomPlayerCount: (createRoomPlayerCount) => set({ createRoomPlayerCount }),
  setRoom: (room) => set({ room }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setPingMs: (pingMs) => set({ pingMs }),
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
