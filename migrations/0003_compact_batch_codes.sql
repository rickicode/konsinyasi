UPDATE product_batches
SET batch_number = 'B' || substr(batch_number, 3, 4) || substr(batch_number, 8, 2)
WHERE batch_number GLOB 'B-[0-9][0-9][0-9][0-9]-[0-9][0-9]';
