# Konsi Frontend Architecture — Phase 2: Architecture Design

> **Scope:** complete rewrite of `src/web/` for the Konsi consignment-management SPA.  
> **Source of truth:** `PRD.md`, `API_CONTRACT.md`, the frontend/UX audits, and the OpenSpec inventory.  
> **Target device:** smartphone portrait first; owner/admin screens may use a desktop rail as an enhancement, but QA and acceptance criteria are measured on mobile.

---

## 0. Architectural stance (assumption on the route examples)

The user examples `/, /produk, /kategori, /keranjang, /checkout, /profil, /owner` look like a consumer-commerce route table. The existing project, backend contract, and PRD describe an **internal consignment/visit app** for owner + staff, not a customer-facing storefront.

This architecture therefore uses the **consignment domain vocabulary** (`/beranda`, `/kunjungan`, `/warung`, `/master`, `/pengaturan`, `/laporan`, `/pengguna`) while also mapping the requested URLs where they naturally fit (`/produk` → product master, `/profil` → current user profile, `/owner` → owner hub).  
`/kategori`, `/keranjang`, and `/checkout` are reserved for a future storefront module (no backend support today). They are listed explicitly in §4 so the route table remains extensible.

---

## 1. Technology stack decision

| Layer | Choice | Version / notes | Rationale |
|-------|--------|-----------------|-----------|
| Framework | **Svelte 5** | `^5.0.0` | Already the project standard. Runes (`$state`, `$derived`, `$effect`, `$props`) give us reactive, component-local state without the boilerplate of external stores. |
| Build tool | **Vite 6** | `^6.0.0` | Same as today. Handles HMR, TypeScript path aliases, and the PWA build plugin. |
| Language | **TypeScript 5.5** | strict, moduleResolution Bundler | Shared contracts between worker and web are compiled with the same TS options. |
| Styling | **Tailwind CSS v4** | `@tailwindcss/vite` | Keep the existing coffee/cream theme and `@theme` / `@utility` setup. v4 removes the need for a separate config file. |
| Routing | **svelte-spa-router** | `^5.1.1` | First-class Svelte 5 support, declarative route map, route params, lazy-loading wrappers, real `<a>` links via `use:link`, and a 404 fallback. Hash-based routing avoids server-side SPA-fallback edge cases with the Cloudflare Worker asset handler. |
| Server state | **TanStack Query for Svelte** | `@tanstack/svelte-query@^6` | Caching, deduplication, retries, invalidation, and optimistic updates out of the box. The visit flow and dashboard benefit enormously from automatic background refetch. |
| Headless primitives (optional) | **bits-ui** | `^2.18` | Svelte 5-compatible headless components for dialog/sheet/tabs/toast. We style them ourselves; we do not adopt a full component library. If the team prefers zero dependencies, these can be replaced by hand-rolled accessible primitives. |
| Icons | **lucide-svelte** | `^1.0` | Tree-shakeable, Svelte 5 compatible, replaces the hard-coded 7-icon `Icon.svelte`. |
| Maps | **Leaflet** | dynamic import | PRD requires OSM + draggable pin for outlet creation/correction. No Google SDK or heavy map framework. |
| PWA | **vite-plugin-pwa** | `^1.0` | Generates manifest, service worker, icon assets, and runtime caching strategy. Phase 6 only. |
| Utilities | `clsx` + `tailwind-merge` + `zod` | already used by worker | A single `cn()` helper for conditional classes; Zod becomes the single source of truth for request/response contracts (see §7). |

### What is intentionally not added
- **SvelteKit** — would force a full-stack adapter story and replace the Hono boundary the PRD wants to keep.
- **Redux / Zustand / Pinia** — Svelte 5 runes + TanStack Query cover all state needs.
- **Superforms** — no SvelteKit form actions, and the API is JSON-based; Zod validation is done with shared schemas.
- **Heavy date libraries** — all server timestamps are ISO strings; `Intl.DateTimeFormat` with `id-ID` locale is enough.

---

## 2. Directory structure (feature-based)

