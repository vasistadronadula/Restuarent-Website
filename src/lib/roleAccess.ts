/**
 * roleAccess.ts — single source of truth for "who can see what" in /admin.
 *
 * AdminGuard, AdminSidebar, and AdminMobileBottomNav all import from here
 * instead of each hardcoding their own copy of the role → page mapping,
 * so the three can never drift out of sync with each other.
 */

import type { UserRole } from '@/types';

// Where a role lands right after login, and where it's redirected back to if
// it tries to reach a page outside its permitted set.
export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  manager: '/admin',
  chef: '/admin/kitchen',
  cashier: '/admin/pos',
  waiter: '/admin/reservations',
  customer: '/',
};

// 'all' = every /admin/* route. Anything else is an explicit allow-list of
// path prefixes. This is a UX convenience layer only — the real security
// boundary is the RLS policies in supabase_schema.sql (can_access_orders(),
// can_access_reservations(), is_admin()); a role hidden from a nav item here
// must also be unable to read/write the underlying data via the API.
export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[] | 'all'> = {
  admin: 'all',
  manager: 'all',
  chef: ['/admin/kitchen'],
  cashier: ['/admin/orders', '/admin/pos', '/admin/bills'],
  waiter: ['/admin/reservations'],
  customer: [],
};

// Reachable by every signed-in staff member regardless of role — managing
// your own name, phone and photo isn't a privileged action.
const SHARED_STAFF_PREFIXES = ['/admin/profile'];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  chef: 'Kitchen Chef',
  cashier: 'Cashier',
  waiter: 'Server',
  customer: 'Customer',
};

// Plain-English summary of what each role can reach. Shown wherever a role is
// assigned, so picking a role visibly means picking permissions rather than
// choosing an opaque label from a dropdown.
export const ROLE_ACCESS_SUMMARY: Record<UserRole, string> = {
  admin: 'Full access — every page, report and setting',
  manager: 'Full access — every page, report and setting',
  chef: 'Kitchen Display only',
  cashier: 'Orders, POS billing & bills',
  waiter: 'Reservations & tables only',
  customer: 'No admin access',
};

export const ROLE_ICONS: Record<UserRole, string> = {
  admin: '👑',
  manager: '🗂️',
  chef: '🔥',
  cashier: '🧾',
  waiter: '🍽️',
  customer: '👤',
};

export const STAFF_ROLES = ['admin', 'manager', 'chef', 'cashier', 'waiter'] as const;

export function canAccess(role: UserRole | null | undefined, pathname: string): boolean {
  if (!role || role === 'customer') return false;
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  if (allowed === 'all') return true;
  const matches = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  return allowed.some(matches) || SHARED_STAFF_PREFIXES.some(matches);
}

export function getRoleHome(role: UserRole | null | undefined): string {
  if (!role) return '/';
  return ROLE_HOME[role];
}

export function isStaffRole(role: UserRole | null | undefined): boolean {
  return !!role && role !== 'customer';
}
