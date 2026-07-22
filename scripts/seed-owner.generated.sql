
INSERT OR IGNORE INTO users (id, email, name, password_hash, role, status, created_at, updated_at)
SELECT lower(hex(randomblob(16))), 'owner@konsi.local', 'Owner', '100000$KBW+sP20A0/zrm0eNFBzdA==$IybHeuglspBM9MaFGQz6fSP5daZlxSIQQrpQaWZSsOo=', 'owner', 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'owner');