```
src/
  shared/                          # Contracts shared by worker + web
    schemas/                       # Zod request/response schemas
      auth.schema.ts
      user.schema.ts
      outlet.schema.ts
      product.schema.ts
      raw-material.schema.ts
      visit.schema.ts
      settings.schema.ts
      report.schema.ts
    types/                         # Plain TS types inferred from schemas
      api.types.ts
    lib/                           # Pure business helpers used on both ends
      units.ts                     # unit conversion for HPP
      money.ts                     # rupiah formatting / integer rules
      age.ts                       # age-hours and color coding
      id.ts                        # uuid/idempotency helpers

  web/
    main.ts
    App.svelte
    index.html
    app.css                        # Tailwind v4 theme tokens + utilities
    routes.ts                      # svelte-spa-router map

    lib/
      api/                         # Typed HTTP client + per-domain TanStack queries
        client.ts
        errors.ts
        query-client.ts
        query-keys.ts
        auth.api.ts
        dashboard.api.ts
        outlet.api.ts
        product.api.ts
        raw-material.api.ts
        visit.api.ts
        settings.api.ts
        users.api.ts
        reports.api.ts

      router/
        guards.svelte.ts           # auth + role guards
        lazy.ts                    # lazy-load wrappers for code splitting
        links.ts                   # helpers for active links

      stores/                      # Global Svelte 5 rune contexts
        auth.svelte.ts
        network.svelte.ts
        geolocation.svelte.ts
        toast.svelte.ts

      utils/
        cn.ts                      # clsx + tailwind-merge
        format.ts                  # date, rupiah, distance
        haptics.ts                 # navigator.vibrate wrapper
        local-storage.ts           # typed localStorage

    shared/                        # Design system
      ui/
        Button.svelte
        Input.svelte
        TextArea.svelte
        Select.svelte
        Card.svelte
        Sheet.svelte
        Dialog.svelte
        Tabs.svelte
        Toast.svelte
        NavItem.svelte
        Skeleton.svelte
        EmptyState.svelte
        ErrorState.svelte
        AgeBadge.svelte
        QtyStepper.svelte
      icons/
        Icon.svelte                # lucide-svelte wrapper, size/color props
      composables/
        PullToRefresh.svelte
        BottomSheet.svelte
        ConfirmDialog.svelte
      providers/
        QueryProvider.svelte
        ToastProvider.svelte

    features/
      auth/
        pages/LoginPage.svelte
        components/LoginForm.svelte
        api/auth.api.ts
        stores/auth.svelte.ts

      shell/
        pages/RootLayout.svelte
        components/AppShell.svelte
        components/TopBar.svelte
        components/BottomNav.svelte
        components/DesktopRail.svelte
        components/RouteGuard.svelte
        providers/QueryProvider.svelte
        providers/ToastProvider.svelte

      dashboard/
        pages/DashboardPage.svelte
        components/UrgencyCard.svelte
        components/SummaryCards.svelte
        api/dashboard.api.ts

      outlets/
        pages/OutletListPage.svelte
        pages/OutletDetailPage.svelte
        pages/OutletFormPage.svelte
        components/OutletCard.svelte
        components/MapPicker.svelte
        components/PhotoUploader.svelte
        components/GeoCaptureButton.svelte
        api/outlet.api.ts
        stores/outlet-filter.svelte.ts

      visits/
        pages/VisitListPage.svelte
        pages/VisitFormPage.svelte
        components/GeofenceStatus.svelte
        components/CyclePickupForm.svelte
        components/DropSheet.svelte
        components/VisitReviewSheet.svelte
        api/visit.api.ts
        stores/visit-draft.svelte.ts

      products/
        pages/ProductListPage.svelte
        pages/ProductDetailPage.svelte
        pages/ProductFormPage.svelte
        components/RecipeEditor.svelte
        components/HppDisplay.svelte
        api/product.api.ts

      raw-materials/
        pages/RawMaterialListPage.svelte
        pages/RawMaterialFormPage.svelte
        api/raw-material.api.ts

      master/
        pages/MasterPage.svelte
        components/MasterTabs.svelte

      settings/
        pages/SettingsPage.svelte
        components/RadiusForm.svelte
        api/settings.api.ts

      users/
        pages/UsersPage.svelte
        components/UserForm.svelte
        api/users.api.ts

      reports/
        pages/ReportsPage.svelte
        components/ReportFilters.svelte
        components/ReportPdfLink.svelte
        api/reports.api.ts

    public/
      favicon.svg
      icons/                         # PWA icons
      manifest.webmanifest           # generated by vite-plugin-pwa
```

### File naming conventions
- **Svelte files:** `PascalCase.svelte` for components and pages.
- **Page suffix:** `*Page.svelte` (e.g. `DashboardPage.svelte`, `VisitFormPage.svelte`) so route files are instantly recognizable.
- **API modules:** `[domain].api.ts` — each exports query options, mutation options, and raw request functions.
- **Rune stores:** `[name].svelte.ts` so TypeScript/Vite treats them as Svelte modules.
- **Utility modules:** `kebab-case.ts`.
- **Shared contracts:** `kebab-case.schema.ts` or `kebab-case.types.ts` under `src/shared/`.
- **No deep barrel files.** Re-exports are limited to the nearest `index.ts` inside a feature; cross-feature imports use explicit paths to avoid cyclic references.

---

## 3. Design system spec

### 3.1 Tokens (in `app.css` using `@theme`)

