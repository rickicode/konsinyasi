---
title: Product Photo Upload agent 3
type: task
permalink: konsinyasi/tasks/product-photo-upload-agent-3
note_type: task
status: done
priority: high
assigned_to: claude
started: 2026-08-05
completed: 2026-08-07
current_step: 7
---

# Product Photo Upload agent 3

## Status

- done

## Steps

1. [x] Add photo_key column to products schema and migration
2. [x] Refactor shared image upload helper from outlets route
3. [x] Add POST /api/products/:id/photo endpoint
4. [x] Update product response schema and routes to expose photo_key
5. [x] Add web API upload function and mutation options
6. [x] Wire product photo UI (display + upload) into ProductCard/ProductDetailPage
7. [x] Run typecheck, lint, and unit tests

## What was implemented

- Schema: `products.photo_key` ada di `src/worker/db/schema.ts` dan migration konsolidasi `migrations/0001_initial.sql`.
- Backend: `src/worker/routes/products.ts` — `POST /:id/photo` (upload via `processImageUpload`, scope `products/{id}`, hapus foto lama) dan `DELETE /:id/photo` (hapus dari R2 + set null). Response produk mengekspos `photo_key` + `photo_url` (via `buildImageUrl`).
- Web API: `src/web/features/products/api/index.ts` — `uploadProductPhoto()` + `deleteProductPhoto()` + mutation options.
- UI:
  - `ProductFormSheet.svelte` — upload foto saat create/update (`uploadProductPhotoMutationOptions`).
  - `ProductCard.svelte` & `ProductDetailSheet.svelte` — display foto (atau fallback ikon package).
- Full suite hijau (266/266) + typecheck worker bersih + build bersih.

## Verification

- `pnpm test` ✅ (266/266)
- `npx tsc -p tsconfig.worker.json --noEmit` ✅
- `npx vite build` ✅

## Notes

Task file sempat berstatus "active" padahal implementasi sudah selesai di working tree — ditandai done pada sesi 2026-08-07 setelah verifikasi. Frontmatter lama yang rusak (YAML ter-nest di dalam frontmatter) dirapikan.
