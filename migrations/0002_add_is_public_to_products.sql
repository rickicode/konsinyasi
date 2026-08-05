-- Add is_public column to products table
ALTER TABLE products ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;

-- Create index for faster public product queries
CREATE INDEX idx_products_is_public ON products(is_public) WHERE deleted_at IS NULL AND is_public = 1;
