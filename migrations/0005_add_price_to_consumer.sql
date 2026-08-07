-- Add consumer-facing price to products.
--
-- The storefront (public pages & public API) must show what the END CUSTOMER
-- pays, not the price charged to the outlet. `price_to_outlet` stays untouched
-- (it still drives revenue calculations inside the worker).
ALTER TABLE products ADD COLUMN price_to_consumer INTEGER NOT NULL DEFAULT 0;

-- Backfill: for existing products the consumer price was never set, so seed it
-- from the outlet price. Owners can then adjust per product.
UPDATE products SET price_to_consumer = price_to_outlet WHERE price_to_consumer = 0;

CREATE INDEX idx_products_consumer_price ON products(price_to_consumer) WHERE deleted_at IS NULL;
