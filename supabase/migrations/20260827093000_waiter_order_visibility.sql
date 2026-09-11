-- Waiters need order state and table_number to operate the floor map, but
-- must not be able to advance kitchen/payment statuses. Keep write access on
-- can_access_orders(); use this broader helper only for SELECT.
CREATE OR REPLACE FUNCTION public.can_view_orders()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.can_access_orders() OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'waiter'
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_orders() TO authenticated;

DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders
FOR SELECT
USING (
  public.can_view_orders()
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);
