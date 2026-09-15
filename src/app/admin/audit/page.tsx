'use client';

import { useMemo, useState } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import { AdminQueryError } from '@/components/admin/ui';
import { useAuditActors, useAuditLog, describeAuditEntry, formatAuditTime } from '@/lib/queries/audit';
import { useAuthStore } from '@/store/useAuthStore';

const TABLE_FILTERS = ['all', 'orders', 'menu_items', 'menu_categories', 'coupons', 'restaurant_tables', 'inventory_items', 'employees', 'reservations'] as const;

/** Who-did-what ledger. The database has recorded every insert/update/delete
 * on the operational tables since the floor_orders_and_audit migration — but
 * until this page that trail was only reachable with raw SQL, which meant no
 * working manager ever looked at it. Admin-only: the RLS policy
 * (audit_admin_select) enforces that server-side, and roleAccess keeps
 * non-admin staff from even reaching this route. */
export default function AuditPage() {
  const userRole = useAuthStore((s) => s.userRole);
  const { data: entries = [], error, refetch, isLoading } = useAuditLog(userRole === 'admin');
  const actorIds = useMemo(() => entries.map((e) => e.actorId).filter((id): id is string => Boolean(id)), [entries]);
  const { data: actors = {} } = useAuditActors(actorIds, userRole === 'admin');

  const [tableFilter, setTableFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (tableFilter !== 'all' && e.tableName !== tableFilter) return false;
      if (!needle) return true;
      const actor = e.actorId ? actors[e.actorId] : undefined;
      return (
        e.recordId?.toLowerCase().includes(needle) ||
        e.operation.toLowerCase().includes(needle) ||
        actor?.name.toLowerCase().includes(needle) ||
        actor?.role.toLowerCase().includes(needle)
      );
    });
  }, [entries, tableFilter, query, actors]);

  if (userRole && userRole !== 'admin') {
    return (
      <AdminLayout title="Audit log">
        <div className="ad-section-head">
          <h3 className="ad-h text-[17px]">Audit log</h3>
        </div>
        <p className="ad-muted text-[13px]">
          The audit trail is restricted to admins. Your role ({userRole}) cannot view it.
        </p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Audit log">
      <div className="w-full max-w-full space-y-4">
        <AdminQueryError error={error} onRetry={() => { void refetch(); }} />
        <div className="ad-section-head">
          <h3 className="ad-h text-[17px]">Who changed what</h3>
          <span className="text-[12px] ad-muted">
            {isLoading ? 'Loading…' : `${filtered.length} of ${entries.length} events · newest first`}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1" role="group" aria-label="Filter by table">
            {TABLE_FILTERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTableFilter(t)}
                aria-pressed={tableFilter === t}
                className="ad-tab shrink-0"
                data-active={tableFilter === t}
              >
                {t === 'all' ? 'All tables' : t}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search record, action, or staff…"
            aria-label="Search audit log"
            className="ad-input sm:ml-auto sm:max-w-[260px]"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center border-2 border-ad-line">
            <p className="ad-h text-[16px]">{isLoading ? 'Reading the audit trail…' : 'No matching events'}</p>
            {!isLoading && (
              <p className="text-[13px] ad-muted mt-1.5">
                {entries.length === 0
                  ? 'Nothing has been recorded yet — writes appear here as staff work.'
                  : 'Try a different table or search term.'}
              </p>
            )}
          </div>
        ) : (
          <ol className="divide-y divide-ad-hairline border-2 border-ad-line bg-ad-surface">
            {filtered.map((entry) => {
              const actor = entry.actorId ? actors[entry.actorId] : undefined;
              return (
                <li key={entry.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-bold text-ad-ink truncate">
                      {describeAuditEntry(entry)}
                    </p>
                    <p className="text-[12px] ad-muted mt-0.5 truncate">
                      {actor ? `${actor.name}${actor.role ? ` · ${actor.role}` : ''}` : 'System'}
                    </p>
                  </div>
                  <span className="ad-num text-[12px] ad-muted shrink-0 tabular-nums">
                    {formatAuditTime(entry.occurredAt)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="text-[11.5px] ad-muted">
          Showing the newest {entries.length} events. Older history stays in the database.
        </p>
      </div>
    </AdminLayout>
  );
}