```css
@theme {
  /* brand palette */
  --color-milk: #f7f3eb;
  --color-cream: #fff8e7;
  --color-caramel: #c69c6d;
  --color-coffee-50: #efebe9;
  --color-coffee-100: #d7ccc8;
  --color-coffee-200: #bcaaa4;
  --color-coffee-300: #a1887f;
  --color-coffee-400: #8d6e63;
  --color-coffee-500: #795548;
  --color-coffee-600: #6d4c41;
  --color-coffee-700: #5d4037;
  --color-coffee-800: #4e342e;
  --color-coffee-900: #3e2723;
  --color-coffee-950: #2b1810;

  /* semantic status */
  --color-danger: #dc2626;      /* red-600 */
  --color-danger-bg: #fef2f2;
  --color-warning: #d97706;     /* amber-600 */
  --color-warning-bg: #fffbeb;
  --color-success: #16a34a;     /* green-600 */
  --color-success-bg: #f0fdf4;
  --color-info: #2563eb;        /* blue-600 */
  --color-info-bg: #eff6ff;

  /* section surfaces */
  --color-section-dashboard: #fff7ed;
  --color-section-visit: #fff0f5;
  --color-section-outlet: #f0fdf4;
  --color-section-master: #faf5ff;

  /* typography */
  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --text-base: 1rem;            /* 16px - prevents iOS zoom */
  --text-sm: 0.875rem;          /* 14px */
  --text-xs: 0.75rem;           /* 12px - captions only */

  /* spacing - 4pt grid */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;

  /* radii */
  --radius-sm: 0.375rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  /* shadows */
  --shadow-card: 0 1px 3px 0 rgb(62 39 35 / 0.08), 0 1px 2px -1px rgb(62 39 35 / 0.08);
  --shadow-float: 0 10px 15px -3px rgb(62 39 35 / 0.1), 0 4px 6px -4px rgb(62 39 35 / 0.1);
}
```

### 3.2 Primitives

#### Button
- Props: `variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'`  
  `size?: 'sm' | 'md' | 'lg'`  
  `fullWidth?: boolean`  
  `loading?: boolean`  
  `disabled?: boolean`  
  `type?: 'button' | 'submit'`  
  `onclick?: () => void`
- Minimum touch size: `min-h-11 min-w-11` (`44px`). Primary CTA on mobile is full-width, `min-h-14`.
- Loading state disables the button and replaces label with a spinner.
- Active feedback: `active:scale-[0.98]` + `transition-transform`.

#### Input / TextArea / Select
- Props: `label`, `error`, `helper`, `id`, `name`, `type`, `inputmode`, `autocomplete`, `placeholder`, `disabled`, `readonly`, `class`.
- Base font size MUST be `text-base` (`16px`) to avoid iOS zoom.
- Error text below the field in `text-sm text-danger`.
- Helper text below in `text-xs text-coffee-500`.

#### Card
- Props: `variant?: 'default' | 'dashboard' | 'visit' | 'outlet' | 'master' | 'product'`.
- All cards: `rounded-2xl border bg-cream shadow-card p-4`.
- Variants only change the tinted background/border from `app.css`.
- Slot-based: header, content, footer.

#### Sheet / Dialog
- Props: `open`, `title`, `description?`, `onClose`.
- **Mobile:** bottom sheet, 90% height, drag handle, swipe-down to close.
- **Desktop:** centered modal, max-width `md` (`448px`).
- `Dialog` is for confirmations/alerts; `Sheet` is for creation/edit flows.
- Built on `bits-ui` primitives for focus trapping and `Escape` handling; fully custom styling.

#### Tabs
- Props: `value`, `items: {id, label, href}[]`, `onChange`.
- Used for master sub-pages (`produk`, `bahan`, `warung`) and visit sub-steps.
- **Must be URL-persisted** so refresh and deep links work.

#### Nav (BottomNav)
- Props: `items: {label, icon, href}[]`, `activeHref`.
- Fixed to bottom with `pb-safe`.
- Each item is a real `<a>` with `aria-current="page"`.
- Active item uses filled icon + coffee-700 background pill.

#### Toast
- Position: top-center with `pt-safe`.
- Variants: success, error, warning, info.
- Duration: 4s; no auto-dismiss for errors with required actions.
- Toast IDs are unique; stacking limit of 3.

#### Loading, Empty, Error
- `Skeleton`: pulsing rounded block, configurable height/width.
- `PageSkeleton`: list of 5 skeleton cards.
- `EmptyState`: icon + title + description + optional CTA.
- `ErrorState`: icon + message + Retry button.

#### AgeBadge
- Props: `hours`, `color`.
- Encodes the PRD rule: ≥96h red, ≥72h amber, otherwise green.
- Includes icon + text so it is not color-only.

### 3.3 Typography scale

| Token | Size | Line height | Use |
|-------|------|-------------|-----|
| heading-xl | 1.5rem (24px) | 2rem | page titles |
| heading-lg | 1.25rem (20px) | 1.75rem | card titles, outlet names |
| heading-md | 1.125rem (18px) | 1.5rem | section headers |
| body | 1rem (16px) | 1.5rem | primary text, inputs |
| body-sm | 0.875rem (14px) | 1.375rem | secondary text, labels |
| caption | 0.75rem (12px) | 1.25rem | metadata, timestamps |

All body text and inputs are ≥16px to avoid iOS input zoom.

---

## 4. Routing table

`svelte-spa-router` route map:

