'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers the admin PWA's service worker and, once an admin is logged in
 * and hasn't already been asked, subscribes their device to Web Push so
 * they get alerted to new orders even when this tab isn't focused.
 * Mounted only inside AdminLayout — never runs for customer sessions.
 */
export default function ServiceWorkerRegister() {
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker.register('/sw.js', { scope: '/admin/' }).then(async (registration) => {
      if (cancelled) return;
      if (!user || userRole !== 'admin') return;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey || !('PushManager' in window)) return;

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
      }
      if (Notification.permission !== 'granted') return;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const keys = subscription.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) return;

      // Upsert-by-endpoint: re-running this on every login is harmless —
      // the unique constraint on `endpoint` means a re-subscribe just
      // no-ops instead of creating duplicate rows.
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: 'endpoint' }
      );
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });

    return () => {
      cancelled = true;
    };
  }, [user, userRole]);

  return null;
}
