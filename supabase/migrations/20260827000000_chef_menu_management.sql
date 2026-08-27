-- Chef menu-management permission. Safe to run more than once.
BEGIN;

-- Older databases may predate the profiles.role field.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer';

CREATE OR REPLACE FUNCTION public.can_manage_menu()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role IN ('admin', 'manager', 'chef')
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.can_manage_menu() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_menu() TO authenticated;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_write" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_update" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_delete" ON public.menu_items;

CREATE POLICY "menu_items_write" ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_menu());

CREATE POLICY "menu_items_update" ON public.menu_items
  FOR UPDATE TO authenticated
  USING (public.can_manage_menu())
  WITH CHECK (public.can_manage_menu());

CREATE POLICY "menu_items_delete" ON public.menu_items
  FOR DELETE TO authenticated
  USING (public.can_manage_menu());

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_categories_insert" ON public.menu_categories;
DROP POLICY IF EXISTS "menu_categories_update" ON public.menu_categories;
DROP POLICY IF EXISTS "menu_categories_delete" ON public.menu_categories;

CREATE POLICY "menu_categories_insert" ON public.menu_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_menu());

CREATE POLICY "menu_categories_update" ON public.menu_categories
  FOR UPDATE TO authenticated
  USING (public.can_manage_menu())
  WITH CHECK (public.can_manage_menu());

CREATE POLICY "menu_categories_delete" ON public.menu_categories
  FOR DELETE TO authenticated
  USING (public.can_manage_menu());

COMMIT;
