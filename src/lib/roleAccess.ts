/**
 * roleAccess.ts — single source of truth for "who can see what" in /admin.
 *
 * AdminGuard, AdminSidebar, and AdminMobileBottomNav all import from here
 * instead of each hardcoding their own copy of the role → page mapping,
 * so the three can never drift out of sync with each other.
 */

import type { StaffRole, UserRole } from '@/types';

// Where a role lands right after login, and where it's redirected back to if
// it tries to reach a page outside its permitted set.
export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  manager: '/admin/customers',
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
  manager: [
    '/admin/customers',
    '/admin/employees',
    '/admin/menu-management',
    '/admin/inventory',
    '/admin/coupons',
    '/admin/performance',
  ],
  chef: ['/admin/kitchen'],
  // '/cashier' is an unlinked alias that renders the same POS billing screen
  // as '/admin/pos' — allowed so typing it doesn't bounce the one role it's
  // named for.
  cashier: ['/admin/orders', '/admin/pos', '/admin/bills', '/cashier'],
  // Table management lives inside the reservations page (add/edit/release
  // tables), so one prefix covers both modules a server needs.
  waiter: ['/admin/reservations'],
  customer: [],
};

// Carved out of an otherwise-full-access role. Taking payment is the
// cashier's job, so the till itself stays out of the admin workspace even
// though admin is 'all' everywhere else — an admin who needs to ring up a
// sale signs in as a cashier.
//
// Bills is deliberately NOT denied: it is a read-only record of what the
// till took, which is exactly the oversight an owner needs. Operating the
// till and auditing it are different privileges.
//
// '/cashier' is listed alongside '/admin/pos' because it renders the exact
// same till component — denying only one of the two paths would leave the
// restriction trivially bypassable by typing the other URL.
export const ROLE_DENIED_PREFIXES: Partial<Record<UserRole, string[]>> = {
  admin: ['/admin/pos', '/cashier'],
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
  admin: 'Full access — every page, report and setting; bills are read-only and the till is cashier-only',
  manager: 'Customers, team, menu, inventory & coupons',
  chef: 'Kitchen Display only — receives order notifications',
  cashier: 'Orders, POS billing & bills — receives order notifications',
  waiter: 'Reservations & table management — receives reservation notifications',
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

// ─── Notification routing ────────────────────────────────────────────────────
// Notifications follow the module each role actually works in, so nobody gets
// alerted about a page they can't open: the cashier and chef are alerted to
// new orders, the server to new reservations. Admin and Manager receive no
// notifications at all per business requirements — they watch the lists.
export const ORDER_NOTIFICATION_ROLES: readonly UserRole[] = ['admin', 'manager', 'cashier', 'chef'] as const;
export const RESERVATION_NOTIFICATION_ROLES: readonly UserRole[] = ['waiter'] as const;

// Union of the two — used to decide whether a device subscribes to Web Push
// at all. The per-event targeting above decides who each push is sent to.
export const NOTIFICATION_ROLES: readonly UserRole[] = [
  ...ORDER_NOTIFICATION_ROLES,
  ...RESERVATION_NOTIFICATION_ROLES,
] as const;

export function receivesOrderNotifications(role: UserRole | null | undefined): boolean {
  return !!role && ORDER_NOTIFICATION_ROLES.includes(role);
}

export function receivesReservationNotifications(role: UserRole | null | undefined): boolean {
  return !!role && RESERVATION_NOTIFICATION_ROLES.includes(role);
}

export function receivesNotifications(role: UserRole | null | undefined): boolean {
  return !!role && NOTIFICATION_ROLES.includes(role);
}

// ─── Who may manage whom ─────────────────────────────────────────────────────
// Managers can run the team page (create logins, edit HR details, disable
// accounts) but may not touch admin accounts or hand out the admin role —
// otherwise "manager" would silently be a path to full access. Enforced
// server-side in the /api/admin/employees routes; the UI mirrors it.
export function assignableRoles(callerRole: UserRole | null | undefined): readonly StaffRole[] {
  if (callerRole === 'admin') return STAFF_ROLES;
  if (callerRole === 'manager') return STAFF_ROLES.filter((r) => r !== 'admin');
  return [];
}

export function canManageStaffRole(
  callerRole: UserRole | null | undefined,
  targetRole: UserRole | null | undefined
): boolean {
  if (callerRole === 'admin') return true;
  if (callerRole === 'manager') return targetRole !== 'admin';
  return false;
}

export function canAccess(role: UserRole | null | undefined, pathname: string): boolean {
  if (!role || role === 'customer') return false;
  if (pathname === '/admin') return true;
  const matches = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

  if (ROLE_DENIED_PREFIXES[role]?.some(matches)) return false;

  const allowed = ROLE_ALLOWED_PREFIXES[role];
  if (allowed === 'all') return true;
  return allowed.some(matches) || SHARED_STAFF_PREFIXES.some(matches);
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
