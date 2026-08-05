-- Performance indexes for consignment_cycles
-- The public storefront scans open cycles across ALL outlets, so an index
-- leading with status avoids a full scan.
CREATE INDEX idx_cycles_status ON consignment_cycles(status);

-- Analytics filters cycles per-outlet by date ranges (created_at).
CREATE INDEX idx_cycles_outlet_created ON consignment_cycles(outlet_id, created_at);