```ts
// src/web/routes.ts
import { wrap } from 'svelte-spa-router/wrap';

export const routes = {
  // public
  '/login': wrap({ asyncComponent: () => import('./features/auth/pages/LoginPage.svelte') }),

  // main mobile shell
  '/': wrap({ asyncComponent: () => import('./features/dashboard/pages/DashboardPage.svelte') }),
  '/beranda': wrap({ asyncComponent: () => import('./features/dashboard/pages/DashboardPage.svelte') }),
  '/kunjungan': wrap({ asyncComponent: () => import('./features/visits/pages/VisitListPage.svelte') }),
  '/kunjungan/:outletId': wrap({ asyncComponent: () => import('./features/visits/pages/VisitFormPage.svelte') }),
  '/warung': wrap({ asyncComponent: () => import('./features/outlets/pages/OutletListPage.svelte') }),
  '/warung/baru': wrap({ asyncComponent: () => import('./features/outlets/pages/OutletFormPage.svelte') }),
  '/warung/:id': wrap({ asyncComponent: () => import('./features/outlets/pages/OutletDetailPage.svelte') }),
  '/warung/:id/edit': wrap({ asyncComponent: () => import('./features/outlets/pages/OutletFormPage.svelte') }),

  // product shortcut + detail
  '/produk': wrap({ asyncComponent: () => import('./features/products/pages/ProductListPage.svelte') }),
  '/produk/:id': wrap({ asyncComponent: () => import('./features/products/pages/ProductDetailPage.svelte') }),

  // master section (URL-persisted tabs)
  '/master': wrap({ asyncComponent: () => import('./features/master/pages/MasterPage.svelte') }),
  '/master/produk': wrap({ asyncComponent: () => import('./features/products/pages/ProductListPage.svelte') }),
  '/master/produk/baru': wrap({ asyncComponent: () => import('./features/products/pages/ProductFormPage.svelte') }),
  '/master/produk/:id/edit': wrap({ asyncComponent: () => import('./features/products/pages/ProductFormPage.svelte') }),
  '/master/bahan': wrap({ asyncComponent: () => import('./features/raw-materials/pages/RawMaterialListPage.svelte') }),
  '/master/bahan/baru': wrap({ asyncComponent: () => import('./features/raw-materials/pages/RawMaterialFormPage.svelte') }),
  '/master/bahan/:id/edit': wrap({ asyncComponent: () => import('./features/raw-materials/pages/RawMaterialFormPage.svelte') }),
  '/master/warung': wrap({ asyncComponent: () => import('./features/outlets/pages/OutletListPage.svelte') }),

  // profile + owner hub
  '/profil': wrap({ asyncComponent: () => import('./features/auth/pages/ProfilePage.svelte') }),
  '/owner': wrap({ asyncComponent: () => import('./features/reports/pages/OwnerHubPage.svelte') }),

  // admin (owner-only)
  '/pengguna': wrap({ asyncComponent: () => import('./features/users/pages/UsersPage.svelte') }),
  '/pengaturan': wrap({ asyncComponent: () => import('./features/settings/pages/SettingsPage.svelte') }),
  '/laporan': wrap({ asyncComponent: () => import('./features/reports/pages/ReportsPage.svelte') }),

  // not found
  '*': wrap({ asyncComponent: () => import('./features/shell/pages/NotFoundPage.svelte') }),
};
```

### Logical route groups

| Group | URL pattern | Auth | Layout | Notes |
|-------|-------------|------|--------|-------|
| `(public)` | `/login` | none | centered card | Redirect authenticated users to `/beranda`. |
| `(main)` | `/`, `/beranda`, `/kunjungan`, `/warung`, `/master/*`, `/profil` | staff or owner | mobile shell with bottom nav | Daily field flow. |
| `(visit)` | `/kunjungan/:outletId` | staff or owner | full-height shell; bottom nav hidden | Page needs max vertical space for geofence + cycles + drops + submit. |
| `(owner)` | `/owner`, `/pengguna`, `/pengaturan`, `/laporan` | owner only | desktop rail on `lg`; mobile uses main shell | Owner-only admin/reporting. |
| `(future-storefront)` | `/kategori`, `/keranjang`, `/checkout` | TBD | TBD | **Reserved** — backend has no categories, cart, or orders. |

### Navigation conventions
- Every navigation element is a real `<a>` with `use:link` from `svelte-spa-router` so users get link previews, focus, and keyboard Enter.
- Active state uses `use:active` or computed `aria-current="page"`.
- `RouteGuard` runs *before* rendering the target page to avoid the content-flash the current `App.svelte` has.

---

## 5. Layout strategy

### 5.1 Viewport & safe areas

`index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#5d4037">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Konsi">
```

CSS utilities for safe areas:
```css
.pt-safe { padding-top: env(safe-area-inset-top, 0px); }
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
.px-safe { padding-left: env(safe-area-inset-left, 0px); padding-right: env(safe-area-inset-right, 0px); }
.min-h-dvh { min-height: 100dvh; }
```

### 5.2 Mobile shell

```
┌──────────────────────────────┐
│ TopBar (safe-area-inset-top) │   height: 64px incl. safe area
├──────────────────────────────┤
│                              │
│   Scrollable main content    │   padding-bottom accommodates bottom nav + safe area
│                              │
│                              │
└──────────────────────────────┘
│  BottomNav (+ safe-area)     │   floating pill, max-w-md, centered
└──────────────────────────────┘
```
- The shell never uses a desktop sidebar on phones. The max width is still constrained to `max-w-md` for readability, but the **background extends edge-to-edge** so it feels app-like, not a centered website box.

