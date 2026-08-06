'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Created inside a `useState` initialiser rather than at module scope.
 *
 * A module-level client is shared by every request the Node process handles, so
 * on the server one diner's order list can be served out of another's cache.
 * One client per mount keeps that boundary intact, and `useState` means it
 * survives re-renders without being rebuilt.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Realtime pushes invalidations for orders, reservations and the
            // menu, so polling on window focus is mostly redundant work on a
            // POS tablet that gets focused constantly.
            refetchOnWindowFocus: false,
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            // One retry, not three. A cashier needs to see "this failed" fast
            // enough to act on it; three backed-off attempts hid a dead
            // connection behind twelve seconds of spinner.
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
