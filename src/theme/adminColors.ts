/**
 * adminColors.ts
 * Design tokens for the admin dashboard shell and every /admin page.
 * Pala Pitta's red/orange brand identity, systematized: one place for
 * surfaces, status colors, role colors, elevation and radius — instead of
 * the same hex strings and shadow values being retyped on every page.
 */

export const adminColors = {
  // Surfaces
  bgPage: '#FFF8F2',
  bgPanel: '#FFFFFF',
  bgPanelAlt: '#FFFBF7',
  bgSubtle: '#FAFAFA',
  bgDanger: '#FFF5F5',
  bgDangerPanel: '#FFFFFF',

  // Brand
  accentOrange: '#FF9800',
  accentOrangeDark: '#E65100',
  accentRed: '#C62828',
  accentRedDark: '#B71C1C',
  gradientBrand: 'linear-gradient(135deg, #C62828, #FF9800)',
  gradientBrandSoft: 'linear-gradient(135deg, rgba(198,40,40,0.08), rgba(255,152,0,0.06))',
  gradientDanger: 'linear-gradient(135deg, #C62828, #FF9800)',

  // Semantic status
  success: '#2E7D32',
  successBg: 'rgba(46,125,50,0.1)',
  warning: '#FF9800',
  warningBg: 'rgba(255,152,0,0.1)',
  info: '#1565C0',
  infoBg: 'rgba(21,101,192,0.1)',
  danger: '#C62828',
  dangerStrong: '#B71C1C',
  dangerBg: 'rgba(198,40,40,0.1)',
  dangerBorder: 'rgba(198,40,40,0.25)',
  neutral: '#616161',
  neutralBg: 'rgba(97,97,97,0.1)',

  // Text
  textPrimary: '#212121',
  textSecondary: 'rgba(33,33,33,0.65)',
  textMuted: 'rgba(33,33,33,0.45)',
  textOnBrand: '#FFFFFF',

  // Structure
  border: 'rgba(0,0,0,0.08)',
  borderSubtle: 'rgba(0,0,0,0.05)',
  divider: 'rgba(0,0,0,0.06)',

  // Elevation
  shadowSm: '0 2px 12px rgba(0,0,0,0.05)',
  shadowMd: '0 4px 20px rgba(0,0,0,0.06)',
  shadowLg: '0 12px 40px rgba(0,0,0,0.12)',

  // Radius scale
  radiusSm: '10px',
  radiusMd: '16px',
  radiusLg: '20px',
  radiusXl: '24px',
} as const;

// Role accent colors — role badges, avatars, sidebar highlights.
export const roleColors: Record<'admin' | 'manager' | 'chef' | 'cashier' | 'waiter', { color: string; bg: string }> = {
  admin: { color: '#C62828', bg: 'rgba(198,40,40,0.1)' },
  manager: { color: '#7B1FA2', bg: 'rgba(123,31,162,0.1)' },
  chef: { color: '#E65100', bg: 'rgba(230,81,0,0.1)' },
  cashier: { color: '#2E7D32', bg: 'rgba(46,125,50,0.1)' },
  waiter: { color: '#1565C0', bg: 'rgba(21,101,192,0.1)' },
};

// One order-status palette shared by the Dashboard, Orders, and Kitchen
// pages instead of three near-identical local copies.
export const orderStatusColors: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#FF9800', bg: 'rgba(255,152,0,0.1)' },
  preparing: { label: 'Preparing', color: '#1565C0', bg: 'rgba(21,101,192,0.1)' },
  ready: { label: 'Ready', color: '#2E7D32', bg: 'rgba(46,125,50,0.1)' },
  delivered: { label: 'Delivered', color: '#616161', bg: 'rgba(97,97,97,0.1)' },
  cancelled: { label: 'Cancelled', color: '#C62828', bg: 'rgba(198,40,40,0.1)' },
};

export const reservationStatusColors: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#FF9800', bg: 'rgba(255,152,0,0.1)' },
  confirmed: { label: 'Confirmed', color: '#2E7D32', bg: 'rgba(46,125,50,0.1)' },
  completed: { label: 'Completed', color: '#616161', bg: 'rgba(97,97,97,0.1)' },
  cancelled: { label: 'Cancelled', color: '#C62828', bg: 'rgba(198,40,40,0.1)' },
};
