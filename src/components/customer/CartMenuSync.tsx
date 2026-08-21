'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { useMenuItems } from '@/lib/queries';
import { menuItems as fallbackMenuItems } from '@/data/menuData';
import { useCartStore } from '@/store/useCartStore';

/**
 * Keeps a restored cart honest about the current menu.
 *
 * The cart is persisted to localStorage with no expiry, so a customer can
 * come back days later to a cart full of dishes that have since been
 * delisted, sold out or repriced. Nothing checked: the stale rows rendered
 * at their stale prices, and because checkout builds its order payload from
 * exactly those rows, the stale price is what the customer was charged and
 * what the kitchen printed.
 *
 * Rendered only when there is something in the cart (see Providers), so a
 * first-time visitor doesn't pay for a menu fetch they have no use for.
 */
function CartMenuSyncInner() {
  const { data: menu, isSuccess } = useMenuItems();
  const reconcileWithMenu = useCartStore((s) => s.reconcileWithMenu);

  // One reconciliation per distinct menu payload. Without this the effect
  // re-runs on every render that touches the cart — including the set() it
  // performs itself.
  const lastReconciled = useRef<unknown>(null);

  useEffect(() => {
    if (!isSuccess || !menu || menu.length === 0) return;

    // `useMenuItems` answers with the bundled demo menu when Supabase is
    // unreachable. Reconciling against that would empty a perfectly good
    // cart because the customer's dishes aren't in the demo data — so an
    // offline moment must be a no-op, not a purge.
    if (menu === fallbackMenuItems) return;

    if (lastReconciled.current === menu) return;
    lastReconciled.current = menu;

    const { removed, repriced } = reconcileWithMenu(menu);

    if (removed.length > 0) {
      toast.warning(
        removed.length === 1
          ? `${removed[0]} is no longer available and was removed from your cart`
          : `${removed.length} items are no longer available and were removed from your cart`,
        { duration: 6000 }
      );
    }
    if (repriced.length > 0) {
      toast.info(
        repriced.length === 1
          ? `${repriced[0]} has been repriced — your cart total is updated`
          : `${repriced.length} items have been repriced — your cart total is updated`,
        { duration: 6000 }
      );
    }
  }, [isSuccess, menu, reconcileWithMenu]);

  return null;
}

export default function CartMenuSync() {
  const hasItems = useCartStore((s) => s.items.length > 0);
  return hasItems ? <CartMenuSyncInner /> : null;
}
