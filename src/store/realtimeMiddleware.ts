/**
 * realtimeMiddleware.ts
 * Redux middleware that bridges Supabase Realtime events → RTK Query cache invalidation.
 * Centralizes ALL realtime subscriptions in one place.
 */

import type { Middleware } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase';
import { supabaseApi } from './supabaseApi';
import { showNotification } from './adminSlice';
import { playOrderChimeSound } from '@/lib/audio';
import toast from 'react-hot-toast';

// Action to trigger realtime setup (dispatched once from providers.tsx)
export const REALTIME_INIT = 'realtime/init';
export const REALTIME_TEARDOWN = 'realtime/teardown';

let channels: ReturnType<typeof supabase.channel>[] = [];

export const realtimeMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  const act = action as { type?: string };
  if (act.type === REALTIME_INIT) {
    // Cleanup any existing channels
    channels.forEach((ch) => supabase.removeChannel(ch));
    channels = [];

    // ── Orders channel ────────────────────────────────────────────────────
    const ordersChannel = supabase
      .channel('redux_realtime_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            playOrderChimeSound();
            toast.success(
              `🔔 NEW ORDER: ${payload.new?.customer_name || 'Customer'} (₹${payload.new?.grand_total || 0})`,
              { duration: 6000, icon: '🍽️' }
            );
            store.dispatch(showNotification({
              message: `🔔 Live order ${payload.new?.id || ''} arrived!`,
              type: 'success',
            }));
          }

          // Invalidate the Orders cache → RTK Query auto-refetches
          store.dispatch(supabaseApi.util.invalidateTags(['Orders']));
        }
      )
      .subscribe();

    // ── Reservations channel ─────────────────────────────────────────────
    const reservationsChannel = supabase
      .channel('redux_realtime_reservations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            playOrderChimeSound();
            toast.success(
              `📅 NEW RESERVATION: ${payload.new?.name || 'Diner'} booked a Table!`,
              { duration: 6000, icon: '🔔' }
            );
          }
          store.dispatch(supabaseApi.util.invalidateTags(['Reservations']));
        }
      )
      .subscribe();

    // ── Menu Items channel ───────────────────────────────────────────────
    const menuChannel = supabase
      .channel('redux_realtime_menu_items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          store.dispatch(supabaseApi.util.invalidateTags(['MenuItems']));
        }
      )
      .subscribe();

    channels = [ordersChannel, reservationsChannel, menuChannel];
    return next(action);
  }

  if (act.type === REALTIME_TEARDOWN) {
    channels.forEach((ch) => supabase.removeChannel(ch));
    channels = [];
    return next(action);
  }

  return next(action);
};
