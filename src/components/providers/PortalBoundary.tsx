'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { getPortalRedirect } from '@/lib/portalRouting';

/** Never mount storefront content while a restored account's role is unresolved. */
export default function PortalBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.userRole);
  const ready = useAuthStore((state) => state.authReady);
  const signingOut = useAuthStore((state) => state.signingOut);
  const error = useAuthStore((state) => state.roleError);
  const target = user && ready && !signingOut ? getPortalRedirect(role, pathname) : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-store px-6 text-center">
        <div role="alert" className="max-w-sm space-y-4">
          <h1 className="font-sans text-xl font-bold">We couldn&apos;t verify your account</h1>
          <p className="text-sm text-ink-3">Check your connection and try again.</p>
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl bg-brand px-6 text-sm font-bold text-white">Retry</button>
        </div>
      </div>
    );
  }

  if (!ready || (user && !role) || target || signingOut) {
    return (
      <div className="grid min-h-dvh place-items-center bg-store" role="status" aria-label={target ? 'Opening your staff portal' : 'Loading your session'}>
        <span aria-hidden="true" className="size-7 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
      </div>
    );
  }

  return children;
}
