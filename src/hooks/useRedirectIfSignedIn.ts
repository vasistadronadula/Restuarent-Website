'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/store/useAuthStore';
import { getRoleHome, isStaffRole } from '@/lib/roleAccess';

/**
 * Sends an already-signed-in visitor away from /login and /signup.
 *
 * Both pages used to render their form to anyone who asked, so a signed-in
 * customer who tapped a stale "Log in" link — or simply pressed Back after
 * signing in — was shown a login screen for the account they were already
 * using. Filling it in worked, which made it look intentional; it just signed
 * them in again.
 *
 * `authReady` rather than `loading` is what gates this. `loading` flips back
 * and forth on every hourly token refresh, and a guard keyed off it can observe
 * "not loading, no user" mid-refresh and conclude the wrong thing. `authReady`
 * latches once, when the first session check has actually produced an answer.
 *
 * The redirect is a soft `router.replace`: nothing is changing hands here, so
 * there is no shared-terminal reason for the hard navigation that
 * `landAfterLogin` does after a real sign-in — and `replace` keeps the login
 * page out of history either way.
 *
 * Note what this deliberately does *not* do: it does not hold the form back
 * while the session check runs. A login page that shows a spinner first is a
 * login page that is slow for the one visitor it exists for — the signed-out
 * one. The form paints immediately and only a visitor who turns out to have a
 * session gets moved.
 *
 * @param fallback where a customer goes; staff always go to their own dashboard.
 * @returns true once a session has been found and the redirect is in flight.
 */
export function useRedirectIfSignedIn(fallback: string): boolean {
  const router = useRouter();
  const authReady = useAuthStore((s) => s.authReady);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.userRole);
  const signingOut = useAuthStore((s) => s.signingOut);

  // Waiting for the role as well as the user: with a user but no role yet,
  // isStaffRole() answers "no" and a manager would be bounced to the storefront
  // instead of their dashboard.
  const shouldRedirect = authReady && !signingOut && Boolean(user) && Boolean(role);

  useEffect(() => {
    if (!shouldRedirect) return;
    router.replace(isStaffRole(role) ? getRoleHome(role) : fallback);
  }, [shouldRedirect, role, fallback, router]);

  return shouldRedirect;
}
