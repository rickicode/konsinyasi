---
title: 'Phase E: Owner/Admin Routes'
type: Task
permalink: konsinyasi/tasks/phase-e-owner-admin-routes
status: done
assigned_to: claude
started: 2026-07-24
completed: 2026-07-24
---

# Phase E: Owner/Admin Routes

Task label: phase-e-routes

## Goal

Register all Phase E owner/admin routes in `src/web/routes.ts` and update internal navigation so the new master URLs work end-to-end.

## Files updated

- `src/web/routes.ts`
  - Kept public routes: `/`, `/beranda`, `/produk`, `/produk/:id`, `/profil`, `/kategori`, `/keranjang`, `/checkout`, `/login`, `/master`, `/__ui`, `*`.
  - Removed legacy owner-only flat routes: `/bahan-baku`, `/bahan-baku/tambah`, `/bahan-baku/:id`, `/produk/tambah`, `/produk/:id/edit`.
  - Added master sub-routes under `/master` with `requireOwner`:
    - `/master/produk` → `ProductListPage`
    - `/master/produk/baru` → `ProductFormPage`
    - `/master/produk/:id/edit` → `ProductFormPage`
    - `/master/bahan` → `RawMaterialListPage`
    - `/master/bahan/baru` → `RawMaterialFormPage`
    - `/master/bahan/:id/edit` → `RawMaterialFormPage`
    - `/master/warung` → `OutletListPage`
  - Kept `/owner`, `/pengguna`, `/pengaturan`, `/laporan` owner-only routes.
- `src/web/features/products/pages/ProductFormPage.svelte`
  - Redirects and back navigation now use `/master/produk`.
- `src/web/features/products/pages/ProductDetailPage.svelte`
  - Edit button now navigates to `/master/produk/:id/edit`.
- `src/web/features/products/pages/ProductListPage.svelte`
  - Create button now navigates to `/master/produk/baru`.
- `src/web/features/raw-materials/pages/RawMaterialFormPage.svelte`
  - Removed unused `pop` import; back navigation and redirects now use `/master/bahan`.
- `src/web/features/raw-materials/pages/RawMaterialListPage.svelte`
  - Add/edit navigation now uses `/master/bahan/baru` and `/master/bahan/:id/edit`.
- `src/web/features/shell/components/AppShell.svelte`
  - Updated `ownerPaths` to hide the bottom nav on owner-only master sub-routes.
- `src/web/features/shell/components/RouteGuard.svelte`
  - Updated default `ownerOnlyPaths` to include `/master/produk`, `/master/bahan`, `/master/warung`.

## Verification

- `pnpm check` passes
- `pnpm lint` passes
- `pnpm build` passes

## Context

The new master route table replaces the temporary Phase D `bahan-baku` flat routes and the
`/produk/tambah` / `/produk/:id/edit` owner paths. Public product catalog (`/produk`, `/produk/:id`)
remains read-only for authenticated users; all create/edit actions for products and raw materials
now live under `/master/*` and are owner-only.
