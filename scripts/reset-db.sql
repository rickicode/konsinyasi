-- Reset migration: Drop all tables
PRAGMA foreign_keys = off;

DROP TABLE IF EXISTS product_batches;
DROP TABLE IF EXISTS consignment_cycles;
DROP TABLE IF EXISTS visit_photos;
DROP TABLE IF EXISTS receipt_photos;
DROP TABLE IF EXISTS visit_submissions;
DROP TABLE IF EXISTS outlet_visit_locks;
DROP TABLE IF EXISTS outlets;
DROP TABLE IF EXISTS product_recipes;
DROP TABLE IF EXISTS raw_materials;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS uoms;

PRAGMA foreign_keys = on;
