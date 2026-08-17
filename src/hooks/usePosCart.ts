'use client';

import { useCallback, useMemo, useReducer, useEffect, useRef } from 'react';
import type { MenuItem, PortionPrices, VegStatus } from '@/types';

/**
 * usePosCart — counter bill line items state machine with localStorage persistence.
 */

export type Portion = 'single' | 'full' | 'large';

export const PORTION_LABEL: Record<Portion, string> = {
  single: 'Half',
  full: 'Full',
  large: 'Large',
};

/** Max items on a single line */
export const MAX_LINE_QTY = 99;

const POS_CART_STORAGE_KEY = 'ppr:pos:cart';

export interface PosLine {
  /** menuItemId + portion — two portions of one dish are separate lines. */
  key: string;
  menuItemId: string;
  /** Display name including portion */
  name: string;
  unitPrice: number;
  quantity: number;
  vegStatus: VegStatus;
  portion?: Portion;
  image?: string;
  notes?: string;
}

type Action =
  | { type: 'hydrate'; lines: PosLine[] }
  | { type: 'add'; line: Omit<PosLine, 'quantity'>; quantity?: number }
  | { type: 'increment'; key: string }
  | { type: 'decrement'; key: string }
  | { type: 'setQuantity'; key: string; quantity: number }
  | { type: 'setNotes'; key: string; notes: string }
  | { type: 'remove'; key: string }
  | { type: 'clear' };

const clampQty = (n: number) => Math.min(Math.max(Math.trunc(n), 1), MAX_LINE_QTY);

function reducer(state: PosLine[], action: Action): PosLine[] {
  switch (action.type) {
    case 'hydrate':
      return action.lines;
    case 'add': {
      const existing = state.find((l) => l.key === action.line.key);
      const step = action.quantity ?? 1;
      if (existing) {
        return state.map((l) =>
          l.key === action.line.key ? { ...l, quantity: clampQty(l.quantity + step) } : l
        );
      }
      return [...state, { ...action.line, quantity: clampQty(step) }];
    }
    case 'increment':
      return state.map((l) =>
        l.key === action.key ? { ...l, quantity: clampQty(l.quantity + 1) } : l
      );
    case 'decrement': {
      // 1. Direct key match (e.g. dish123::full)
      const exactIdx = state.findIndex((l) => l.key === action.key);
      if (exactIdx !== -1) {
        const line = state[exactIdx];
        return line.quantity <= 1
          ? state.filter((_, i) => i !== exactIdx)
          : state.map((l, i) => (i === exactIdx ? { ...l, quantity: l.quantity - 1 } : l));
      }

      // 2. Fallback: menuItemId match (e.g. dish123)
      const menuIdx = state.findLastIndex((l) => l.menuItemId === action.key);
      if (menuIdx !== -1) {
        const line = state[menuIdx];
        return line.quantity <= 1
          ? state.filter((_, i) => i !== menuIdx)
          : state.map((l, i) => (i === menuIdx ? { ...l, quantity: l.quantity - 1 } : l));
      }

      return state;
    }
    case 'setQuantity': {
      if (!Number.isFinite(action.quantity) || action.quantity < 1) {
        return state.filter((l) => l.key !== action.key);
      }
      return state.map((l) =>
        l.key === action.key ? { ...l, quantity: clampQty(action.quantity) } : l
      );
    }
    case 'setNotes': {
      return state.map((l) =>
        l.key === action.key ? { ...l, notes: action.notes.trim() || undefined } : l
      );
    }
    case 'remove':
      return state.filter((l) => l.key !== action.key);
    case 'clear':
      return [];
    default:
      return state;
  }
}

/** The portions a dish is actually sold in, with real prices. */
export function sellablePortions(item: MenuItem): { portion: Portion; price: number }[] {
  const prices = item.portionPrices as PortionPrices | undefined;
  if (!prices) return [];
  return (['single', 'full', 'large'] as Portion[])
    .filter((p) => typeof prices[p] === 'number' && (prices[p] as number) > 0)
    .map((p) => ({ portion: p, price: prices[p] as number }));
}

