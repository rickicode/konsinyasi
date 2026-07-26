-- Denormalize visit totals so the visit list can read them without parsing response_json.

ALTER TABLE visit_submissions ADD COLUMN amount_collected_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE visit_submissions ADD COLUMN qty_sold_total INTEGER NOT NULL DEFAULT 0;

-- Composite index to speed up reports that filter by status + created_at.
CREATE INDEX IF NOT EXISTS idx_visit_submissions_status_created_at ON visit_submissions(status, created_at);

-- Backfill totals from the closed (non-voided) consignment_cycles tied to each visit.
UPDATE visit_submissions
SET amount_collected_total = COALESCE((
  SELECT SUM(amount_collected)
  FROM consignment_cycles
  WHERE visit_submission_id = visit_submissions.idempotency_key
    AND status != 'voided'
), 0),
qty_sold_total = COALESCE((
  SELECT SUM(qty_sold)
  FROM consignment_cycles
  WHERE visit_submission_id = visit_submissions.idempotency_key
    AND status != 'voided'
), 0);
