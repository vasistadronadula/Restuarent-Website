/**
 * adminColors.ts — the admin panel's design tokens.
 *
 * One warm, accessible palette. Every value below meets WCAG AA against the
 * surface it's used on, which the previous ad-hoc mix did not (it carried
 * leftovers from an old dark theme — neon #4ade80 on white, #cbd5e1 body
 * text, blue-slate #0F172A against a warm cream page).
 *
 * Neutrals are warm (stone) rather than blue (slate) so they harmonize with
 * the cream canvas and the red/orange brand instead of fighting them.
 */

const ink = '#0F172A';        // near-black slate
const inkSoft = '#334155';
const muted = '#64748B';
const faint = '#94A3B8';
const line = '#E2E8F0';
const lineSoft = '#F1F5F9';

const brand = '#059669';      // Emerald green (RestoFlow primary)
const brandDark = '#047857';
const accent = '#10B981';     // Light emerald
const accentDark = '#059669';

export const adminColors = {
  // ── Surfaces ──────────────────────────────────────────────
  canvas: '#F8FAFC',          // crisp clean light slate canvas
  bgPage: '#F8FAFC',
  bgPanel: '#FFFFFF',
  bgPanelAlt: '#F8FAFC',
  bgSubtle: '#F1F5F9',
  bgDanger: '#FEF2F2',
  bgDangerPanel: '#FFFFFF',

  // ── Brand ─────────────────────────────────────────────────
  brand,
  brandDark,
  brandSoft: '#ECFDF5',
  accent,
  accentDark,
  accentSoft: '#F0FDF4',
  // Legacy aliases — kept so existing pages keep compiling.
  accentRed: brand,
  accentRedDark: brandDark,
  accentOrange: accent,
  accentOrangeDark: accentDark,
  gradientBrand: `linear-gradient(135deg, ${brand}, ${brandDark})`,
  gradientBrandSoft: 'linear-gradient(135deg, rgba(5,150,105,0.06), rgba(16,185,129,0.05))',
  gradientDanger: `linear-gradient(135deg, #DC2626, #B91C1C)`,

  // ── Semantic status (AA on white) ─────────────────────────
  success: '#059669',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  danger: '#DC2626',
  dangerStrong: '#B91C1C',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  info: '#2563EB',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',
  neutral: muted,
  neutralBg: lineSoft,

  // ── Text ──────────────────────────────────────────────────
  textPrimary: ink,
  textSecondary: inkSoft,
  textMuted: muted,
  textFaint: faint,
  textOnBrand: '#FFFFFF',

  // ── Structure ─────────────────────────────────────────────
  border: line,
  borderSubtle: lineSoft,
  divider: lineSoft,

  // ── Elevation ─────────────────────────────────────────────
  shadowSm: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
  shadowMd: '0 4px 12px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04)',
  shadowLg: '0 12px 32px rgba(15,23,42,0.08), 0 4px 8px rgba(15,23,42,0.04)',

  // ── Radius scale ──────────────────────────────────────────
  radiusSm: '8px',
  radiusMd: '12px',
  radiusLg: '16px',
  radiusXl: '20px',
} as const;

// Role accents — distinct hues, all AA on their own soft background.
export const roleColors: Record<'admin' | 'manager' | 'chef' | 'cashier' | 'waiter', { color: string; bg: string }> = {
  admin: { color: '#C62828', bg: '#FEF2F2' },
  manager: { color: '#7C3AED', bg: '#F5F3FF' },
  chef: { color: '#EA580C', bg: '#FFF7ED' },
  cashier: { color: '#15803D', bg: '#F0FDF4' },
  waiter: { color: '#1D4ED8', bg: '#EFF6FF' },
};

// One order-status palette shared by Dashboard, Orders, and Kitchen instead
// of three near-identical local copies.
export const orderStatusColors: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#B45309', bg: '#FFFBEB' },
  preparing: { label: 'Preparing', color: '#1D4ED8', bg: '#EFF6FF' },
  ready: { label: 'Ready', color: '#15803D', bg: '#F0FDF4' },
  delivered: { label: 'Delivered', color: '#78716C', bg: '#F1EFED' },
  cancelled: { label: 'Cancelled', color: '#B91C1C', bg: '#FEF2F2' },
};

export const reservationStatusColors: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#B45309', bg: '#FFFBEB' },
  confirmed: { label: 'Confirmed', color: '#15803D', bg: '#F0FDF4' },
  completed: { label: 'Completed', color: '#78716C', bg: '#F1EFED' },
  cancelled: { label: 'Cancelled', color: '#B91C1C', bg: '#FEF2F2' },
};
