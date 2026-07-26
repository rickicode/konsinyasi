---
title: Frontend redesign + infinite scroll agent 2
type: task
permalink: konsinyasi/tasks/frontend-redesign-infinite-scroll-agent-2
status: done
current_step: 9
priority: high
assigned_to: claude
started: 2026-08-05
completed: 2026-08-05
---

# Frontend redesign + infinite scroll agent 2

## Goal

Apply a consistent mobile-first redesign to the web SPA list pages and wire them to the existing backend pagination with TanStack Query infinite scroll.

## Status

- done

## Scope

- Target: `src/web/` Svelte 5 SPA.
- Pages updated:
  - `/produk` and `/master/produk` → `ProductListPage.svelte`
  - `/warung` and `/master/warung` → `OutletListPage.svelte`
  - `/master/bahan` → `RawMaterialListPage.svelte`
  - `/pengguna` → `UsersPage.svelte`
  - `/kunjungan` → `VisitListPage.svelte`
  - `/` (home / Tempatkan Kopi) → `PlaceCoffeePage.svelte`
- Added shared primitives:
  - `src/web/shared/composables/InfiniteScroll.svelte` (IntersectionObserver sentinel + manual load button)
  - `src/web/shared/ui/SkeletonList.svelte` (consistent list skeleton placeholder)
- Added paginated fetchers + `infiniteQueryOptions` factories in product/outlet/raw-material/user API modules.

## Steps

1. [x] Audit current list pages and API structure
2. [x] Add reusable InfiniteScroll + skeleton components
3. [x] Add paginated fetchers and infiniteQueryOptions to product/outlet/raw-material/user APIs
4. [x] Refactor ProductListPage with infinite scroll + redesign
5. [x] Refactor OutletListPage with infinite scroll + redesign
6. [x] Refactor RawMaterialListPage with infinite scroll + redesign
7. [x] Refactor UsersPage with infinite scroll + redesign
8. [x] Refactor VisitListPage and PlaceCoffeePage with infinite scroll + redesign
9. [x] Run `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`

## Context

- Backend pagination implemented in `src/worker/lib/pagination.ts` and enabled on `GET /api/products`, `/api/outlets`, `/api/raw-materials/`, `/api/users`.
- Default request (no `page`/`limit`) returns a plain array; paginated request returns `{ data, meta }`.
- Shared pagination schema lives in `src/shared/schemas/pagination.schema.ts`.
- Previous non-paginated `queryOptions` factories kept intact for consumers that still need full arrays (picker, reports, form sheets).

## Verification

- `pnpm format` ✅
- `pnpm check` ✅
- `pnpm lint` ✅
- `pnpm test` ✅ (139 tests)
- `pnpm build` ✅

## Notes

- Search/filter remains client-side over already-loaded pages. The backend list endpoints do not yet support search params, so rare matches may require scrolling to load more pages. A future improvement is to add `q`/`search` params to the backend routes so infinite scroll can be driven by the server.
- Distance sort for outlet lists is also client-side and only considers loaded pages; adding backend geospatial sort would improve accuracy for large outlet datasets.

## Related

- backend-pagination [[Backend pagination]]
- frontend-rewrite-ultracode [[frontend-rewrite-ultracode]]
