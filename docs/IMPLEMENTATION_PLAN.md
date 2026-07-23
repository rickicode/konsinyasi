# Konsi Frontend Rewrite — Implementation Plan

> Consumes the decisions in `docs/FRONTEND_ARCHITECTURE.md` and routes them into 8 executable, parallelizable phases (A–H).
> **Target:** smartphone portrait first, owner/admin screens enhanced at `lg`, consignment-domain vocabulary preserved.

---

## Assumptions

- `API_CONTRACT.md` and `PRD.md` are the source of truth; deviations are documented per phase.
- The worker will be refactored to import request/response schemas from `src/shared/schemas/*` (frontend + backend share one contract).
- Two backend additions are treated as **blockers**:
  - `GET /api/visits` for the owner void entry point (needed in Phase F).
  - `/api/reports` + `/api/reports/export.pdf` (needed in Phase E).
- The old `src/web/pages/*`, `src/web/lib/*`, and `src/web/components/*` are kept until Phase H.

---

## Timeline Overview

| Phase | Focus                             | Rough Duration | Gate                                                 |
| ----- | --------------------------------- | -------------- | ---------------------------------------------------- |
| **A** | Bootstrap & tooling               | 0.5–1 wk       | CI green, build emits shell                          |
| **B** | Design system & layout primitives | 1 wk           | All primitives render, shell navigates               |
| **C** | API client, auth, permissions     | 1 wk           | Login/logout/guards work                             |
| **D** | Public/customer screens           | 1.5 wk         | Dashboard, product, profile, reserved routes         |
| **E** | Owner/admin screens               | 2 wk           | Master, users, settings, reports (backend-dependent) |
| **F** | Visit/submission flows            | 2 wk           | End-to-end visit on a real phone                     |
| **G** | Polish: PWA, animations, tests    | 1 wk           | Lighthouse ≥90, E2E green                            |
| **H** | Cutover & final review            | 0.5 wk         | Old code removed, production build signed off        |

**Critical path after A:** B and C can run in parallel. After C, **D**, **E**, and **F** can be developed by separate owners. G starts once D/E/F core pages are merged.

---

## Phase A — Bootstrap & Tooling

### Goal

A new feature-based directory skeleton exists, the toolchain is installed, lint/CI wired, and the app still builds.

### Files / directories to create

- `.github/workflows/ci.yml` — pnpm install, typecheck (`pnpm check`), lint, unit test.
- `eslint.config.js` / `prettier.config.js` / `.prettierignore` — ignore `dist/`, old `src/web/pages/`, `src/web/lib/`, `src/web/components/` during transition.
- Empty directory scaffold:
  - `src/shared/schemas/`
  - `src/shared/types/`
  - `src/shared/lib/`
  - `src/web/features/`
  - `src/web/lib/api/`
  - `src/web/lib/router/`
  - `src/web/lib/stores/`
  - `src/web/lib/utils/`
  - `src/web/shared/ui/`
  - `src/web/shared/composables/`
  - `src/web/shared/providers/`
  - `src/web/public/icons/`

### Files to modify

- `package.json`
  - Add scripts: `lint`, `lint:fix`, `format`, `test:unit`, `test:e2e`.
  - Keep `check` and `build` as-is.
- `vite.config.ts` — leave plugin list unchanged; PWA plugin is added in Phase G.
- `tsconfig.web.json` / `tsconfig.worker.json` — `@shared/*` alias already exists; verify it resolves.

### Dependencies to add

```bash
# runtime
pnpm add svelte-spa-router@^5.1.1 @tanstack/svelte-query@^6.0.0 bits-ui@^2.18.0 lucide-svelte@^1.0.0 clsx tailwind-merge

# tooling / PWA foundation
pnpm add -D vite-plugin-pwa@^1.3.0 eslint prettier eslint-plugin-svelte eslint-config-prettier prettier-plugin-svelte
```

Optional but recommended: `@eslint/js`, `@typescript-eslint/*`, `globals`, `@types/leaflet` (defer to Phase F if preferred).

### In-parallel tasks

- Backend owner reviews the shared-schema target and agrees on the worker import refactor.
- Designer/stakeholder confirms final nav labels and route table.
- QA inventories test devices (iOS Safari, Android Chrome, and one desktop owner screen).

