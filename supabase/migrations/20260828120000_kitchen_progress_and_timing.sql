-- Additive KDS migration. Existing timestamps stay NULL: do not invent when
-- historical tickets started cooking or became ready.
BEGIN;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS preparing_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS kitchen_progress jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.stamp_kitchen_stage()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  END IF;
  CASE NEW.status
    WHEN 'pending' THEN
      NEW.preparing_at := NULL; NEW.ready_at := NULL; NEW.delivered_at := NULL;
      NEW.kitchen_progress := '{}'::jsonb;
    WHEN 'preparing' THEN
      NEW.preparing_at := clock_timestamp(); NEW.ready_at := NULL; NEW.delivered_at := NULL;
      IF TG_OP = 'UPDATE' AND OLD.status IN ('ready', 'delivered') THEN
        NEW.kitchen_progress := '{}'::jsonb;
      END IF;
    WHEN 'ready' THEN NEW.ready_at := clock_timestamp(); NEW.delivered_at := NULL;
    WHEN 'delivered' THEN NEW.delivered_at := clock_timestamp();
    ELSE NULL;
  END CASE;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stamp_kitchen_stage ON public.orders;
CREATE TRIGGER stamp_kitchen_stage BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.stamp_kitchen_stage();

-- SECURITY INVOKER preserves the existing orders SELECT/UPDATE RLS policies.
-- A row lock merges simultaneous checks on different lines without losing one.
CREATE OR REPLACE FUNCTION public.set_kitchen_item_prepared(
  p_order_id text, p_item_index integer, p_expected_item jsonb,
  p_item_key text, p_prepared boolean
) RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  ticket public.orders%ROWTYPE;
  decoded_key jsonb;
  occurrence integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_access_orders() THEN
    RAISE EXCEPTION 'Kitchen access required' USING ERRCODE = '42501';
  END IF;
  IF p_prepared IS NULL OR p_item_index IS NULL OR p_item_index < 0 OR p_item_key IS NULL
    OR length(p_item_key) > 16000 THEN RAISE EXCEPTION 'Invalid kitchen item'; END IF;
  SELECT * INTO ticket FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found or not permitted'; END IF;
  IF ticket.status NOT IN ('pending', 'preparing') THEN
    RAISE EXCEPTION 'Ticket stage changed. Refresh before preparing items.';
  END IF;
  IF jsonb_typeof(ticket.items::jsonb) <> 'array'
    OR p_item_index >= jsonb_array_length(ticket.items::jsonb)
    OR (ticket.items::jsonb -> p_item_index) IS DISTINCT FROM p_expected_item THEN
    RAISE EXCEPTION 'Ticket items changed. Refresh and try again.';
  END IF;
  decoded_key := p_item_key::jsonb;
  SELECT count(*) INTO occurrence
    FROM jsonb_array_elements(ticket.items::jsonb) WITH ORDINALITY AS line(item, ordinal)
    WHERE ordinal <= p_item_index AND item = p_expected_item;
  IF decoded_key IS DISTINCT FROM jsonb_build_array(p_expected_item, occurrence) THEN
    RAISE EXCEPTION 'Kitchen item identity does not match';
  END IF;
  RETURN QUERY UPDATE public.orders
    SET kitchen_progress = CASE WHEN p_prepared
      THEN kitchen_progress || jsonb_build_object(p_item_key, true)
      ELSE kitchen_progress - p_item_key END
    WHERE id = p_order_id RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.set_kitchen_item_prepared(text, integer, jsonb, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_kitchen_item_prepared(text, integer, jsonb, text, boolean) TO authenticated;
COMMIT;
