'use client';

import { useEffect } from 'react';

import { BrandScreen, BrandScreenAction, BrandScreenLink } from '@/components/customer/BrandScreen';
import { restaurantInfo } from '@/data/restaurantInfo';

/**
 * Route-level error boundary.
 *
 * Everything under the root layout is wrapped in `<Providers>` — QueryProvider,
 * AuthProvider, RealtimeProvider, AdminProvider, CartProvider. A throw during
 * any of their renders used to take the whole page to white with nothing on
 * screen and no way to recover short of the customer reloading by instinct.
 * This catches it, keeps the brand on screen, and offers the retry that
 * `reset()` makes possible (re-rendering the segment rather than reloading).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is what ties this screen to the stack trace in the server
    // logs — the message itself is redacted in production builds.
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'client_render_error',
        at: new Date().toISOString(),
        digest: error.digest,
        message: error.message,
      })
    );
  }, [error]);

  return (
    <BrandScreen
      title="Something went wrong"
      message={
        <>
          A hiccup on our side — your cart and any placed order are safe. Try
          again, and if it keeps happening call us on{' '}
          <a href={`tel:${restaurantInfo.phone.replace(/\s/g, '')}`} className="font-semibold underline underline-offset-4">
            {restaurantInfo.phoneDisplay}
          </a>
          .
        </>
      }
    >
      <BrandScreenAction onClick={reset}>Try again</BrandScreenAction>
      <BrandScreenLink href="/menu">Back to the menu</BrandScreenLink>
    </BrandScreen>
  );
}
