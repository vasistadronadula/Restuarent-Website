'use client';

import React from 'react';
import Link from 'next/link';
import { adminColors, roleColors, orderStatusColors, reservationStatusColors } from '@/theme/adminColors';
import { ROLE_LABELS } from '@/lib/roleAccess';
import type { UserRole } from '@/types';
import { Badge } from '@/components/ui/badge';

export { adminColors, roleColors, orderStatusColors, reservationStatusColors };

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-stone-500 mt-0.5 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="w-full sm:w-auto flex-shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  icon, label, value, sub, accent = '#C62828', trend, href,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode;
  accent?: string; trend?: { label: string; up: boolean } | null; href?: string;
}) {
  const inner = (
    <div className={`p-4 rounded-xl border border-stone-200 bg-white h-full flex flex-col justify-between ${href ? 'hover:border-stone-300 hover:shadow-sm cursor-pointer transition-all' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            <div className="w-4 h-4 flex items-center justify-center">{icon}</div>
          </div>
          <span className="text-xs font-medium text-stone-500 truncate">
            {label}
          </span>
        </div>
        {trend && (
          <Badge className={`text-xs font-medium px-2 py-0.5 rounded-md border-none ${trend.up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {trend.label}
          </Badge>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-stone-900 leading-tight tabular-nums">
          {value}
        </div>
        {sub && (
          <div className="text-xs text-stone-400 mt-0.5 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full no-underline">{inner}</Link>;
  }
  return inner;
}

export function SectionCard({
  children, noPadding = false, className = '',
}: { children: React.ReactNode; noPadding?: boolean; className?: string }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white overflow-hidden ${noPadding ? '' : 'p-4 sm:p-5'} ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({
  title, subtitle, action,
}: { title: React.ReactNode; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4 mb-4 flex-wrap">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-stone-900">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function AlertTile({
  icon, label, detail, count, tone = 'warning', href,
}: {
  icon: React.ReactNode; label: string; detail?: string; count: number;
  tone?: 'warning' | 'danger' | 'info'; href: string;
}) {
  const tones = {
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
  }[tone];

  return (
    <Link href={href} className="no-underline block">
      <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors hover:brightness-95 ${tones}`}>
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-stone-900 leading-tight">
            {label}
          </h4>
          {detail && (
            <p className="text-xs text-stone-500 truncate mt-0.5">{detail}</p>
          )}
        </div>
        <Badge className="min-w-[24px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-semibold">
          {count}
        </Badge>
      </div>
    </Link>
  );
}

export function StatusChip({
  status, palette,
}: { status: string; palette?: Record<string, { label: string; color: string; bg: string }> }) {
  const p = (palette || orderStatusColors)[status] || { label: status, color: '#78716C', bg: '#F5F5F4' };
  return (
    <Badge
      className="font-medium text-xs px-2 py-0.5 border-none"
      style={{ backgroundColor: p.bg, color: p.color }}
    >
      {p.label}
    </Badge>
  );
}

export function EmptyState({
  emoji = '📭', title, subtitle, action,
}: { emoji?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-semibold text-stone-900 text-sm">{title}</h3>
      {subtitle && (
        <p className="text-sm text-stone-500 mt-1">{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function RoleBadge({ role }: { role: UserRole | null | undefined }) {
  if (!role || role === 'customer') return null;
  const c = roleColors[role];
  return (
    <Badge
      className="font-medium text-xs px-2 py-0.5 border-none"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}
