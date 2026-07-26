-- Migration 0005: Add hpp_override column to products table
ALTER TABLE products ADD COLUMN hpp_override INTEGER;
