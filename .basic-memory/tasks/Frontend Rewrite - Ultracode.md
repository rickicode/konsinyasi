---
title: Frontend Rewrite - Ultracode
type: task
permalink: konsinyasi/tasks/frontend-rewrite-ultracode-1
tags:
  - frontend
  - rewrite
  - ultracode
---

# Frontend Rewrite - Ultracode

## Goal

Rebuild `src/web/` as a true mobile-native Svelte 5 SPA with real URLs, feature-based architecture, reusable design system, and shared Zod schemas.

## Status

- Branch: `rewrite/ultracode-frontend`
- Decision recorded: `2ee51405`
- Architecture: docs/FRONTEND_ARCHITECTURE.md
- Plan: docs/IMPLEMENTATION_PLAN.md

## Phases

- [x] Audit + Architecture design
- [x] A — Bootstrap & tooling (built passed; committed)- [x] B — Design system & layout primitives (shell, primitives, /__ui kitchen sink)- [x] C — API client, auth, permissions (shared schemas + typed client + auth context + guards)- [x] D — Public/field screens (dashboard, products, profile, placeholders)
- [x] E — Owner/admin screens (product CRUD, master, raw-materials, users, settings, reports)
- [x] F — Visit/submission flows (outlets, visits, geofence, draft store)
- [x] G — PWA, animations, tests (PWA manifest, component tests, E2E scaffold, polish)
- [x] H — Cutover & final review (old code removed, lint/prettier ignores cleaned, all gates green)

## Notes

- Keep Svelte 5 / Vite 6 / Tailwind v4.
- Shared schemas under `src/shared/schemas/*` must be used by both worker and web.
- Backend blockers: `GET /api/visits`, `/api/reports` + PDF export.
- Old `src/web/pages/*`, `src/web/lib/*`, `src/web/components/*` are disposable; removed in Phase H.

## Final Status

- All phases A–H committed to `rewrite/ultracode-frontend`.
- Gates at HEAD `c4d8be2`: `pnpm check` ✅, `pnpm lint` ✅, `pnpm build` ✅, `pnpm test` ✅ (149 tests, 19 files).
- Architecture decision `2ee51405` is still pending human approval.
- Known non-blocking build warnings: Svelte `state_referenced_locally`, `<svelte:component>` deprecation (ReportsPage), and a11y notes in Dialog/Sheet primitives.

## Follow-up fixes (committed `35b0b28`)

- Eliminated all Svelte build warnings (Dialog/Sheet a11y, `<svelte:component>` deprecation, `state_referenced_locally`).
- Fixed `t.subscribe is not a function` runtime crash by moving from legacy `$query` store syntax to TanStack Svelte 5 rune object access and accessor-function `createQuery(() => ...)` / `createMutation(() => ...)`.
- Login page (`/login`) now renders full-screen without shell/topbar/bottom-nav.
- Bottom navigation capped at 4 items and split by role; owner-only extras (Profil, Admin, Laporan, Pengguna, Pengaturan) moved to TopBar menu.
- All gates remain green: `pnpm check`, `pnpm lint`, `pnpm build`, `pnpm test` (149 tests).