### Verification criteria

- [ ] `pnpm install` succeeds.
- [ ] `pnpm check` passes for both web and worker configs.
- [ ] `pnpm lint` passes with transition ignores in place.
- [ ] CI job passes on a branch push.
- [ ] `pnpm build` emits `dist/client/index.html` and assets.

### Risks

| Risk                                                                   | Mitigation                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `bits-ui` or `svelte-spa-router` conflicts with Svelte 5 / Tailwind v4 | Pin exact versions tested in A; isolate every primitive in Phase B                     |
| Linting old pages produces thousands of errors                         | ESLint ignores old `src/web/{pages,lib,components}` and ignores are removed in Phase H |
| CI runs out of time                                                    | Use `pnpm` action with caching; keep E2E out of the PR gate until Phase G              |

---

## Phase B — Design System & Layout Primitives

### Goal

The visual language, shell, and generic components exist before any feature logic is written.

### Files / directories to create

Design tokens & global helpers:

- `src/web/app.css` — rewrite with architecture tokens (semantic status, shadows, typography, safe-area utilities).
- `src/web/index.html` — update viewport to `viewport-fit=cover`, add `theme-color`, `mobile-web-app-capable`, Apple status-bar meta.
- `src/web/lib/utils/cn.ts`
- `src/web/lib/utils/format.ts` — date/rupiah helpers
- `src/web/lib/utils/haptics.ts`
- `src/web/lib/utils/local-storage.ts`
- `src/web/routes.ts` — initial route map with lazy wrappers

Shared UI primitives (`src/web/shared/ui/`):

- `Button.svelte`
- `Input.svelte`
- `TextArea.svelte`
- `Select.svelte`
- `Card.svelte`
- `Sheet.svelte`
- `Dialog.svelte`
- `Tabs.svelte`
- `Toast.svelte`
- `NavItem.svelte`
- `Skeleton.svelte`
- `EmptyState.svelte`
- `ErrorState.svelte`
- `AgeBadge.svelte`
- `QtyStepper.svelte`
- `icons/Icon.svelte`

Composables:

- `src/web/shared/composables/PullToRefresh.svelte`
- `src/web/shared/composables/BottomSheet.svelte`
- `src/web/shared/composables/ConfirmDialog.svelte`

Providers:

- `src/web/shared/providers/QueryProvider.svelte`
- `src/web/shared/providers/ToastProvider.svelte`

Shell feature (`src/web/features/shell/`):

- `pages/RootLayout.svelte`
- `components/AppShell.svelte`
- `components/TopBar.svelte`
- `components/BottomNav.svelte`
- `components/DesktopRail.svelte`
- `components/RouteGuard.svelte`
- `pages/NotFoundPage.svelte`

Lazy-loading helper:

- `src/web/lib/router/lazy.ts`

### Files to modify

- `src/web/main.ts` — ensure `mount(App, …)` and `app.css` import.
- `src/web/App.svelte` — replace with router + provider composition.
- `src/web/routes.ts` — first route table:
  - `/login`
  - `/beranda` → placeholder shell page
  - `/profil` → placeholder
  - `*` → `NotFoundPage`

### Dependencies

No new dependencies. `bits-ui`, `lucide-svelte`, `clsx`, `tailwind-merge` from Phase A are used here.

### In-parallel tasks

- **Phase C** starts as soon as `cn()`, `Icon`, and `Card` land; auth pages can temporarily use the skeleton components.
- Backend removes inline schemas from worker route files and imports from `src/shared/schemas/*`.

### Verification criteria

- [ ] All primitive variants render on a temporary `/__ui` kitchen-sink route (removed before merge).
- [ ] Bottom nav uses real `<a>` links with `use:link` and active states.
- [ ] Desktop rail renders at `lg` and bottom nav renders below.
- [ ] Touch targets are ≥44×44 dp; inputs are `text-base` (16px).
- [ ] Sheet/dialog close with backdrop tap, swipe-down, and Escape.
- [ ] Build passes; no horizontal scroll on iPhone SE viewport.

### Risks

| Risk                                            | Mitigation                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| `bits-ui` theming requires unexpected overrides | Keep every primitive unstyled first, then layer Tailwind classes; document deviations |
| Safe-area CSS causes layout jumps on iOS        | Test on real device; use `100dvh` and `env()` constants                               |

