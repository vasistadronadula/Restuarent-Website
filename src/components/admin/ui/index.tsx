'use client';

/**
 * The admin console's shared primitives, in the Modernist system.
 *
 * Rules of the system, so additions stay consistent:
 *   • A little radius (`--ad-radius`), no shadow. Structure is 2px rules and
 *     2px hairline grid gaps; the radius eases corners, it doesn't soften them.
 *   • One accent (hot red) for primary actions and things that need attention.
 *     Everything else is ink and neutrals — a page with four accent colours is
 *     a page with none.
 *   • Labels are 10–11px, uppercase, wide-tracked. Values are Manrope 800.
 *
 * Existing pages import these by the same names and props they always did, so
 * a page that hasn't been rewritten still lands in the new system.
 */

import React from 'react';
import Link from 'next/link';
import { adminColors, roleColors, orderStatusColors, reservationStatusColors } from '@/theme/adminColors';
import { ROLE_LABELS } from '@/lib/roleAccess';
import type { UserRole } from '@/types';

export { adminColors, roleColors, orderStatusColors, reservationStatusColors };

/**
 * The page toolbar.
 *
 * The route's title already sits in the console header, so this no longer
 * repeats it — it carries the descriptive line and the page's primary action.
 * `title` is still accepted (and still rendered when a page passes no
 * subtitle) so every existing call site keeps working.
 */
export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b-2 border-ad-line pb-3 mb-5">
      <p className="text-[13px] ad-muted max-w-2xl m-0">
        {subtitle || title}
      </p>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Hairline grid — children sit on a divider backplate and the 2px gap between
 * them is the rule. `cols` is a Tailwind grid-template-columns class.
 */
export function HairlineGrid({
  children, cols = 'grid-cols-2 lg:grid-cols-4', className = '',
}: { children: React.ReactNode; cols?: string; className?: string }) {
  return <div className={`ad-grid ${cols} ${className}`}>{children}</div>;
}

/** A stat cell for use inside HairlineGrid — no border of its own. */
export function StatCell({
  label, value, delta, alert = false,
}: { label: string; value: React.ReactNode; delta?: React.ReactNode; alert?: boolean }) {
  return (
    <div className="px-5 py-4">
      <div className="ad-kicker truncate">{label}</div>
      <div
        className="ad-num text-[30px] sm:text-[34px] leading-[1.1] mt-2"
        style={alert ? { color: 'var(--ad-accent)' } : undefined}
      >
        {value}
      </div>
      {delta && <div className="text-[12px] ad-muted mt-1.5 truncate">{delta}</div>}
    </div>
  );
}

/**
 * Standalone stat card — same content as StatCell but carrying its own rule,
 * for the pages that lay stats out in an ordinary gapped grid.
 *
 * `icon`, `accent` and `trend` are kept for call-site compatibility. The
 * per-card accent colour is deliberately not painted: the system runs on one
 * accent, and four differently-tinted cards read as four unrelated things.
 */
