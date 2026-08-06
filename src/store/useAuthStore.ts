import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/types';

export type { UserRole };

interface AuthState {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  authReady: boolean;
  signingOut: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setUserRole: (role: UserRole | null) => void;
  authResolved: () => void;
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  signOutStarted: () => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  userRole: null,
  loading: true,
  authReady: false,
  signingOut: false,
  isAuthModalOpen: false,
  authModalTab: 'login',

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setUserRole: (userRole) => set({ userRole }),
  authResolved: () => set({ loading: false, authReady: true }),
  openAuthModal: (tab) => set({ authModalTab: tab ?? 'login', isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  signOutStarted: () => set({ signingOut: true }),
  signOut: () => set({ user: null, session: null, userRole: null, signingOut: false }),
}));
