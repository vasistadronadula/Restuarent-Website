/**
 * roleAccess.ts — single source of truth for "who can see what" in /admin.
 *
 * AdminGuard (the redirect gate) and AdminSidebar (the nav rail, filtering
 * adminNav.ts's ADMIN_NAV) both import from here instead of each hardcoding
 * their own copy of the role → page mapping, so the two can never drift out
 * of sync — a role that can't reach a page never sees a link to it either.
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

// Every non-admin/manager role used to resolve to 'all' here — a rich role
// system (chef/cashier/waiter) existed in the type, in ROLE_HOME, in the
// assignable-roles list, everywhere except here, where it did nothing: any
// signed-in staff account could reach every /admin page regardless of role.
// These lists are the actual scope for each restricted role; '/admin' (the
// dashboard) and '/admin/profile' are available to every staff role via
// SHARED_STAFF_PREFIXES below, so they're not repeated in each array.
export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[] | 'all'> = {
  admin: 'all',
  manager: 'all',
  chef: ['/admin/kitchen', '/admin/orders', '/admin/menu-management'],
  cashier: ['/admin/pos', '/admin/bills', '/admin/orders', '/admin/tables', '/admin/coupons'],
  waiter: ['/admin/orders', '/admin/tables'],
  customer: [],
};

export const ROLE_DENIED_PREFIXES: Partial<Record<UserRole, string[]>> = {};

// Reachable by every staff role regardless of ROLE_ALLOWED_PREFIXES: the
// dashboard overview and a staff member's own profile page.
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
  manager: 'Full management access — same as Admin',
  chef: 'Kitchen display, live orders, and menu management',
  cashier: 'POS, bills, live orders, tables, and coupons',
  waiter: 'Live orders and table management',
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

// Only the two roles that actually act on a new/changed order — cashier
// (billing/POS) and chef (KDS) — get pushed. Manager/admin/waiter watch the
// dashboard instead of a phone, and used to be spammed on every order event.
export const ORDER_NOTIFICATION_ROLES: readonly UserRole[] = ['cashier', 'chef'] as const;
export const RESERVATION_NOTIFICATION_ROLES: readonly UserRole[] = [] as const;

export const NOTIFICATION_ROLES: readonly UserRole[] = ORDER_NOTIFICATION_ROLES;

export function receivesOrderNotifications(role: UserRole | null | undefined): boolean {
  return !!role && (ORDER_NOTIFICATION_ROLES as readonly string[]).includes(role);
}

export function receivesReservationNotifications(_role: UserRole | null | undefined): boolean {
  return false;
}

export function receivesNotifications(role: UserRole | null | undefined): boolean {
  return receivesOrderNotifications(role);
}

export function assignableRoles(callerRole: UserRole | null | undefined): readonly StaffRole[] {
  return isStaffRole(callerRole) ? STAFF_ROLES : [];
}

export function canManageStaffRole(callerRole: UserRole | null | undefined): boolean {
  return isStaffRole(callerRole);
}

function isUnderOrEqual(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccess(role: UserRole | null | undefined, pathname: string): boolean {
  if (!role || role === 'customer') return false;

  const denied = ROLE_DENIED_PREFIXES[role];
  if (denied?.some((p) => isUnderOrEqual(pathname, p))) return false;

  const allowed = ROLE_ALLOWED_PREFIXES[role];
  if (allowed === 'all') return true;

  // The dashboard itself is an exact match, not a prefix — '/admin' would
  // otherwise prefix-match every other /admin/* route and defeat the point
  // of restricting them.
  if (pathname === '/admin') return true;
  if (SHARED_STAFF_PREFIXES.some((p) => isUnderOrEqual(pathname, p))) return true;

  return allowed.some((p) => isUnderOrEqual(pathname, p));
}

export function getRoleHome(role: UserRole | null | undefined): string {
  if (!role) return '/';
  return ROLE_HOME[role];
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