export function StatCard({
  icon, label, value, sub, trend, href,
}: {
  icon?: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode;
  accent?: string; trend?: { label: string; up: boolean } | null; href?: string;
}) {
  const inner = (
    <div className="border-2 border-ad-line bg-ad-bg px-5 py-4 h-full flex flex-col justify-between ad-hover transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="ad-kicker truncate flex items-center gap-1.5">
          {icon && <span className="opacity-70 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>}
          {label}
        </div>
        {trend && (
          <span
            className="text-[11px] font-semibold flex-none"
            style={{ color: trend.up ? 'var(--ad-ok)' : 'var(--ad-a700)' }}
          >
            {trend.label}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="ad-num text-[28px] leading-[1.1]">{value}</div>
        {sub && <div className="text-[12px] ad-muted mt-1 truncate">{sub}</div>}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block h-full no-underline text-inherit">{inner}</Link>;
  return inner;
}

export function SectionCard({
  children, noPadding = false, className = '',
}: { children: React.ReactNode; noPadding?: boolean; className?: string }) {
  return (
    <div className={`border-2 border-ad-line bg-ad-bg ${noPadding ? '' : 'p-4 sm:p-5'} ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({
  title, subtitle, action,
}: { title: React.ReactNode; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="ad-section-head">
      <h3 className="ad-h text-[17px]">{title}</h3>
      {subtitle && <span className="text-[12px] ad-muted">{subtitle}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

/** Uppercase filter tabs — the system's segmented control. */
export function Tabs<T extends string>({
  tabs, value, onChange, className = '',
}: {
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          className="ad-tab"
          data-active={t.value === value}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Two-state toggle rendered as a bordered pill (on-menu / out-of-stock, live / paused). */
export function Pill({
  on, onLabel, offLabel, onClick,
}: { on: boolean; onLabel: string; offLabel: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      className="ad-pill"
      data-on={on}
      onClick={onClick}
      disabled={!onClick}
      style={onClick ? undefined : { cursor: 'default' }}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}

/** Square switch — the permissions-row control from the design. */
export function Toggle({
  on, onClick, label,
}: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className="ad-switch" data-on={on} onClick={onClick} aria-pressed={on} aria-label={label}>
      <span />
    </button>
  );
}

/** Flat progress bar used by the top-sellers list. */
export function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 bg-ad-n200 rounded-[var(--ad-radius)] overflow-hidden">
      <div
        className="h-full bg-ad-accent"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function AlertTile({
  icon, label, detail, count, tone = 'warning', href,
}: {
  icon?: React.ReactNode; label: string; detail?: string; count: number;
  tone?: 'warning' | 'danger' | 'info'; href: string;
}) {
  const stripe = tone === 'danger' ? 'var(--ad-accent)' : tone === 'info' ? 'var(--ad-info)' : 'var(--ad-warn)';

  return (
    <Link href={href} className="no-underline block text-inherit">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-ad-surface hover:bg-ad-n200 transition-colors rounded-[var(--ad-radius)] overflow-hidden"
        style={{ borderLeft: `4px solid ${stripe}` }}
      >
        {icon && <span className="flex-none opacity-70">{icon}</span>}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold leading-tight truncate">{label}</div>
          {detail && <div className="text-[12px] ad-muted truncate mt-0.5">{detail}</div>}
        </div>
        <span className="ad-num text-[13px] px-2 py-0.5 bg-ad-ink text-ad-bg">
          {count}
        </span>
      </div>
    </Link>
  );
}

/**
 * Status word. Kept as a flat tag rather than the old tinted chip — the
 * palettes in adminColors still drive which of the four tones it lands on.
 */
export function StatusChip({
  status, palette,
}: { status: string; palette?: Record<string, { label: string; color: string; bg: string }> }) {
  const p = (palette || orderStatusColors)[status];
  const label = p?.label || status;

  const tone =
    status === 'ready' || status === 'confirmed' || status === 'paid' ? 'ad-tag-ok'
    : status === 'pending' ? 'ad-tag-accent'
    : status === 'preparing' ? 'ad-tag-info'
    : status === 'cancelled' ? 'ad-tag-outline'
    : '';

  return <span className={`ad-tag ${tone}`.trim()}>{label}</span>;
}

export function EmptyState({
  emoji = '—', title, subtitle, action,
}: { emoji?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-14 px-4">
      <div className="text-2xl mb-3 opacity-40">{emoji}</div>
      <h3 className="ad-h text-[16px]">{title}</h3>
      {subtitle && <p className="text-[13px] ad-muted mt-1.5 m-0">{subtitle}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function RoleBadge({ role }: { role: UserRole | null | undefined }) {
  if (!role || role === 'customer') return null;
  return <span className="ad-tag ad-tag-solid">{ROLE_LABELS[role]}</span>;
}
