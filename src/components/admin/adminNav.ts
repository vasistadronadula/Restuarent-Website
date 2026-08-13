/**
 * adminNav.ts — one registry for every admin destination.
 *
 * The sidebar rail, the header's kicker/title pair and the dashboard launcher
 * all read from this list, so a route added here shows up in all three at once
 * and can never be labelled three different ways.
 *
 * `badge` names a counter the shell computes from live data (see
 * `useAdminBadges`); pages without one render no badge at all.
 */

import {
  BarChart3, BookOpen, Calculator, ChefHat, ClipboardList,
  LayoutGrid, Receipt, Ticket, TrendingUp, UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AdminBadgeKey = 'pendingOrders' | 'kitchenTickets';

export interface AdminNavItem {
  /** Sidebar label — short, it renders uppercase at 12px. */
  label: string;
  href: string;
  /** Small uppercase line above the page title in the header. */
  kicker: string;
  /** Full page title in the header. */
  title: string;
  /** One line of explanation for the dashboard launcher tiles. */
  description: string;
  icon: LucideIcon;
  badge?: AdminBadgeKey;
  group: 'Service' | 'Catalogue' | 'Insight' | 'Account';
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    kicker: 'Overview',
    title: 'Today at a glance',
    description: 'Live sales, open tickets and what needs attention now',
    icon: LayoutGrid,
    group: 'Service',
  },
  {
    label: 'Cashier POS',
    href: '/admin/pos',
    kicker: 'Front of house',
    title: 'Point of sale',
    description: 'Ring up sales, print receipts, take counter payments',
    icon: Calculator,
    group: 'Service',
  },
  {
    label: 'Live orders',
    href: '/admin/orders',
    kicker: 'Service',
    title: 'Live orders',
    description: 'Real-time order tracking and kitchen updates',
    icon: ClipboardList,
    badge: 'pendingOrders',
    group: 'Service',
  },
  {
    label: 'Kitchen KDS',
    href: '/admin/kitchen',
    kicker: 'Kitchen',
    title: 'Kitchen display',
    description: 'Cooking queues, lane progress, ticket bumping',
    icon: ChefHat,
    badge: 'kitchenTickets',
    group: 'Service',
  },
  {
    label: 'Menu',
    href: '/admin/menu-management',
    kicker: 'Catalogue',
    title: 'Menu management',
    description: 'Edit dishes, prices, portions and categories',
    icon: BookOpen,
    group: 'Catalogue',
  },
  {
    label: 'Coupons',
    href: '/admin/coupons',
    kicker: 'Marketing',
    title: 'Coupons and offers',
    description: 'Promo codes, campaigns, flat discounts',
    icon: Ticket,
    group: 'Catalogue',
  },
  {
    label: 'Bills',
    href: '/admin/bills',
    kicker: 'Ledger',
    title: 'Bills and invoices',
    description: 'Historical bill records and reprints',
    icon: Receipt,
    group: 'Insight',
  },
  {
    label: 'Reports',
    href: '/admin/reports',
    kicker: 'Analytics',
    title: 'Reports and stats',
    description: 'Revenue, metrics and top sellers',
    icon: BarChart3,
    group: 'Insight',
  },
  {
    label: 'Performance',
    href: '/admin/performance',
    kicker: 'Analytics',
    title: 'Live performance',
    description: 'Real-time sales graphs and daily targets',
    icon: TrendingUp,
    group: 'Insight',
  },
  {
    label: 'Profile',
    href: '/admin/profile',
    kicker: 'Account',
    title: 'Your profile',
    description: 'Account details, avatar, contact number',
    icon: UserCircle,
    group: 'Account',
  },
] as const;

export const ADMIN_NAV_GROUPS = ['Service', 'Catalogue', 'Insight', 'Account'] as const;

/**
 * Longest-prefix match, so `/admin/menu-management/123` still highlights Menu
 * while `/admin` alone doesn't win every route by being a prefix of all of them.
 */
export function navItemForPath(pathname: string): AdminNavItem | undefined {
  if (pathname === '/cashier') return ADMIN_NAV.find((i) => i.href === '/admin/pos');

  let best: AdminNavItem | undefined;
  for (const item of ADMIN_NAV) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best;
}
