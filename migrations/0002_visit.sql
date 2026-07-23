-- PRD §7 visit flow: consignment_cycles + visit_submissions

CREATE TABLE consignment_cycles (
    id                  TEXT PRIMARY KEY,
    outlet_id           TEXT NOT NULL REFERENCES outlets(id) ON DELETE RESTRICT,
    product_id          TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    hpp_snapshot        INTEGER NOT NULL CHECK (hpp_snapshot >= 0),
    price_snapshot      INTEGER NOT NULL CHECK (price_snapshot >= 0),
    qty_dropped         INTEGER NOT NULL CHECK (qty_dropped > 0),
    dropped_at          TEXT NOT NULL,
    qty_sold            INTEGER NOT NULL DEFAULT 0 CHECK (qty_sold >= 0),
    qty_return_good     INTEGER NOT NULL DEFAULT 0 CHECK (qty_return_good >= 0),
    qty_return_damaged  INTEGER NOT NULL DEFAULT 0 CHECK (qty_return_damaged >= 0),
    amount_collected    INTEGER NOT NULL DEFAULT 0 CHECK (amount_collected >= 0),
    picked_up_at        TEXT,
    status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'voided')),
    visit_submission_id TEXT,
    notes               TEXT,
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_cycles_outlet_open
    ON consignment_cycles(outlet_id)
    WHERE status = 'open' AND picked_up_at IS NULL;

CREATE INDEX idx_cycles_dropped_at ON consignment_cycles(dropped_at);
CREATE INDEX idx_cycles_product ON consignment_cycles(product_id);

CREATE TRIGGER trg_consignment_cycles_updated_at
AFTER UPDATE ON consignment_cycles
BEGIN
    UPDATE consignment_cycles SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
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
);

CREATE INDEX idx_visit_submissions_outlet ON visit_submissions(outlet_id);
CREATE INDEX idx_visit_submissions_user ON visit_submissions(user_id);
