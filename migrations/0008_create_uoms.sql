-- Simple UOM configuration table
CREATE TABLE uoms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX idx_uoms_symbol_active ON uoms(symbol) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_uoms_updated_at
AFTER UPDATE ON uoms
BEGIN
  UPDATE uoms SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

INSERT INTO uoms (id, name, symbol) VALUES
('ml', 'Mililiter', 'ml'),
('l', 'Liter', 'l'),
('cup', 'Cup', 'cup'),
('gr', 'Gram', 'gr'),
('ons', 'Ons', 'ons'),
('kg', 'Kilogram', 'kg'),
('pcs', 'Pieces', 'pcs');
