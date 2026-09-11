import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
});

import { getCartDiscountAmount, useCartStore } from './useCartStore';
import type { MenuItem } from '@/types';

const dish: MenuItem = {
  id: 'dish', name: 'Rice', price: 100, category: 'rice', vegStatus: 'veg',
  description: '', rating: 0, reviewCount: 0, image: '', isPopular: false,
  isAvailable: true, isSpecial: false, tags: [], maxQuantity: 3,
};

beforeEach(() => useCartStore.getState().clearCart());

describe('cart pricing and reconciliation', () => {
  it('does not invent a cap for an uncapped coupon', () => {
    expect(getCartDiscountAmount(5000, 10, 0)).toBe(500);
    expect(getCartDiscountAmount(5000, 10, 200)).toBe(200);
  });
  it('removes stale items when the live menu is empty', () => {
    useCartStore.getState().addItem(dish);
    expect(useCartStore.getState().reconcileWithMenu([]).removed).toEqual(['Rice']);
    expect(useCartStore.getState().items).toEqual([]);
  });
  it('enforces a dish cap across portions, including quantity increases', () => {
    const cart = useCartStore.getState();
    cart.addItem({ ...dish, selectedPortion: 'single' }, 2);
    cart.addItem({ ...dish, selectedPortion: 'large' }, 2);
    cart.increaseQty('dish', 'large');
    expect(useCartStore.getState().items.map((line) => line.quantity)).toEqual([2, 1]);
  });
  it('refreshes and applies quantity limits even when the price has not changed', () => {
    const cart = useCartStore.getState();
    cart.addItem({ ...dish, maxQuantity: undefined }, 5);
    expect(cart.reconcileWithMenu([dish]).quantityAdjusted).toEqual(['Rice']);
    expect(useCartStore.getState().items[0]).toMatchObject({ quantity: 3, maxQuantity: 3 });
  });
  it('removes a selected portion that has been discontinued', () => {
    const cart = useCartStore.getState();
    cart.addItem({ ...dish, selectedPortion: 'single', portionPrices: { single: 60, full: 100 } });
    expect(cart.reconcileWithMenu([dish]).removed).toEqual(['Rice']);
    expect(useCartStore.getState().items).toEqual([]);
  });
  it('keeps the default full portion of a dish without portion choices', () => {
    const cart = useCartStore.getState();
    cart.addItem({ ...dish, selectedPortion: 'full' });
    expect(cart.reconcileWithMenu([dish]).removed).toEqual([]);
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
