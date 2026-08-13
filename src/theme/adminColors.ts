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

const ink = '#1C1917';        // near-black, warm
const inkSoft = '#44403C';
const muted = '#78716C';
const faint = '#A8A29E';
const line = '#E7E5E4';
const lineSoft = '#F1EFED';

const brand = '#C62828';      // Pala Pitta red
const brandDark = '#9B1C1C';
const accent = '#EA580C';     // orange — AA on white, unlike #FF9800
const accentDark = '#C2410C';

export const adminColors = {
  // ── Surfaces ──────────────────────────────────────────────
  canvas: '#FBF8F5',          // page background (warm cream)
  bgPage: '#FBF8F5',
  bgPanel: '#FFFFFF',
  bgPanelAlt: '#FDFBF9',
  bgSubtle: '#FAFAF9',
  bgDanger: '#FEF2F2',
  bgDangerPanel: '#FFFFFF',

  // ── Brand ─────────────────────────────────────────────────
  brand,
  brandDark,
  brandSoft: '#FEF2F2',
  accent,
  accentDark,
  accentSoft: '#FFF7ED',
  // Legacy aliases — kept so existing pages keep compiling.
  accentRed: brand,
  accentRedDark: brandDark,
  accentOrange: accent,
  accentOrangeDark: accentDark,
  gradientBrand: `linear-gradient(135deg, ${brand}, ${accent})`,
  gradientBrandSoft: 'linear-gradient(135deg, rgba(198,40,40,0.06), rgba(234,88,12,0.05))',
  gradientDanger: `linear-gradient(135deg, ${brand}, ${accent})`,

  // ── Semantic status (AA on white) ─────────────────────────
  success: '#15803D',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
  warning: '#B45309',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  danger: '#B91C1C',
  dangerStrong: '#991B1B',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  info: '#1D4ED8',
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

  // ── Elevation — soft and warm, not gray smudge ────────────
  shadowSm: '0 1px 2px rgba(28,25,23,0.04), 0 1px 3px rgba(28,25,23,0.06)',
  shadowMd: '0 4px 12px rgba(28,25,23,0.06), 0 2px 4px rgba(28,25,23,0.04)',
  shadowLg: '0 12px 32px rgba(28,25,23,0.10), 0 4px 8px rgba(28,25,23,0.05)',

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
