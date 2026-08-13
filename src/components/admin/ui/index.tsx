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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed font-medium">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="w-full sm:w-auto flex-shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  icon, label, value, sub, accent = '#059669', trend, href,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode;
  accent?: string; trend?: { label: string; up: boolean } | null; href?: string;
}) {
  const inner = (
    <div className={`p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white h-full flex flex-col justify-between shadow-2xs ${href ? 'hover:border-slate-300 hover:shadow-md cursor-pointer transition-all active:scale-[0.99]' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="size-8.5 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            <div className="size-4 flex items-center justify-center">{icon}</div>
          </div>
          <span className="text-xs font-bold text-slate-500 truncate">
            {label}
          </span>
        </div>
        {trend && (
          <Badge className={`text-[11px] font-bold px-2 py-0.5 rounded-md border-none ${trend.up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {trend.label}
          </Badge>
        )}
      </div>
      <div>
        <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tabular-nums font-mono">
          {value}
        </div>
        {sub && (
          <div className="text-xs text-slate-400 mt-1 truncate font-medium">
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
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden ${noPadding ? '' : 'p-4 sm:p-5'} ${className}`}>
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
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>
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
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
  }[tone];

  return (
    <Link href={href} className="no-underline block">
      <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-2xs ${tones}`}>
        <div className="size-8 rounded-lg bg-white flex items-center justify-center text-sm shrink-0 shadow-2xs">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-slate-900 leading-tight">
            {label}
          </h4>
          {detail && (
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{detail}</p>
          )}
        </div>
        <Badge className="min-w-[22px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10.5px] font-black">
          {count}
        </Badge>
      </div>
    </Link>
  );
}

export function StatusChip({
  status, palette,
}: { status: string; palette?: Record<string, { label: string; color: string; bg: string }> }) {
  const p = (palette || orderStatusColors)[status] || { label: status, color: '#64748B', bg: '#F1F5F9' };
  return (
    <Badge
      className="font-bold text-[11px] px-2.5 py-0.5 border-none shadow-2xs"
      style={{ backgroundColor: p.bg, color: p.color }}
    >
      {p.label}
    </Badge>
  );
}

export function EmptyState({
  icon, emoji, title, description, action,
}: {
  icon?: React.ReactNode; emoji?: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="p-10 text-center flex flex-col items-center justify-center">
      <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-3 text-xl">
        {icon || emoji || '📦'}
      </div>
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed font-medium">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function RolePill({ role }: { role?: UserRole | null }) {
  if (!role) return null;
  const meta = roleColors[role as keyof typeof roleColors] || { color: '#64748B', bg: '#F1F5F9' };
  const label = ROLE_LABELS[role] || role;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      {label}
    </span>
  );
}

export const RoleBadge = RolePill;

