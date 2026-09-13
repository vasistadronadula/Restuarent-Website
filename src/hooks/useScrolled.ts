'use client';

import { useEffect, useState } from 'react';

/**
 * True once the page has scrolled past `threshold` px.
 *
 * rAF-throttled so a fling doesn't setState once per pixel. Each call site
 * owns its listener — the subscribers are few and page-lived, so a shared
 * singleton would be bookkeeping without a payoff. SSR snapshot is always
 * `false`, which matches the server render of a page sitting at the top.
 */
export function useScrolled(threshold = 40): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y =
        window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setScrolled(y > threshold);
    };
    const handler = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };
    window.addEventListener('scroll', handler, { passive: true });
    document.addEventListener('scroll', handler, { passive: true });
    handler(); // initial check
    return () => {
      window.removeEventListener('scroll', handler);
      document.removeEventListener('scroll', handler);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}
