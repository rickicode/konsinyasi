-- Initial schema for Konsinyasi (single migration, generated from current DB state).
-- This file replaces the previous 0000-0015 migration chain.
PRAGMA foreign_keys = off;

CREATE TABLE users (
    id              TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    username        TEXT NOT NULL,
    name            TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE sessions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at      TEXT NOT NULL,
    last_seen_at    TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE TABLE app_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_by  TEXT REFERENCES users(id)
);
CREATE TRIGGER trg_app_settings_updated_at
AFTER UPDATE ON app_settings
BEGIN
    UPDATE app_settings SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE key = NEW.key;
END;
CREATE TABLE products (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    hpp              INTEGER NOT NULL DEFAULT 0 CHECK (hpp >= 0),
    price_to_outlet  INTEGER NOT NULL CHECK (price_to_outlet >= 0),
    status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    deleted_at       TEXT,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
, photo_key TEXT, hpp_override INTEGER);
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
, last_visit_at TEXT);
CREATE INDEX idx_outlets_geo ON outlets(latitude, longitude);
CREATE INDEX idx_outlets_active ON outlets(status) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_products_updated_at
AFTER UPDATE ON products
BEGIN
    UPDATE products SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;
CREATE TRIGGER trg_outlets_updated_at
AFTER UPDATE ON outlets
BEGIN
    UPDATE outlets SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;
CREATE TABLE visit_submissions (
    idempotency_key          TEXT PRIMARY KEY,
    outlet_id                TEXT NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
    user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    response_json            TEXT NOT NULL,
    client_latitude          REAL NOT NULL,
    client_longitude         REAL NOT NULL,
    client_accuracy_m        REAL,
    distance_m               REAL NOT NULL CHECK (distance_m >= 0),
    geofence_radius_m        INTEGER NOT NULL CHECK (geofence_radius_m > 0),
    geofence_override        INTEGER NOT NULL DEFAULT 0 CHECK (geofence_override IN (0, 1)),
    geofence_override_reason TEXT,
    status                   TEXT NOT NULL DEFAULT 'committed' CHECK (status IN ('committed', 'voided')),
    voided_at                TEXT,
    voided_by                TEXT REFERENCES users(id),
    void_reason              TEXT,
    created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
, notes TEXT, amount_collected_total INTEGER NOT NULL DEFAULT 0, qty_sold_total INTEGER NOT NULL DEFAULT 0);
CREATE INDEX idx_visit_submissions_outlet ON visit_submissions(outlet_id);
CREATE INDEX idx_visit_submissions_user ON visit_submissions(user_id);
CREATE TABLE raw_materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_unit TEXT NOT NULL,
  price_per_base_unit INTEGER NOT NULL CHECK (price_per_base_unit >= 0),
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX idx_raw_materials_name_unique ON raw_materials(name) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_raw_materials_updated_at
AFTER UPDATE ON raw_materials
BEGIN
  UPDATE raw_materials SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;
CREATE TABLE product_recipes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  raw_material_id TEXT NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX idx_recipes_unique_product_raw ON product_recipes(product_id, raw_material_id);
CREATE INDEX idx_recipes_product ON product_recipes(product_id);
CREATE TRIGGER trg_product_recipes_updated_at
AFTER UPDATE ON product_recipes
BEGIN
  UPDATE product_recipes SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;
CREATE TABLE outlet_visit_locks (
  outlet_id TEXT PRIMARY KEY REFERENCES outlets(id) ON DELETE CASCADE,
  visit_id  TEXT NOT NULL,
  locked_at TEXT NOT NULL
);

CREATE INDEX idx_outlet_visit_locks_locked_at ON outlet_visit_locks(locked_at);

CREATE TABLE visit_photos (
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
CREATE INDEX idx_visit_photos_visit_id ON visit_photos (visit_id);
CREATE TABLE receipt_photos (
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
CREATE INDEX idx_receipt_photos_visit_id ON receipt_photos (visit_id);
CREATE INDEX idx_outlets_name ON outlets(name);
CREATE INDEX idx_products_deleted_at_name ON products(deleted_at, name);
CREATE INDEX idx_products_status_deleted_at_name ON products(status, deleted_at, name);
CREATE INDEX idx_visit_submissions_created_at ON visit_submissions(created_at);
CREATE INDEX idx_visit_submissions_outlet_created_at ON visit_submissions(outlet_id, created_at);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_visit_submissions_status_created_at ON visit_submissions(status, created_at);
CREATE TABLE consignment_cycles (
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
CREATE UNIQUE INDEX idx_visit_photos_sequence ON visit_photos(visit_id, sequence);
CREATE INDEX idx_visit_submissions_outlet_status_created ON visit_submissions(outlet_id, status, created_at);
CREATE UNIQUE INDEX idx_outlets_name_active ON outlets(name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_products_name_active ON products(name) WHERE deleted_at IS NULL;
CREATE TABLE uoms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  dimension TEXT NOT NULL DEFAULT 'count' CHECK (dimension IN ('vol', 'mass', 'count')),
  multiplier INTEGER NOT NULL DEFAULT 1 CHECK (multiplier > 0),
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
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status_role ON users(status, role);
CREATE TRIGGER trg_users_updated_at
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

-- Seed default geofence radius
INSERT INTO app_settings (key, value) VALUES ('geofence_radius_m','100');

PRAGMA foreign_keys = on;
