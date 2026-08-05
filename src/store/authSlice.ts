import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, Session } from '@supabase/supabase-js';
import type { RootState } from './index';
import type { UserRole } from '@/types';

export type { UserRole };

// ─── State ───────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  /**
   * One-way latch: false until the very first session check has produced an
   * answer, true forever after.
   *
   * `loading` alone must never be used to authorize a render. Later auth
   * events (TOKEN_REFRESHED fires hourly and on every tab focus) write to it
   * too, so a guard keyed off `loading` can observe
   * `loading === false && user === null` in the middle of a refresh and
   * wrongly conclude the user is signed out — which is exactly how a signed-in
   * cashier used to get thrown out of the POS.
   */
  authReady: boolean;
  /**
   * True between "user clicked Log out" and the navigation that follows.
   * Route guards stand down while it is set, otherwise clearing the user
   * makes them fire a "please log in" error toast on top of a perfectly
   * successful logout.
   */
  signingOut: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
}

const initialState: AuthState = {
  user: null,
  session: null,
  userRole: null,
  loading: true,
  authReady: false,
  signingOut: false,
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
    /**
     * The initial session check has an answer — signed in or signed out.
     * Dispatched exactly once per page load; `authReady` never goes back to
     * false, so subsequent token refreshes can't reopen the "still deciding"
     * window that guards wait on.
     */
    authResolved(state) {
      state.loading = false;
      state.authReady = true;
    },
    openAuthModal(state, action: PayloadAction<'login' | 'signup' | undefined>) {
      state.authModalTab = action.payload ?? 'login';
      state.isAuthModalOpen = true;
    },
    closeAuthModal(state) {
      state.isAuthModalOpen = false;
    },
    signOutStarted(state) {
      state.signingOut = true;
    },
    signOut(state) {
      state.user = null;
      state.session = null;
      state.userRole = null;
      state.signingOut = false;
    },
  },
});

export const {
  setUser, setSession, setUserRole, authResolved,
  openAuthModal, closeAuthModal, signOutStarted, signOut,
} = authSlice.actions;

export default authSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectUser = (state: RootState) => state.auth.user;
export const selectSession = (state: RootState) => state.auth.session;
export const selectUserRole = (state: RootState) => state.auth.userRole;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectAuthReady = (state: RootState) => state.auth.authReady;
export const selectIsSigningOut = (state: RootState) => state.auth.signingOut;
export const selectIsAuthModalOpen = (state: RootState) => state.auth.isAuthModalOpen;
export const selectAuthModalTab = (state: RootState) => state.auth.authModalTab;
export const selectIsAdmin = (state: RootState) =>
  state.auth.userRole === 'admin' || state.auth.userRole === 'manager';
export const selectIsAuthenticated = (state: RootState) => !!state.auth.user;
