-- Remove the hard-coded unit enum constraints from raw_materials and product_recipes
-- so custom UOMs defined in the uoms table can be used.
PRAGMA foreign_keys = OFF;

CREATE TABLE _raw_materials_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_unit TEXT NOT NULL,
  price_per_base_unit INTEGER NOT NULL CHECK (price_per_base_unit >= 0),
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO _raw_materials_new (id, name, base_unit, price_per_base_unit, deleted_at, created_at, updated_at)
SELECT id, name, base_unit, price_per_base_unit, deleted_at, created_at, updated_at FROM raw_materials;

DROP TABLE raw_materials;
ALTER TABLE _raw_materials_new RENAME TO raw_materials;

CREATE UNIQUE INDEX idx_raw_materials_name_unique ON raw_materials(name) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_raw_materials_updated_at
AFTER UPDATE ON raw_materials
BEGIN
  UPDATE raw_materials SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

CREATE TABLE _product_recipes_new (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  raw_material_id TEXT NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO _product_recipes_new (id, product_id, raw_material_id, quantity, unit, created_at, updated_at)
SELECT id, product_id, raw_material_id, quantity, unit, created_at, updated_at FROM product_recipes;

DROP TABLE product_recipes;
ALTER TABLE _product_recipes_new RENAME TO product_recipes;

CREATE UNIQUE INDEX idx_recipes_unique_product_raw ON product_recipes(product_id, raw_material_id);
CREATE INDEX idx_recipes_product ON product_recipes(product_id);

CREATE TRIGGER trg_product_recipes_updated_at
AFTER UPDATE ON product_recipes
BEGIN
  UPDATE product_recipes SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

PRAGMA foreign_keys = ON;