### 5.3 Desktop owner layout

At `lg` (≥1024px) on owner/admin routes, the bottom nav is replaced by a fixed **240px left rail**:
- Beranda, Kunjungan, Warung, Master, Laporan, Pengguna, Pengaturan, Profil.
- Main content becomes a wider card surface with actual tables (still constrained to `max-w-5xl`).
- This satisfies “desktop layout for owner” without making the field UI desktop-first.

### 5.4 Visit page layout

`/kunjungan/:outletId` uses a full-height flex column:
1. Sticky geofence status card (safe area top).
2. Scrollable body: open-cycle pickup cards, drop section.
3. Sticky footer with review/submit button and offline banner.

The submit button is **not** `fixed bottom-5` (which is overlapped by the keyboard); it lives inside the scrollable flex layout and uses `scroll-padding-bottom`.

### 5.5 Keyboard handling
- All inputs use `font-size: 16px` minimum.
- Numeric quantity inputs use `inputmode="numeric"`.
- The primary action is always visible without scrolling to the absolute bottom; use `padding-bottom` equal to estimated on-screen keyboard height or rely on native browser `100dvh` resizing.

---

## 6. State management strategy

### 6.1 Global client state (Svelte 5 context/runes)

| Context | Responsibility |
|---------|----------------|
| `AuthContext` | current user, role, login/logout, `isReady`, `can(capability)` helper. |
| `NetworkContext` | `online`, `effectiveType`, offline banner state. |
| `GeolocationContext` | current coords, accuracy, watch state, `distanceTo(outlet)`. |
| `ToastContext` | global toast queue and helpers. |

All contexts are set in `App.svelte` and consumed with Svelte `getContext` or by importing a singleton `.svelte.ts` module. Runes make these reactive without `writable` stores.

### 6.2 Server state (TanStack Query)

Default `queryClient` config:
```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Do not retry auth/validation/conflict errors
        if (error instanceof ApiError) {
          return ![400, 401, 403, 409].includes(error.status) && failureCount < 1;
        }
        return false;
      },
    },
  },
});
```

Key query-key hierarchy:
```ts
export const queryKeys = {
  auth: { me: ['auth', 'me'] },
  dashboard: ['dashboard'],
  outlets: { all: ['outlets'], detail: (id: string) => ['outlets', id] },
  products: { all: ['products'], detail: (id: string) => ['products', id], picker: ['products', 'picker'] },
  rawMaterials: { all: ['raw-materials'] },
  settings: ['settings'],
  users: ['users'],
  reports: (filters: ReportFilters) => ['reports', filters],
  visitPrep: (outletId: string) => ['visit-prep', outletId],
};
```

Invalidation rules:
- Outlet created/edited/deleted → invalidate `outlets`, `dashboard`.
- Product or material mutation → invalidate `products`/`raw-materials`, `dashboard`.
- Visit submitted or voided → invalidate `dashboard`, `visitPrep`, `outlets`.
- Settings changed → invalidate `settings`.

### 6.3 Feature-local state

#### Visit builder
The visit form is the most complex client state. Encapsulate it in `features/visits/stores/visit-draft.svelte.ts`:

```ts
export function createVisitDraft(outletId: string) {
  let pickups = $state<Record<string, PickupInput>>({});
  let drops = $state<DropInput[]>([]);
  let overrideReason = $state('');
  let notes = $state('');
  const idempotencyKey = generateIdempotencyKey();

  // derived validation
  const isEquationValid = $derived(/* sum per cycle check */);
  const isReadyToSubmit = $derived(isEquationValid && isOnline && gpsReady);

  // persistence
  function save() { localStorage.setItem(storageKey, JSON.stringify(snap())); }
  function load() { /* hydrate from localStorage */ }
  function clear() { localStorage.removeItem(storageKey); }

  return {
    get pickups() { return pickups; },
    get drops() { return drops; },
    get idempotencyKey() { return idempotencyKey; },
    get isReadyToSubmit() { return isReadyToSubmit; },
    /* actions */
  };
}
```

- One draft per outlet. Key: `konsi_draft_<outletId>`.
- TTL 7 days; stale drafts are discarded.
- Equation validation is computed in `$derived` and displayed per cycle.

#### Filters and reports
- Master product list search filter: local `$state` only.
- Report filters: local `$state` + URL query params so refresh preserves the filter.

### 6.4 What is NOT kept in global state
- Business entity lists (dashboard, outlets, products): TanStack Query.
- Modal open/closed state: local component state or URL params for shareable overlays.
- Form dirty state: page-local runes.

---

## 7. API client architecture

### 7.1 Shared contracts

Move all request/response schemas to `src/shared/schemas/*` using Zod. Example:

```ts
// src/shared/schemas/outlet.schema.ts
import { z } from 'zod';

export const outletStatus = z.enum(['active', 'inactive']);

export const createOutletSchema = z.object({
  name: z.string().min(1, 'Nama warung wajib diisi'),
  address: z.string().min(1, 'Alamat wajib diisi'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  notes: z.string().optional(),
  status: outletStatus.optional(),
});

export type CreateOutletInput = z.infer<typeof createOutletSchema>;
```

