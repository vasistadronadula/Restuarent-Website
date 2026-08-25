-- Security hardening: checkout/order trust boundary, staff roles, storage, and privacy fixes.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_unique
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_payment_id_unique
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_exact_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_exact_admin() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND NOT public.is_exact_admin() THEN
    RAISE EXCEPTION 'Only admins can change profile roles';
  END IF;
  IF OLD.role = 'admin' AND NEW.role IS DISTINCT FROM 'admin' AND NOT public.is_exact_admin() THEN
    RAISE EXCEPTION 'Only admins can change admin roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_exact_admin());
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_exact_admin())
  WITH CHECK (auth.uid() = id OR public.is_exact_admin());

DROP POLICY IF EXISTS "storage_menu_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_menu_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_menu_delete" ON storage.objects;
CREATE POLICY "storage_menu_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'menu-images' AND public.is_admin());
CREATE POLICY "storage_menu_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'menu-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'menu-images' AND public.is_admin());
CREATE POLICY "storage_menu_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'menu-images' AND public.is_admin());

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'menu-images';

DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;
CREATE POLICY "reservations_insert" ON public.reservations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

DROP POLICY IF EXISTS "table_reservations_insert" ON public.table_reservations;
CREATE POLICY "table_reservations_insert" ON public.table_reservations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND user_id = auth.uid()
      AND payment_status = 'unpaid'
      AND order_source = 'direct'
    )
  );