---

## Phase C — API Client, Auth, Permissions

### Goal

Server communication, authentication, role-based routing, and global Svelte 5 contexts are solid.

### Files / directories to create

Shared contracts:

- `src/shared/schemas/auth.schema.ts`
- `src/shared/schemas/user.schema.ts`
- `src/shared/schemas/outlet.schema.ts`
- `src/shared/schemas/product.schema.ts`
- `src/shared/schemas/raw-material.schema.ts`
- `src/shared/schemas/visit.schema.ts`
- `src/shared/schemas/settings.schema.ts`
- `src/shared/schemas/report.schema.ts`
- `src/shared/types/api.types.ts`
- `src/shared/lib/units.ts`
- `src/shared/lib/money.ts`
- `src/shared/lib/age.ts`
- `src/shared/lib/id.ts`

API layer (`src/web/lib/api/`):

- `client.ts` — typed `ApiClient` with Zod parse and error mapping
- `errors.ts` — `ApiError` + `errorMessages` map
- `query-client.ts` — `QueryClient` with retry rules from architecture
- `query-keys.ts`

Domain API modules:

- `src/web/features/auth/api/auth.api.ts`
- `src/web/features/auth/stores/auth.svelte.ts`
- `src/web/features/users/api/users.api.ts`
- `src/web/features/settings/api/settings.api.ts`
- `src/web/features/dashboard/api/dashboard.api.ts`
- `src/web/features/outlets/api/outlet.api.ts`
- `src/web/features/products/api/product.api.ts`
- `src/web/features/raw-materials/api/raw-material.api.ts`
- `src/web/features/visits/api/visit.api.ts`
- `src/web/features/reports/api/reports.api.ts`

Global rune contexts (`src/web/lib/stores/`):

- `network.svelte.ts`
- `geolocation.svelte.ts`
- `toast.svelte.ts`

Router helpers:

- `src/web/lib/router/guards.svelte.ts` — `requireAuth`, `requireOwner`
- `src/web/lib/router/links.ts` — active link helpers

Auth feature pages:

- `src/web/features/auth/pages/LoginPage.svelte`
- `src/web/features/auth/components/LoginForm.svelte`
- `src/web/features/auth/pages/ProfilePage.svelte`

### Files to modify

- `src/worker/routes/*.ts` — replace inline Zod schemas with imports from `@shared/schemas/*`.
- `src/web/routes.ts` — wire `/login`, `/profil`, `*`.
- `src/web/features/shell/components/RouteGuard.svelte` — consume `auth.svelte.ts` and redirect unauthenticated/unauthorized requests.
- `src/web/shared/providers/QueryProvider.svelte` — attach global `onError` for `AUTH_REQUIRED`.

### Dependencies

No new runtime dependencies. `zod` is already used by the worker.

### In-parallel tasks

- Phase B can still finish remaining primitives.
- Backend schema refactor (worker imports from `src/shared/schemas/*`).
- Phase D/E/F owners can review the API module signatures once `client.ts` is merged.

### Verification criteria

- [ ] Unit tests for `age.ts`, `units.ts`, `money.ts`, `id.ts` pass.
- [ ] Login page validates email/password with `auth.schema.ts`.
- [ ] Successful login sets the user context, stores session cookie, and navigates to `/beranda`.
- [ ] Logout clears context and navigates to `/login`.
- [ ] `AuthContext.can('reports:read')` returns `false` for staff and `true` for owner.
- [ ] Visiting `/owner` as staff redirects to `/beranda`; visiting it as owner stays.
- [ ] `401 AUTH_REQUIRED` from any query navigates to `/login` and shows a toast.
- [ ] `pnpm check` passes with worker referencing `@shared/*`.

### Risks

| Risk                                                                     | Mitigation                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Shared schemas drift from the worker during refactor                     | Add a small smoke test that imports every schema in both web + worker typecheck paths |
| `fetch('/api/...')` behaves differently under `wrangler dev` vs Vite dev | Verify on the actual dev command (`pnpm dev`) and adjust `base`/proxy if needed       |
| Geolocation watch drains battery                                         | Keep watch only inside visit form (Phase F), not globally                             |

