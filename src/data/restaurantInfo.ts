/**
 * restaurantInfo.ts — single source of truth for business details shown on
 * bills, receipts, and site footers. Previously this was hardcoded in three
 * different places with three different fabricated GSTIN numbers.
 *
 * gstin/fssai are intentionally blank until the real registration numbers
 * are supplied — every place that renders them hides the line entirely when
 * blank rather than showing a placeholder value that could be mistaken for a
 * real one on an actual customer bill. They read from env vars so the real
 * numbers can be set per-deployment without a code change; an FSSAI licence
 * number is legally required on food bills in India, so this must be
 * populated before serving customers.
 */

/**
 * Canonical public origin, no trailing slash.
 *
 * Everything that emits an absolute link — sitemap, robots, the WhatsApp
 * order-tracking messages, the webhook registration URLs — reads it from
 * here. Those used to disagree: WhatsApp messages pointed customers at
 * `pala-pitta-ruchulu.vercel.app` (with hyphens) while robots/sitemap used
 * `palapittaruchulu.vercel.app`, so every tracking link sent to a customer
 * 404'd. Point `NEXT_PUBLIC_SITE_URL` at the custom domain once it exists.
 */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://palapittaruchulu.vercel.app')
  .trim()
  .replace(/\/+$/, '');

/** Absolute URL for a path on this site — `absoluteUrl('/orders')`. */
export const absoluteUrl = (path: string): string =>
  `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;

export const restaurantInfo = {
  name: 'Pala Pitta Ruchulu',
  tagline: 'A feast worth craving',
  /** The neighbourhood alone — "Collect from Madhapur", not the full postal
   *  address — for checkout/order-confirmation copy. Kept separate from
   *  `addressLine` so a second location only means updating this one field,
   *  not grepping every screen that used to hardcode "Madhapur" directly. */
  locality: 'Madhapur',
  addressLine: 'Madhapur, Hyderabad, TS 500081',
  phone: '+91 70326 82089',
  phoneDisplay: '+91 70326 82089',
  whatsapp: '917032682089',
  email: 'palapittaruchulu@gmail.com',
  website: 'www.palapittaruchulu.com',
  siteUrl,
  openingHours: '12 PM – 11 PM',
  openingDisplay: '12:00 PM – 11:00 PM',
  gstin: (process.env.NEXT_PUBLIC_GSTIN || '').trim(),
  fssai: (process.env.NEXT_PUBLIC_FSSAI || '').trim(),
};
