-- Enforce UOM referential integrity at the database level without a direct
-- foreign key, because uoms.symbol supports soft-delete reuse.
-- Applications must still check for usage; D1 trigger support is limited, so
-- integrity is enforced in application code.

-- Make sure the active-symbol partial index is in place (idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS idx_uoms_symbol_active ON uoms(symbol) WHERE deleted_at IS NULL;
