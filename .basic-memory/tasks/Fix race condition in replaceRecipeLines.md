---
title: Fix race condition in replaceRecipeLines
type: task
permalink: konsinyasi/tasks/fix-race-condition-in-replace-recipe-lines
tags:
  - backend
  - hpp
  - race-condition
---

## What changed

- Switched `replaceRecipeLines` in `src/worker/services/hpp.ts` from delete-first to insert-first.
- New recipe lines are upserted (`INSERT ... ON CONFLICT(product_id, raw_material_id) DO UPDATE`) and obsolete lines are deleted in the same D1 `batch`.
- This removes the window where a crash/retry after the delete left the product with zero recipe lines.
- Added validation for duplicate raw materials and positive quantities.
- Also added missing `fetchRecipeLinesForProducts` helper used by `src/worker/routes/products.ts`.

## Status

- `npm run check` passes.
- Pre-existing lint/test failures remain unrelated.
