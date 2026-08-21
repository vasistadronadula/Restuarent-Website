'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Route-transition chrome: the top accent bar and the scroll reset.
 *
 * This stays a `template.tsx` rather than moving into `layout.tsx` because it
 * needs the remount that only a template gives — the `animate-page-transition`
 * entry has to replay on every navigation, and a layout deliberately persists.
 * The cost of that remount is real, so nothing expensive should be added here:
 * it is two pieces of local state and no data.
 *
 * The bar used to be driven by four chained `setTimeout`s per navigation.
 * It's now two: one to hand off from the entry width to the full width (the
 * CSS transition does the travel), and one to clear the bar after the fade.
 * Same arc on screen, half the timers to get wrong.
 */
const ADVANCE_MS = 90;
const CLEAR_MS = 420;

type Phase = 'idle' | 'start' | 'finish';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    setPhase('start');

    const advance = setTimeout(() => setPhase('finish'), ADVANCE_MS);
    const clear = setTimeout(() => setPhase('idle'), CLEAR_MS);

    // Scroll to top on page transition. `instant` rather than `smooth`: a
    // navigation should present the new page already at the top, not animate
    // the old one away underneath it.
    window.scrollTo({ top: 0, behavior: 'instant' });

    return () => {
      clearTimeout(advance);
      clearTimeout(clear);
    };
  }, [pathname]);

  return (
    <div key={pathname} className="animate-page-transition relative w-full flex-1">
      {/* Top page-transition accent indicator */}
      {phase !== 'idle' && (
        <div
          aria-hidden
          className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-sm transition-all duration-300 ease-out pointer-events-none"
          style={{
            width: phase === 'start' ? '35%' : '100%',
            opacity: phase === 'finish' ? 0 : 1,
          }}
        />
      )}
      {children}
    </div>
  );
}
