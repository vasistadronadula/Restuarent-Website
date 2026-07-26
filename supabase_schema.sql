-- ============================================================
-- PALA PITTA RUCHULU (ROYAL SPICE) - PRODUCTION DATABASE SCHEMA
-- Run this in your Supabase SQL Editor to initialize/upgrade all tables
-- Safe & Idempotent script (Can be executed multiple times without errors)
-- ============================================================

-- 1. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_address TEXT,
  order_type TEXT DEFAULT 'takeaway',
  payment_mode TEXT DEFAULT 'cod',
  payment_status TEXT DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  cgst NUMERIC NOT NULL DEFAULT 0,
  sgst NUMERIC NOT NULL DEFAULT 0,
  delivery_charge NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'preparing', 'ready', 'delivered', 'cancelled'
  order_time TEXT,
  coupon_code TEXT,
  order_source TEXT DEFAULT 'direct', -- 'direct', 'swiggy', 'zomato'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist (idempotent upgrades)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'takeaway';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'direct';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_source ON orders(order_source);

-- 2. RESERVATIONS TABLE
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  guests INTEGER NOT NULL DEFAULT 2,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  request TEXT,
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'pending', 'cancelled', 'completed'
  table_id TEXT,
  table_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure table columns exist on reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS table_number INTEGER;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);

-- 3. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image TEXT,
  veg_status TEXT NOT NULL DEFAULT 'non-veg', -- 'veg', 'non-veg'
  rating NUMERIC DEFAULT 4.5,
  review_count INTEGER DEFAULT 100,
  is_popular BOOLEAN DEFAULT false,
  is_special BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  description TEXT,
  prep_time INTEGER DEFAULT 25,
  tags TEXT[] DEFAULT '{}',
  portion_prices JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure portion_prices column exists if table was created previously
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS portion_prices JSONB;
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available);

-- 4. INVENTORY ITEMS TABLE
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  min_quantity NUMERIC NOT NULL DEFAULT 5,
  last_restocked TEXT,
  supplier TEXT,
  unit_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'Head Chef', 'Sous Chef', 'Manager', 'Cashier', 'Waiter'
  phone TEXT NOT NULL,
  email TEXT,
  shift TEXT DEFAULT 'Morning',
  salary NUMERIC DEFAULT 0,
  joining_date TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. RESTAURANT TABLES — Admin-managed dining tables
-- ============================================================

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id TEXT PRIMARY KEY,              -- e.g. "T-001"
  table_number INTEGER UNIQUE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  description TEXT,                 -- e.g. "Window seat", "Outdoor", "Private"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. TABLE RESERVATIONS — Slot locking per booking
-- ============================================================

CREATE TABLE IF NOT EXISTS table_reservations (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  date TEXT NOT NULL,           -- "2026-07-26"
  time_slot TEXT NOT NULL,      -- "7:00 PM"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (table_id, date, time_slot)  -- one booking per table per slot
);
-- The UNIQUE constraint above only helps queries that filter by table_id
-- first; slot-availability lookups filter by date+time_slot alone.
CREATE INDEX IF NOT EXISTS idx_table_reservations_date_slot ON table_reservations(date, time_slot);

-- ============================================================
-- 8. COUPONS TABLE — Admin-managed, DB-driven (no hardcoded promo codes)
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  discount NUMERIC NOT NULL DEFAULT 0,      -- percentage
  max_discount NUMERIC NOT NULL DEFAULT 0,
  min_order NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. PUSH SUBSCRIPTIONS — Web Push endpoints for the admin PWA