export interface AddResult {
  ok: boolean;
  reason?: string;
}

export function usePosCart() {
  const [lines, dispatch] = useReducer(reducer, [] as PosLine[]);
  const hasHydrated = useRef(false);

  // Restore cart on mount from localStorage
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(POS_CART_STORAGE_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          dispatch({ type: 'hydrate', lines: parsed });
        }
      }
    } catch (e) {
      console.error('Failed to restore POS cart:', e);
    } finally {
      hasHydrated.current = true;
    }
  }, []);

  // Save cart to localStorage on changes after hydration
  useEffect(() => {
    if (!hasHydrated.current) return;
    try {
      if (typeof window !== 'undefined') {
        if (lines.length > 0) {
          localStorage.setItem(POS_CART_STORAGE_KEY, JSON.stringify(lines));
        } else {
          localStorage.removeItem(POS_CART_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to persist POS cart:', e);
    }
  }, [lines]);

  const add = useCallback((item: MenuItem, portion?: Portion): AddResult => {
    const portions = sellablePortions(item);

    // If no portion specified, check if there's already a line for this dish in cart
    let targetPortion = portion;
    if (!targetPortion && portions.length > 0) {
      const existingLine = lines.find((l) => l.menuItemId === item.id);
      if (existingLine && existingLine.portion) {
        targetPortion = existingLine.portion;
      } else {
        // Default to first portion available
        targetPortion = portions[0].portion;
      }
    }

    const chosen = targetPortion ? portions.find((p) => p.portion === targetPortion) : undefined;

    if (portion && !chosen) {
      return { ok: false, reason: `${item.name} isn't sold as ${PORTION_LABEL[portion]}` };
    }

    const unitPrice = chosen ? chosen.price : item.price;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return { ok: false, reason: `${item.name} has no price set — fix it in Menu Management` };
    }

    const key = chosen ? `${item.id}::${chosen.portion}` : item.id;
    const name = chosen && portions.length > 1
      ? `${item.name} (${PORTION_LABEL[chosen.portion]})`
      : item.name;

    dispatch({
      type: 'add',
      line: {
        key,
        menuItemId: item.id,
        name,
        unitPrice,
        vegStatus: item.vegStatus,
        portion: chosen?.portion,
        image: item.image,
      },
    });
    return { ok: true };
  }, [lines]);

  const increment = useCallback((key: string) => dispatch({ type: 'increment', key }), []);
  const decrement = useCallback((key: string) => dispatch({ type: 'decrement', key }), []);
  const remove = useCallback((key: string) => dispatch({ type: 'remove', key }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const setQuantity = useCallback(
    (key: string, quantity: number) => dispatch({ type: 'setQuantity', key, quantity }),
    []
  );
  const setNotes = useCallback(
    (key: string, notes: string) => dispatch({ type: 'setNotes', key, notes }),
    []
  );

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines]
  );

  const totalUnits = useMemo(
    () => lines.reduce((n, l) => n + l.quantity, 0),
    [lines]
  );

  /** How many of each dish are on the bill, for the badge on its card. */
  const quantityByMenuItem = useMemo(() => {
    const map: Record<string, number> = {};
    lines.forEach((l) => {
      map[l.menuItemId] = (map[l.menuItemId] || 0) + l.quantity;
    });
    return map;
  }, [lines]);

  /** Quantity by menuItemId + portion key (e.g. "dish123::full") */
  const quantityByPortion = useMemo(() => {
    const map: Record<string, number> = {};
    lines.forEach((l) => {
      const key = l.portion ? `${l.menuItemId}::${l.portion}` : l.menuItemId;
      map[key] = (map[key] || 0) + l.quantity;
    });
    return map;
  }, [lines]);

  return {
    lines,
    subtotal,
    totalUnits,
    quantityByMenuItem,
    quantityByPortion,
    add,
    increment,
    decrement,
    setQuantity,
    setNotes,
    remove,
    clear,
  };
}
