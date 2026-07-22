
INSERT OR IGNORE INTO users (id, email, name, password_hash, role, status, created_at, updated_at)
SELECT lower(hex(randomblob(16))), 'owner@konsi.local', 'Owner', '100000$TKRjyG2eXijaFwMC+xrAlQ==$DcOu+GWGfDf3Bu/TI39z+XKP8RKpSokZ9yz6yLe02PU=', 'owner', 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'owner');
