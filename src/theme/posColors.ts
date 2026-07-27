/**
 * posColors.ts — clean light-theme design tokens for the POS screen.
 * Harmonized with Pala Pitta Ruchulu's warm cream & brand red aesthetic.
 */

export const pos = {
  // ── Surfaces ──────────────────────────────────────────────
  bg:            '#FBF8F5',   // Warm cream page canvas
  surface:       '#FFFFFF',   // Clean white cards/panels
  surfaceAlt:    '#F9F8F6',
  surfaceHover:  '#F3F0EC',
  surfaceActive: '#EBE7E1',
  elevated:      '#FFFFFF',

  // ── Borders ───────────────────────────────────────────────
  border:        '#E7E5E4',
  borderSubtle:  '#F1EFED',
  borderFocus:   '#C62828',

  // ── Text ──────────────────────────────────────────────────
  text:          '#1C1917',   // Near black
  textSecondary: '#44403C',
  textMuted:     '#78716C',
  textFaint:     '#A8A29E',

  // ── Brand & Actions ───────────────────────────────────────
  brand:         '#C62828',   // Pala Pitta red
  brandDark:     '#9B1C1C',
  brandSoft:     '#FEF2F2',

  charge:        '#15803D',   // Emerald green for charge/pay action
  chargeDark:    '#166534',
  chargeSoft:    '#F0FDF4',

  danger:        '#DC2626',
  dangerDark:    '#B91C1C',
  dangerSoft:    '#FEF2F2',

  // ── Category / Selection ──────────────────────────────────
  categoryActive:   '#C62828',
  categoryActiveBg: '#FEF2F2',

  // ── Veg indicators ────────────────────────────────────────
  veg:           '#16A34A',
  nonVeg:        '#DC2626',
  egg:           '#D97706',

  // ── Payment mode ──────────────────────────────────────────
  cash:          '#16A34A',
  upi:           '#7C3AED',
  card:          '#2563EB',

  // ── Shadows ───────────────────────────────────────────────
  shadowSm:  '0 1px 3px rgba(28,25,23,0.06)',
  shadowMd:  '0 4px 12px rgba(28,25,23,0.08)',
  shadowLg:  '0 12px 32px rgba(28,25,23,0.12)',
} as const;
