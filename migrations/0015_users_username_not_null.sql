-- Enforce users.username NOT NULL at the database level to match schema.ts.
-- SQLite requires a table rebuild to add NOT NULL to an existing column.
PRAGMA foreign_keys = off;
PRAGMA defer_foreign_keys = on;

CREATE TABLE users_new (
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

-- Copy existing rows with explicit column mapping so column order changes do not
-- misalign values. Backfill any residual NULL username from the email prefix.
INSERT INTO users_new (id, email, username, name, password_hash, role, status, created_at, updated_at)
SELECT
    id,
    email,
    COALESCE(
        username,
        lower(substr(email, 1, instr(email, '@') - 1))
    ) AS username,
    name,
    password_hash,
    role,
    status,
    created_at,
    updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status, role);

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = NEW.id;
END;

PRAGMA defer_foreign_keys = off;
PRAGMA foreign_keys = on;