The worker imports these schemas for route validation, eliminating duplicated types and ensuring the web and API stay in sync.

### 7.2 Typed HTTP client

```ts
// src/web/lib/api/client.ts
class ApiClient {
  async request<T>(
    method: string,
    path: string,
    options: { body?: unknown; schema?: z.ZodType<T>; asFormData?: boolean } = {}
  ): Promise<T> {
    const res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: options.asFormData ? undefined : { 'Content-Type': 'application/json' },
      body: options.asFormData
        ? (options.body as FormData)
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
    });

    if (!res.ok) throw await this.parseError(res);
    if (res.status === 204) return undefined as T;
    const data = await res.json();
    return options.schema ? options.schema.parse(data) : (data as T);
  }
  // ...
}

export const api = new ApiClient();
```

### 7.3 Error mapping

```ts
// src/web/lib/api/errors.ts
export const errorMessages: Record<string, string> = {
  AUTH_REQUIRED: 'Sesi Anda habis. Silakan masuk kembali.',
  FORBIDDEN: 'Anda tidak punya izin untuk ini.',
  VALIDATION_ERROR: 'Data tidak valid. Periksa kembali isian Anda.',
  CONFLICT: 'Data sudah berubah atau sudah diproses. Muat ulang dan coba lagi.',
  GEOFENCE_ERROR: 'Anda di luar radius kunjungan.',
  NOT_FOUND: 'Data tidak ditemukan.',
  CONFIG_ERROR: 'Terjadi kesalahan server. Hubungi owner.',
  INTERNAL_ERROR: 'Terjadi kesalahan. Coba lagi sebentar.',
};
```

On `AUTH_REQUIRED`, the `QueryProvider` wrapper globally navigates to `/login` and clears the user context. All other errors become toasts or inline field errors depending on `status`.

### 7.4 Per-domain API modules

Each domain exports three things:
1. Raw request helpers (`fetch...`).
2. `create...QueryOptions()` factories for `createQuery` / `createInfiniteQuery`.
3. `create...Mutation()` for `createMutation`.

Example:
```ts
// src/web/features/outlets/api/outlet.api.ts
import { api } from '$lib/api/client.js';
import { createOutletSchema, type CreateOutletInput } from '@shared/schemas/outlet.schema.js';

export function fetchOutlets() {
  return api.request('GET', '/outlets/', { schema: outletListSchema });
}

export function updateOutlet(id: string, body: Partial<CreateOutletInput>) {
  return api.request('PATCH', `/outlets/${id}`, { body, schema: outletSchema });
}

export const outletsQueryOptions = () =>
  queryOptions({ queryKey: queryKeys.outlets.all, queryFn: fetchOutlets });

export const updateOutletMutation = () => {
  const qc = useQueryClient();
  return createMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateOutletInput> }) =>
      updateOutlet(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.outlets.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
};
```

### 7.5 Media

Photos are displayed with `src="/api/media/{photoKey}"` and `fetch` credentials included (the endpoint requires an active session). The `PhotoUploader` component does client-side resizing/compression then posts `FormData` to `/api/outlets/:id/photo`.

---

## 8. Feature module breakdown

| Feature | Responsibility | Key files |
|---------|----------------|-----------|
| `auth` | login, logout, profile, auth guard | `LoginPage.svelte`, `auth.svelte.ts`, `auth.api.ts` |
| `shell` | app providers, layouts, bottom nav, desktop rail, guards, not found | `AppShell.svelte`, `BottomNav.svelte`, `DesktopRail.svelte`, `RouteGuard.svelte`, `QueryProvider.svelte`, `ToastProvider.svelte` |
| `dashboard` | urgency list, summary cards, age badges, open Maps action | `DashboardPage.svelte`, `UrgencyCard.svelte`, `dashboard.api.ts` |
| `outlets` | outlet CRUD, detail, map picker, photo upload, GPS capture | `OutletListPage.svelte`, `OutletDetailPage.svelte`, `OutletFormPage.svelte`, `MapPicker.svelte`, `PhotoUploader.svelte`, `outlet.api.ts` |
| `visits` | outlet picker, visit builder, geofence UI, cycle pickup, drop sheet, review/submit, offline draft, void trigger | `VisitListPage.svelte`, `VisitFormPage.svelte`, `GeofenceStatus.svelte`, `CyclePickupForm.svelte`, `DropSheet.svelte`, `visit-draft.svelte.ts`, `visit.api.ts` |
| `products` | product CRUD, recipe editor, HPP display, role-aware fields | `ProductListPage.svelte`, `ProductFormPage.svelte`, `RecipeEditor.svelte`, `product.api.ts` |
| `raw-materials` | BOM ingredient CRUD | `RawMaterialListPage.svelte`, `RawMaterialFormPage.svelte`, `raw-material.api.ts` |
| `master` | tab shell that composes product / raw-material / outlet lists | `MasterPage.svelte`, `MasterTabs.svelte` |
| `settings` | geofence radius form | `SettingsPage.svelte`, `RadiusForm.svelte`, `settings.api.ts` |
| `users` | owner user management | `UsersPage.svelte`, `UserForm.svelte`, `users.api.ts` |
| `reports` | owner reports, filters, PDF export link, owner hub landing | `ReportsPage.svelte`, `OwnerHubPage.svelte`, `report-filters.svelte.ts`, `reports.api.ts` |

