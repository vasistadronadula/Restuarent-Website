'use client';

/**
 * AuthContext.tsx
 * Thin Supabase Auth bridge — listens to auth state changes and dispatches to Redux authSlice.
 * Components consume auth state via useAppSelector (selectUser, selectUserRole, etc.) or useAuth().
 */

import React, { createContext, useContext, ReactNode, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { User } from '@supabase/supabase-js';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { AppDispatch } from '@/store';
import { getErrorMessage } from '@/lib/errors';
import { ROLE_HOME } from '@/lib/roleAccess';
import type { UserRole } from '@/types';
import {
  setUser, setSession, setUserRole, setLoading, openAuthModal, closeAuthModal, signOut,
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

interface AuthContextType {
  user: User | null;
  session: import('@supabase/supabase-js').Session | null;
  userRole: UserRole | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; role?: UserRole }>;
  signUpWithEmail: (email: string, pass: string, name?: string, phone?: string) => Promise<{ success: boolean; role?: UserRole }>;
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

  useEffect(() => {
    let resolved = false;

    // Safety fallback: ensure loading spinner is dismissed after 1.5s max
    const timer = setTimeout(() => {
      if (!resolved) {
        dispatch(setLoading(false));
      }
    }, 1500);

    // 1. Restore existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      resolved = true;
      dispatch(setSession(session));
      dispatch(setUser(session?.user ?? null));
      if (session?.user) {
        const role = await fetchAndSetUserRole(session.user, dispatch);
        if (role !== 'customer' && typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path === '/login' || path === '/signup') {
            window.location.href = ROLE_HOME[role];
          }
        }
      } else {
        dispatch(setUserRole(null));
      }
      dispatch(setLoading(false));
    }).catch(() => {
      resolved = true;
      dispatch(setLoading(false));
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      dispatch(setSession(session));
      const currentUser = session?.user ?? null;
      dispatch(setUser(currentUser));

      if (currentUser) {
        const role = await fetchAndSetUserRole(currentUser, dispatch);
        if (event === 'SIGNED_IN' && role !== 'customer' && typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path === '/' || path === '/login' || path === '/signup') {
            window.location.href = ROLE_HOME[role];
          }
        }
      } else {
        dispatch(setUserRole(null));
      }
      dispatch(setLoading(false));
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [dispatch]);

  // ─── Auth Methods ──────────────────────────────────────────────────────────

  const signInWithEmail = async (email: string, pass: string): Promise<{ success: boolean; role?: UserRole }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) { toast.error(error.message || 'Login failed.'); return { success: false }; }
      const u = data.user;
      let role: UserRole = 'customer';
      if (u) role = await fetchAndSetUserRole(u, dispatch);
      toast.success(`Welcome back, ${u?.email || 'User'}! 👋`);
      dispatch(closeAuthModal());
      if (role !== 'customer' && typeof window !== 'undefined') window.location.href = ROLE_HOME[role];
      return { success: true, role };
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Login error');
      return { success: false };
    }
  };

  const signUpWithEmail = async (
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
      }
      toast.success('Account created successfully! 🎉');
      dispatch(closeAuthModal());
      return { success: true, role };
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Signup error');
      return { success: false };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      });
      if (error) toast.error(error.message || 'Google sign in failed');
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Google login error');
    }
  };

  const signOutUser = async () => {
    try {
      await supabase.auth.signOut();
      dispatch(signOut());
      toast.success('Logged out successfully');
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        window.location.href = '/';
      }
    } catch {
      toast.error('Logout error');
    }
  };

  const openModal = (tab?: 'login' | 'signup') => dispatch(openAuthModal(tab));
  const closeModal = () => dispatch(closeAuthModal());

  const contextValue = useMemo(() => ({
    user, session, userRole, loading, isAuthModalOpen, authModalTab,
    signInWithEmail, signUpWithEmail, signInWithGoogle, signOutUser,
    fetchUserRole: (u: User) => fetchAndSetUserRole(u, dispatch),
    openAuthModal: openModal,
    closeAuthModal: closeModal,
  }), [user, session, userRole, loading, isAuthModalOpen, authModalTab]);

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
