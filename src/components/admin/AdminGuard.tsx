'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import {
  selectUser, selectUserRole, selectAuthReady, selectIsSigningOut,
} from '@/store/authSlice';
import { Box, CircularProgress, Typography } from '@mui/material';
import toast from 'react-hot-toast';
import { adminColors } from '@/theme/adminColors';
import { canAccess, getRoleHome, isStaffRole } from '@/lib/roleAccess';

/**
 * AdminGuard — auth gate for every /admin/* route (and /cashier).
 *
 * Three rules, in order of importance:
 *
 * 1. NEVER render an "Access Denied" page. On a cold load the store is
 *    briefly user=null while Supabase restores the session from localStorage,
 *    and rendering the denial state during that window flashed a full-screen
 *    403 at legitimate staff every single time they opened the dashboard.
 *    Denial is a redirect, not a destination — the only thing this component
 *    ever renders besides the page itself is a spinner.
 *
 * 2. Decide only once `authReady` is set. That flag is a one-way latch set
 *    when the initial session check produces an answer (see authSlice), which
 *    replaced an earlier guess-a-timeout approach: any fixed delay is either
 *    too short on a slow connection (evicting valid staff) or dead time on a
 *    fast one.
 *
 * 3. Real security lives in the Supabase RLS policies. This guard is UX.
 */

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const user       = useAppSelector(selectUser);
  const userRole   = useAppSelector(selectUserRole);
  const authReady  = useAppSelector(selectAuthReady);
  const signingOut = useAppSelector(selectIsSigningOut);
  const router     = useRouter();
  const pathname   = usePathname();

  // Stops a second toast + a second router.replace firing between the effect
  // running and the navigation actually committing.
  const isRedirecting = useRef(false);

  const isStaff          = isStaffRole(userRole);
  const hasSectionAccess = isStaff && canAccess(userRole, pathname);
  const allowed          = !!user && hasSectionAccess;

  // ── Redirect effect ────────────────────────────────────────────────────
  useEffect(() => {
    if (!authReady) return;
    // Sign-out owns its own navigation and shows its own toast.
    if (signingOut) return;
    if (isRedirecting.current) return;
    if (allowed) return;

    isRedirecting.current = true;

    if (!user || !isStaff) {
      toast.error('Please log in with your staff account.', { id: 'admin-denied', duration: 3000 });
      router.replace('/');
      return;
    }

    toast.error("Your role doesn't have access to this section.", {
      id: 'admin-section-denied', duration: 3000,
    });
    router.replace(getRoleHome(userRole));
  }, [authReady, signingOut, allowed, user, isStaff, userRole, router]);

  // Navigation committed — re-arm for the next decision.
  useEffect(() => { isRedirecting.current = false; }, [pathname]);

  // ── Render ─────────────────────────────────────────────────────────────
  if (!authReady) return <LoadingScreen message="Verifying access…" />;
  if (signingOut) return <LoadingScreen message="Signing you out…" />;
  // Redirect is in flight — a spinner, never an error page.
  if (!allowed)  return <LoadingScreen message="Redirecting…" />;

  return <>{children}</>;
}

// ── Shared loading UI ──────────────────────────────────────────────────────
function LoadingScreen({ message }: { message: string }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: adminColors.bgPanel,
        color: adminColors.textPrimary,
        gap: 2.5,
      }}
    >
      <CircularProgress size={44} thickness={4} sx={{ color: adminColors.accentOrange }} />
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: adminColors.textMuted, letterSpacing: 0.3 }}
      >
        {message}
      </Typography>
    </Box>
  );
}
