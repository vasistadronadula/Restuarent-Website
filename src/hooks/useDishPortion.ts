'use client';

import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { toast } from 'sonner';
import type { MenuItem } from '@/types';
import { useCartStore } from '@/store/useCartStore';
import { flyToCart } from '@/lib/flyToCart';

export type Portion = 'single' | 'full' | 'large';

const PORTION_ORDER: Portion[] = ['single', 'full', 'large'];

/** Short labels for the portion pills — the full words don't fit a phone. */
export const PORTION_LABELS: Record<Portion, string> = {
  single: 'Single',
  full: 'Full',
  large: 'Large',
};

/**
 * Everything a dish card needs to put a dish in the cart.
 *
 * Three surfaces now render dishes — the menu grid, the home page's "top
 * picks" rail and the home page's menu list — and each has to agree with the
 * others about what gets added, or the same dish arrives in the cart twice
 * under two slightly different names. The naming rule (portion suffixed only
 * when the dish actually has more than one) and the id+portion match used to
 * find the existing cart row are the parts that must not drift, so they are
 * defined once, here.
 */
export function useDishPortion(item: MenuItem) {
  const availablePortions = useMemo<Portion[]>(
    () => (item.portionPrices
      ? PORTION_ORDER.filter((p) => item.portionPrices?.[p] !== undefined)
      : []),
    [item.portionPrices],
  );

  const [selectedPortion, setSelectedPortion] = useState<Portion>(() => {
    if (availablePortions.length === 0) return 'full';
    return availablePortions.includes('full') ? 'full' : availablePortions[0];
  });

  const hasPortions = availablePortions.length > 1;
  const activePrice = item.portionPrices?.[selectedPortion] ?? item.price;

  const cartItems = useCartStore((s) => s.items);
  const cartItem = cartItems.find(
    (i) => i.id === item.id && (i.selectedPortion || 'full') === selectedPortion,
  );

  /**
   * Pass the click event through and the dish flies from the button that was
   * pressed to the cart icon. Every surface that renders a dish goes through
   * this one function, so wiring the animation here covers the menu grid, the
   * home page rail and the dish list at once — and a caller that has no event
   * to give (a keyboard-driven add, say) still adds the item, just without the
   * flight.
   */
  const add = (event?: MouseEvent<HTMLElement>) => {
    const name = hasPortions ? `${item.name} (${selectedPortion.toUpperCase()})` : item.name;
    useCartStore.getState().addItem({
      ...item,
      price: activePrice,
      selectedPortion,
      selectedPrice: activePrice,
      name,
    });

    flyToCart({ source: event?.currentTarget, imageUrl: item.image });

    // Shorter than the default and anchored to the dish, because the flight
    // is now doing the work of saying "this went in the cart"; the toast is
    // just the accessible, readable confirmation of the same event.
    toast.success(`${name} added to cart`, { duration: 1800 });
  };

  const increase = () => { if (cartItem) useCartStore.getState().increaseQty(cartItem.id); };
  const decrease = () => { if (cartItem) useCartStore.getState().decreaseQty(cartItem.id); };

  return {
    availablePortions,
    hasPortions,
    selectedPortion,
    setSelectedPortion,
    activePrice,
    cartItem,
    add,
    increase,
    decrease,
  };
}