---

## Phase D — Public / Customer Screens

### Goal

Field users see the dashboard, product information, profile, and the reserved storefront routes are exposed as placeholders.

### Files / directories to create

Dashboard feature:

- `src/web/features/dashboard/pages/DashboardPage.svelte`
- `src/web/features/dashboard/components/UrgencyCard.svelte`
- `src/web/features/dashboard/components/SummaryCards.svelte`

Products feature (read-only/list):

- `src/web/features/products/pages/ProductListPage.svelte`
- `src/web/features/products/pages/ProductDetailPage.svelte`
- `src/web/features/products/components/ProductCard.svelte`

Public/reserved storefront placeholders:

- `src/web/features/public/pages/CategoryPage.svelte`
- `src/web/features/public/pages/CartPage.svelte`
- `src/web/features/public/pages/CheckoutPage.svelte`

Profile feature (finalized):

- `src/web/features/auth/pages/ProfilePage.svelte`

### Files to modify

- `src/web/routes.ts` add:
  - `/`, `/beranda` → `DashboardPage`
  - `/produk`, `/produk/:id` → product pages
  - `/profil` → `ProfilePage`
  - `/kategori`, `/keranjang`, `/checkout` → placeholder pages

### Dependencies

No new dependencies.

### In-parallel tasks

- Phase E owner/admin screens can be developed in parallel by a different owner.
- Phase F visit/submission can begin as soon as outlet API modules are available.

### Verification criteria

- [ ] `/beranda` renders summary cards and urgency list sorted red → yellow → green → none.
- [ ] `AgeBadge` matches PRD thresholds (≥96h red, ≥72h amber).
- [ ] `/produk` lists active products; staff does not see `hpp` / `price_to_outlet`.
- [ ] `/produk/:id` shows correct owner vs staff fields.
- [ ] `/profil` shows current user name/email/role and logout.
- [ ] `/kategori`, `/keranjang`, `/checkout` render an explanatory “coming soon” card and do not call missing endpoints.
- [ ] Pull-to-refresh refetches dashboard and product list; offline shows the offline chip.

### Risks

| Risk                                                            | Mitigation                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Staff sees financial fields because the UI forgets to gate them | Drive fields from the server response and add a role guard helper; add a component test |
| Dashboard data is stale after a visit                           | Phase F will wire visit invalidation; verify again in Phase F                           |
| Placeholder routes confuse QA                                   | Add a clear banner and link back to `/beranda`                                          |

---

## Phase E — Owner / Admin Screens

### Goal

Owner/admin flows are desktop-ready, fully responsive, and reports work once the backend endpoint lands.

### Files / directories to create

Master feature:

- `src/web/features/master/pages/MasterPage.svelte`
- `src/web/features/master/components/MasterTabs.svelte`

Product management:

- `src/web/features/products/pages/ProductFormPage.svelte`
- `src/web/features/products/components/RecipeEditor.svelte`
- `src/web/features/products/components/HppDisplay.svelte`

Raw-material management:

- `src/web/features/raw-materials/pages/RawMaterialListPage.svelte`
- `src/web/features/raw-materials/pages/RawMaterialFormPage.svelte`

Users management:

- `src/web/features/users/pages/UsersPage.svelte`
- `src/web/features/users/components/UserForm.svelte`

Settings:

- `src/web/features/settings/pages/SettingsPage.svelte`
- `src/web/features/settings/components/RadiusForm.svelte`

Reports / owner hub:

- `src/web/features/reports/pages/OwnerHubPage.svelte`
- `src/web/features/reports/pages/ReportsPage.svelte`
- `src/web/features/reports/components/ReportFilters.svelte`
- `src/web/features/reports/components/ReportPdfLink.svelte`
- `src/web/features/reports/stores/report-filters.svelte.ts`

### Files to modify

- `src/web/routes.ts` add:
  - `/master`, `/master/produk`, `/master/produk/baru`, `/master/produk/:id/edit`
  - `/master/bahan`, `/master/bahan/baru`, `/master/bahan/:id/edit`
  - `/master/warung`
  - `/owner`, `/pengguna`, `/pengaturan`, `/laporan`
- `src/web/features/shell/components/DesktopRail.svelte` — add all owner/admin links.

### Dependencies

