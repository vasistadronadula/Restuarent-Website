/**
 * orderTime.ts — the one place an order's date and time stamps are produced.
 *
 * These strings are written to `orders.order_date` / `orders.order_time` and
 * then printed on bills, so they have to mean the same thing no matter which
 * runtime created them. Two separate problems made that untrue:
 *
 *  1. `toLocaleTimeString('en-US', …)` was called in checkout (browser),
 *     db.ts and both aggregator webhooks (server). Its output depends on the
 *     runtime's ICU build and default locale, so the same instant could be
 *     rendered differently by a diner's phone and by the Vercel function that
 *     handled a Swiggy push.
 *  2. `new Date().toISOString().split('T')[0]` is a *UTC* date. For a
 *     Hyderabad restaurant open until 11 PM, every order placed after 5:30 PM
 *     IST was filed under the previous day — which is the window that carries
 *     most of the dinner service.
 *
 * Both are fixed by pinning the stamps to IST explicitly. IST is UTC+5:30
 * year-round with no daylight saving, so shifting the epoch and reading the
 * UTC fields is exact — and, unlike a locale-aware formatter, produces byte
 * -identical output in every environment.
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function istIsoParts(date: Date): { date: string; time: string } {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/** Business-day date in IST — `2026-08-20`. */
export function orderDateStamp(date: Date = new Date()): string {
  return istIsoParts(date).date;
}

/** Wall-clock time in IST, 24-hour — `19:45`. */
export function orderTimeStamp(date: Date = new Date()): string {
  return istIsoParts(date).time;
}

/** Both stamps from a single instant, so they can never straddle midnight. */
export function orderStamps(date: Date = new Date()): { orderDate: string; orderTime: string } {
  const { date: d, time: t } = istIsoParts(date);
  return { orderDate: d, orderTime: t };
}
