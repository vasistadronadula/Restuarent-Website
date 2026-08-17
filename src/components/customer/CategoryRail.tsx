'use client';

import React, { useRef } from 'react';
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
        className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1 sm:gap-6"
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
                    alt=""
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
          buttons over a rail you can swipe is clutter. */}
      <RailArrow side="left" onClick={() => nudge(-1)} />
      <RailArrow side="right" onClick={() => nudge(1)} />
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
        'border-hair-1 text-ink-2 hover:text-brand-600 absolute top-[31px] hidden size-9 -translate-y-1/2 place-items-center rounded-full border bg-white shadow-[0_2px_10px_rgba(2,6,12,0.12)] transition-colors lg:grid',
        side === 'left' ? '-left-4' : '-right-4'
      )}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
