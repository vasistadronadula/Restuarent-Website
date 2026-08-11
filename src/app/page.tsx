'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { getRoleHome, isStaffRole } from '@/lib/roleAccess';

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

  return null;
}
