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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 dark:text-white tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm font-semibold text-stone-500 dark:text-stone-400 max-w-2xl leading-relaxed">
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
    <div className={`p-5 sm:p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1C1E] shadow-sm dark:shadow-none h-full flex flex-col justify-between transition-all duration-200 ${href ? 'hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-base font-bold shadow-xs"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            <div className="w-5 h-5 flex items-center justify-center">{icon}</div>
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 truncate">
            {label}
          </span>
        </div>
        {trend && (
          <Badge className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border-none ${trend.up ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'}`}>
            {trend.label}
          </Badge>
        )}
      </div>
      <div className="min-w-0 pt-1">
        <div className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white leading-tight tracking-tight">
          {value}
        </div>
        {sub && (
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mt-1.5 truncate">
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
    <div className={`rounded-3xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#1C1C1E] shadow-sm dark:shadow-none overflow-hidden ${noPadding ? '' : 'p-6 sm:p-8'} ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({
  title, subtitle, action,
}: { title: React.ReactNode; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 mb-5 flex-wrap">
      <div className="min-w-0 space-y-0.5">
        <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium">{subtitle}</p>
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
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  }[tone];

  return (
    <Link href={href} className="no-underline block">
      <div className={`flex items-center gap-3 p-3 rounded-xl border transition-transform hover:translate-x-1 ${tones}`}>
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-stone-900 flex items-center justify-center text-sm shadow-xs flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-extrabold text-stone-900 dark:text-stone-100 leading-tight">
            {label}
          </h4>
          {detail && (
            <p className="text-[11px] text-stone-500 truncate font-medium mt-0.5">
              {detail}
            </p>
          )}
        </div>
        <Badge className="min-w-[24px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-extrabold">
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
      className="font-extrabold text-[10px] px-2 py-0.5 border-none"
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
    <div className="text-center py-8 px-4">
      <div className="text-3xl mb-2">{emoji}</div>
      <h3 className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">{title}</h3>
      {subtitle && (
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">{subtitle}</p>
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
      className="font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 border-none"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}