**Cross-feature rules:**
- A feature may import from `src/web/shared/*` and from common `src/web/lib/*`.
- A feature may import from another feature only through its **public API** (its `api/*.api.ts` and well-defined type exports). UI components are not imported across feature boundaries.
- All backend-facing types come from `src/shared/*`.

---

## 9. Native-mobile UX spec

### 9.1 Touch targets
- Minimum `44×44dp` on every tappable element (`min-h-11 min-w-11`).
- Primary action buttons are full-width, `min-h-14`.
- Adjacent icon buttons have at least `8px` gap.
- No hover-only interactions; use `active:` states and `transition-transform active:scale-[0.98]`.

### 9.2 Navigation & transitions
- All tabs use real `<a>` links.
- Page transitions use Svelte `fade`/`slide` with `prefers-reduced-motion` guard.
- Route guards run before render; unauthorized access shows a loading state then redirects.

### 9.3 Sheets and overlays
- Creation/editing on mobile opens a bottom sheet.
- Confirmations (delete, void) use a centered alert dialog.
- Sheets can be dismissed by backdrop tap, swipe-down, or a visible close handle.
- URL-persist master tabs so `/master/produk` is deep-linkable and survives refresh.

### 9.4 Pull-to-refresh
- A `PullToRefresh` wrapper on list pages triggers `queryClient.refetchQueries()` on overscroll.
- If offline, the gesture shows an offline chip instead of spinning forever.

### 9.5 Optimistic UI and skeletons
- Lists show `PageSkeleton` on first load.
- After mutation, TanStack Query `onMutate` updates the cache immediately; rollback on error.
- Submit buttons show a spinner and disable while the mutation is pending.
- Error boundaries per feature route show `ErrorState` with a Retry CTA.

### 9.6 Toasts
- Success: green, 4s.
- Error: red, persistent until dismissed if action is required.
- Warning: amber, used for geofence accuracy warnings or offline state.
- Network status is also shown as a thin top banner, not a toast.

### 9.7 Network & offline
- Use `navigator.onLine` + the `NetworkContext`.
- Offline banner: “Tidak ada jaringan. Draft kunjungan tersimpan di HP.”
- Submit buttons are disabled when offline.
- Retry re-uses the same `idempotency_key` (replay-safe).

### 9.8 GPS / geofence UI
The visit form always shows a sticky geofence card with:
- outlet name and target pin,
- active radius (`geofence_radius_m`),
- current GPS coordinate + accuracy,
- computed distance in meters,
- badge: “Dalam radius” / “Di luar radius” / “GPS belum siap”.
- manual refresh button.
- For owner: disclosure to override with reason.
- For staff: override is hidden (server will reject anyway).

### 9.9 Photo capture
- `<input type="file" accept="image/*" capture="environment">` opens the camera on mobile.
- Compression before upload: max edge 1600px, quality 0.8 JPEG/WebP, target ≤~500 KB.
- Upload progress shown as a linear progress bar.
- After upload, optionally update outlet coordinates from the same GPS reading.

### 9.10 PWA (Phase 6)
- `vite-plugin-pwa` generates `manifest.webmanifest`:
  - `name: Konsi`, `short_name: Konsi`, `theme_color: #5d4037`, `background_color: #f7f3eb`, `display: standalone`, `orientation: portrait`.
- Runtime caching: `CacheFirst` for `/api/media/*`, `NetworkFirst` for `/api/*`, precache shell.
- App still cannot submit offline; the SW only enables app-shell and draft access.

### 9.11 Accessibility
- Touch targets have visible focus rings.
- Color-coded status uses both color and text/icon.
- Form errors linked with `aria-describedby`.
- Live regions for geofence status and toast queue.
- Respect `prefers-reduced-motion`.

---

## 10. Migration / implementation phases

### Phase 0 — Foundation (1 week)
**Goal:** new project skeleton compiles and the auth loop works.

- Add dependencies: `svelte-spa-router`, `@tanstack/svelte-query`, `bits-ui`, `lucide-svelte`, `vite-plugin-pwa`, `clsx`, `tailwind-merge`.
- Set up `src/shared/schemas/` with copied/centralized Zod schemas.
- Wire `@shared` alias if needed.
- Build design tokens, `cn()` helper, primitive components, `Icon.svelte`, `ToastProvider`, `QueryProvider`.
- Implement `routes.ts`, `AppShell`, `BottomNav`, `DesktopRail`, `RouteGuard`.
- Rewrite `LoginPage` with shared auth schema.
- Port auth API to `auth.api.ts` and `auth.svelte.ts`.

