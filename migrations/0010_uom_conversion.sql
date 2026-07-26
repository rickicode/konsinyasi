-- UOM conversion support: each active unit now has a dimension and a multiplier
-- relative to the canonical dimension unit (ml, gr, pcs).
ALTER TABLE uoms ADD COLUMN dimension TEXT NOT NULL DEFAULT 'count';
ALTER TABLE uoms ADD COLUMN multiplier INTEGER NOT NULL DEFAULT 1 CHECK (multiplier > 0);

UPDATE uoms SET dimension = 'vol', multiplier = 1 WHERE symbol = 'ml';
UPDATE uoms SET dimension = 'vol', multiplier = 1000 WHERE symbol = 'l';
UPDATE uoms SET dimension = 'vol', multiplier = 250 WHERE symbol = 'cup';
UPDATE uoms SET dimension = 'mass', multiplier = 1 WHERE symbol = 'gr';
UPDATE uoms SET dimension = 'mass', multiplier = 100 WHERE symbol = 'ons';
UPDATE uoms SET dimension = 'mass', multiplier = 1000 WHERE symbol = 'kg';
UPDATE uoms SET dimension = 'count', multiplier = 1 WHERE symbol = 'pcs';
