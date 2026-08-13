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

function LoadingScreen({ message }: { message: string }) {
  // Styled in the console's system rather than the customer site's: this is the
  // first frame of /admin, and it should not flash a different application.
  return (
    <div className="ad-shell min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-ad-accent" />
      <p className="ad-kicker">{message}</p>
    </div>
  );
}
