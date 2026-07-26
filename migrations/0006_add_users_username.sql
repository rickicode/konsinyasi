-- Add username column to match schema.ts
ALTER TABLE users ADD COLUMN username TEXT;

-- Populate username from email local-part for any existing rows
UPDATE users
SET username = lower(substr(email, 1, instr(email, '@') - 1))
WHERE username IS NULL OR username = '';

-- Enforce unique usernames
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
