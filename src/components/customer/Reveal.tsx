'use client';

import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'fade' | 'zoom';

/** Where the element starts before it settles into place. */
const START_TRANSFORM: Record<RevealDirection, string> = {
  up: 'translate3d(0, 28px, 0)',
  down: 'translate3d(0, -28px, 0)',
  left: 'translate3d(28px, 0, 0)',
  right: 'translate3d(-28px, 0, 0)',
  fade: 'none',
  zoom: 'scale(0.95)',
};

interface RevealProps {
  children: React.ReactNode;
  /** Direction the content travels from. Defaults to a gentle rise. */
  direction?: RevealDirection;
  /** Stagger, in ms, for items revealed as a group. */
  delay?: number;
  /** Transition length in ms. */
  duration?: number;
  /** Fraction of the element that must be on screen before it reveals. */
  threshold?: number;
  component?: React.ElementType;
  sx?: SxProps<Theme>;
  className?: string;
}

/**
 * Reveals its children once they scroll into view, then stops observing.
 *
 * Deliberately built on a CSS transition rather than an animation: a
 * transition's end state survives `prefers-reduced-motion: reduce` (which
 * globals.css collapses to ~0ms), so a reduced-motion visitor sees the
 * content in place instantly instead of seeing nothing at all.
 *
 * If IntersectionObserver is missing the content reveals immediately — the
 * page degrades to "no animation", never to "no content".
 */
export default function Reveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 620,
  threshold = 0.12,
  component = 'div',
  sx,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      // Deferred to the next frame rather than set inline: an observer
      // callback would have been asynchronous too, so this keeps both paths
      // behaving the same and avoids a re-render cascading out of the effect.
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        // Hold the reveal until the element is a little way past the fold, so
        // it animates where the eye already is rather than off at the edge.
        rootMargin: '0px 0px -8% 0px',
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <Box
      ref={ref}
      component={component}
      className={className}
      sx={[
        {
          opacity: shown ? 1 : 0,
          transform: shown ? 'none' : START_TRANSFORM[direction],
          transition: `opacity ${duration}ms cubic-bezier(0.22, 0.61, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 0.61, 0.36, 1) ${delay}ms`,
          // Without this the transformed subtree can be composited on its own
          // layer permanently; clearing it after the reveal keeps text crisp.
          willChange: shown ? 'auto' : 'opacity, transform',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
