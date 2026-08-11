'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { playOrderChimeSound } from '@/lib/audio';
import { receivesOrderNotifications, receivesReservationNotifications } from '@/lib/roleAccess';
import { queryKeys } from '@/lib/queries/keys';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Supabase Realtime → TanStack Query cache invalidation.
 *
 * This replaces the Redux `realtimeMiddleware`. All subscriptions stay
 * centralised in one place so a table is only ever listened to once, no matter
 * how many screens are reading it.
 *
 * Live alerts follow the same routing as push (see roleAccess.ts): only the
 * cashier/chef are alerted to orders and only the server to reservations. Admin
 * and manager watch the lists without being interrupted, and a customer session
 * is never alerted at all. The invalidation below stays unconditional — keeping
 * data fresh is not a notification.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Read the role from the store at event time rather than closing over it.
    // Subscribing to `userRole` here would tear down and rebuild all three
    // channels on every sign-in, and the resubscribe races the first event.
    const currentRole = () => useAuthStore.getState().userRole;

    const ordersChannel = supabase
      .channel('rq_realtime_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT' && receivesOrderNotifications(currentRole())) {
          playOrderChimeSound();
          toast.success('New order received', {
            description: `${payload.new?.customer_name || 'Customer'} · ₹${payload.new?.grand_total || 0}`,
            duration: 6000,
          });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.orders });
        queryClient.invalidateQueries({ queryKey: ['guest-orders'] });
      })
      .subscribe();

    const reservationsChannel = supabase
      .channel('rq_realtime_reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
        if (payload.eventType === 'INSERT' && receivesReservationNotifications(currentRole())) {
          playOrderChimeSound();
          toast.success('New reservation', {
            description: `${payload.new?.name || 'A diner'} booked a table`,
            duration: 6000,
          });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.reservations });
        // A booking also consumes a table slot, so the availability grid on the
        // reservation page has to be re-read — it used to keep offering a slot
        // that had just been taken.
        queryClient.invalidateQueries({ queryKey: queryKeys.allTableSlots });
      })
      .subscribe();

    const menuChannel = supabase
      .channel('rq_realtime_menu_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.menuItems });
      })
      .subscribe();

    const categoriesChannel = supabase
      .channel('rq_realtime_menu_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categories' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(menuChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [queryClient]);

  return <>{children}</>;
}
