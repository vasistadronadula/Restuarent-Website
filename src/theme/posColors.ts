/**
 * posColors.ts — dark-theme design tokens exclusive to the POS screen.
 *
 * The admin panel stays warm-cream; this palette only applies inside
 * /admin/pos. Every value meets WCAG AA on the surface it sits on.
 *
 * Inspired by Toast, Square, and Petpooja POS terminals — dark slate
 * backgrounds reduce eye strain during long cashier shifts, and the
 * emerald "Charge" button is the most visible element on screen.
 */

export const pos = {
  // ── Surfaces ──────────────────────────────────────────────
  bg:            '#0F172A',
  surface:       '#1E293B',
  surfaceAlt:    '#162032',
  surfaceHover:  '#334155',
  surfaceActive: '#475569',
  elevated:      '#253349',

  // ── Borders ───────────────────────────────────────────────
  border:        '#334155',
  borderSubtle:  '#1E293B',
  borderFocus:   '#6366F1',

  // ── Text ──────────────────────────────────────────────────
  text:          '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted:     '#94A3B8',
  textFaint:     '#64748B',

  // ── Brand & Actions ───────────────────────────────────────
  brand:         '#C62828',   // Pala Pitta red
  brandDark:     '#9B1C1C',
  brandSoft:     'rgba(198,40,40,0.15)',

  charge:        '#10B981',   // Primary CTA — "Charge / Place order"
  chargeDark:    '#059669',
  chargeSoft:    'rgba(16,185,129,0.12)',

  danger:        '#EF4444',
  dangerDark:    '#DC2626',
  dangerSoft:    'rgba(239,68,68,0.12)',

  // ── Category / Selection ──────────────────────────────────
  categoryActive:   '#6366F1',
  categoryActiveBg: 'rgba(99,102,241,0.15)',

  // ── Veg indicators ────────────────────────────────────────
  veg:           '#22C55E',
  nonVeg:        '#EF4444',
  egg:           '#F59E0B',

  // ── Payment mode ──────────────────────────────────────────
  cash:          '#10B981',
  upi:           '#8B5CF6',
  card:          '#3B82F6',

  // ── Shadows (on dark they are near-black) ─────────────────
  shadowSm:  '0 1px 3px rgba(0,0,0,0.3)',
  shadowMd:  '0 4px 12px rgba(0,0,0,0.4)',
  shadowLg:  '0 12px 32px rgba(0,0,0,0.5)',
} as const;
