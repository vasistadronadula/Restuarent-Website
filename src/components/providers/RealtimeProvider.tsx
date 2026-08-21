'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { playOrderChimeSound } from '@/lib/audio';
import { receivesOrderNotifications, receivesReservationNotifications, isStaffRole } from '@/lib/roleAccess';
import { queryKeys } from '@/lib/queries/keys';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrderEventStore } from '@/store/useOrderEventStore';
import type { OrderStatus } from '@/types';

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
  // Coarse (staff vs. not) rather than the raw role, so this only flips —
  // and only re-subscribes the two staff-only channels below — on an actual
  // sign-in/sign-out, not on every role-shaped state change.
  const isStaff = useAuthStore((s) => isStaffRole(s.userRole));

  // Orders, menu items/categories and coupons matter to every visitor —
  // a guest browsing the menu still needs live prices/availability, and
  // anyone with an order in flight needs its status. These stay unconditional.
  useEffect(() => {
    // Read the role from the store at event time rather than closing over it.
    // Subscribing to `userRole` here would tear down and rebuild the channel
    // on every sign-in, and the resubscribe races the first event.
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
        // ['orders'] invalidates ['orders','mine',userId] too — TanStack Query
        // matches by key prefix, and useMyOrders()'s key starts with 'orders'.
        queryClient.invalidateQueries({ queryKey: queryKeys.orders });
        queryClient.invalidateQueries({ queryKey: ['guest-orders'] });

        // Fan out the raw event for anything that reacts per-order rather
        // than by re-reading the list — the customer /orders page's own
        // "kitchen updated your order" toast, specifically — instead of that
        // page opening a second subscription to this same table.
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new;
          useOrderEventStore.getState().publish({
            eventType: payload.eventType,
            orderId: row?.id as string,
            userId: (row?.user_id as string | null) ?? null,
            status: (row?.status as OrderStatus) || 'pending',
            delayMinutes: Number(row?.delay_minutes) || 0,
          });
        }
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

    const couponsChannel = supabase
      .channel('rq_realtime_coupons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.coupons });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(menuChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(couponsChannel);
    };
  }, [queryClient]);

  // Reservations and the table grid are staff-only concerns today — no
  // customer page reads or creates a reservation (see useCreateReservation's
  // only caller, AdminContext, which admin/tables uses on a walk-in's
  // behalf). A guest browsing the menu gained nothing from these two
  // sockets but a permanently-open, permanently-idle connection.
  useEffect(() => {
    if (!isStaff) return;

    const reservationsChannel = supabase
      .channel('rq_realtime_reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
        if (payload.eventType === 'INSERT' && receivesReservationNotifications(useAuthStore.getState().userRole)) {
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

    const tablesChannel = supabase
      .channel('rq_realtime_tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.tables });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_reservations' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.allTableSlots });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(tablesChannel);
    };
  }, [queryClient, isStaff]);

  return <>{children}</>;
}
