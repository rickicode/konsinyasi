PRAGMA foreign_keys = OFF;

UPDATE product_batches
SET batch_number = 'B' || substr(production_date, 9, 2) || substr(production_date, 6, 2) || '99'
WHERE batch_number IS NULL;

ALTER TABLE product_batches RENAME TO product_batches_legacy;

CREATE TABLE product_batches (
  id              TEXT PRIMARY KEY,
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  batch_number    TEXT NOT NULL,
  production_date TEXT NOT NULL,
  expired_date    TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  notes           TEXT,
  deleted_at      TEXT,
  created_by      TEXT NOT NULL REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO product_batches (
  id,
  product_id,
  batch_number,
  production_date,
  expired_date,
  quantity,
  notes,
  deleted_at,
  created_by,
  created_at,
  updated_at
)
SELECT
  id,
  product_id,
  batch_number,
  production_date,
  expired_date,
  quantity,
  notes,
  deleted_at,
  created_by,
  created_at,
  updated_at
FROM product_batches_legacy;

DROP TABLE product_batches_legacy;

CREATE INDEX idx_product_batches_product ON product_batches(product_id);
CREATE INDEX idx_product_batches_production_date ON product_batches(production_date);
CREATE INDEX idx_product_batches_expired_date ON product_batches(expired_date);
CREATE INDEX idx_product_batches_created_at ON product_batches(created_at);
CREATE UNIQUE INDEX idx_product_batches_batch_number_active
  ON product_batches(batch_number)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_product_batches_updated_at
  AFTER UPDATE ON product_batches
BEGIN
  UPDATE product_batches SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

PRAGMA foreign_keys = ON;
