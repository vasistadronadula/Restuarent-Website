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
  roleError: string | null;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setUserRole: (role: UserRole | null) => void;
  setRoleError: (message: string | null) => void;
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
  roleError: null,
  isAuthModalOpen: false,
  authModalTab: 'login',

  setUser: (user) => set((state) => state.user?.id === user?.id
    ? { user }
    : { user, userRole: null, roleError: null }),
  setSession: (session) => set({ session }),
  setUserRole: (userRole) => set({ userRole, roleError: null }),
  setRoleError: (roleError) => set({ roleError }),
  authResolved: () => set({ loading: false, authReady: true }),
  openAuthModal: (tab) => set({ authModalTab: tab ?? 'login', isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  signOutStarted: () => set({ signingOut: true }),
  signOut: () => set({ user: null, session: null, userRole: null, signingOut: false, roleError: null }),
}));
