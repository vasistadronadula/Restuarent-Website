/**
 * restaurantInfo.ts — single source of truth for business details shown on
 * bills, receipts, and site footers. Previously this was hardcoded in three
 * different places with three different fabricated GSTIN numbers.
 *
 * gstin/fssai are intentionally blank until the real registration numbers
 * are added here — every place that renders them hides the line entirely
 * when blank rather than showing a placeholder value that could be mistaken
 * for a real one on an actual customer bill.
 */
export const restaurantInfo = {
  name: 'Pala Pitta Ruchulu',
  tagline: 'A feast worth craving',
  addressLine: 'Madhapur, Hyderabad, TS 500081',
  phone: '+91 70326 82089',
  phoneDisplay: '+91 70326 82089',
  whatsapp: '917032682089',
  email: 'palapittaruchulu@gmail.com',
  website: 'www.palapittaruchulu.com',
  gstin: '',
  fssai: '',
};
