import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, Session } from '@supabase/supabase-js';
import type { RootState } from './index';

export type UserRole = 'customer' | 'admin';

// ─── State ───────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
}

const initialState: AuthState = {
  user: null,
  session: null,
  userRole: null,
  loading: true,
  isAuthModalOpen: false,
  authModalTab: 'login',
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      // User from Supabase may contain functions — store plain serializable copy
      if (action.payload) {
        state.user = JSON.parse(JSON.stringify(action.payload));
      } else {
        state.user = null;
      }
    },
    setSession(state, action: PayloadAction<Session | null>) {
      if (action.payload) {
        state.session = JSON.parse(JSON.stringify(action.payload));
      } else {
        state.session = null;
      }
    },
    setUserRole(state, action: PayloadAction<UserRole | null>) {
      state.userRole = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    openAuthModal(state, action: PayloadAction<'login' | 'signup' | undefined>) {
      state.authModalTab = action.payload ?? 'login';
      state.isAuthModalOpen = true;
    },
    closeAuthModal(state) {
      state.isAuthModalOpen = false;
    },
    signOut(state) {
      state.user = null;
      state.session = null;
      state.userRole = null;
    },
  },
});

export const {
  setUser, setSession, setUserRole, setLoading,
  openAuthModal, closeAuthModal, signOut,
} = authSlice.actions;

export default authSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectUser = (state: RootState) => state.auth.user;
export const selectSession = (state: RootState) => state.auth.session;
export const selectUserRole = (state: RootState) => state.auth.userRole;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectIsAuthModalOpen = (state: RootState) => state.auth.isAuthModalOpen;
export const selectAuthModalTab = (state: RootState) => state.auth.authModalTab;
export const selectIsAdmin = (state: RootState) => state.auth.userRole === 'admin';
export const selectIsAuthenticated = (state: RootState) => !!state.auth.user;
