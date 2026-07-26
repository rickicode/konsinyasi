-- Schema fixes: consignment_cycles FK, visit_photos unique sequence,
-- visit_submissions composite index, partial unique active names, and
-- explicit CHECK on uoms.dimension for databases that ran 0010 before it
-- had a CHECK clause.

PRAGMA defer_foreign_keys = on;

-- 1) Rebuild consignment_cycles to add the FK to visit_submissions.idempotency_key.
-- D1 does not currently enforce foreign keys, but declaring it keeps the schema
-- and Drizzle model aligned.
CREATE TABLE _consignment_cycles_new (
  id TEXT PRIMARY KEY,
  outlet_id TEXT NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  hpp_snapshot INTEGER NOT NULL CHECK (hpp_snapshot >= 0),
  price_snapshot INTEGER NOT NULL CHECK (price_snapshot >= 0),
  qty_dropped INTEGER NOT NULL CHECK (qty_dropped > 0),
  dropped_at TEXT NOT NULL,
  qty_sold INTEGER NOT NULL DEFAULT 0 CHECK (qty_sold >= 0),
  qty_return_good INTEGER NOT NULL DEFAULT 0 CHECK (qty_return_good >= 0),
  qty_return_damaged INTEGER NOT NULL DEFAULT 0 CHECK (qty_return_damaged >= 0),
  amount_collected INTEGER NOT NULL DEFAULT 0 CHECK (amount_collected >= 0),
  picked_up_at TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'voided')),
  visit_submission_id TEXT REFERENCES visit_submissions(idempotency_key) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO _consignment_cycles_new (
  id, outlet_id, product_id, hpp_snapshot, price_snapshot, qty_dropped, dropped_at,
  qty_sold, qty_return_good, qty_return_damaged, amount_collected, picked_up_at,
  status, visit_submission_id, notes, created_at, updated_at
)
SELECT
  id, outlet_id, product_id, hpp_snapshot, price_snapshot, qty_dropped, dropped_at,
  qty_sold, qty_return_good, qty_return_damaged, amount_collected, picked_up_at,
  status, visit_submission_id, notes, created_at, updated_at
FROM consignment_cycles;
DROP TABLE consignment_cycles;
ALTER TABLE _consignment_cycles_new RENAME TO consignment_cycles;
CREATE INDEX idx_cycles_outlet_status_picked ON consignment_cycles(outlet_id, status, picked_up_at);
CREATE INDEX idx_cycles_dropped_at ON consignment_cycles(dropped_at);
CREATE INDEX idx_cycles_product ON consignment_cycles(product_id);
CREATE INDEX idx_consignment_cycles_visit_submission_id ON consignment_cycles(visit_submission_id);
CREATE INDEX idx_consignment_cycles_created_at ON consignment_cycles(created_at);
CREATE TRIGGER trg_consignment_cycles_updated_at
AFTER UPDATE ON consignment_cycles
BEGIN
  UPDATE consignment_cycles SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

-- 2) Enforce one sequence slot per visit photo set.
-- First, deterministically renumber any duplicate sequences so the unique
-- index can be created safely. Order is preserved by created_at, then id.
WITH ranked AS (
  SELECT
    rowid,
    ROW_NUMBER() OVER (PARTITION BY visit_id ORDER BY created_at, id) - 1 AS new_seq
  FROM visit_photos
)
UPDATE visit_photos
SET sequence = (
  SELECT new_seq FROM ranked WHERE ranked.rowid = visit_photos.rowid
);
DROP INDEX IF EXISTS idx_visit_photos_sequence;
CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_photos_sequence ON visit_photos(visit_id, sequence);

-- 3) Composite index for visit list filtering by outlet + status + created_at.
CREATE INDEX IF NOT EXISTS idx_visit_submissions_outlet_status_created ON visit_submissions(outlet_id, status, created_at);

-- 4) Partial unique indexes for active business names so deleted names can be reused.
CREATE UNIQUE INDEX IF NOT EXISTS idx_outlets_name_active ON outlets(name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name_active ON products(name) WHERE deleted_at IS NULL;

-- 5) Rebuild uoms so existing databases enforce the dimension enum CHECK.
CREATE TABLE _uoms_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  dimension TEXT NOT NULL DEFAULT 'count' CHECK (dimension IN ('vol', 'mass', 'count')),
  multiplier INTEGER NOT NULL DEFAULT 1 CHECK (multiplier > 0),
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO _uoms_new (id, name, symbol, dimension, multiplier, deleted_at, created_at, updated_at)
SELECT id, name, symbol, dimension, multiplier, deleted_at, created_at, updated_at FROM uoms;
DROP TABLE uoms;
ALTER TABLE _uoms_new RENAME TO uoms;
CREATE UNIQUE INDEX IF NOT EXISTS idx_uoms_symbol_active ON uoms(symbol) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_uoms_updated_at
AFTER UPDATE ON uoms
BEGIN
  UPDATE uoms SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

PRAGMA defer_foreign_keys = off;
