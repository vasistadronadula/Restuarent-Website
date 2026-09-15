'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface RailCategory {
  id: string;
  label: string;
  image: string;
  count: number;
  /** Drawn instead of a photo. Used by the "All dishes" entry, which has no
      single dish that could represent it honestly. */
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * The horizontal strip of circular category photos.
 *
 * A photo rail rather than a row of text tabs because most of this menu's
 * category names — "Pulusu", "Vepudu", "Kodi Kura" — mean nothing to a
 * customer who hasn't eaten Telangana food before, and a picture of the dish
 * does the explaining that the word can't.
 *
 * Scrolls with the finger on a phone and with the arrow buttons on desktop,
 * where there is no touch and a hidden scrollbar would otherwise leave the
 * overflow unreachable.
 */
export default function CategoryRail({
  categories,
  activeId,
  onSelect,
  className,
}: {
  categories: RailCategory[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Starts optimistic (both true) rather than false — a false-to-true flip
  // after the first measurement is what makes an arrow visibly pop in a beat
  // after the rail renders; starting hidden (both false) instead would just
  // move that same flash to the common case of a rail that does overflow.
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollLeft(track.scrollLeft > 4);
    setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateScrollState();

    const onScroll = () => updateScrollState();
    track.addEventListener('scroll', onScroll, { passive: true });

    // Re-checks when the rail's own content changes width (category list
    // loads in, or the viewport is resized) — a plain resize listener misses
    // both.
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(track);

    return () => {
      track.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [categories.length]);

  // Keeps the active chip visible in the strip, not just active in state — a
  // deep link like /menu?category=desserts otherwise lands on a rail that's
  // still scrolled to its default left edge, with the highlighted chip
  // sitting off-screen to the right until the customer happens to swipe.
  //
  // Horizontal-only: scrollIntoView with block:'nearest' still nudges the
  // *page* vertically whenever the rail sits half under the sticky strip,
  // and it fires on every activeId change, fighting the customer's own
  // swipe mid-gesture. So: skip while the finger is down, skip when the chip
  // is already fully visible, and move only the track's scrollLeft.
  const userScrollingRef = useRef(false);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let cooldown: ReturnType<typeof setTimeout>;
    const mark = () => {
      userScrollingRef.current = true;
      clearTimeout(cooldown);
      cooldown = setTimeout(() => { userScrollingRef.current = false; }, 900);
    };
    track.addEventListener('touchstart', mark, { passive: true });
    track.addEventListener('wheel', mark, { passive: true });
    return () => {
      track.removeEventListener('touchstart', mark);
      track.removeEventListener('wheel', mark);
      clearTimeout(cooldown);
    };
  }, [categories.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || userScrollingRef.current) return;
    const activeButton = track.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!activeButton) return;
    const trackRect = track.getBoundingClientRect();
    const btnRect = activeButton.getBoundingClientRect();
    const fullyVisible =
      btnRect.left >= trackRect.left - 1 && btnRect.right <= trackRect.right + 1;
    if (fullyVisible) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target =
      track.scrollLeft + (btnRect.left - trackRect.left) - (track.clientWidth - btnRect.width) / 2;
    track.scrollTo({ left: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
  }, [activeId]);

  const nudge = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    // Two-thirds of a screenful, so a tap always leaves a partially visible
    // item on the leading edge — the cue that says the rail kept going.
    track.scrollBy({ left: direction * track.clientWidth * 0.66, behavior: 'smooth' });
  };

  if (categories.length === 0) return null;

  return (
    <div className={cn('relative', className)}>
      <div
        ref={trackRef}
        // `safe center`: the rail sits centred while it fits, and — unlike a
        // plain `justify-center`, which would clip the leading items out of
        // reach — falls back to a left-aligned scroller once it overflows.
        // The top padding is load-bearing: the active circle's ring + offset
        // draw ~5px outside the photo, and with overflow-x set the track
        // clips vertically — without it the ring's crown is cut flat.
        className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pt-1.5 pb-1 [justify-content:safe_center] sm:gap-6"
      >
        {categories.map((cat) => {
          const active = cat.id === activeId;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              aria-pressed={active}
              className="group flex w-[68px] shrink-0 snap-start flex-col items-center gap-2 outline-none sm:w-[84px]"
            >
              <span
                className={cn(
                  'relative grid size-[62px] place-items-center overflow-hidden rounded-full transition-all duration-200 sm:size-[76px]',
                  active
                    ? 'ring-brand ring-offset-store ring-[2.5px] ring-offset-2'
                    : 'ring-hair-1 ring-1 group-hover:ring-ink-4/50'
                )}
              >
                {cat.icon ? (
                  <span className="bg-brand-50 text-brand-600 grid size-full place-items-center">
                    <cat.icon className="size-6 sm:size-7" />
                  </span>
                ) : cat.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-pasted category photos come from arbitrary hosts, which next/image would need a remotePatterns entry per host for.
                  <img
                    src={cat.image}
                    alt={`${cat.label} dishes`}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="bg-brand-50 text-brand-700 grid size-full place-items-center text-[20px] font-extrabold">
                    {(cat.label || 'C')[0].toUpperCase()}
                  </span>
                )}
              </span>

              <span
                className={cn(
                  'line-clamp-2 text-center text-[11.5px] leading-tight',
                  active ? 'text-brand-700 font-extrabold' : 'text-ink-2 font-semibold'
                )}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop-only. On touch the finger already does this, and two extra
          buttons over a rail you can swipe is clutter. Each arrow only
          renders while there's somewhere left for it to take you — a rail
          that fits on screen, or one you've scrolled to the end of, showed a
          fully functional-looking button that did nothing when pressed. */}
      {canScrollLeft && <RailArrow side="left" onClick={() => nudge(-1)} />}
      {canScrollRight && <RailArrow side="right" onClick={() => nudge(1)} />}
    </div>
  );
}

function RailArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Scroll categories left' : 'Scroll categories right'}
      className={cn(
        // Vertically centred on the circle image, not the button column: the
        // arrows only ever render at `lg:` and up, where the circle is
        // already at its `sm:` size (76px, centre 38px) plus the track's 6px
        // top padding — using the mobile 62px centre here left them sitting
        // visibly above the ring.
        'border-hair-1 text-ink-2 hover:text-brand-600 absolute top-[44px] hidden size-9 -translate-y-1/2 place-items-center rounded-full border bg-white shadow-[0_2px_10px_rgba(2,6,12,0.12)] transition-colors lg:grid',
        side === 'left' ? '-left-4' : '-right-4'
      )}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
