'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * SSR-safe media query subscription.
 *
 * `useSyncExternalStore` rather than `useState` + an effect: the server
 * snapshot is always `false`, so the server and the first client render agree,
 * and React swaps in the real value during hydration without an intermediate
 * paint. The MUI hook this replaces needed `{ noSsr: true }` at every call site
 * to get the same guarantee, and one missing flag rendered the desktop layout
 * on a phone for a frame.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
