-- Migration 0006: Add visit photos and receipt/bon photo storage
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
