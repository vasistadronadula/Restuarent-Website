'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { canAccess, getRoleHome, isStaffRole } from '@/lib/roleAccess';
import { Loader2 } from 'lucide-react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const user       = useAuthStore((s) => s.user);
  const userRole   = useAuthStore((s) => s.userRole);
  const authReady  = useAuthStore((s) => s.authReady);
  const signingOut = useAuthStore((s) => s.signingOut);
  const router     = useRouter();
  const pathname   = usePathname();

  const isRedirecting = useRef(false);

  const isStaff          = isStaffRole(userRole);
  const hasSectionAccess = isStaff && canAccess(userRole, pathname);
  const allowed          = !!user && hasSectionAccess;

  useEffect(() => {
    if (!authReady) return;
    if (signingOut) return;
    if (isRedirecting.current) return;
    if (allowed) return;

    isRedirecting.current = true;

    if (!user || !isStaff) {
      toast.error('Please log in with your staff account.', { id: 'admin-denied', duration: 3000 });
      router.replace('/');
      return;
    }

    toast.error("Your role doesn't have access to this section.", {
      id: 'admin-section-denied', duration: 3000,
    });
    router.replace(getRoleHome(userRole));
  }, [authReady, signingOut, allowed, user, isStaff, userRole, router]);

  useEffect(() => { isRedirecting.current = false; }, [pathname]);

  if (!authReady) return <LoadingScreen message="Verifying access…" />;
  if (signingOut) return <LoadingScreen message="Signing you out…" />;
  if (!allowed)  return <LoadingScreen message="Redirecting…" />;

  return <>{children}</>;
}

import PalaPittaLogo from '@/components/customer/PalaPittaLogo';

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[var(--brand-50)] grid place-items-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <PalaPittaLogo size="large" priority className="mx-auto" />
        <h1 className="text-ink-1 mt-8 font-[family-name:var(--font-manrope)] text-2xl font-extrabold sm:text-3xl">
          {message}
        </h1>
        <div className="mt-8 flex flex-col items-center gap-3">
          <span aria-hidden className="bg-brand/70 size-3 animate-ping rounded-full" />
          <span className="sr-only" role="status">Loading</span>
        </div>
      </div>
    </div>
  );
}