No new dependencies. Reports PDF is downloaded from `/api/reports/export.pdf` (backend-dependent).

### In-parallel tasks

- **Backend** implements `GET /api/reports`, filters, and PDF export.
- **Phase F** consumes product picker data from the same `product.api.ts`.
- QA writes desktop responsive checklist.

### Verification criteria

- [ ] Owner can add/edit/delete raw materials and products; product HPP recalculates correctly.
- [ ] Staff cannot access `/pengguna`, `/pengaturan`, `/laporan`, or financial fields.
- [ ] Master tabs are URL-persisted (`/master/produk` survives refresh).
- [ ] Desktop rail shows on viewports ≥1024px and bottom nav is hidden on owner routes.
- [ ] Table layouts do not overflow horizontally on mobile.
- [ ] Settings geofence radius persists and validates 20–2000m.
- [ ] Reports page loads data and PDF link downloads (or is clearly gated if backend is not ready).

### Risks

| Risk                                        | Mitigation                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Reports endpoint not ready by this phase    | Gate the reports route with a clear “belum tersedia” state; owner hub still lands first reports card from dashboard |
| Recipe editor UX becomes unwieldy on phone  | Build mobile-first forms; use bottom sheets for ingredient picker                                                   |
| Soft-delete errors are not surfaced to user | Map `CONFLICT` backend code to inline toast with the message from `errors.ts`                                       |

---

## Phase F — Visit / Submission Flows

### Goal

The most critical user journey is fluid on mobile: locate outlet, start visit, geofence, close cycles, drop bottles, submit idempotently.

### Files / directories to create

Outlets feature:

- `src/web/features/outlets/pages/OutletListPage.svelte`
- `src/web/features/outlets/pages/OutletDetailPage.svelte`
- `src/web/features/outlets/pages/OutletFormPage.svelte`
- `src/web/features/outlets/components/OutletCard.svelte`
- `src/web/features/outlets/components/MapPicker.svelte`
- `src/web/features/outlets/components/PhotoUploader.svelte`
- `src/web/features/outlets/components/GeoCaptureButton.svelte`
- `src/web/features/outlets/stores/outlet-filter.svelte.ts`

Visits feature:

- `src/web/features/visits/pages/VisitListPage.svelte`
- `src/web/features/visits/pages/VisitFormPage.svelte`
- `src/web/features/visits/components/GeofenceStatus.svelte`
- `src/web/features/visits/components/CyclePickupForm.svelte`
- `src/web/features/visits/components/DropSheet.svelte`
- `src/web/features/visits/components/VisitReviewSheet.svelte`
- `src/web/features/visits/stores/visit-draft.svelte.ts`

### Files to modify

- `src/web/routes.ts` add:
  - `/warung`, `/warung/baru`, `/warung/:id`, `/warung/:id/edit`
  - `/kunjungan` → `VisitListPage`
  - `/kunjungan/:outletId` → `VisitFormPage`
- `src/web/features/shell/components/AppShell.svelte` — hide bottom nav on `/kunjungan/:outletId` and add full-height flex layout.
- `src/web/lib/stores/geolocation.svelte.ts` — finalize accuracy/distance helpers.

### Dependencies to add

```bash
pnpm add leaflet
pnpm add -D @types/leaflet
```

Leaflet must be imported dynamically inside `MapPicker.svelte` to avoid SSR/bundle weight issues.

### In-parallel tasks

- **Backend** delivers `GET /api/visits` (owner visit history) so the void button has an entry point.
- QA drafts the end-to-end mobile visit script.

### Verification criteria

- [ ] Owner/staff can create a new outlet with GPS capture and photo upload; photo is compressed ≤500KB before upload.
- [ ] `MapPicker` displays OSM tiles, a draggable pin, and outlet coordinates.
- [ ] Visit list shows outlets with an open visit action.
- [ ] Visit form shows a live geofence card: distance, accuracy, radius, and “Dalam radius / Di luar radius / GPS belum siap” badge.
- [ ] Staff outside radius cannot submit; owner can override with a reason.
- [ ] Cycle closure enforces `qty_sold + qty_return_good + qty_return_damaged == qty_dropped` before API call.
- [ ] Drop section adds new cycles; product picker uses `/api/products/picker`.
- [ ] Double-tap submit is prevented by idempotency key and pending mutation state.
- [ ] Drafts persist to `localStorage` and survive refresh; stale drafts (>7 days) are discarded.
- [ ] Offline banner disables submit and shows “Draft kunjungan tersimpan di HP”.
- [ ] After submit, dashboard and outlet caches invalidate automatically.
- [ ] Owner can void a visit from the visit history list (backend-dependent).