**Gate 0:** `pnpm check` passes, login/logout works, tabs navigate on a real phone without horizontal scroll.

### Phase 1 — Dashboard + Outlets (1.5 weeks)
**Goal:** field staff can see urgency and manage warung with GPS + photo.

- `DashboardPage`, `UrgencyCard`, `AgeBadge`.
- `OutletListPage`, `OutletDetailPage`, `OutletFormPage`.
- `MapPicker` with Leaflet + draggable pin.
- `PhotoUploader` with client compression.
- `GeoCaptureButton` integrated into outlet create/edit.

**Gate 1:** Add an outlet with GPS and photo on a real phone; dashboard shows correct urgency colors and sort order.

### Phase 2 — Products + Raw Materials + HPP (1.5 weeks)
**Goal:** master data is role-aware and HPP computes correctly.

- `ProductListPage`, `ProductFormPage`, `RecipeEditor`, `HppDisplay`.
- `RawMaterialListPage`, `RawMaterialFormPage`.
- Role-aware rendering: hide `price_to_outlet`, `hpp`, recipe lines from staff.
- Use shared schemas for create/update validation.

**Gate 2:** Owner edits a material price and product HPP recalculates; staff network tab does not expose financial fields.

### Phase 3 — Visit Flow (2 weeks)
**Goal:** the most critical user journey is fluid and correct on a phone.

- `VisitListPage` outlet picker.
- `VisitFormPage` with `CyclePickupForm`, `DropSheet`, `VisitReviewSheet`.
- `GeofenceStatus` live card.
- `visit-draft.svelte.ts` with localStorage persistence and idempotency key.
- Visit submit with optimistic dashboard invalidation.
- Owner void from a visit history list (requires backend endpoint `GET /api/visits`, otherwise add it before this phase).

**Gate 3:** Visit submit + geofence + override works on a real phone; double-submit does not double-write; visit equation errors reject before sending; drafts survive page refresh.

### Phase 4 — Settings + Users (1 week)
**Goal:** owner controls and multi-user support.

- `SettingsPage`, `RadiusForm`.
- `UsersPage`, `UserForm`, reset-password flow.
- `OwnerHubPage` as admin landing.

**Gate 4:** Owner can change radius and add a staff user; staff cannot access settings or users.

### Phase 5 — Reports (1 week, backend-dependent)
**Goal:** owner can view and export period reports.

- `ReportsPage`, `ReportFilters`, `ReportPdfLink`.
- Front-end PDF display via `/api/reports/export.pdf` or `Blob` download.

**Gate 5:** Report period and per-petugas filter produces a PDF; voided visits are excluded.

### Phase 6 — PWA, Polish, Tests (1 week)
**Goal:** app feels native and is maintainable.

- Configure `vite-plugin-pwa`, icons, manifest.
- Add pull-to-refresh, haptic feedback, reduced-motion support.
- Unit tests for `visit-draft`, `age.ts`, `units.ts`, geofence math.
- Component tests for `AgeBadge`, `QtyStepper`, `GeofenceStatus` with `@testing-library/svelte`.
- Playwright mobile E2E for login → outlet → visit → submit.

**Gate 6:** Lighthouse PWA score ≥90, core flows pass E2E on mobile viewport.

---

## Appendix A — API gaps to address with the backend owner

The rewrite can proceed as a pure front-end change, but the following product/UX features need small backend additions:

1. **Visit history / void entry point** — the API contract has `POST /api/visits/:idempotencyKey/void` but no list/detail endpoint. Add `GET /api/visits` (owner) returning submissions with outlet/user metadata.
2. **Reports endpoint** — `PRD.md` describes `/api/reports` and `/api/reports/export.pdf`, but no route currently exists. Implement before Phase 5.
3. **Shared Zod schemas** — worker routes should import from `src/shared/schemas/*` instead of redeclaring inline schemas, eliminating duplicated types.

---

## Appendix B — Technology decision log

| # | Decision | Rationale | Trade-off |
|---|----------|-----------|-----------|
| 1 | Keep Svelte 5 + Vite | Already in use; runes are ideal for this form-heavy mobile app. | Vendor lock-in to Svelte ecosystem. |
| 2 | svelte-spa-router | Svelte 5 compatible, lazy load, real `<a>` links, fallback route. | Hash-based URLs; acceptable for internal app. |
| 3 | TanStack Query | Solves cache invalidation, retries, optimistic updates for visit/dashboard. | Adds bundle size; needs Svelte adapter. |
| 4 | bits-ui primitives | Avoids hand-rolling accessible focus traps for sheet/dialog. | Small dependency; theming needed. |
| 5 | lucide-svelte | Scalable icon set; tree-shakeable. | Hard-coded SVG sprite is slightly lighter; icons are not brand-critical. |
| 6 | Feature folders | Matches PRD domain boundaries; easier onboarding than flat `pages/` + `lib/`. | Slightly more files. |
| 7 | Shared schemas | Single source of truth for worker+web types. | Worker route files need import refactor. |

---

*Document status:* Architecture baseline for Phase 2.  
*Next step:* review with the team, lock the route table, then begin Phase 0 implementation.
