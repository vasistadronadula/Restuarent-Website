-- ============================================================
-- MENU CATEGORIES TABLE — Admin-managed, DB-driven categories
-- Applied by `supabase db push`. Idempotent, so re-running is harmless.
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '🍽️',
  image TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_slug ON menu_categories(slug);
CREATE INDEX IF NOT EXISTS idx_menu_categories_sort_order ON menu_categories(sort_order);

-- RLS
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_categories_select" ON menu_categories;
DROP POLICY IF EXISTS "menu_categories_insert" ON menu_categories;
DROP POLICY IF EXISTS "menu_categories_update" ON menu_categories;
DROP POLICY IF EXISTS "menu_categories_delete" ON menu_categories;

CREATE POLICY "menu_categories_select" ON menu_categories FOR SELECT USING (true);
CREATE POLICY "menu_categories_insert" ON menu_categories FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "menu_categories_update" ON menu_categories FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "menu_categories_delete" ON menu_categories FOR DELETE USING (public.is_admin());

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'menu_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE menu_categories;
  END IF;
END $$;

-- Seed with the current 11 categories (idempotent)
INSERT INTO menu_categories (id, name, slug, icon, image, sort_order, is_active) VALUES
  ('CAT-combos',       'Unlimited & Party Combos', 'combos',       '🎁', NULL, 1,  true),
  ('CAT-starters',     'Starters',                 'starters',     '🍗', NULL, 2,  true),
  ('CAT-tandoori',     'Tandoori',                 'tandoori',     '🔥', NULL, 3,  true),
  ('CAT-biryani',      'Biryani & Pulao',          'biryani',      '🍚', NULL, 4,  true),
  ('CAT-south-indian', 'Curries & Bagara Spl',     'south-indian', '🥘', NULL, 5,  true),
  ('CAT-north-indian', 'North Indian',             'north-indian', '🍛', NULL, 6,  true),
  ('CAT-chinese',      'Chinese',                  'chinese',      '🥡', NULL, 7,  true),
  ('CAT-rice',         'Rice',                     'rice',         '🍙', NULL, 8,  true),
  ('CAT-breads',       'Roties & Breads',          'breads',       '🫓', NULL, 9,  true),
  ('CAT-desserts',     'Desserts',                 'desserts',     '🍮', NULL, 10, true),
  ('CAT-beverages',    'Cool Drinks & Soups',      'beverages',    '🥤', NULL, 11, true)
ON CONFLICT (id) DO NOTHING;
