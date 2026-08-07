---
title: Image Processing Service agent 2
type: task
permalink: konsinyasi/tasks/image-processing-service-agent-2
note_type: task
status: done
priority: high
assigned_to: claude
started: 2026-08-05
completed: 2026-08-07
current_step: 4
---

# Image Processing Service agent 2

Create a shared Cloudflare-Workers-compatible image-processing service for validation, metadata, resize/compression, R2 upload, and old-photo cleanup.

## Status

- done

## Steps

1. [x] Inspect existing outlet/media upload code and shared patterns
2. [x] Implement `src/worker/services/image-processing.ts`
3. [x] Update `src/worker/routes/outlets.ts` to delegate photo uploads to the service
4. [x] Write unit tests and run typecheck/lint/test

## What was implemented

- `src/worker/services/image-processing.ts` (baru): service bersama `processImageUpload({ bucket, file, scope, oldKey, publicUrlBase })` — validasi file, upload R2, hapus foto lama, build URL publik; plus helper `deleteImageFromR2` / `isSafeImageKey`.
- `src/worker/routes/outlets.ts`: `POST /:id/photo` mendelegasikan upload ke service (scope `outlets/{id}`).
- `src/worker/routes/products.ts`: `POST /:id/photo` + `DELETE /:id/photo` memakai service yang sama (scope `products/{id}`) — bagian dari Product Photo Upload.
- Semua unit test hijau (full suite 266/266) + typecheck worker bersih + build bersih.

## Verification

- `pnpm test` ✅ (266/266)
- `npx tsc -p tsconfig.worker.json --noEmit` ✅
- `npx vite build` ✅

## Notes

Task file sempat berstatus "active" padahal implementasi sudah selesai di working tree — ditandai done pada sesi 2026-08-07 setelah verifikasi.
