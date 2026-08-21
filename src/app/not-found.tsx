import type { Metadata } from 'next';

import { BrandScreen, BrandScreenAction, BrandScreenLink } from '@/components/customer/BrandScreen';

export const metadata: Metadata = {
  title: 'Page not found | Pala Pitta Ruchulu',
  robots: { index: false, follow: false },
};

/**
 * Replaces the stock Next.js 404, which arrived unbranded and with no link
 * anywhere — a customer who mistyped a URL or followed a stale WhatsApp
 * link had nothing to do but hit back.
 */
export default function NotFound() {
  return (
    <BrandScreen
      title="We couldn't find that page"
      message="The link may be out of date, or the dish you were looking for has moved. The full menu is one tap away."
    >
      <BrandScreenAction href="/menu">Browse the menu</BrandScreenAction>
      <BrandScreenLink href="/orders">Track an order</BrandScreenLink>
    </BrandScreen>
  );
}
