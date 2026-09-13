'use client';

import { cn, formatCurrency } from '@/lib/utils';
import { PORTION_LABELS, type Portion } from '@/lib/portionLabels';

/** Shared portion controls: readable labels, wrapping chips, and real touch targets. */
export default function PortionSelector({ portions, selected, onSelect, label, prices }: {
  portions: Portion[];
  selected: Portion;
  onSelect: (portion: Portion) => void;
  label: string;
  prices?: Partial<Record<Portion, number>>;
}) {
  return (
    <div role="group" aria-label={`Portion size for ${label}`} className="flex flex-wrap gap-1.5">
      {portions.map((portion) => (
        <button
          key={portion}
          type="button"
          aria-pressed={portion === selected}
          onClick={() => onSelect(portion)}
          className={cn(
            'min-h-11 min-w-11 flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand',
            portion === selected
              ? 'border-brand bg-brand-50 text-brand-700 shadow-xs'
              : 'border-hair-1 bg-white text-ink-3 hover:border-brand-300 hover:bg-brand-50/50'
          )}
        >
          {PORTION_LABELS[portion]}
          {prices?.[portion] != null && <span className="mt-0.5 block text-[10px] tabular-nums">{formatCurrency(prices[portion])}</span>}
        </button>
      ))}
    </div>
  );
}
