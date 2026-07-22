-- PRD §7 master data: raw_materials, products, product_recipes, outlets

CREATE TABLE raw_materials (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    base_unit            TEXT NOT NULL CHECK (base_unit IN ('ml','l','cl','gr','kg','pcs')),
    price_per_base_unit  INTEGER NOT NULL CHECK (price_per_base_unit >= 0),
    deleted_at           TEXT,
    created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE products (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    hpp              INTEGER NOT NULL DEFAULT 0 CHECK (hpp >= 0),
    price_to_outlet  INTEGER NOT NULL CHECK (price_to_outlet >= 0),
    status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    deleted_at       TEXT,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE product_recipes (
    id               TEXT PRIMARY KEY,
    product_id       TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    raw_material_id  TEXT NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
    quantity         REAL NOT NULL CHECK (quantity > 0),
    unit             TEXT NOT NULL CHECK (unit IN ('ml','l','cl','gr','kg','pcs')),
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (product_id, raw_material_id)
);

CREATE TABLE outlets (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    address               TEXT,
    latitude              REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude             REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    location_accuracy_m   REAL,
    location_captured_at  TEXT,
    photo_key             TEXT,
    notes                 TEXT,
    status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    deleted_at            TEXT,
    created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_recipes_product ON product_recipes(product_id);
CREATE INDEX idx_outlets_geo ON outlets(latitude, longitude);
CREATE INDEX idx_outlets_active ON outlets(status) WHERE deleted_at IS NULL;

-- Auto-update updated_at triggers
CREATE TRIGGER trg_raw_materials_updated_at
AFTER UPDATE ON raw_materials
BEGIN
    UPDATE raw_materials SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

CREATE TRIGGER trg_products_updated_at
AFTER UPDATE ON products
BEGIN
    UPDATE products SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

CREATE TRIGGER trg_product_recipes_updated_at
AFTER UPDATE ON product_recipes
BEGIN
    UPDATE product_recipes SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

CREATE TRIGGER trg_outlets_updated_at
AFTER UPDATE ON outlets
BEGIN
    UPDATE outlets SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;
