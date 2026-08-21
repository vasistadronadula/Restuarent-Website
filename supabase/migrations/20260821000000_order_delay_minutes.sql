-- ============================================================
-- ORDERS.DELAY_MINUTES — dedicated column for kitchen prep delays
-- Applied by `supabase db push`. Idempotent, so re-running is harmless.
--
-- Without this column, useUpdateOrderPrepTime() (src/lib/queries/orders.ts)
-- fell back to encoding the delay as a `[DELAY:15]` prefix jammed into the
-- `notes` column — which meant every delay update overwrote whatever real
-- kitchen note was already there, and only the most recent delay survived
-- if it was set twice. Adding the real column makes that fallback path
-- (kept for older/unmigrated environments) dead code here.
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0;
