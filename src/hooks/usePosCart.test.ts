// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { reconcilePosLines, restorePosLines, usePosCart, type PosLine } from './usePosCart';
import type { MenuItem } from '@/types';

const dish: MenuItem = { id: 'rice', name: 'Rice', price: 100, category: 'rice', description: '', image: '',
  rating: 0, reviewCount: 0, isPopular: false, isSpecial: false, isAvailable: true, vegStatus: 'veg', tags: [],
  portionPrices: { single: 100, full: 180 }, maxQuantity: 3 };
const line: PosLine = { key: 'rice::single', menuItemId: 'rice', name: 'Rice', unitPrice: 100, quantity: 1, portion: 'single', vegStatus: 'veg' };
beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('persisted POS tickets', () => {
  it('ignores invalid stored lines and clamps quantities instead of producing NaN totals', () => {
    expect(restorePosLines([null, { ...line, quantity: 'bad' }, { ...line, unitPrice: -1 }, { ...line, quantity: 1000 }]))
      .toEqual([{ ...line, quantity: 99, maxQuantity: undefined }]);
  });
  it('preserves a restored ticket through Strict Mode effect replay', () => {
    localStorage.setItem('ppr:pos:cart', JSON.stringify([line]));
    const { result } = renderHook(usePosCart, { wrapper: ({ children }) => React.createElement(React.StrictMode, null, children) });
    expect(result.current.lines).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('ppr:pos:cart')!)).toHaveLength(1);
    expect(result.current.subtotal).toBe(100);
  });
  it('enforces dish quantity limits across portions and rejects sold-out additions', () => {
    const { result } = renderHook(usePosCart);
    act(() => { result.current.add(dish, 'single'); result.current.add(dish, 'full'); });
    act(() => { result.current.increment('rice::single'); result.current.increment('rice::full'); });
    expect(result.current.totalUnits).toBe(3);
    act(() => expect(result.current.add({ ...dish, isAvailable: false }).ok).toBe(false));
  });
  it('updates stale prices and removes dishes or portions no longer sold', () => {
    expect(reconcilePosLines([line], [{ ...dish, portionPrices: { single: 120, full: 180 } }]))
      .toMatchObject({ changed: true, lines: [{ unitPrice: 120 }] });
    expect(reconcilePosLines([line], [{ ...dish, portionPrices: { full: 180 } }]).lines).toEqual([]);
    expect(reconcilePosLines([line], [{ ...dish, isAvailable: false }]).lines).toEqual([]);
  });
});
