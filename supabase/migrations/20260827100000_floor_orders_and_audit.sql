-- Waiters operate tables through a narrow RPC. They must never receive the
-- customer identity/contact columns contained in public.orders.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_tendered numeric;
DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders
FOR SELECT
USING (
  public.can_access_orders()
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

REVOKE ALL ON FUNCTION public.can_view_orders() FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_floor_orders()
RETURNS TABLE (
  id text,
  status text,
  payment_status text,
  grand_total numeric,
  subtotal numeric,
  table_number integer,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT o.id, o.status, o.payment_status, o.grand_total, o.subtotal,
         o.table_number, o.created_at
  FROM public.orders o
  WHERE o.table_number IS NOT NULL
    AND o.status NOT IN ('delivered', 'cancelled')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager', 'waiter')
    )
  ORDER BY o.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_floor_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_floor_orders() TO authenticated;

-- Immutable operational audit log populated by database triggers. The actor
-- is taken from auth.uid(), never from client-supplied form data.
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_admin_select" ON public.admin_audit_log;
CREATE POLICY "audit_admin_select" ON public.admin_audit_log
FOR SELECT USING (public.can_access_employees());

CREATE OR REPLACE FUNCTION public.capture_admin_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  before_row jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  after_row jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
BEGIN
  INSERT INTO public.admin_audit_log(actor_id, table_name, operation, record_id, old_data, new_data)
  VALUES (
    auth.uid(), TG_TABLE_NAME, TG_OP,
    COALESCE(after_row->>'id', after_row->>'code', before_row->>'id', before_row->>'code'),
    before_row, after_row
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['orders','employees','menu_items','menu_categories','coupons','restaurant_tables','inventory_items']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_changes ON public.%I', target);
    EXECUTE format('CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_admin_audit()', target);
  END LOOP;
END $$;
