-- Enforce UOM referential integrity at the database level without a direct
-- foreign key, because uoms.symbol supports soft-delete reuse.
-- Applications must still check for usage; these triggers close the race window.

-- Make sure the active-symbol partial index is in place (idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS idx_uoms_symbol_active ON uoms(symbol) WHERE deleted_at IS NULL;

-- Reject inserting/updating raw_materials with an unknown or deleted UOM symbol.
CREATE TRIGGER IF NOT EXISTS trg_raw_materials_uom_check
BEFORE INSERT OR UPDATE ON raw_materials
FOR EACH ROW
WHEN NEW.deleted_at IS NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM uoms WHERE symbol = NEW.base_unit AND deleted_at IS NULL
    )
    THEN RAISE(ABORT, 'Foreign key violation: base_unit references unknown/deleted UOM')
  END;
END;

-- Reject inserting/updating product_recipes with an unknown or deleted UOM symbol.
CREATE TRIGGER IF NOT EXISTS trg_product_recipes_uom_check
BEFORE INSERT OR UPDATE ON product_recipes
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM uoms WHERE symbol = NEW.unit AND deleted_at IS NULL
    )
    THEN RAISE(ABORT, 'Foreign key violation: unit references unknown/deleted UOM')
  END;
END;

-- Reject soft-deleting a UOM that is still referenced by active raw_materials
-- or any product_recipes line.
CREATE TRIGGER IF NOT EXISTS trg_uoms_prevent_delete_in_use
BEFORE UPDATE ON uoms
FOR EACH ROW
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM raw_materials
      WHERE base_unit = OLD.symbol AND deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM product_recipes WHERE unit = OLD.symbol
    )
    THEN RAISE(ABORT, 'UOM is still in use and cannot be deleted')
  END;
END;
