/**
 * adminColors.ts
 * Shared color tokens for the admin dashboard shell (sidebar, header,
 * guards, empty/error states). The admin panel now uses the SAME light
 * brand palette as the customer-facing site (see theme.ts) rather than a
 * separate dark dashboard look — these tokens exist so the handful of
 * places still using raw CSS-in-JS `<style>` blocks (which can't consume
 * the MUI theme directly) stay in sync with it.
 */
export const adminColors = {
  bgPage: '#FFF8F2',
  bgPanel: '#FFFFFF',
  bgPanelAlt: '#FFF3E0',
  bgDanger: '#FFF5F5',
  bgDangerPanel: '#FFFFFF',
  accentOrange: '#FF9800',
  accentRed: '#C62828',
  danger: '#C62828',
  dangerStrong: '#B71C1C',
  dangerBorder: 'rgba(198,40,40,0.25)',
  gradientDanger: 'linear-gradient(135deg, #C62828, #FF9800)',
  textMuted: 'rgba(33,33,33,0.65)',
  textPrimary: '#212121',
  border: 'rgba(0,0,0,0.08)',
} as const;
