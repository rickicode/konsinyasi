-- Prevent duplicate active raw material names.
-- Soft-deleted materials are excluded so a deleted name can be reused later.
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_materials_name_unique ON raw_materials (name) WHERE deleted_at IS NULL;
