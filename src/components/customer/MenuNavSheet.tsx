'use client';

import React, { useState } from 'react';
import { List, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { RailCategory } from './CategoryRail';

/**
 * The floating MENU button and the category list it opens. Phones only.
 *
 * On a phone the category rail has scrolled off the top by the time you are
 * three dishes into "Biryani", and scrolling back up to change section is the
 * most common piece of pointless work in a long mobile menu. This button never
 * moves, so switching category is always one tap from wherever you are.
 *
 * It sits above the cart bar rather than beside it: they are both bottom-edge
 * furniture, and side by side on a 360px screen neither would be a comfortable
 * tap target.
 */
export default function MenuNavSheet({
  categories,
  activeId,
  onSelect,
  raised,
}: {
  categories: RailCategory[];
  activeId: string;
  onSelect: (id: string) => void;
  /** True when the cart bar is showing, so the button lifts clear of it. */
  raised: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (categories.length <= 1) return null;

  const activeLabel = categories.find((c) => c.id === activeId)?.label ?? 'Menu';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Jump to a menu section"
          style={{
            bottom: raised
              ? 'calc(var(--ppr-bottom-nav-h,0px) + env(safe-area-inset-bottom,0px) + 5.5rem)'
              : 'calc(var(--ppr-bottom-nav-h,0px) + env(safe-area-inset-bottom,0px) + 1rem)',
          }}
          className={cn(
            'fixed left-1/2 z-30 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full px-5',
            'bg-ink-1 text-[13px] font-extrabold tracking-wide text-white uppercase',
            'shadow-[0_6px_24px_rgba(2,6,12,0.35)] transition-[bottom] duration-200 outline-none active:scale-[0.97]',
            'lg:hidden'
          )}
        >
          <List className="size-4" />
          Menu
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[72dvh] gap-0 rounded-t-3xl border-none bg-white p-0"
      >
        <SheetHeader className="border-hair-2 flex-row items-center justify-between border-b px-5 py-4">
          <SheetTitle className="text-ink-1 text-[16px] font-extrabold">
            Menu sections
          </SheetTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-ink-3 hover:bg-hair-2 grid size-8 place-items-center rounded-full transition-colors"
          >
            <X className="size-[18px]" />
          </button>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 pb-[env(safe-area-inset-bottom,0px)]">
          {categories.map((cat) => {
            const active = cat.id === activeId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelect(cat.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-4 rounded-xl px-3.5 py-3 text-left transition-colors',
                  active ? 'bg-brand-50' : 'hover:bg-hair-2'
                )}
              >
                <span
                  className={cn(
                    'text-[15px]',
                    active ? 'text-brand-700 font-extrabold' : 'text-ink-2 font-semibold'
                  )}
                >
                  {cat.label}
                </span>
                <span
                  className={cn(
                    'text-[13px] font-bold tabular-nums',
                    active ? 'text-brand-600' : 'text-ink-4'
                  )}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-ink-4 border-hair-2 border-t px-5 py-3 text-center text-[11.5px] font-semibold">
          Showing <span className="text-ink-2">{activeLabel}</span>
        </p>
      </SheetContent>
    </Sheet>
  );
}
