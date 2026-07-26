-- Add username column to match schema.ts
ALTER TABLE users ADD COLUMN username TEXT;

-- Populate username from email local-part for any existing rows (safe to replay).
UPDATE users
SET username = lower(substr(email, 1, instr(email, '@') - 1))
WHERE username IS NULL OR username = '';

-- Resolve duplicate usernames deterministically by appending a counter.
-- The first user (by created_at, then id) keeps the bare prefix; later
-- duplicates become prefix_1, prefix_2, etc.
WITH ranked AS (
  SELECT
    rowid,
    username,
    ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at, id) AS rn
  FROM users
)
UPDATE users
SET username = (
  SELECT ranked.username || '_' || (ranked.rn - 1)
  FROM ranked
  WHERE ranked.rowid = users.rowid
)
WHERE rowid IN (SELECT rowid FROM ranked WHERE rn > 1);

-- Enforce unique usernames.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
