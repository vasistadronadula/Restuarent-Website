-- SECURITY DEFINER changes current_user to the function owner. It must never
-- be used to recognize a trusted caller: these functions are owned by postgres.
-- session_user remains the connection login (authenticator for PostgREST).
CREATE OR REPLACE FUNCTION public.is_exact_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT COALESCE(auth.role() = 'service_role', false)
    OR session_user IN ('postgres', 'service_role', 'supabase_admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT COALESCE(auth.role() = 'service_role', false)
    OR session_user IN ('postgres', 'service_role', 'supabase_admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'));
$$;

CREATE OR REPLACE FUNCTION public.can_access_employees()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT public.is_exact_admin(); $$;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND NOT public.is_exact_admin() THEN
    RAISE EXCEPTION 'Only admins can change profile roles';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_default_role_on_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_exact_admin() THEN
    NEW.role := 'customer';
  END IF;
  RETURN NEW;
END;
$$;

-- Customer orders must pass authoritative pricing/payment verification in the
-- checkout API. Only counter staff may create client-priced POS orders.
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'cashier'
  )
);
