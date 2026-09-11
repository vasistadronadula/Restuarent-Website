-- Migration: 20260910000000_order_number.sql
-- Add human-friendly sequential order_number for every order (KDS, receipts, tracking)

CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq START WITH 101;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number BIGINT DEFAULT nextval('orders_order_number_seq');

-- Ensure all existing rows have a sequential order_number
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) + 100 AS num
  FROM orders
  WHERE order_number IS NULL OR order_number < 101
)
UPDATE orders o
SET order_number = numbered.num
FROM numbered
WHERE o.id = numbered.id AND (o.order_number IS NULL OR o.order_number < 101);

-- Sync sequence with current maximum
SELECT setval('orders_order_number_seq', COALESCE((SELECT MAX(order_number) FROM orders), 100) + 1, false);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