-- One row per browser/device an admin has installed the app on and
-- granted notification permission to.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. PROFILES TABLE & ADMIN PRIVILEGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECURITY DEFINER HELPER — safe admin check with no RLS recursion
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ============================================================
-- PRIVILEGE-ESCALATION GUARDS ON profiles.role
-- A logged-in non-admin user can never grant themselves (or anyone) the
-- 'admin' role through the API, even though they can update their own row.
-- Trusted contexts (SQL editor / migrations / service role — no auth.uid())
-- and existing admins are exempt, so this seed script can still promote
-- the owner accounts below.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_default_role_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.role := 'customer';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_default_role ON public.profiles;
CREATE TRIGGER trg_enforce_default_role
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_default_role_on_insert();

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Replaces the previous "USING (true) WITH CHECK (true)" policies, which
-- allowed anyone holding the public anon key to read and write every
-- table — including employee salaries and every customer's PII.
-- ============================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop every previous policy so this script can be re-run safely
DROP POLICY IF EXISTS "Allow public all access on orders" ON orders;
DROP POLICY IF EXISTS "Allow public all access on reservations" ON reservations;
DROP POLICY IF EXISTS "Allow public all access on menu_items" ON menu_items;
DROP POLICY IF EXISTS "Allow public all access on inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Allow public all access on employees" ON employees;
DROP POLICY IF EXISTS "Allow public all access on restaurant_tables" ON restaurant_tables;
DROP POLICY IF EXISTS "Allow public all access on table_reservations" ON table_reservations;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert/update their profile" ON public.profiles;
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;
DROP POLICY IF EXISTS "reservations_select" ON reservations;
DROP POLICY IF EXISTS "reservations_insert" ON reservations;
DROP POLICY IF EXISTS "reservations_update" ON reservations;
DROP POLICY IF EXISTS "reservations_delete" ON reservations;
DROP POLICY IF EXISTS "menu_items_select" ON menu_items;
DROP POLICY IF EXISTS "menu_items_write" ON menu_items;
DROP POLICY IF EXISTS "menu_items_update" ON menu_items;
DROP POLICY IF EXISTS "menu_items_delete" ON menu_items;
DROP POLICY IF EXISTS "inventory_admin_only" ON inventory_items;
DROP POLICY IF EXISTS "employees_admin_only" ON employees;
DROP POLICY IF EXISTS "restaurant_tables_select" ON restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_write" ON restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_insert" ON restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_update" ON restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_delete" ON restaurant_tables;
DROP POLICY IF EXISTS "table_reservations_select" ON table_reservations;
DROP POLICY IF EXISTS "table_reservations_insert" ON table_reservations;
DROP POLICY IF EXISTS "table_reservations_write" ON table_reservations;
DROP POLICY IF EXISTS "table_reservations_update" ON table_reservations;
DROP POLICY IF EXISTS "table_reservations_delete" ON table_reservations;
DROP POLICY IF EXISTS "coupons_select" ON coupons;
DROP POLICY IF EXISTS "coupons_write" ON coupons;
DROP POLICY IF EXISTS "coupons_insert" ON coupons;
DROP POLICY IF EXISTS "coupons_update" ON coupons;
DROP POLICY IF EXISTS "coupons_delete" ON coupons;
DROP POLICY IF EXISTS "push_subscriptions_select" ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert" ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete" ON push_subscriptions;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- ── orders ──────────────────────────────────────────────────────────────
-- Placing an order stays public (guest takeaway/POS/webhook orders), but
-- reading, changing status, or deleting is restricted to admins or the
-- authenticated owner of that order.
CREATE POLICY "orders_select" ON orders FOR SELECT
  USING (public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));
CREATE POLICY "orders_insert" ON orders FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "orders_update" ON orders FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "orders_delete" ON orders FOR DELETE
  USING (public.is_admin());

-- ── reservations ────────────────────────────────────────────────────────
CREATE POLICY "reservations_select" ON reservations FOR SELECT
  USING (public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));
CREATE POLICY "reservations_insert" ON reservations FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "reservations_update" ON reservations FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "reservations_delete" ON reservations FOR DELETE
  USING (public.is_admin());

-- ── menu_items ──────────────────────────────────────────────────────────
-- Public storefront needs to read the menu; only admins can change it.
CREATE POLICY "menu_items_select" ON menu_items FOR SELECT USING (true);
CREATE POLICY "menu_items_write" ON menu_items FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "menu_items_update" ON menu_items FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "menu_items_delete" ON menu_items FOR DELETE USING (public.is_admin());

-- ── inventory_items — internal only ────────────────────────────────────
CREATE POLICY "inventory_admin_only" ON inventory_items FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── employees — internal only (salaries, phone numbers) ────────────────
CREATE POLICY "employees_admin_only" ON employees FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── restaurant_tables — public needs to see tables to book one ─────────
CREATE POLICY "restaurant_tables_select" ON restaurant_tables FOR SELECT USING (true);
CREATE POLICY "restaurant_tables_insert" ON restaurant_tables FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "restaurant_tables_update" ON restaurant_tables FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "restaurant_tables_delete" ON restaurant_tables FOR DELETE USING (public.is_admin());

-- ── table_reservations — slot locks; not sensitive, needed for availability
CREATE POLICY "table_reservations_select" ON table_reservations FOR SELECT USING (true);
CREATE POLICY "table_reservations_insert" ON table_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "table_reservations_update" ON table_reservations FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "table_reservations_delete" ON table_reservations FOR DELETE USING (public.is_admin());

-- ── coupons — only active codes are publicly visible ────────────────────
CREATE POLICY "coupons_select" ON coupons FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "coupons_insert" ON coupons FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "coupons_update" ON coupons FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coupons_delete" ON coupons FOR DELETE USING (public.is_admin());

-- ── push_subscriptions — admins manage only their own device subscriptions.
-- The server-side push sender uses the service-role key and bypasses RLS
-- entirely, so it can still read every admin's subscription to notify them.
CREATE POLICY "push_subscriptions_select" ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_insert" ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_admin());
CREATE POLICY "push_subscriptions_delete" ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ── profiles — a user reads/updates only their own row; admins read/update all
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin()) WITH CHECK (auth.uid() = id OR public.is_admin());

-- ============================================================
-- STORAGE — menu-images bucket for real file uploads.
-- Replaces base64-encoded images previously embedded directly in
-- menu_items.image, which bloated every menu fetch (customer site
-- included) and defeated image optimization/caching entirely.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "menu_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "menu_images_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "menu_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "menu_images_admin_delete" ON storage.objects;

