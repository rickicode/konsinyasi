---
title: 'Phase E: Owner Reports'
type: task
permalink: konsinyasi/tasks/phase-e-owner-reports
tags:
  - phase-e
  - reports
  - frontend
---

# Phase E: Owner Reports

## Status

- status: done
- current_step: tsc, lint, and vite build verified

## Files created

- src/web/features/reports/pages/OwnerHubPage.svelte — admin landing with links to Laporan, Pengguna, Pengaturan, and Beranda.
- src/web/features/reports/pages/ReportsPage.svelte — owner report dashboard (summary + breakdowns per outlet, product, user; filter card; PDF/export link).
- src/web/features/reports/components/ReportFilters.svelte — period preset + custom date range + staff filter.
- src/web/features/reports/components/ReportPdfLink.svelte — anchor download for backend PDF, with print-preview fallback when backend endpoints are missing.
- src/web/features/reports/stores/report-filters.svelte.ts — reactive filter state with period helper functions and global store.

## Files updated

- src/web/features/reports/api/index.ts — getReport() now returns an empty fallback report on HTTP 404 so the UI renders before the backend endpoint lands.
- src/web/routes.ts — registered /owner and /laporan as owner-only routes.
- src/web/features/shell/components/RouteGuard.svelte — added /owner and /laporan to ownerOnlyPaths.
- src/web/features/shell/components/DesktopRail.svelte — added Admin and Laporan links; fixed #each key from missing item.key to item.path.
- src/web/features/shell/components/BottomNav.svelte — added Admin and Laporan owner-only nav items.
- src/web/features/shell/components/AppShell.svelte — hide bottom nav on owner-only routes so desktop rail is the primary chrome on lg.
- src/web/features/master/pages/MasterPage.svelte — fixed svelte-spa-router v5 import (router.querystring instead of removed querystring export) so build passes.

## Verification

- pnpm check: pass
- pnpm lint: pass
- pnpm build: pass

## Notes

- PDF export is served from /api/reports/export.pdf when the backend is ready.
- When the reports API returns 404, the report page shows a fallback banner and zeroed metrics; the PDF button falls back to browser print preview.
- Mobile-first stacked cards are used for breakdowns to avoid horizontal overflow.
