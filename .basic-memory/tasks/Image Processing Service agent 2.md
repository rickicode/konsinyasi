---
title: Image Processing Service agent 2
type: task
permalink: konsinyasi/tasks/image-processing-service-agent-2
---

# Image Processing Service agent 2

Create a shared Cloudflare-Workers-compatible image-processing service for validation, metadata, resize/compression, R2 upload, and old-photo cleanup.

## Observations

- [description] Build reusable worker service that validates image uploads, extracts dimensions, resizes/compresses using OffscreenCanvas, uploads to R2, and deletes the previous object when a replacement is stored.
- [status] active
- [assigned_to] claude
- [current_step] 1

## Steps

1. [ ] Inspect existing outlet/media upload code and shared patterns
2. [ ] Implement `src/worker/services/image-processing.ts`
3. [ ] Update `src/worker/routes/outlets.ts` to delegate photo uploads to the service
4. [ ] Write unit tests and run typecheck/lint/test

## Context

- Project root: /workspaces/konsinyasi
- Existing image helpers: `src/web/lib/photo.ts` (browser-only canvas), `src/worker/routes/outlets.ts` (inline upload/validation/cleanup), `src/worker/routes/media.ts` (R2 read proxy)
- R2 binding: `PHOTOS`; media URL prefix: `/api/media/`
- Worker service pattern lives under `src/worker/services/`
- Errors live in `src/worker/lib/errors.ts` and are used in `app.onError`
