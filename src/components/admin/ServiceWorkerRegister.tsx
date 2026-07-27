'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { receivesNotifications } from '@/lib/roleAccess';
import { syncExistingSubscription } from '@/lib/pushClient';

/**
 * Registers the staff app's service worker (needed for offline shell and to
 * receive Web Push at all), then keeps this device's push subscription in
 * sync — but only for a role that gets notifications and only once
 * permission has already been granted.
 *
 * The permission prompt itself lives in the install dialog, behind a button
 * (see lib/pushClient.ts). Asking here, on page load, meant the request had
 * no user gesture behind it — which browsers increasingly auto-block, and a
 * block is far harder for staff to reverse than a prompt they chose to open.
 *
 * Which event reaches which role is decided server-side when a push is sent
 * (lib/pushNotify.ts): orders to cashier + chef, reservations to servers.
 * Mounted only inside AdminLayout — never runs for customer sessions.
 */
export default function ServiceWorkerRegister() {
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        // Scope '/admin' (no trailing slash) also covers the dashboard at
        // exactly /admin, which the app's start_url points at for admins;
        // the old '/admin/' scope did not, so that page was never offline-
        // capable. Drop the stale registration first, otherwise the device
        // ends up with two service workers and two push subscriptions.
        const existing = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          existing
            .filter((reg) => reg.scope.endsWith('/admin/'))
            .map((reg) => reg.unregister())
        );

        await navigator.serviceWorker.register('/sw.js', { scope: '/admin' });
        if (cancelled || !user || !receivesNotifications(userRole)) return;
        await syncExistingSubscription(user.id);
      } catch (err) {
        console.warn('Service worker registration failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, userRole]);

  return null;
}
