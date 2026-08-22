import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Smooth-scrolls a field into view before focusing it — used after a form
 * validation failure to take the customer straight to the problem field
 * instead of leaving them to scroll and hunt for the red-outlined box.
 *
 * `preventScroll` on the focus call is deliberate: `scrollIntoView`'s smooth
 * animation and a focus-triggered jump-scroll fighting each other is what
 * made the first attempt at this feel like a glitch rather than a nicety.
 */
export function scrollToAndFocus(el: HTMLElement | null | undefined): void {
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => el.focus({ preventScroll: true }), 300);
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
 * `useDishPortion.add()` bakes the portion into a cart line's `name` — e.g.
 * "Chicken Biryani (FULL)" — because a kitchen ticket, an invoice line and a
 * WhatsApp order confirmation all need the size spelled out with nothing else
 * on screen to carry it. A few customer-facing rows *do* show a separate
 * portion pill next to that same name (the cart, the order history), and
 * without this those rows said "FULL" twice — once inline, once in the pill.
 * Strips only a suffix that matches the row's own `selectedPortion`, so a
 * dish name that happens to end in a parenthesis for an unrelated reason is
 * left alone.
 */
export function displayNameWithoutPortion(name: string, portion?: string | null): string {
  if (!portion) return name;
  const suffix = ` (${portion.toUpperCase()})`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

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
