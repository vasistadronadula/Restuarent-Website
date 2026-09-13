/**
 * posColors.ts — clean light-theme design tokens for the POS screen.
 * Harmonized with Pala Pitta Ruchulu's warm cream & brand red aesthetic.
 */

export const pos = {
  // ── Surfaces ──────────────────────────────────────────────
  bg:            '#FFF8EB',   // Warm cream page canvas
  surface:       '#FFFFFF',   // Clean white cards/panels
  surfaceAlt:    '#FFFAF0',
  surfaceHover:  '#FFF1D2',
  surfaceActive: '#F5E5C5',
  elevated:      '#FFFFFF',

  // ── Borders ───────────────────────────────────────────────
  border:        '#E7E5E4',
  borderSubtle:  '#F1EFED',
  borderFocus:   '#008391',

  // ── Text ──────────────────────────────────────────────────
  text:          '#1C1917',   // Near black
  textSecondary: '#44403C',
  textMuted:     '#78716C',
  textFaint:     '#A8A29E',

  // ── Brand & Actions ───────────────────────────────────────
  brand:         '#DF301C',
  brandDark:     '#A32418',
  brandSoft:     '#FFF2ED',

  charge:        '#15803D',   // Emerald green for charge/pay action
  chargeDark:    '#166534',
  chargeSoft:    '#F0FDF4',

  danger:        '#DC2626',
  dangerDark:    '#B91C1C',
  dangerSoft:    '#FEF2F2',

  // ── Category / Selection ──────────────────────────────────
  categoryActive:   '#DF301C',
  categoryActiveBg: '#FFF2ED',

  // ── Veg indicators ────────────────────────────────────────
  veg:           '#16A34A',
  nonVeg:        '#DC2626',
  egg:           '#D97706',

  // ── Payment mode ──────────────────────────────────────────
  cash:          '#16A34A',
  upi:           '#006773',
  card:          '#A35200',

  // ── Shadows ───────────────────────────────────────────────
  shadowSm:  '0 1px 3px rgba(28,25,23,0.06)',
  shadowMd:  '0 4px 12px rgba(28,25,23,0.08)',
  shadowLg:  '0 12px 32px rgba(28,25,23,0.12)',
} as const;
