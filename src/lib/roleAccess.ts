/**
 * roleAccess.ts — single source of truth for "who can see what" in /admin.
 *
 * AdminGuard (the redirect gate) and the dashboard's LAUNCHPAD_PAGES tile
 * filter both import from here instead of each hardcoding their own copy of
 * the role → page mapping, so the two can never drift out of sync.
 */

import type { StaffRole, UserRole } from '@/types';

// Where a role lands right after login, and where it's redirected back to if
// it tries to reach a page outside its permitted set.
export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  manager: '/admin',
  chef: '/admin/kitchen',
  cashier: '/admin/pos',
  waiter: '/admin',
  customer: '/',
};

export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[] | 'all'> = {
  admin: 'all',
  manager: 'all',
  chef: 'all',
  cashier: 'all',
  waiter: 'all',
  customer: [],
};

export const ROLE_DENIED_PREFIXES: Partial<Record<UserRole, string[]>> = {};

const SHARED_STAFF_PREFIXES = ['/admin/profile'];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Admin',
  chef: 'Admin',
  cashier: 'Admin',
  waiter: 'Admin',
  customer: 'Customer',
};

export const ROLE_ACCESS_SUMMARY: Record<UserRole, string> = {
  admin: 'Full management access — all tools, POS, menu, inventory, reports',
  manager: 'Full management access',
  chef: 'Full management access',
  cashier: 'Full management access',
  waiter: 'Full management access',
  customer: 'No admin access',
};

export const ROLE_ICONS: Record<UserRole, string> = {
  admin: '👑',
  manager: '👑',
  chef: '👑',
  cashier: '👑',
  waiter: '👑',
  customer: '👤',
};

export const STAFF_ROLES = ['admin', 'manager', 'chef', 'cashier', 'waiter'] as const;

export const ORDER_NOTIFICATION_ROLES: readonly UserRole[] = ['admin', 'manager', 'cashier', 'chef', 'waiter'] as const;
export const RESERVATION_NOTIFICATION_ROLES: readonly UserRole[] = [] as const;

export const NOTIFICATION_ROLES: readonly UserRole[] = ORDER_NOTIFICATION_ROLES;

export function receivesOrderNotifications(role: UserRole | null | undefined): boolean {
  return isStaffRole(role);
}

export function receivesReservationNotifications(_role: UserRole | null | undefined): boolean {
  return false;
}

export function receivesNotifications(role: UserRole | null | undefined): boolean {
  return isStaffRole(role);
}

export function assignableRoles(callerRole: UserRole | null | undefined): readonly StaffRole[] {
  return isStaffRole(callerRole) ? STAFF_ROLES : [];
}

export function canManageStaffRole(callerRole: UserRole | null | undefined): boolean {
  return isStaffRole(callerRole);
}

export function canAccess(role: UserRole | null | undefined, _pathname: string): boolean {
  if (!role || role === 'customer') return false;
  return true;
}

export function getRoleHome(role: UserRole | null | undefined): string {
  if (!role || role === 'customer') return '/';
  return '/admin';
}

export function isStaffRole(role: UserRole | null | undefined): boolean {
  return !!role && role !== 'customer';
}

export function getRoleDashboardLabel(role: UserRole | null | undefined, userName?: string): string {
  if (!role || role === 'customer') return 'My Orders';
  const namePart = userName?.trim().split(' ')[0];
  const labelBase = role === 'admin' ? 'Admin Dashboard'
    : role === 'manager' ? 'Manager Console'
    : role === 'cashier' ? 'Cashier POS'
    : role === 'chef' ? 'Kitchen KDS'
    : role === 'waiter' ? 'Server Console'
    : 'Staff Dashboard';
  
  return namePart ? `${labelBase} · ${namePart}` : labelBase;
}
