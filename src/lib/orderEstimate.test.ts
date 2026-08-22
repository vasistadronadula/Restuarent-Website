import { describe, expect, it } from 'vitest';
import { buildPrepTimeMap, estimateOrderMinutes } from './orderEstimate';
import type { MenuItem, PersistedOrderItem } from '@/types';

const foodItem: PersistedOrderItem = { menuItemId: 'M-1', name: 'Chicken Biryani', price: 320, quantity: 1 };
const dessertItem: PersistedOrderItem = { menuItemId: 'M-2', name: 'Qubani Ka Meetha', price: 120, quantity: 1 };
const beverageItem: PersistedOrderItem = { menuItemId: 'M-3', name: 'Badam Milk', price: 90, quantity: 1 };

describe('estimateOrderMinutes', () => {
  it('returns undefined once the order is delivered or cancelled — nothing left to estimate', () => {
    const emptyMap = new Map<string, number>();
    expect(estimateOrderMinutes({ status: 'delivered', items: [foodItem], delayMinutes: 0 }, emptyMap)).toBeUndefined();
    expect(estimateOrderMinutes({ status: 'cancelled', items: [foodItem], delayMinutes: 0 }, emptyMap)).toBeUndefined();
  });

  it('returns 0 once the order is ready for pickup', () => {
    const emptyMap = new Map<string, number>();
    expect(estimateOrderMinutes({ status: 'ready', items: [foodItem], delayMinutes: 0 }, emptyMap)).toBe(0);
  });

  it('falls back to a category-appropriate default when no menu prep time is known', () => {
    const emptyMap = new Map<string, number>();
    expect(estimateOrderMinutes({ status: 'pending', items: [foodItem], delayMinutes: 0 }, emptyMap)).toBe(15);
    expect(estimateOrderMinutes({ status: 'pending', items: [dessertItem], delayMinutes: 0 }, emptyMap)).toBe(8);
    expect(estimateOrderMinutes({ status: 'pending', items: [beverageItem], delayMinutes: 0 }, emptyMap)).toBe(5);
  });

  it('uses the slowest dish on the ticket, not an average', () => {
    const map = buildPrepTimeMap([
      { id: 'M-1', prepTime: 25 } as MenuItem,
      { id: 'M-3', prepTime: 5 } as MenuItem,
    ]);
    // Mixed food + beverage order: classifyOrderCategory calls this 'food'
    // (food wins whenever any food item is present), so the default for an
    // unmapped line would be 15 — but both lines here ARE mapped, and the
    // slower one (25) should win regardless of order.
    expect(estimateOrderMinutes({ status: 'pending', items: [beverageItem, foodItem], delayMinutes: 0 }, map)).toBe(25);
  });

  it('adds kitchen delay minutes on top of the base prep time', () => {
    const emptyMap = new Map<string, number>();
    const base = estimateOrderMinutes({ status: 'pending', items: [foodItem], delayMinutes: 0 }, emptyMap)!;
    const delayed = estimateOrderMinutes({ status: 'pending', items: [foodItem], delayMinutes: 10 }, emptyMap)!;
    expect(delayed).toBe(base + 10);
  });

  it('counts down once cooking has started, with a 3-minute floor', () => {
    const emptyMap = new Map<string, number>();
    const pendingEstimate = estimateOrderMinutes({ status: 'pending', items: [foodItem], delayMinutes: 0 }, emptyMap)!;
    const preparingEstimate = estimateOrderMinutes({ status: 'preparing', items: [foodItem], delayMinutes: 0 }, emptyMap)!;
    expect(preparingEstimate).toBe(Math.max(3, pendingEstimate - 4));
  });
});

describe('buildPrepTimeMap', () => {
  it('only maps items with a truthy prepTime', () => {
    const map = buildPrepTimeMap([
      { id: 'A', prepTime: 12 } as MenuItem,
      { id: 'B', prepTime: 0 } as MenuItem,
      { id: 'C' } as MenuItem,
    ]);
    expect(map.get('A')).toBe(12);
    expect(map.has('B')).toBe(false);
    expect(map.has('C')).toBe(false);
  });
});
