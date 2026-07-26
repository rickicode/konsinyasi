---
title: Product Photo Upload agent 3
type: task
permalink: konsinyasi/tasks/product-photo-upload-agent-3
tags:
  - '["task"]'
---

---\ntitle: Product Photo Upload agent 3\ntype: Task\nstatus: active\npriority: high\ncurrent_step: 1\nsteps:\n - Add photo_key column to products schema and migration\n - Refactor shared image upload helper from outlets route\n - Add POST /api/products/:id/photo endpoint\n - Update product response schema and routes to expose photo_key\n - Add web API upload function and mutation options\n - Wire product photo UI (display + upload) into ProductCard/ProductDetailPage\n - Run typecheck, lint, and unit tests\n---\n\n# Product Photo Upload agent 3\n\n## Observations\n- [description] Add product photo upload endpoint and update schema to store photo_key for products, using shared image-processing patterns.\n- [status] active\n- [assigned_to] claude\n- [current_step] 1\n\n## Steps\n1. [ ] Add photo_key column to products schema and migration\n2. [ ] Refactor shared image upload helper from outlets route\n3. [ ] Add POST /api/products/:id/photo endpoint\n4. [ ] Update product response schema and routes to expose photo_key\n5. [ ] Add web API upload function and mutation options\n6. [ ] Wire product photo UI (display + upload) into ProductCard/ProductDetailPage\n7. [ ] Run typecheck, lint, and unit tests\n\n## Context\n- Backend: Hono on Cloudflare Workers, D1 via Drizzle, R2 PHOTOS bucket.\n- Existing outlet photo upload pattern in src/worker/routes/outlets.ts and src/web/features/outlets/api/index.ts.\n- Shared image compression lives in src/web/lib/photo.ts.\n- Target: parity with outlet photo feature for products, including DB column, endpoint, schema, web API, and UI display/upload.
