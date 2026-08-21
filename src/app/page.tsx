'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/store/useAuthStore';
import { getRoleHome, isStaffRole } from '@/lib/roleAccess';
import { BrandScreen } from '@/components/customer/BrandScreen';

/**
 * `/` is a router, not a page: staff land on their console, everyone else on
 * the menu. Deciding which needs the auth state, and that resolves anywhere
 * from instantly (warm session) to the store's several-second ceiling (cold
 * start on a slow connection).
 *
 * It used to render `null` for that whole span — a white screen with nothing
 * on it, at the exact moment a first-time visitor is deciding whether the
 * site works. Showing the brand instead costs nothing and reads as loading
 * rather than broken.
 */
export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.userRole);
  const authReady = useAuthStore((s) => s.authReady);
  const signingOut = useAuthStore((s) => s.signingOut);

  useEffect(() => {
    if (authReady && !signingOut) {
      if (user && isStaffRole(userRole)) {
        router.replace(getRoleHome(userRole));
      } else {
        router.replace('/menu');
      }
    }
  }, [authReady, signingOut, user, userRole, router]);

  return (
    <BrandScreen title="Setting your table…" message="One moment while we bring up the menu.">
      {/* aria-hidden: the heading above already announces the state, and a
          screen reader has no use for a spinner. */}
      <span
        aria-hidden
        className="bg-brand/70 size-2.5 animate-ping rounded-full"
      />
      <span className="sr-only" role="status">
        Loading
      </span>
    </BrandScreen>
  );
}
