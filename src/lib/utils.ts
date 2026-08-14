import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Rupee formatting, in one place.
 *
 * `en-IN` grouping matters here — ₹1,25,000 is what an Indian customer expects
 * on a bill, and `toLocaleString()` with no locale gave ₹125,000 on roughly
 * half the devices that opened the site.
 *
 * `decimals` defaults to none because prices in this menu are whole rupees;
 * tax lines pass 2.
 */
export function formatCurrency(value: number, decimals = 0): string {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** A dish image that failed to load falls back to a generic plate, not a broken icon. */
export const FALLBACK_DISH_IMAGE =
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=70';

/**
 * A missing timestamp reads as "unknown", not silently as "now" — falling
 * back to the current time would show a fabricated moment as if it were the
 * record's real date, and doing that inline at every call site is also what
 * kept tripping the render-purity rule (`Date.now()` called during render).
 */
export function formatOrderTimestamp(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN');
}
