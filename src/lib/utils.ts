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
