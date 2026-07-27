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

// ── PageHeader ─────────────────────────────────────────────────────────────
export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: { xs: 'flex-start', sm: 'center' },
      flexDirection: { xs: 'column', sm: 'row' },
      gap: 1.5, mb: 2,
    }}>
      <Box>
        <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 900, color: adminColors.textPrimary, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 12.5, color: adminColors.textMuted, mt: 0.3, fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>{action}</Box>}
    </Box>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────
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
        p: 1.75, borderRadius: adminColors.radiusMd,
        border: `1px solid ${adminColors.border}`,
        bgcolor: adminColors.bgPanel, boxShadow: adminColors.shadowSm,
        height: '100%', display: 'flex', flexDirection: 'column', gap: 1,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        ...(href ? { cursor: 'pointer', '&:hover': { borderColor: accent, boxShadow: adminColors.shadowMd } } : {}),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: adminColors.radiusSm,
          bgcolor: `${accent}14`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: '15px',
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
              fontWeight: 800, fontSize: '10px', height: 19, flexShrink: 0,
            }}
          />
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 900, color: adminColors.textPrimary, lineHeight: 1.1, letterSpacing: '-0.6px' }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: adminColors.textSecondary, mt: 0.3 }}>
          {label}
        </Typography>
        {sub && (
          <Typography sx={{ fontSize: 10.5, color: adminColors.textMuted, mt: 0.15, fontWeight: 500 }}>
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

// ── SectionCard ────────────────────────────────────────────────────────────
export function SectionCard({
  children, sx, noPadding = false,
}: { children: React.ReactNode; sx?: SxProps<Theme>; noPadding?: boolean }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: adminColors.radiusMd,
        border: `1px solid ${adminColors.border}`,
        bgcolor: adminColors.bgPanel, boxShadow: adminColors.shadowSm,
        overflow: 'hidden',
        ...(noPadding ? {} : { p: { xs: 1.75, sm: 2 } }),
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

// ── SectionHeading — in-card title row ─────────────────────────────────────
export function SectionHeading({
  title, subtitle, action,
}: { title: React.ReactNode; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: adminColors.textPrimary, letterSpacing: '-0.2px' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 11, color: adminColors.textMuted, mt: 0.15, fontWeight: 500 }}>{subtitle}</Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}

// ── AlertTile — a single actionable "needs attention" row ──────────────────
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
        display: 'flex', alignItems: 'center', gap: 1.25,
        p: 1.25, borderRadius: adminColors.radiusSm,
        bgcolor: tones.bg, border: `1px solid ${tones.border}`,
        transition: 'transform 0.12s ease',
        '&:hover': { transform: 'translateX(2px)' },
      }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: '7px', flexShrink: 0,
          bgcolor: '#FFFFFF', color: tones.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: adminColors.textPrimary, lineHeight: 1.3 }}>
            {label}
          </Typography>
          {detail && (
            <Typography sx={{ fontSize: 11, color: adminColors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
              {detail}
            </Typography>
          )}
        </Box>
        <Box sx={{
          minWidth: 24, height: 22, px: 0.75, borderRadius: '11px', flexShrink: 0,
          bgcolor: tones.color, color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800,
        }}>
          {count}
        </Box>
      </Box>
    </Link>
  );
}

// ── StatusChip ─────────────────────────────────────────────────────────────
export function StatusChip({
  status, palette,
}: { status: string; palette?: Record<string, { label: string; color: string; bg: string }> }) {
  const p = (palette || orderStatusColors)[status] || { label: status, color: adminColors.neutral, bg: adminColors.neutralBg };
  return (
    <Chip label={p.label} size="small" sx={{ bgcolor: p.bg, color: p.color, fontWeight: 800, fontSize: '10.5px' }} />
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({
  emoji = '📭', title, subtitle, action,
}: { emoji?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
      <Typography sx={{ fontSize: '2rem', mb: 0.75, opacity: 0.8 }}>{emoji}</Typography>
      <Typography sx={{ fontWeight: 800, color: adminColors.textPrimary, fontSize: 14 }}>{title}</Typography>
      {subtitle && (
        <Typography sx={{ color: adminColors.textMuted, mt: 0.4, fontSize: 12.5, fontWeight: 500 }}>{subtitle}</Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}

// ── RoleBadge ──────────────────────────────────────────────────────────────
export function RoleBadge({ role, size = 'small' }: { role: UserRole | null | undefined; size?: 'small' | 'medium' }) {
  if (!role || role === 'customer') return null;
  const c = roleColors[role];
  return (
    <Chip
      label={ROLE_LABELS[role]}
      size="small"
      sx={{
        bgcolor: c.bg, color: c.color, fontWeight: 800,
        fontSize: size === 'small' ? '9px' : '10.5px',
        textTransform: 'uppercase', letterSpacing: '0.4px',
        height: size === 'small' ? 18 : 22,
      }}
    />
  );
}
