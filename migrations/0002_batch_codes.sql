WITH numbered AS (
  SELECT
    id,
    printf(
      'B%s%s%02d',
      substr(production_date, 9, 2),
      substr(production_date, 6, 2),
      ROW_NUMBER() OVER (
        PARTITION BY substr(production_date, 1, 10)
        ORDER BY created_at, id
      )
    ) AS batch_code
  FROM product_batches
  WHERE deleted_at IS NULL
)
UPDATE product_batches
SET batch_number = (
  SELECT batch_code FROM numbered WHERE numbered.id = product_batches.id
)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_batches_batch_number_active
  ON product_batches(batch_number)
  WHERE deleted_at IS NULL;
