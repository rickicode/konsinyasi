-- Migration 0004: Add unique username column derived from email prefix
ALTER TABLE users ADD COLUMN username TEXT;
UPDATE users SET username = SUBSTR(email, 1, INSTR(email, '@') - 1);
-- Enforce non-null to match the Drizzle schema after backfilling existing rows.
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX idx_users_username ON users (username);
