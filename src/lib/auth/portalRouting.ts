import type { UserRole } from '@/types';
import { getRoleHome, isStaffRole } from './roleAccess';
import { safeRedirect } from '@/lib/validation';

export function isStaffPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/cashier';
}

/** Routing only; API authorization and AdminGuard remain the access controls. */
export function getPortalRedirect(role: UserRole | null, pathname: string): string | null {
  if (!isStaffRole(role) || isStaffPath(pathname) || pathname === '/reset-password') return null;
  return getRoleHome(role);
}

export function getLoginDestination(role: UserRole, fallbackPath?: string): string {
  if (isStaffRole(role)) return getRoleHome(role);
  const target = safeRedirect(fallbackPath ?? null, '/');
  // A customer's /admin deep link must not bounce between login and AdminGuard.
  return isStaffPath(target.split(/[?#]/)[0]) ? '/' : target;
}
