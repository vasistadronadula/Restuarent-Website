'use client';

import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { queryKeys } from './keys';

export interface AuditEntry {
  id: number;
  occurredAt: string;
  actorId: string | null;
  tableName: string;
  operation: string;
  recordId: string | null;
}

/** Newest 500 entries. The log is append-only and unbounded server-side;
 * the viewer pages the tail — a full-table read would grow with the
 * restaurant's lifetime, not its current service. */
export const AUDIT_PAGE_SIZE = 500;

export function mapAuditEntry(row: Record<string, unknown>): AuditEntry {
  return {
    id: Number(row.id) || 0,
    occurredAt: String(row.occurred_at || ''),
    actorId: row.actor_id != null ? String(row.actor_id) : null,
    tableName: String(row.table_name || ''),
    operation: String(row.operation || ''),
    recordId: row.record_id != null ? String(row.record_id) : null,
  };
}

/** "orders #ABCD · UPDATE" — stable wording for rows, toasts, and tests. */
export function describeAuditEntry(entry: Pick<AuditEntry, 'tableName' | 'operation' | 'recordId'>): string {
  const record = entry.recordId ? ` #${entry.recordId.slice(-4).toUpperCase()}` : '';
  return `${entry.tableName}${record} · ${entry.operation}`;
}

/** IST wall-clock for the ledger ("14 Sep, 6:32 pm"). Falls back to the raw
 * value when the timestamp is missing or unparseable — never blank. */
export function formatAuditTime(raw: string): string {
  const time = Date.parse(raw);
  if (!Number.isFinite(time)) return raw || '—';
  return new Date(time).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function useAuditLog(enabled = true) {
  return useQuery({
    queryKey: queryKeys.audit,
    queryFn: async (): Promise<AuditEntry[]> => {
      // RLS (audit_admin_select) restricts this to admins; non-admin staff
      // get an error here rather than an empty log that reads as "nothing
      // ever happened".
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('id, occurred_at, actor_id, table_name, operation, record_id')
        .order('occurred_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(AUDIT_PAGE_SIZE);
      if (error) throw new Error(error.message);
      return (data || []).map((row) => mapAuditEntry(row as Record<string, unknown>));
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export interface AuditActor {
  id: string;
  name: string;
  role: string;
}

/** Names behind the actor UUIDs. Admin-only read, same as the log itself. */
export function useAuditActors(actorIds: string[], enabled = true) {
  const unique = [...new Set(actorIds.filter(Boolean))];
  return useQuery({
    queryKey: [...queryKeys.audit, 'actors', ...unique.sort()],
    queryFn: async (): Promise<Record<string, AuditActor>> => {
      if (unique.length === 0) return {};
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', unique);
      if (error) throw new Error(error.message);
      const map: Record<string, AuditActor> = {};
      for (const row of (data || []) as Array<Record<string, unknown>>) {
        const id = String(row.id);
        const name = String(row.full_name || '').trim();
        map[id] = {
          id,
          name: name || String(row.email || 'Staff').split('@')[0],
          role: String(row.role || ''),
        };
      }
      return map;
    },
    staleTime: 300_000,
    enabled: enabled && unique.length > 0,
  });
}
