-- Add outlets.last_visit_at, backfill from committed visits, and add all missing indexes for hot queries.
-- D1 migrations are applied only once via 'wrangler d1 migrations apply'.

-- Ensure photo tables exist (they were created outside the migrations folder on some environments).
CREATE TABLE IF NOT EXISTS visit_photos (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL,
  photo_key TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  uploaded_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (visit_id) REFERENCES visit_submissions(idempotency_key) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_visit_photos_visit_id ON visit_photos (visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_sequence ON visit_photos (visit_id, sequence);

CREATE TABLE IF NOT EXISTS receipt_photos (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL,
  photo_key TEXT NOT NULL,
  amount INTEGER,
  note TEXT,
  uploaded_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (visit_id) REFERENCES visit_submissions(idempotency_key) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_receipt_photos_visit_id ON receipt_photos (visit_id);

ALTER TABLE outlets ADD COLUMN last_visit_at TEXT;

UPDATE outlets
SET last_visit_at = (
  SELECT MAX(created_at)
  FROM visit_submissions
  WHERE visit_submissions.outlet_id = outlets.id
    AND visit_submissions.status = 'committed'
);

-- Outlets
CREATE INDEX IF NOT EXISTS idx_outlets_geo ON outlets(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_outlets_active ON outlets(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outlets_name ON outlets(name);

-- Products (currently unindexed)
CREATE INDEX IF NOT EXISTS idx_products_deleted_at_name ON products(deleted_at, name);
CREATE INDEX IF NOT EXISTS idx_products_status_deleted_at_name ON products(status, deleted_at, name);

-- Consignment cycles: replace narrow partial index with a composite index usable by loadOpenCycles
DROP INDEX IF EXISTS idx_cycles_outlet_open;
CREATE INDEX IF NOT EXISTS idx_cycles_outlet_status_picked ON consignment_cycles(outlet_id, status, picked_up_at);
CREATE INDEX IF NOT EXISTS idx_cycles_dropped_at ON consignment_cycles(dropped_at);
CREATE INDEX IF NOT EXISTS idx_cycles_product ON consignment_cycles(product_id);
CREATE INDEX IF NOT EXISTS idx_consignment_cycles_visit_submission_id ON consignment_cycles(visit_submission_id);
CREATE INDEX IF NOT EXISTS idx_consignment_cycles_created_at ON consignment_cycles(created_at);

-- Visit submissions
CREATE INDEX IF NOT EXISTS idx_visit_submissions_outlet ON visit_submissions(outlet_id);
CREATE INDEX IF NOT EXISTS idx_visit_submissions_user ON visit_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_submissions_created_at ON visit_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_visit_submissions_outlet_created_at ON visit_submissions(outlet_id, created_at);

-- Sessions (auth cleanup, logout lookups)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Users (list filters)
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status, role);

-- Supporting tables already declared in schema.ts
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_unique_product_raw ON product_recipes(product_id, raw_material_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product ON product_recipes(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_materials_name_unique ON raw_materials(name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_uoms_symbol_active ON uoms(symbol) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visit_photos_visit_id ON visit_photos(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_sequence ON visit_photos(visit_id, sequence);
CREATE INDEX IF NOT EXISTS idx_receipt_photos_visit_id ON receipt_photos(visit_id);
