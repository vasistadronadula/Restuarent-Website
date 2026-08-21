import { create } from 'zustand';
import type { OrderStatus } from '@/types';

/**
 * Broadcasts raw `orders` table realtime events to any UI that wants to react
 * to them (right now: the customer /orders page's "kitchen updated your
 * order" toast/chime).
 *
 * RealtimeProvider already holds the one Supabase Realtime subscription to
 * this table app-wide; before this store existed, /orders opened a *second*,
 * identical channel just to get the same payloads for its own toast logic —
 * two live sockets to the same table, doing the same job. Publishing the
 * event here instead lets any listener react without opening its own.
 */
export interface OrderRealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  orderId: string;
  userId: string | null;
  status: OrderStatus;
  delayMinutes: number;
  /** Strictly increasing, so the same status firing twice in a row (e.g. two
   *  delay bumps) is still a distinct event a `useEffect` can key off. */
  seq: number;
}

interface OrderEventState {
  lastEvent: OrderRealtimeEvent | null;
  publish: (event: Omit<OrderRealtimeEvent, 'seq'>) => void;
}

let seqCounter = 0;

export const useOrderEventStore = create<OrderEventState>((set) => ({
  lastEvent: null,
  publish: (event) => set({ lastEvent: { ...event, seq: ++seqCounter } }),
}));
