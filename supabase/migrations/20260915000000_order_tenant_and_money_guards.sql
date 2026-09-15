-- Optional multi-tenant scope plus money/status guards for orders and reservations.
-- The app writes tenant columns only when configured and retries without them
-- on older databases, so this migration is additive and safe to apply anytime.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restaurant_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_id UUID;

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS restaurant_id UUID;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS branch_id UUID;

-- Money must never go negative from a client-computed total, and a single
-- takeaway/counter ticket has a sanity ceiling shared with checkout pricing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_money_guards') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_money_guards CHECK (
      subtotal >= 0 AND discount >= 0 AND cgst >= 0 AND sgst >= 0
      AND delivery_charge >= 0 AND grand_total >= 0 AND grand_total <= 200000
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_guards') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_guards CHECK (
      payment_mode IN ('cash', 'razorpay', 'upi', 'card')
      AND payment_status IN ('paid', 'unpaid')
      AND order_type IN ('takeaway', 'counter', 'dine-in')
      AND status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')
    );
  END IF;
END
$$;
