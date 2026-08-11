/**
 * One place that names every cached collection.
 *
 * RTK Query's `tagTypes` used to serve this purpose; under TanStack Query the
 * equivalent is a key factory. Keeping the keys here rather than inline at each
 * `useQuery` call is what makes the realtime bridge possible — RealtimeProvider
 * has to invalidate "orders" without importing every hook that reads orders.
 */
export const queryKeys = {
  orders: ['orders'] as const,
  reservations: ['reservations'] as const,
  menuItems: ['menu-items'] as const,
  inventory: ['inventory'] as const,
  employees: ['employees'] as const,
  tables: ['tables'] as const,
  coupons: ['coupons'] as const,
  categories: ['menu-categories'] as const,
  /** Slot availability is per date+time, so it needs a parameterised key. */
  bookedTableSlots: (date: string, timeSlot: string) =>
    ['table-slots', date, timeSlot] as const,
  /** Every slot key, for blanket invalidation after a booking or release. */
  allTableSlots: ['table-slots'] as const,
} as const;
