-- Table-slot locks must be created by staff or by the booking they belong to.
-- The previous WITH CHECK (true) let anyone lock any table/date/slot row,
-- holding the floor hostage from an anonymous session.

DROP POLICY IF EXISTS "table_reservations_insert" ON public.table_reservations;
CREATE POLICY "table_reservations_insert" ON public.table_reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_reservations()
    OR (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.reservations r
        WHERE r.id = reservation_id
          AND (r.user_id IS NULL OR r.user_id = auth.uid())
      )
    )
  );
