-- Durable idempotency for the JDBC checkout endpoint, including guest retries
-- and concurrent requests to different business-service instances.
CREATE TABLE IF NOT EXISTS public.checkout_requests (
  request_key text PRIMARY KEY,
  request_hash text NOT NULL,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.checkout_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_requests FROM anon, authenticated;
GRANT ALL ON public.checkout_requests TO service_role;
