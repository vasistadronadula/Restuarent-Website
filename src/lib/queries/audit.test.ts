import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({}) } }));

import { describeAuditEntry, formatAuditTime, mapAuditEntry } from './audit';

describe('audit log helpers', () => {
  it('maps a database row to an entry without leaking payload columns', () => {
    expect(mapAuditEntry({
      id: 7, occurred_at: '2026-09-14T12:00:00Z', actor_id: 'user-1',
      table_name: 'orders', operation: 'UPDATE', record_id: 'PPR-ORD-20260914-ABCD1234',
      old_data: { secret: true }, new_data: { secret: false },
    })).toEqual({
      id: 7, occurredAt: '2026-09-14T12:00:00Z', actorId: 'user-1',
      tableName: 'orders', operation: 'UPDATE', recordId: 'PPR-ORD-20260914-ABCD1234',
    });
  });
  it('describes an entry with a short record suffix', () => {
    expect(describeAuditEntry({ tableName: 'orders', operation: 'UPDATE', recordId: 'PPR-ORD-20260914-ABCD1234' }))
      .toBe('orders #1234 · UPDATE');
    expect(describeAuditEntry({ tableName: 'coupons', operation: 'DELETE', recordId: null }))
      .toBe('coupons · DELETE');
  });
  it('formats IST wall-clock and never blanks on bad input', () => {
    expect(formatAuditTime('2026-09-14T12:00:00Z')).toContain('14 Sep');
    expect(formatAuditTime('not-a-date')).toBe('not-a-date');
    expect(formatAuditTime('')).toBe('—');
  });
});
