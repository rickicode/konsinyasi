-- Add nullable hpp_override column to products (schema drift fix)
ALTER TABLE products ADD COLUMN hpp_override INTEGER;