CREATE POLICY "menu_images_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');
CREATE POLICY "menu_images_admin_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images' AND public.is_admin());
CREATE POLICY "menu_images_admin_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'menu-images' AND public.is_admin());
CREATE POLICY "menu_images_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images' AND public.is_admin());

-- Enable Supabase Realtime publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'restaurant_tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'table_reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE table_reservations;
  END IF;
END $$;

-- Assign Administrator role to designated owner emails.
-- Safe to re-run: the triggers above only block role changes coming from an
-- authenticated non-admin API caller, not from this trusted SQL Editor context.
UPDATE public.profiles
SET role = 'admin'
WHERE LOWER(email) IN (
  'vasistadronadula@gmail.com',
  'pathaniroshini@gmail.com',
  'palapittaruchulu@gmail.com'
);

SELECT id, email, role FROM public.profiles;

-- ============================================================
-- 11. STAFF ROLES — real logins for employees (chef / cashier / waiter /
--     manager), each confined to their own section of /admin, plus manager
--     folded into full admin-equivalent access. Safe & idempotent, same as
--     the rest of this file.
-- ============================================================

-- ── Link an HR record to a real Supabase Auth login ─────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON employees(auth_user_id);

-- ── Lock profiles.role / employees.role down to the known role set ──────
-- (employees table historically documented free-text labels like "Head
-- Chef" in a comment, but the app has always written/read the lowercase
-- enum values below — this constraint just makes that explicit and enforced.)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'admin', 'manager', 'chef', 'cashier', 'waiter'));

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('admin', 'manager', 'chef', 'cashier', 'waiter'));

-- ── Fold 'manager' into the existing admin check ─────────────────────────
-- Every policy already gated on is_admin() automatically extends to
-- managers too, instead of duplicating "role IN ('admin','manager')" across
-- every policy in this file.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
$$;

-- ── Narrow, per-role helpers for the two tables staff actually operate ──
-- Deliberately NOT one broad is_staff() — a waiter session should not be
-- able to touch orders, nor a chef/cashier touch reservations, even though
-- the frontend nav already hides those pages. RLS is the real boundary.
CREATE OR REPLACE FUNCTION public.can_access_orders()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('cashier', 'chef')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_reservations()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'waiter'
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_orders() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_access_reservations() TO authenticated, anon;

-- ── Widen orders/reservations RLS from admin-only to admin + relevant staff
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT
  USING (public.can_access_orders() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));
CREATE POLICY "orders_update" ON orders FOR UPDATE
  USING (public.can_access_orders()) WITH CHECK (public.can_access_orders());

DROP POLICY IF EXISTS "reservations_select" ON reservations;
DROP POLICY IF EXISTS "reservations_update" ON reservations;
CREATE POLICY "reservations_select" ON reservations FOR SELECT
  USING (public.can_access_reservations() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));
CREATE POLICY "reservations_update" ON reservations FOR UPDATE
  USING (public.can_access_reservations()) WITH CHECK (public.can_access_reservations());

-- ── Atomic staff account creation ────────────────────────────────────────
-- Called via the service-role client's .rpc() from a trusted server route
-- (src/app/api/admin/employees/route.ts) AFTER auth.admin.createUser()
-- succeeds, so the profiles + employees rows are written in one transaction
-- instead of two separate client calls that could partially fail.
--
-- Safe under the privilege-escalation triggers defined earlier: a
-- service-role JWT carries no `auth.uid()`, so
-- `auth.uid() IS NOT NULL AND NOT is_admin()` is false for both
-- trg_enforce_default_role and trg_prevent_role_escalation — they no-op
-- for this caller (triggers still run under service role; only RLS
-- *policies* are bypassed). REVOKE/GRANT below means this function is only
-- callable with the service-role key — never from a browser session, even
-- an admin's — so the bearer-token check in the API route is the sole gate.
CREATE OR REPLACE FUNCTION public.admin_upsert_staff(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text,
  p_phone text,
  p_role text,
  p_employee_id text,
  p_shift text,
  p_salary numeric,
  p_joining_date text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone, role)
  VALUES (p_auth_user_id, p_email, p_full_name, p_phone, p_role)
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

  INSERT INTO employees (id, name, role, phone, email, shift, salary, joining_date, status, auth_user_id)
  VALUES (p_employee_id, p_full_name, p_role, p_phone, p_email, p_shift, p_salary, p_joining_date, 'Active', p_auth_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_staff FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_staff TO service_role;

-- ============================================================
-- 12. PROFILE AVATARS — every signed-in user manages their own
--     display name, phone and profile photo from /admin/profile.
--     Safe & idempotent, same as the rest of this file.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Public bucket: avatars are shown in the admin shell and need to load
-- without a signed URL round-trip on every page render.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_delete" ON storage.objects;

-- Files are stored as "<auth.uid()>/<filename>", so the first path segment
-- scopes writes to the owner — one user can never overwrite another's photo.
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "avatars_own_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "avatars_own_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "avatars_own_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