### Risks

| Risk                                                 | Mitigation                                                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET /api/visits` endpoint missing, blocking void UI | Build the visit submit flow first; ship void list behind the same endpoint blocker             |
| Mobile camera/file input behaves inconsistently      | `<input accept="image/*" capture="environment">` + compression canvas; test on iOS and Android |
| GPS accuracy swings cause false geofence failures    | Show accuracy value; allow refresh; owner override documented in UX                            |
| Map tiles fail to load offline                       | Map picker requires network; visit form geofence works without map tiles                       |
| Equation validation mismatch with server             | Run the same math in `visit-draft.svelte.ts` that the backend enforces; unit test it           |

---

## Phase G — Polish: PWA, Animations, Gestures, Tests

### Goal

The app feels native, passes a quality bar, and has automated coverage for critical paths.

### Files / directories to create

PWA assets:

- `src/web/public/icons/` — maskable + transparent PNGs, generated from `favicon.svg`.
- PWA configuration lives in `vite.config.ts` (manifest generated by plugin).

Tests:

- Update/add to existing `src/web/lib/__tests__/`:
  - `draft.test.ts` for `visit-draft.svelte.ts`
  - `role.test.ts` or `rbac.test.ts`
  - `geofence.test.ts`, `age.test.ts`, `units.test.ts`
- Component tests:
  - `src/web/shared/ui/__tests__/AgeBadge.spec.ts`
  - `src/web/shared/ui/__tests__/QtyStepper.spec.ts`
  - `src/web/features/visits/components/__tests__/GeofenceStatus.spec.ts`
- E2E:
  - `e2e/mobile-flow.spec.ts` — login → add outlet → visit → submit
  - `e2e/owner-admin.spec.ts` — owner radius + user CRUD
  - `playwright.config.ts`

Polish:

- `src/web/lib/utils/animations.ts` — route transition helpers with `prefers-reduced-motion` guard.
- Offline banner component in shell.
- Pull-to-refresh integration on list pages.
- Haptics utility used on primary actions.

### Files to modify

- `vite.config.ts` — add `VitePWA({ registerType: 'autoUpdate', manifest: {...}, workbox runtimeCaching: [...] })`.
- `src/web/index.html` — add `<link rel="manifest" href="/manifest.webmanifest">`.
- `vitest.config.ts` — add `environmentMatchGlobs` so `src/web/**/*.spec.ts` runs in `jsdom` while worker tests stay `node`.
- `src/web/main.ts` / `App.svelte` — final PWA registration, reduced-motion guards.

### Dependencies to add

```bash
pnpm add -D @playwright/test @testing-library/svelte jsdom
# (or happy-dom if team prefers)
```

Also run `pnpm exec playwright install --with-deps` in CI/dev.

### In-parallel tasks

- Backend finalizes reports and visit-history endpoints before cutover.
- Design/product review signs off on mobile UX.
- Ops confirms Cloudflare Worker R2 bucket and asset serving for PWA precache.

### Verification criteria

- [ ] `vite-plugin-pwa` generates `manifest.webmanifest` and service worker.
- [ ] Lighthouse PWA score ≥ 90.
- [ ] Runtime caching serves `/api/media/*` when offline and falls back for `/api/*`.
- [ ] App installs on Android and iOS “Add to Home Screen”.
- [ ] Page transitions respect `prefers-reduced-motion`.
- [ ] Unit + component tests pass (`pnpm test:unit`).
- [ ] Playwright E2E passes on mobile viewport (`pnpm test:e2e`).
- [ ] No console errors on login → dashboard → visit submit in dev.

### Risks

| Risk                                        | Mitigation                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Service worker caches stale JS after deploy | Use `autoUpdate` + `workbox` precache revision manifest; verify with a staging deploy |
| Playwright mobile E2E flaky on CI           | Use desktop Chromium with mobile viewport first; add real-device smoke in Phase H     |
| Reduced-motion not respected                | Guard every `transition`/`fly`/`fade` with `prefers-reduced-motion: reduce`           |

---

## Phase H — Cutover & Final Review

### Goal

Old code is removed, documentation is accurate, and the rewrite is merged.

### Files / directories to delete

- `src/web/pages/Login.svelte`
- `src/web/pages/Dashboard.svelte`
- `src/web/pages/VisitList.svelte`
- `src/web/pages/VisitForm.svelte`
- `src/web/pages/OutletList.svelte`
- `src/web/pages/MasterPage.svelte`
- `src/web/pages/ProductList.svelte`
- `src/web/pages/RawMaterialList.svelte`
- `src/web/pages/Users.svelte`
- `src/web/lib/api.ts`
- `src/web/lib/router.ts`
- `src/web/lib/role.ts`
- `src/web/lib/visit.ts`
- `src/web/lib/photo.ts`
- `src/web/components/Icon.svelte`
- `src/web/lib/__tests__/draft.test.ts` if superseded by new test location

### Files to modify

- `eslint.config.js` / `.prettierignore` — remove temporary ignores for old paths.
- `package.json` — remove any now-unused scripts.
- `docs/FRONTEND_ARCHITECTURE.md` — record final deviations and route table changes.
- `docs/IMPLEMENTATION_PLAN.md` — mark statuses and add post-mortem notes.

### Dependencies

No new dependencies. Remove any deps only used by the old code (check `Icon.svelte` hard-coded SVGs, etc.).

### In-parallel tasks

- Backend removes duplicated inline schemas if not already done.
- QA runs regression on the merged `main` branch.
- Product owner signs off against PRD acceptance criteria.

### Verification criteria

- [ ] Old source files do not exist in the working tree.
- [ ] `pnpm check`, `pnpm lint`, `pnpm test:unit`, and `pnpm build` all pass.
- [ ] `pnpm dev` login → dashboard → visit submit succeeds on a real phone.
- [ ] Lighthouse PWA score still ≥ 90 after cleanup.
- [ ] Git diff shows no leftover TODO/FIXME related to the cutover.
- [ ] PR approved and merged; old branch deleted.

### Risks

| Risk                                                | Mitigation                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Deleting old files removes something still imported | Do a project-wide search for `from './lib/` and `from '../components/` first |
| Final build size jumps after removing old pages     | Run `pnpm build` with `vite-plugin-visualizer` if bundle budget is a concern |
| Last-minute regression in production                | Stage on a non-prod Cloudflare environment and run the E2E suite there       |

---

## Cross-Cutting Rules

1. **Shared schemas are the source of truth.** Any frontend validation must use the same Zod schema the worker uses.
2. **All navigation is real `<a>`.** Use `use:link` / `use:active` from `svelte-spa-router`; no `window.location` or `navigate()` in production UI components.
3. **Touch first.** Every tap target ≥44dp; primary actions full-width, min-h-14.
4. **Server state lives in TanStack Query; local UI state in Svelte 5 runes.** Never put fetched lists in a global store.
5. **Role-aware UI.** The server already filters data, but the UI must also hide inputs/buttons an owner-only action. Use `auth.can(...)`.
6. **Errors map to toasts or inline fields.** Use `errorMessages` from `src/web/lib/api/errors.ts`.
7. **Offline is an explicit state.** Banners, disabled submit, and idempotent retries with the same key.
8. **PWA is Phase G, not Phase A.** Do not block feature development on service-worker details.
9. **Phase H only happens after all gates pass.** Old code is the safety net during development.

---

## Appendix: Backend Blockers & Owner Decisions

| Backend Need                                         | Required By | Action Owner      |
| ---------------------------------------------------- | ----------- | ----------------- |
| Refactor worker routes to use `src/shared/schemas/*` | Phase C     | Backend lead      |
| `GET /api/visits` (owner visit history)              | Phase F     | Backend lead      |
| `GET /api/reports` and `/api/reports/export.pdf`     | Phase E     | Backend lead      |
| Confirm retention / TTL for visit draft localStorage | Phase F     | Product owner     |
| PWA icon asset set (maskable, 192, 512)              | Phase G     | Design / frontend |
