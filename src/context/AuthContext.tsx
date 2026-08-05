'use client';

/**
 * AuthContext.tsx
 * Thin Supabase Auth bridge — listens to auth state changes and dispatches to Redux authSlice.
 * Components consume auth state via useAppSelector (selectUser, selectUserRole, etc.) or useAuth().
 */

import React, {
  createContext, useContext, ReactNode, useCallback, useEffect, useMemo, useRef,
} from 'react';
import { supabase } from '@/lib/supabase';
import { endFirebaseSession } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { User } from '@supabase/supabase-js';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { AppDispatch } from '@/store';
import { getErrorMessage } from '@/lib/errors';
import { getRoleHome, isStaffRole } from '@/lib/roleAccess';
import type { UserRole } from '@/types';
import {
  setUser, setSession, setUserRole, authResolved, openAuthModal, closeAuthModal,
  signOutStarted, signOut,
  selectUser, selectSession, selectUserRole, selectAuthLoading,
  selectIsAuthModalOpen, selectAuthModalTab,
} from '@/store/authSlice';

export type { UserRole };

// Owner-account bootstrap: these emails are always forced to 'admin' even if
// their `profiles.role` row says otherwise. Mirrors the same whitelist used
// in the one-time `UPDATE profiles SET role = 'admin' WHERE email IN (...)`
// at the bottom of supabase_schema.sql.
const ADMIN_EMAILS = [
  'vasistadronadula@gmail.com',
  'pathaniroshini@gmail.com',
  'palapittaruchulu@gmail.com',
];

const KNOWN_ROLES: UserRole[] = ['customer', 'admin', 'manager', 'chef', 'cashier', 'waiter'];
const isKnownRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && (KNOWN_ROLES as string[]).includes(value);

/**
 * Set just before handing off to Google, read once when the OAuth redirect
 * lands us back on the site. Supabase returns the browser to
 * `window.location.origin`, which is indistinguishable from an ordinary visit
 * to the home page — this flag is what tells the two apart, so a Google
 * sign-in still lands staff on their dashboard without the app having to guess
 * from the pathname (guessing is what used to bounce a signed-in admin off the
 * public home page every time they pressed Back).
 */
const OAUTH_PENDING_KEY = 'ppr:oauth-redirect-pending';

const takeOAuthPendingFlag = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const pending = window.sessionStorage.getItem(OAUTH_PENDING_KEY) === '1';
    if (pending) window.sessionStorage.removeItem(OAUTH_PENDING_KEY);
    return pending;
  } catch {
    return false; // Private mode / storage disabled — just don't auto-redirect.
  }
};

/**
 * Post-login landing.
 *
 * This is a deliberate full page load, not `router.replace`, and that is the
 * point: these are shared terminals. A hard navigation guarantees the incoming
 * user gets a clean Redux store, a clean RTK Query cache and a realtime socket
 * opened with their own token, instead of inheriting whatever the previous
 * shift left in memory.
 *
 * `replace` rather than `href` so the login form is dropped from history —
 * pressing Back from the dashboard must not return an already-signed-in user
 * to a login screen.
 */
export function landAfterLogin(role: UserRole, fallbackPath?: string) {
  if (typeof window === 'undefined') return;
  const target = isStaffRole(role) ? getRoleHome(role) : (fallbackPath ?? getRoleHome(role));
  window.location.replace(target);
}

