import Link from 'next/link';
import type { ReactNode } from 'react';

import PalaPittaLogo from '@/components/customer/PalaPittaLogo';
import { cn } from '@/lib/utils';

/**
 * BrandScreen — the full-page surface behind the app's three dead ends:
 * a route that doesn't exist, a render that threw, and the moment before
 * auth resolves. Each of those used to be a blank white page with no way
 * out (or, for the crash, no page at all).
 *
 * Kept as a server component with no state so `error.tsx`, `not-found.tsx`
 * and the home-page loader can all reach for it without pulling anything
 * into their bundles.
 */
export function BrandScreen({
  title,
  message,
  children,
  className,
}: {
  title: string;
  message?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        'grid min-h-[100svh] place-items-center bg-[var(--brand-50)] px-6 py-16',
        className
      )}
    >
      <div className="w-full max-w-md text-center">
        <PalaPittaLogo variant="light" size="medium" className="mx-auto" />

        <h1 className="text-ink-1 mt-8 font-[family-name:var(--font-fraunces)] text-2xl font-black sm:text-3xl">
          {title}
        </h1>

        {message ? <p className="text-ink-3 mt-3 text-[15px] leading-relaxed">{message}</p> : null}

        {children ? <div className="mt-8 flex flex-col items-center gap-3">{children}</div> : null}
      </div>
    </main>
  );
}

/** The primary action on a BrandScreen — same shape whether it links or acts. */
export function BrandScreenAction({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className =
    'inline-flex h-11 w-full max-w-[16rem] items-center justify-center rounded-xl bg-brand px-6 text-[15px] font-bold text-white shadow-sm transition hover:bg-[var(--brand-600)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-600)]';

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

/** Secondary, quieter action — sits under the primary one. */
export function BrandScreenLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-ink-3 text-[14px] font-semibold underline underline-offset-4 transition hover:text-[var(--brand-600)]"
    >
      {children}
    </Link>
  );
}
