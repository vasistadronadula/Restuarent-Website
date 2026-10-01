'use client';

/**
 * AuthContext.tsx
 * Thin Supabase Auth bridge — listens to auth state changes and writes them
 * into the Zustand auth store. Components can consume either this context
 * (`useAuth()`, for the action methods) or `useAuthStore` directly (for state,
 * with a selector so a component only re-renders on the slice it reads).
 */

import React, { createContext, useContext, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { isStaffRole } from '@/lib/auth/roleAccess';
import { getLoginDestination } from '@/lib/auth/portalRouting';
import type { UserRole } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

export type { UserRole };

// NOTE: The owner-email whitelist that used to live here has been removed.
// It was shipping real email addresses in the browser JS bundle and bypassing
// the database role entirely — admin access couldn't be revoked without a
// redeploy. Both the UI and server now trust profiles.role exclusively.

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
 * user gets a clean Zustand store, a clean TanStack Query cache and a realtime
 * socket opened with their own token, instead of inheriting whatever the
 * previous shift left in memory.
 *
 * `replace` rather than `href` so the login form is dropped from history —
 * pressing Back from the dashboard must not return an already-signed-in user
 * to a login screen.
 */
export function landAfterLogin(role: UserRole, fallbackPath?: string) {
  if (typeof window === 'undefined') return;
  const target = getLoginDestination(role, fallbackPath);
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
  signInWithPhoneToken: (idToken: string, name?: string) => Promise<{
    success: boolean;
    role?: UserRole;
    isNewUser?: boolean;
    hasDetails?: boolean;
    profile?: { full_name: string; email: string; phone: string } | null;
  }>;
  updateUserProfile: (fullName: string, email: string, phone?: string) => Promise<boolean>;
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
const pendingRoles = new Map<string, Promise<UserRole>>();

async function readProfileRole(u: User): Promise<UserRole> {
  const email = (u.email || '').toLowerCase().trim();
  const own = await supabase.from('profiles').select('role').eq('id', u.id).maybeSingle();
  let data = own.data;
  let lookupError = own.error;

  if (!data && email) {
    const fallback = await supabase.from('profiles').select('role').ilike('email', email).maybeSingle();
    data = fallback.data;
    lookupError = lookupError || fallback.error;
  }

  // A failed lookup is not evidence that someone is a customer. In particular,
  // don't insert a customer profile or route an admin to the storefront offline.
  if (!data && lookupError) throw new Error(lookupError.message);
  if (!data) {
    const inserted = await supabase.from('profiles').insert([{
      id: u.id, email: u.email || '',
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || '',
      phone: u.user_metadata?.phone || '', role: 'customer',
    }]).select('role').single();
    if (inserted.error?.code === '23505') {
      const existing = await supabase.from('profiles').select('role').eq('id', u.id).single();
      if (existing.error) throw new Error(existing.error.message);
      data = existing.data;
    } else {
      if (inserted.error) throw new Error(inserted.error.message);
      data = inserted.data;
    }
  }
  const role = data?.role?.toString().toLowerCase().trim();
  if (!isKnownRole(role)) throw new Error('Account role could not be verified');
  return role;
}

async function fetchAndSetUserRole(u: User): Promise<UserRole> {
  let request = pendingRoles.get(u.id);
  if (!request) {
    request = readProfileRole(u).finally(() => pendingRoles.delete(u.id));
    pendingRoles.set(u.id, request);
  }
  try {
    const role = await request;
    if (useAuthStore.getState().user?.id === u.id) useAuthStore.getState().setUserRole(role);
    return role;
  } catch (err) {
    console.error('Error fetching user role:', err);
    if (useAuthStore.getState().user?.id === u.id) {
      useAuthStore.getState().setRoleError('Could not verify your account role. Please retry.');
    }
    throw err;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const userRole = useAuthStore((s) => s.userRole);
  const loading = useAuthStore((s) => s.loading);
  const isAuthModalOpen = useAuthStore((s) => s.isAuthModalOpen);
  const authModalTab = useAuthStore((s) => s.authModalTab);

  // Which user id the role in the store was fetched for, so a token refresh
  // for the same person doesn't trigger a redundant `profiles` round-trip.
  const roleForUserId = useRef<string | null>(null);
  const cachedRole = useRef<UserRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    let settled = false;
    let authEventVersion = 0;

    const { setUser, setSession, setUserRole, authResolved } = useAuthStore.getState();

    /** Latch `authReady` exactly once, whichever source answers first. */
    function settle() {
      if (cancelled || settled) return;
      settled = true;
      clearTimeout(ceiling);
      authResolved();
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
      useAuthStore.getState().setRoleError('Session verification timed out. Please retry.');
      settle();
    }, 15_000);

    // 1. Restore an existing session.
    //
    // PortalBoundary owns routing after restoration, before content mounts.
    supabase.auth.getSession()
      .then(async ({ data: { session: restored } }) => {
        if (cancelled || authEventVersion > 0) return;
        setSession(restored);
        setUser(restored?.user ?? null);

        if (restored?.user) {
          const role = await fetchAndSetUserRole(restored.user);
          if (cancelled || useAuthStore.getState().user?.id !== restored.user.id) return;
          roleForUserId.current = restored.user.id;
          cachedRole.current = role;
        } else {
          setUserRole(null);
        }
        settle();
      })
      .catch((err) => {
        console.error('[auth] getSession failed:', err);
        if (!cancelled && authEventVersion === 0) useAuthStore.getState().setRoleError('Could not restore your session. Please retry.');
        settle();
      });

    // 2. Track auth state changes for the rest of the session.
    const roleTimers = new Set<ReturnType<typeof setTimeout>>();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      authEventVersion += 1;

      setSession(nextSession);
      const currentUser = nextSession?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setUserRole(null);
        roleForUserId.current = null;
        cachedRole.current = null;
        settle();
        return;
      }

      // Release Supabase's auth callback lock before queries ask for its token.
      // Awaiting database work inside that callback can stall sign-in/navigation.
      const timer = setTimeout(async () => {
        roleTimers.delete(timer);
        if (cancelled || useAuthStore.getState().user?.id !== currentUser.id) return;
        try {
          // Token refresh and profile edits can reuse this account's verified role.
          const isRefresh = event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED';
          const sameUser = roleForUserId.current === currentUser.id;
          const role = isRefresh && sameUser && cachedRole.current
            ? cachedRole.current
            : await fetchAndSetUserRole(currentUser);

          if (cancelled || useAuthStore.getState().user?.id !== currentUser.id) return;
          roleForUserId.current = currentUser.id;
          cachedRole.current = role;
          settle();

          if (event === 'SIGNED_IN' && takeOAuthPendingFlag()) landAfterLogin(role);
        } catch {
          // Keep the account unresolved and expose retry UI instead of guessing a role.
          settle();
        }
      }, 0);
      roleTimers.add(timer);
    });

    return () => {
      cancelled = true;
      clearTimeout(ceiling);
      subscription.unsubscribe();
      roleTimers.forEach(clearTimeout);
    };
  }, []);

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
        role = await fetchAndSetUserRole(u);
        roleForUserId.current = u.id;
        cachedRole.current = role;
      }
      toast.success(`Welcome back, ${u?.email || 'User'}!`);
      useAuthStore.getState().closeAuthModal();
      return { success: true, role };
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Login error');
      return { success: false };
    }
  }, []);

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
      const role: UserRole = 'customer';
      if (u) {
        // The DB trigger sets profiles.role='admin' for owner email addresses
        // at insert time. Client-side email checks were removed from this module
        // (they exposed emails in the bundle); the DB is the authoritative source.
        await supabase.from('profiles').insert([{
          id: u.id, email: u.email || email, full_name: name || '', phone: phone || '', role,
        }]);
        useAuthStore.getState().setUserRole(role);
        roleForUserId.current = u.id;
        cachedRole.current = role;
      }
      toast.success('Account created successfully');
      useAuthStore.getState().closeAuthModal();
      return { success: true, role };
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Signup error');
      return { success: false };
    }
  }, []);

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
  ): Promise<{
    success: boolean;
    role?: UserRole;
    isNewUser?: boolean;
    hasDetails?: boolean;
    profile?: { full_name: string; email: string; phone: string } | null;
  }> => {
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

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: payload.tokenHash as string,
        type: 'magiclink',
      });

      const signedInUser = data?.user;
      if (error || !signedInUser) {
        console.error('[auth] phone session exchange failed:', error?.message);
        toast.error('Could not sign you in. Please request a new code.');
        return { success: false };
      }

      // Imported here rather than at the top of the file on purpose. This
      // provider is mounted by the root layout, so a static import puts the
      // whole Firebase auth SDK in the JavaScript every page ships — the menu,
      // the cart, the home page — for a module only ever reached at the end of
      // a phone sign-in. By this line the OTP screen has already loaded it, so
      // the import resolves from cache and costs nothing.
      const { endFirebaseSession } = await import('@/lib/firebase');
      await endFirebaseSession();

      const role = await fetchAndSetUserRole(signedInUser);
      roleForUserId.current = signedInUser.id;
      cachedRole.current = role;

      if (payload.hasDetails) {
        toast.success(
          payload.isNewUser
            ? 'Welcome to Pala Pitta Ruchulu!'
            : `Welcome back${payload.profile?.full_name ? `, ${payload.profile.full_name}` : ''}!`
        );
        useAuthStore.getState().closeAuthModal();
      }

      return {
        success: true,
        role,
        isNewUser: payload.isNewUser,
        hasDetails: payload.hasDetails,
        profile: payload.profile,
      };
    } catch (err) {
      console.error('[auth] phone sign-in error:', err);
      toast.error(getErrorMessage(err) || 'Sign-in failed. Please try again.');
      return { success: false };
    }
  }, []);

  /**
   * Saves the customer's own name, email and phone.
   *
   * The access token is read from the Supabase client at call time rather than
   * from the store copy. Those two disagree for a moment right after a phone
   * sign-in: `verifyOtp` has already produced a session, but the SIGNED_IN
   * event that copies it into the store has not been delivered yet — which is
   * exactly when the "complete your profile" step submits. Reading it live
   * means the request always carries a token, so the route can insist on one.
   */
  const updateUserProfile = useCallback(async (
    fullName: string, email: string, phone?: string
  ): Promise<boolean> => {
    try {
      const { data: { session: current } } = await supabase.auth.getSession();
      const accessToken = current?.access_token;

      if (!accessToken) {
        toast.error('Your session has expired. Please sign in again.');
        return false;
      }

      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ fullName, email, phone }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(payload?.error || 'Could not update profile. Please try again.');
        return false;
      }

      if (payload.user) {
        useAuthStore.getState().setUser(payload.user);
      }

      toast.success('Profile updated');
      useAuthStore.getState().closeAuthModal();
      return true;
    } catch (err) {
      console.error('[auth] update profile error:', err);
      toast.error(getErrorMessage(err) || 'Profile update failed.');
      return false;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        try { window.sessionStorage.setItem(OAUTH_PENDING_KEY, '1'); } catch { /* storage disabled */ }
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      });
      if (error) {
        takeOAuthPendingFlag();
        toast.error(error.message || 'Google sign in failed');
      }
    } catch (err) {
      takeOAuthPendingFlag();
      toast.error(getErrorMessage(err) || 'Google login error');
    }
  }, []);

  const signOutUser = useCallback(async () => {
    useAuthStore.getState().signOutStarted();
    const wasStaff = isStaffRole(cachedRole.current);
    try {
      await supabase.auth.signOut();
      roleForUserId.current = null;
      cachedRole.current = null;
      toast.success('Logged out successfully');

      if (wasStaff && typeof window !== 'undefined') {
        window.location.replace('/login?redirect=%2Fadmin');
        return;
      }
      useAuthStore.getState().signOut();
    } catch {
      useAuthStore.getState().signOut();
      toast.error('Logout error');
    }
  }, []);

  const openModal = useCallback((tab?: 'login' | 'signup') => {
    useAuthStore.getState().openAuthModal(tab);
  }, []);
  const closeModal = useCallback(() => {
    useAuthStore.getState().closeAuthModal();
  }, []);
  const fetchUserRole = useCallback((u: User) => fetchAndSetUserRole(u), []);

  const contextValue = useMemo(() => ({
    user, session, userRole, loading, isAuthModalOpen, authModalTab,
    signInWithEmail, signUpWithEmail, signInWithPhoneToken, updateUserProfile, signInWithGoogle, signOutUser,
    fetchUserRole,
    openAuthModal: openModal,
    closeAuthModal: closeModal,
  }), [
    user, session, userRole, loading, isAuthModalOpen, authModalTab,
    signInWithEmail, signUpWithEmail, signInWithPhoneToken, updateUserProfile, signInWithGoogle, signOutUser,
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
