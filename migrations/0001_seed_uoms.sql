-- Seed default UOMs (mass and volume) for raw materials and recipes.
INSERT INTO uoms (id, name, symbol, dimension, multiplier) VALUES
  ('uom-gram', 'Gram', 'g', 'mass', 1),
  ('uom-kg', 'Kilogram', 'kg', 'mass', 1000),
  ('uom-ons', 'Ons', 'ons', 'mass', 100),
  ('uom-ml', 'Mililiter', 'ml', 'vol', 1),
  ('uom-liter', 'Liter', 'L', 'vol', 1000);
