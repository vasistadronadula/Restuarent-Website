'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { MenuItem } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addItem, increaseQty, decreaseQty, selectCartItems } from '@/store/cartSlice';

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
  const dispatch = useAppDispatch();

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

  const cartItems = useAppSelector(selectCartItems);
  const cartItem = cartItems.find(
    (i) => i.id === item.id && (i.selectedPortion || 'full') === selectedPortion,
  );

  const add = () => {
    const name = hasPortions ? `${item.name} (${selectedPortion.toUpperCase()})` : item.name;
    dispatch(addItem({ ...item, price: activePrice, selectedPortion, selectedPrice: activePrice, name }));
    toast.success(`${name} added to cart!`, { icon: '🍽️' });
  };

  const increase = () => { if (cartItem) dispatch(increaseQty(cartItem.id)); };
  const decrease = () => { if (cartItem) dispatch(decreaseQty(cartItem.id)); };

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
