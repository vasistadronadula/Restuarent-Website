'use client';

import { useMemo } from 'react';
import { useAdmin } from '@/context/AdminContext';
import type { AdminBadgeKey } from './adminNav';

/**
 * The live counters the sidebar prints next to nav labels.
 *
 * Deliberately two different numbers rather than one shared "open orders":
 * `pendingOrders` is what nobody has picked up yet (an action for the floor),
 * `kitchenTickets` is everything the pass is currently holding.
 */
export function useAdminBadges(): Record<AdminBadgeKey, number> {
  const { orders } = useAdmin();

  return useMemo(() => {
    let pendingOrders = 0;
    let kitchenTickets = 0;

    for (const o of orders) {
      if (o.status === 'pending') {
        pendingOrders++;
        kitchenTickets++;
      } else if (o.status === 'preparing') {
        kitchenTickets++;
      }
    }

    return { pendingOrders, kitchenTickets };
  }, [orders]);
}