interface AuthContextType {
  user: User | null;
  session: import('@supabase/supabase-js').Session | null;
  userRole: UserRole | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; role?: UserRole }>;
  signUpWithEmail: (email: string, pass: string, name?: string, phone?: string) => Promise<{ success: boolean; role?: UserRole }>;
  /** Takes a Firebase ID token from the OTP screen, not a phone number — see the implementation. */
  signInWithPhoneToken: (idToken: string, name?: string) => Promise<{ success: boolean; role?: UserRole }>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  fetchUserRole: (u: User) => Promise<UserRole>;
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── fetchUserRole helper ──────────────────────────────────────────────────
// SECURITY: `u.user_metadata` is client-writable (any signed-in user can call
// `supabase.auth.updateUser({ data: { role: 'admin' } })` from the browser
// console), so it must NEVER be trusted for authorization — that was a live
// privilege-escalation hole. `profiles.role` (server-side, RLS-protected,
// with a trigger blocking self-escalation) is the only source of truth here.
// `u.app_metadata` is safe (only settable server-side) but isn't populated
// by anything in this app, so it's not read either — one source of truth.
async function fetchAndSetUserRole(u: User, dispatch: AppDispatch): Promise<UserRole> {
  try {
    const email = (u.email || '').toLowerCase().trim();

    if (ADMIN_EMAILS.includes(email)) {
      dispatch(setUserRole('admin'));
      return 'admin';
    }

    const { data: ownData, error } = await supabase
      .from('profiles').select('role').eq('id', u.id).maybeSingle();
    let data = ownData;

    if ((!data || error) && email) {
      const { data: emailData } = await supabase
        .from('profiles').select('role').ilike('email', email).maybeSingle();
      if (emailData) data = emailData;
    }

    if (data?.role) {
      const raw = data.role.toString().toLowerCase().trim();
      const role: UserRole = isKnownRole(raw) ? raw : 'customer';
      dispatch(setUserRole(role));
      return role;
    }

    // Insert default customer profile
    const newRole: UserRole = 'customer';
    const fullName = u.user_metadata?.full_name || u.user_metadata?.name || '';
    const phone = u.user_metadata?.phone || '';
    await supabase.from('profiles').insert([{
      id: u.id, email: u.email || '', full_name: fullName, phone, role: newRole,
    }]);
    dispatch(setUserRole(newRole));
    return newRole;
  } catch (err) {
    console.error('Error fetching user role:', err);
    const email = (u.email || '').toLowerCase().trim();
    if (ADMIN_EMAILS.includes(email)) {
      dispatch(setUserRole('admin'));
      return 'admin';
    }
    dispatch(setUserRole('customer'));
    return 'customer';
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const session = useAppSelector(selectSession);
  const userRole = useAppSelector(selectUserRole);
  const loading = useAppSelector(selectAuthLoading);
  const isAuthModalOpen = useAppSelector(selectIsAuthModalOpen);
  const authModalTab = useAppSelector(selectAuthModalTab);

  // Which user id the role in the store was fetched for, so a token refresh
  // for the same person doesn't trigger a redundant `profiles` round-trip.
  const roleForUserId = useRef<string | null>(null);
  const cachedRole = useRef<UserRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    /** Latch `authReady` exactly once, whichever source answers first. */
    function settle() {
      if (cancelled || settled) return;
      settled = true;
      clearTimeout(ceiling);
      dispatch(authResolved());
    }

    // Last-resort ceiling so a hung network can never leave the app stuck
    // behind a permanent spinner.
    //
    // This used to be 1.5s, which was short enough to fire *while*
    // getSession() was still in flight on a weak mobile connection. The app
    // then saw "not loading, no user", and route guards evicted a perfectly
    // valid staff session with a "please log in" toast. The ceiling must sit
    // well beyond a realistic slow response, not inside it — it is an
    // emergency exit, not part of the normal path.
    const ceiling = setTimeout(() => {
      console.warn('[auth] session check did not settle in 15s — unblocking UI as signed out');
      settle();
    }, 15_000);

    // 1. Restore an existing session.
    //
    // Restoring a session is NOT a navigation event: whatever page the user
    // opened is the page they want. This deliberately never redirects.
    // Redirecting here is what made a signed-in staff member unable to reach
    // the public site at all — Back out of /admin, land on /, get thrown
    // straight back to /admin, forever.
    supabase.auth.getSession()
      .then(async ({ data: { session: restored } }) => {
        if (cancelled) return;
        dispatch(setSession(restored));
        dispatch(setUser(restored?.user ?? null));

        if (restored?.user) {
          const role = await fetchAndSetUserRole(restored.user, dispatch);
          if (cancelled) return;
          roleForUserId.current = restored.user.id;
          cachedRole.current = role;
        } else {
          dispatch(setUserRole(null));
        }
        settle();
      })
      .catch((err) => {
        console.error('[auth] getSession failed:', err);
        settle();
      });

    // 2. Track auth state changes for the rest of the session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (cancelled) return;

      dispatch(setSession(nextSession));
      const currentUser = nextSession?.user ?? null;
      dispatch(setUser(currentUser));

      if (!currentUser) {
        dispatch(setUserRole(null));
        roleForUserId.current = null;
        cachedRole.current = null;
        settle();
        return;
      }

      // TOKEN_REFRESHED fires hourly and on every tab focus; USER_UPDATED
      // fires on profile edits. Re-querying `profiles` on each is a wasted
      // round-trip, and worse — if that query fails (offline, RLS hiccup)
      // fetchAndSetUserRole falls back to 'customer', which would demote a
      // working cashier mid-shift and bounce them out of the till.
      const isRefresh = event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED';
      const sameUser = roleForUserId.current === currentUser.id;
      const role = isRefresh && sameUser && cachedRole.current
        ? cachedRole.current
        : await fetchAndSetUserRole(currentUser, dispatch);

      if (cancelled) return;
      roleForUserId.current = currentUser.id;
      cachedRole.current = role;
      settle();

      // Only a Google/OAuth return navigates from here. Every password login
      // is routed by its own caller (login page, signup page, auth modal), so
      // there is exactly one owner per flow and no two redirects racing each
      // other to set window.location.
      if (event === 'SIGNED_IN' && takeOAuthPendingFlag()) {
        landAfterLogin(role);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(ceiling);
      subscription.unsubscribe();
    };
  }, [dispatch]);

  // ─── Auth Methods ──────────────────────────────────────────────────────────

  // Returns the resolved role and leaves navigation to the caller. Previously
  // this jumped to the dashboard itself while the SIGNED_IN listener jumped
  // too and the login page ran its own router.push('/') — three navigations
  // racing on one click, which is what surfaced a half-rendered page between
  // pressing Log In and arriving anywhere.
  const signInWithEmail = useCallback(async (
    email: string, pass: string
  ): Promise<{ success: boolean; role?: UserRole }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) { toast.error(error.message || 'Login failed.'); return { success: false }; }
      const u = data.user;
      let role: UserRole = 'customer';
      if (u) {
        role = await fetchAndSetUserRole(u, dispatch);
        roleForUserId.current = u.id;
        cachedRole.current = role;
      }
      toast.success(`Welcome back, ${u?.email || 'User'}! 👋`);
      dispatch(closeAuthModal());
      return { success: true, role };
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Login error');
      return { success: false };
    }
  }, [dispatch]);

  const signUpWithEmail = useCallback(async (
    email: string, pass: string, name?: string, phone?: string
  ): Promise<{ success: boolean; role?: UserRole }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password: pass,
        options: { data: { full_name: name || '', phone: phone || '' } },
      });
      if (error) { toast.error(error.message || 'Signup failed'); return { success: false }; }
      const u = data.user;
      let role: UserRole = 'customer';
      if (u) {
        const isOwner = ADMIN_EMAILS.includes((u.email || '').toLowerCase().trim());
        role = isOwner ? 'admin' : 'customer';
        await supabase.from('profiles').insert([{
          id: u.id, email: u.email || email, full_name: name || '', phone: phone || '', role,
        }]);
        dispatch(setUserRole(role));
        roleForUserId.current = u.id;
        cachedRole.current = role;
      }
      toast.success('Account created successfully! 🎉');
      dispatch(closeAuthModal());
      return { success: true, role };
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Signup error');
      return { success: false };
    }
  }, [dispatch]);



  /**
   * Completes a phone sign-in from a Firebase ID token.
   *
   * The token is proof that Firebase sent an SMS to a number and the right code
   * came back. It is worth nothing until a server checks Google's signature on
   * it, so that is all this does: post it to /api/auth/phone, which verifies it
   * and returns a one-time hash the browser redeems with Supabase for a real
   * session.
   *
   * The version this replaced signed in with a password derived from the phone
   * number — meaning anyone who knew a customer's number could open a console
   * and sign in as them, no SMS involved. Nothing here is derived from anything
   * the browser can guess.
   */
  const signInWithPhoneToken = useCallback(async (
    idToken: string, name?: string
  ): Promise<{ success: boolean; role?: UserRole }> => {
    try {
      const response = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, fullName: name || undefined }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.tokenHash) {
        toast.error(payload?.error || 'Could not complete sign-in. Please try again.');
        return { success: false };
      }

      // Redeeming the hash is what actually issues the session, and it is done
      // by the browser so the tokens land in the same storage every other part
      // of the app reads them from.
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: payload.tokenHash as string,
        type: 'magiclink',
      });

      if (error || !data.user) {
        console.error('[auth] phone session exchange failed:', error?.message);
        toast.error('Could not start your session. Please try again.');
        return { success: false };
      }

      // Firebase has served its purpose; don't leave a second identity behind.
      await endFirebaseSession();

      const role = await fetchAndSetUserRole(data.user, dispatch);
      roleForUserId.current = data.user.id;
      cachedRole.current = role;

      toast.success(payload.isNewUser ? 'Welcome to Pala Pitta Ruchulu! 🎉' : 'Welcome back! 👋');
      dispatch(closeAuthModal());
      return { success: true, role };
    } catch (err) {
      console.error('[auth] phone sign-in error:', err);
      toast.error(getErrorMessage(err) || 'Sign-in failed. Please try again.');
      return { success: false };
    }
  }, [dispatch]);

  const signInWithGoogle = useCallback(async () => {
    try {
      // Mark the hand-off so the SIGNED_IN listener knows the return trip is a
      // login and not an ordinary page visit. Set before the call, because
      // signInWithOAuth navigates away and never resolves here.
      if (typeof window !== 'undefined') {
        try { window.sessionStorage.setItem(OAUTH_PENDING_KEY, '1'); } catch { /* storage disabled */ }
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      });
      if (error) {
        takeOAuthPendingFlag(); // Never left the page — clear the flag again.
        toast.error(error.message || 'Google sign in failed');
      }
    } catch (err) {
      takeOAuthPendingFlag();
      toast.error(getErrorMessage(err) || 'Google login error');
    }
  }, []);

  const signOutUser = useCallback(async () => {
    // Flag first: clearing the user is about to make every route guard
    // observe a signed-out session. Without this they fire "Please log in
    // with your staff account" as an error toast on top of a successful
    // logout, and race the navigation below with one of their own.
    dispatch(signOutStarted());
    const wasStaff = isStaffRole(cachedRole.current);
    try {
      await supabase.auth.signOut();
      roleForUserId.current = null;
      cachedRole.current = null;
      toast.success('Logged out successfully');

      // Staff leave via a full page load so the next person on this terminal
      // starts with an empty store instead of the previous shift's cached
      // orders, bills and customer records.
      if (wasStaff && typeof window !== 'undefined') {
        window.location.replace('/');
        return;
      }
      dispatch(signOut());
    } catch {
      dispatch(signOut()); // Clears `signingOut` so guards go live again.
      toast.error('Logout error');
    }
  }, [dispatch]);

  const openModal = useCallback((tab?: 'login' | 'signup') => { dispatch(openAuthModal(tab)); }, [dispatch]);
  const closeModal = useCallback(() => { dispatch(closeAuthModal()); }, [dispatch]);
  const fetchUserRole = useCallback((u: User) => fetchAndSetUserRole(u, dispatch), [dispatch]);

  // Every method is a stable useCallback, so this value only changes when auth
  // state actually changes. It used to list state in the deps while rebuilding
  // the methods inline each render, which made the memo a no-op and re-rendered
  // every useAuth() consumer — the whole POS included — on each render pass.
  const contextValue = useMemo(() => ({
    user, session, userRole, loading, isAuthModalOpen, authModalTab,
    signInWithEmail, signUpWithEmail, signInWithPhoneToken, signInWithGoogle, signOutUser,
    fetchUserRole,
    openAuthModal: openModal,
    closeAuthModal: closeModal,
  }), [
    user, session, userRole, loading, isAuthModalOpen, authModalTab,
    signInWithEmail, signUpWithEmail, signInWithPhoneToken, signInWithGoogle, signOutUser,
    fetchUserRole, openModal, closeModal,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
