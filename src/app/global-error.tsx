'use client';

/**
 * The last resort: `error.tsx` renders *inside* the root layout, so it cannot
 * catch a throw from the layout itself (or from `<Providers>` mounting). This
 * one replaces the whole document, which is why it ships its own <html> and
 * <body> and styles inline — none of the app's CSS, fonts or providers can be
 * assumed to have loaded at the point it renders.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          background: '#fff6ee',
          color: '#02060c',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          padding: '2rem 1.5rem',
        }}
      >
        <main style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c25708' }}>
            Pala Pitta Ruchulu
          </p>
          <h1 style={{ margin: '1rem 0 0', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.25 }}>
            The site couldn&apos;t load
          </h1>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.9375rem', lineHeight: 1.6, color: '#7e808c' }}>
            Something failed before the page could start. Reloading usually
            clears it — call us on +91 70326 82089 if it doesn&apos;t.
            {/* Hardcoded, not `restaurantInfo.phone` — this page renders before
                any app code (including data modules) can be assumed to have
                loaded. Manual-sync point: keep this in step with
                data/restaurantInfo.ts `phoneDisplay` by hand. */}
          </p>
          {error.digest ? (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: '#93959f' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '2rem',
              height: '2.75rem',
              padding: '0 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: '#fc8019',
              color: '#fff',
              fontSize: '0.9375rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
