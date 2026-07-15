import { create } from 'zustand';

type AppShellState = {
  isContentLoading: boolean;
  isOffline: boolean;
  isRefreshing: boolean;
  isStale: boolean;
  unreadNotifications: number;
  warningMessage: string | null;
  markNotificationsRead: () => void;
  refreshContent: () => Promise<void>;
  setContentLoading: (isLoading: boolean) => void;
  setOffline: (isOffline: boolean) => void;
  setStale: (isStale: boolean) => void;
  setUnreadNotifications: (count: number) => void;
  setWarningMessage: (message: string | null) => void;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useAppShellStore = create<AppShellState>((set) => ({
  isContentLoading: false,
  isOffline: false,
  isRefreshing: false,
  isStale: false,
  unreadNotifications: 0,
  warningMessage: null,
  markNotificationsRead: () => set({ unreadNotifications: 0 }),
  refreshContent: async () => {
    set({ isRefreshing: true });
    await wait(1100);
    set({
      isRefreshing: false,
      isStale: false,
      warningMessage: null,
    });
  },
  setContentLoading: (isContentLoading) => set({ isContentLoading }),
  setOffline: (isOffline) => set({ isOffline }),
  setStale: (isStale) => set({ isStale }),
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
  setWarningMessage: (warningMessage) => set({ warningMessage }),
}));
