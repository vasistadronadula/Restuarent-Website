/**
 * roleApps.ts — one installable app per staff role.
 *
 * Every role gets its own home-screen app rather than one generic "Admin"
 * icon: the chef installs Kitchen and lands on the KDS, the cashier installs
 * Billing and lands on the POS. Each entry drives both the web manifest
 * served at /manifest/<slug> and the copy shown in the install dialog, so the
 * icon label and what the dialog promises can never disagree.
 *
 * `id` is what a browser uses to tell installed apps apart — distinct ids
 * mean a phone shared between two staff members can hold both apps side by
 * side instead of the second install replacing the first.
 */

import type { StaffRole } from '@/types';
import { getRoleHome } from './roleAccess';
import { roleColors } from '@/theme/adminColors';

export interface RoleApp {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  themeColor: string;
  /** What this app does, in the install dialog. */
  highlights: string[];
}

const HIGHLIGHTS: Record<StaffRole, string[]> = {
  admin: [
    'Dashboard, reports and live order/reservation lists',
    'Menu, inventory, coupons and team management',
    'Works offline once opened',
  ],
  manager: [
    'Customers, team, menu, inventory and coupons',
    'Add a coupon and it goes live on the website instantly',
    'Works offline once opened',
  ],
  cashier: [
    'Instant alert the moment an order comes in',
    'Counter billing and bill history in one tap',
    'Pairs with a Bluetooth receipt printer for auto-printing',
  ],
  chef: [
    'Instant alert the moment an order comes in',
    'Full-screen Kitchen Display, no menus in the way',
    'Works offline once opened',
  ],
  waiter: [
    'Instant alert the moment a table is booked',
    'Reservations and table management on the floor',
    'Works offline once opened',
  ],
};

const NAMES: Record<StaffRole, { name: string; short: string; description: string }> = {
  admin: {
    name: 'Pala Pitta Admin',
    short: 'PP Admin',
    description: 'Dashboard, reports and management for Pala Pitta Ruchulu.',
  },
  manager: {
    name: 'Pala Pitta Manager',
    short: 'PP Manager',
    description: 'Customers, team, menu, inventory and coupons for Pala Pitta Ruchulu.',
  },
  cashier: {
    name: 'Pala Pitta Billing',
    short: 'PP Billing',
    description: 'Counter billing, orders and receipt printing for Pala Pitta Ruchulu.',
  },
  chef: {
    name: 'Pala Pitta Kitchen',
    short: 'PP Kitchen',
    description: 'Kitchen Display System for Pala Pitta Ruchulu.',
  },
  waiter: {
    name: 'Pala Pitta Tables',
    short: 'PP Tables',
    description: 'Reservations and table management for Pala Pitta Ruchulu.',
  },
};

export const ROLE_APP_SLUGS: Record<StaffRole, string> = {
  admin: 'admin',
  manager: 'manager',
  cashier: 'billing',
  chef: 'kitchen',
  waiter: 'tables',
};

export const ROLE_APPS: Record<StaffRole, RoleApp> = (
  Object.keys(ROLE_APP_SLUGS) as StaffRole[]
).reduce((acc, role) => {
  acc[role] = {
    slug: ROLE_APP_SLUGS[role],
    name: NAMES[role].name,
    shortName: NAMES[role].short,
    description: NAMES[role].description,
    startUrl: getRoleHome(role),
    themeColor: roleColors[role].color,
    highlights: HIGHLIGHTS[role],
  };
  return acc;
}, {} as Record<StaffRole, RoleApp>);

export function roleAppBySlug(slug: string): RoleApp | undefined {
  return Object.values(ROLE_APPS).find((app) => app.slug === slug);
}

export function roleAppFor(role: string | null | undefined): RoleApp | undefined {
  if (!role || !(role in ROLE_APPS)) return undefined;
  return ROLE_APPS[role as StaffRole];
}

/** Web manifest document for one role — served as application/manifest+json. */
export function buildManifest(app: RoleApp) {
  return {
    id: `/manifest/${app.slug}`,
    name: app.name,
    short_name: app.shortName,
    description: app.description,
    start_url: app.startUrl,
    // Every staff app lives under /admin, so one scope covers them all —
    // including the dashboard at exactly /admin. Matches the service
    // worker's scope in ServiceWorkerRegister.tsx.
    scope: '/admin',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#FBF8F5',
    theme_color: app.themeColor,
    // Real files at the sizes they claim, and a separate maskable cut.
    // These all used to point at /logo.png — one 1364x828 wordmark declared
    // as both a 192px and a 512px square, and as maskable, which left
    // Android to crop the name off it for the home screen.
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
