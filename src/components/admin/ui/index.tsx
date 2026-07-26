'use client';

/**
 * Shared admin UI kit. Every /admin page composes from these instead of
 * re-declaring its own card/chip/empty-state styling — the redesign's
 * "production-grade structure" is this: one set of primitives, not a
 * bespoke implementation of the same patterns on every page.
 */

import React from 'react';
import Link from 'next/link';
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
        <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 800, color: adminColors.textPrimary, letterSpacing: '-0.4px', lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 13, color: adminColors.textMuted, mt: 0.5 }}>
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
  icon, label, value, sub, accent = adminColors.accent, trend, href,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode;
  accent?: string; trend?: { label: string; up: boolean } | null; href?: string;
}) {
  const inner = (
    <Paper
      elevation={0}
      sx={{
        p: 2.25, borderRadius: adminColors.radiusLg,
        border: `1px solid ${adminColors.border}`,
        bgcolor: adminColors.bgPanel, boxShadow: adminColors.shadowSm,
        height: '100%', display: 'flex', flexDirection: 'column', gap: 1.25,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        ...(href ? { cursor: 'pointer', '&:hover': { borderColor: accent, boxShadow: adminColors.shadowMd } } : {}),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: adminColors.radiusSm,
          bgcolor: `${accent}14`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: '16px',
        }}>
          {icon}
        </Box>
        {trend && (
          <Chip
            label={trend.label}
            size="small"
            sx={{
              bgcolor: trend.up ? adminColors.successBg : adminColors.dangerBg,
              color: trend.up ? adminColors.success : adminColors.danger,
              fontWeight: 700, fontSize: '10.5px', height: 20, flexShrink: 0,
            }}
          />
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 800, color: adminColors.textPrimary, lineHeight: 1.1, letterSpacing: '-0.6px' }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: adminColors.textSecondary, mt: 0.4 }}>
          {label}
        </Typography>
        {sub && (
          <Typography sx={{ fontSize: 11, color: adminColors.textMuted, mt: 0.2 }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Paper>
  );

  if (href) {
    return <Link href={href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{inner}</Link>;
  }
  return inner;
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
        border: `1px solid ${adminColors.border}`,
        bgcolor: adminColors.bgPanel, boxShadow: adminColors.shadowSm,
        overflow: 'hidden',
        ...(noPadding ? {} : { p: { xs: 2, sm: 2.5 } }),
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

// ─── SectionHeading — in-card title row ─────────────────────────────────────
export function SectionHeading({
  title, subtitle, action,
}: { title: React.ReactNode; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: adminColors.textPrimary, letterSpacing: '-0.2px' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 11.5, color: adminColors.textMuted, mt: 0.2 }}>{subtitle}</Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}

// ─── AlertTile — a single actionable "needs attention" row ──────────────────
export function AlertTile({
  icon, label, detail, count, tone = 'warning', href,
}: {
  icon: React.ReactNode; label: string; detail?: string; count: number;
  tone?: 'warning' | 'danger' | 'info'; href: string;
}) {
  const tones = {
    warning: { color: adminColors.warning, bg: adminColors.warningBg, border: adminColors.warningBorder },
    danger: { color: adminColors.danger, bg: adminColors.dangerBg, border: adminColors.dangerBorder },
    info: { color: adminColors.info, bg: adminColors.infoBg, border: adminColors.infoBorder },
  }[tone];

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        p: 1.5, borderRadius: adminColors.radiusMd,
        bgcolor: tones.bg, border: `1px solid ${tones.border}`,
        transition: 'transform 0.12s ease',
        '&:hover': { transform: 'translateX(2px)' },
      }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: adminColors.radiusSm, flexShrink: 0,
          bgcolor: '#FFFFFF', color: tones.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: adminColors.textPrimary, lineHeight: 1.3 }}>
            {label}
          </Typography>
          {detail && (
            <Typography sx={{ fontSize: 11.5, color: adminColors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {detail}
            </Typography>
          )}
        </Box>
        <Box sx={{
          minWidth: 26, height: 24, px: 1, borderRadius: '12px', flexShrink: 0,
          bgcolor: tones.color, color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>
          {count}
        </Box>
      </Box>
    </Link>
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
  emoji = '📭', title, subtitle, action,
}: { emoji?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
      <Typography sx={{ fontSize: '2.25rem', mb: 1, opacity: 0.8 }}>{emoji}</Typography>
      <Typography sx={{ fontWeight: 700, color: adminColors.textPrimary, fontSize: 15 }}>{title}</Typography>
      {subtitle && (
        <Typography sx={{ color: adminColors.textMuted, mt: 0.5, fontSize: 13 }}>{subtitle}</Typography>
      )}
      {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
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
        fontSize: size === 'small' ? '9.5px' : '11px',
        textTransform: 'uppercase', letterSpacing: '0.4px',
        height: size === 'small' ? 19 : 23,
      }}
    />
  );
}
