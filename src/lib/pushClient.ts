'use client';

import { supabase } from './supabase';

/**
 * pushClient.ts — browser side of Web Push for the staff apps.
 *
 * Permission is only ever requested from `enablePushNotifications()`, which
 * the install dialog calls behind a button. Asking on page load (what this
 * used to do) is the pattern browsers penalise: Chrome can auto-block the
 * prompt outright, and a permission denied that way is very hard for a
 * staff member to undo. `syncExistingSubscription()` covers the already-
 * granted case on every later visit without showing anything.
 */

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied';

export function getPushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushState;
}

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
 * Subscribe this device and record it against the user, so the server can
 * push to it. Assumes permission is already granted; returns false if the
 * browser can't subscribe or the row couldn't be saved.
 */
async function subscribeDevice(userId: string): Promise<boolean> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return false;

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys?.auth) return false;

  // Upsert-by-endpoint: re-running this on every login is harmless — the
  // unique constraint on `endpoint` turns a re-subscribe into a no-op
  // instead of a duplicate row.
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: 'endpoint' }
  );

  return !error;
}

/**
 * Ask for notification permission and subscribe. Must be called from a user
 * gesture (a button click) — that's what makes the browser show the prompt
 * rather than silently suppress it.
 */
export async function enablePushNotifications(userId: string): Promise<PushState> {
  const state = getPushState();
  if (state === 'unsupported' || state === 'denied') return state;

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission as PushState;
  }

  await subscribeDevice(userId);
  return 'granted';
}

/**
 * Silent path for every visit after the first: if permission was already
 * granted, make sure this device still has a subscription row (they expire
 * and get pruned server-side). Never prompts.
 */
export async function syncExistingSubscription(userId: string): Promise<void> {
  if (getPushState() !== 'granted') return;
  try {
    await subscribeDevice(userId);
  } catch (err) {
    console.warn('Push re-subscribe failed:', err);
  }
}
