-- ============================================================
-- MENU_ITEMS.MAX_QUANTITY — per-item cap on how many units a
-- customer can add to their cart in one order.
-- Applied by `supabase db push`. Idempotent, so re-running is harmless.
--
-- NULL means uncapped (the default for existing dishes and any new
-- dish left blank in the admin form).
-- ============================================================

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS max_quantity INTEGER;
