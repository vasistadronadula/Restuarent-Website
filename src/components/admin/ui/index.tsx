'use client';

/**
 * Shared admin UI kit. Every /admin page composes from these instead of
 * re-declaring its own Paper/Chip/empty-state styling — the redesign's
 * "production-grade structure" is this: one set of primitives, not 13
 * bespoke implementations of the same card/chip/header patterns.
 */

import React from 'react';
import { Box, Paper, Typography, Chip, type SxProps, type Theme } from '@mui/material';
import { adminColors, roleColors, orderStatusColors, reservationStatusColors } from '@/theme/adminColors';
import { ROLE_LABELS } from '@/lib/roleAccess';
import type { UserRole } from '@/types';

export { adminColors, roleColors, orderStatusColors, reservationStatusColors };

// ─── PageHeader ─────────────────────────────────────────────────────────────
export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: { xs: 'flex-start', sm: 'center' },
      flexDirection: { xs: 'column', sm: 'row' },
      gap: 2, mb: 3,
    }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: adminColors.textPrimary, letterSpacing: '-0.3px' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: adminColors.textSecondary, mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>{action}</Box>}
    </Box>
  );
}

// ─── StatCard ───────────────────────────────────────────────────────────────
export function StatCard({
  icon, label, value, sub, accent = adminColors.accentOrange, trend,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode;
  accent?: string; trend?: { label: string; up: boolean };
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5, borderRadius: adminColors.radiusLg,
        border: `1px solid ${adminColors.borderSubtle}`,
        bgcolor: adminColors.bgPanel, boxShadow: adminColors.shadowSm,
        display: 'flex', alignItems: 'center', gap: 2, height: '100%',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: adminColors.shadowMd },
      }}
    >
      <Box sx={{
        width: 48, height: 48, borderRadius: adminColors.radiusMd,
        bgcolor: `${accent}18`, color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: '1.4rem',
      }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, color: adminColors.textPrimary, lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: adminColors.textSecondary, display: 'block', mt: 0.3 }}>
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: adminColors.textMuted, fontSize: '10.5px', display: 'block' }}>
            {sub}
          </Typography>
        )}
      </Box>
      {trend && (
        <Chip
          label={`${trend.up ? '↑' : '↓'} ${trend.label}`}
          size="small"
          sx={{
            bgcolor: trend.up ? adminColors.successBg : adminColors.dangerBg,
            color: trend.up ? adminColors.success : adminColors.danger,
            fontWeight: 700, fontSize: '10px', flexShrink: 0,
          }}
        />
      )}
    </Paper>
  );
}

// ─── SectionCard ────────────────────────────────────────────────────────────
export function SectionCard({
  children, sx, noPadding = false,
}: { children: React.ReactNode; sx?: SxProps<Theme>; noPadding?: boolean }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: adminColors.radiusLg,
        border: `1px solid ${adminColors.borderSubtle}`,
        bgcolor: adminColors.bgPanel, boxShadow: adminColors.shadowSm,
        overflow: 'hidden',
        ...(noPadding ? {} : { p: { xs: 2, sm: 3 } }),
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

// ─── StatusChip ─────────────────────────────────────────────────────────────
export function StatusChip({
  status, palette,
}: { status: string; palette?: Record<string, { label: string; color: string; bg: string }> }) {
  const p = (palette || orderStatusColors)[status] || { label: status, color: adminColors.neutral, bg: adminColors.neutralBg };
  return (
    <Chip label={p.label} size="small" sx={{ bgcolor: p.bg, color: p.color, fontWeight: 700, fontSize: '11px' }} />
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({
  emoji = '📭', title, subtitle,
}: { emoji?: string; title: string; subtitle?: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
      <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>{emoji}</Typography>
      <Typography sx={{ fontWeight: 700, color: adminColors.textPrimary }}>{title}</Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: adminColors.textMuted, mt: 0.5 }}>{subtitle}</Typography>
      )}
    </Box>
  );
}

// ─── RoleBadge ──────────────────────────────────────────────────────────────
export function RoleBadge({ role, size = 'small' }: { role: UserRole | null | undefined; size?: 'small' | 'medium' }) {
  if (!role || role === 'customer') return null;
  const c = roleColors[role];
  return (
    <Chip
      label={ROLE_LABELS[role]}
      size="small"
      sx={{
        bgcolor: c.bg, color: c.color, fontWeight: 800,
        fontSize: size === 'small' ? '9px' : '11px',
        textTransform: 'uppercase', letterSpacing: '0.4px',
        height: size === 'small' ? 18 : 22,
      }}
    />
  );
}
