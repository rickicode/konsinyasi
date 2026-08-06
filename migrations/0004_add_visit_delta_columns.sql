-- Per-visit (delta) financial columns.
--
-- visit_submissions.amount_collected_total / qty_sold_total store the CUMULATIVE
-- state of every cycle touched by the visit (qty_sold is recomputed as
-- qty_dropped - qty_remaining_good - qty_return_damaged on each pickup). Summing
-- those totals across visits double-counts revenue whenever a cycle is picked up
-- more than once. These new columns capture only what happened DURING the visit.
ALTER TABLE visit_submissions ADD COLUMN amount_collected_delta INTEGER NOT NULL DEFAULT 0;
ALTER TABLE visit_submissions ADD COLUMN qty_sold_delta INTEGER NOT NULL DEFAULT 0;

-- Backfill: for existing rows the exact delta is not recoverable, so approximate
-- with the recorded total. Rows whose cycles were picked up exactly once are
-- exact; multi-pickup historical rows remain approximate until their next edit.
UPDATE visit_submissions
SET amount_collected_delta = amount_collected_total,
    qty_sold_delta = qty_sold_total;
