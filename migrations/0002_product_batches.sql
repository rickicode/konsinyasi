-- Product batches for label printing (production date, expiry date, optional batch number)
PRAGMA foreign_keys = off;

CREATE TABLE product_batches (
    id               TEXT PRIMARY KEY,
    product_id       TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_number     TEXT,                          -- optional, e.g. "B20260801-001"
    production_date  TEXT NOT NULL,                 -- ISO date: "2026-08-01"
    expired_date     TEXT NOT NULL,                 -- ISO date: "2026-08-05"
    quantity         INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    notes            TEXT,
    deleted_at       TEXT,
    created_by       TEXT NOT NULL REFERENCES users(id),
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_product_batches_product ON product_batches(product_id);
CREATE INDEX idx_product_batches_production_date ON product_batches(production_date);
CREATE INDEX idx_product_batches_expired_date ON product_batches(expired_date);
CREATE INDEX idx_product_batches_created_at ON product_batches(created_at);

CREATE TRIGGER trg_product_batches_updated_at
AFTER UPDATE ON product_batches
BEGIN
    UPDATE product_batches SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

PRAGMA foreign_keys = on;
