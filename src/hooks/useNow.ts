'use client';

import { useEffect, useState } from 'react';

/**
 * A ticking clock for the render tree. Components that display elapsed time
 * (order age, table occupancy, KDS lateness) read this instead of calling
 * `Date.now()` directly during render — a direct call there is impure and
 * is what the render-purity rule (and React's concurrent rendering, which
 * may call a render function more than once per commit) forbids.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
