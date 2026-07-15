import { create } from 'zustand';

import type { AuthSession } from '@/features/auth/types';

type AuthStore = {
  errorMessage: string | null;
  isSubmitting: boolean;
  session: AuthSession | null;
  beginSubmit: () => void;
  clearError: () => void;
  clearSession: () => void;
  failSubmit: (message: string) => void;
  setSession: (session: AuthSession) => void;
  updateAccessToken: (accessToken: string) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  errorMessage: null,
  isSubmitting: false,
  session: null,
  beginSubmit: () =>
    set({
      errorMessage: null,
      isSubmitting: true,
    }),
  clearError: () =>
    set({
      errorMessage: null,
    }),
  clearSession: () =>
    set({
      errorMessage: null,
      isSubmitting: false,
      session: null,
    }),
  failSubmit: (message) =>
    set({
      errorMessage: message,
      isSubmitting: false,
    }),
  setSession: (session) =>
    set({
      errorMessage: null,
      isSubmitting: false,
      session,
    }),
  updateAccessToken: (accessToken) =>
    set((state) => {
      if (!state.session) return {};
      return { session: { ...state.session, accessToken } };
    }),
}));
