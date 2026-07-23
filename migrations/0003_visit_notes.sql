-- Add optional top-level notes to visit submissions.

ALTER TABLE visit_submissions ADD COLUMN notes TEXT;
