---
title: UX Debt Audit — Phase 1 Discovery
note_type: Task
status: active
phase: 'Phase 1: Audit & Discovery'
label: ux-debt-audit
created: 2026-07-24
current_step: discovery-complete
permalink: konsinyasi/tasks/ux-debt-audit
---

# UX Debt Audit — Phase 1 Discovery

Project: `konsinyasi` frontend (`src/web/**`)
Goal: identify why the current Svelte 5 + Tailwind 4 UI does not feel like a native mobile app and catalog navigation, interaction, state, performance, and accessibility debt.

## Top-line verdict

The frontend is a mobile-width web app wrapped in a coffee/cream visual theme, not a mobile-native experience. It lacks PWA shell, native navigation gestures, safe-area anchored chrome, consistent loading/empty/error patterns, a component library, and critical accessibility affordances. The `VisitForm` also receives an undefined `user` prop from `App.svelte`, which is a runtime/UX blocker.

## 1. Why it does not feel native

- No PWA manifest / service worker / `standalone` display mode.
- No `theme-color` or viewport-fit / `apple-mobile-web-app-*` meta tags in `src/web/index.html`.
- Layout is centered `max-w-md` with floating topbar/bottom nav instead of edge-to-edge viewport (`src/web/App.svelte`).
- Browser chrome remains visible; no stand-alone app chrome.
- Inputs use `text-sm` (≈14px), which triggers iOS zoom on focus (`src/web/pages/Login.svelte`, `src/web/pages/OutletList.svelte`, etc.).
- Hover states dominate (`btn:hover`, `hover:underline`) while touch feedback is inconsistent (`active:scale` on some elements only).
- No haptics, no swipe gestures, no pull-to-refresh, no page-transition directionality.
- Fixed submit button in `VisitForm` can be overlapped by the on-screen keyboard (`src/web/pages/VisitForm.svelte`).

## 2. State vs URL navigation

- Routes live in `src/web/lib/router.ts` (history API + Svelte store). Deep links exist (`/kunjungan/:outletId`).
- `App.svelte` guards routes in reactive effects; redirects lost sessions to `/login`.
- Master sub-tabs (`produk`, `bahan`, `warung`) are pure component state in `MasterPage.svelte` — refreshing loses the selected tab and no sub-URL can be shared.
- Modal overlays (create/edit/delete) are local `mode` state in list pages; URL does not reflect overlay state, so back button and shareability are broken.
- Navigation uses programmatic `navigate()` on `<button>` elements; no `<a href>` semantics, no focus/keyboard shortcut behavior, no `aria-current`.

## 3. Touch target & mobile interaction problems

- Many action buttons are well below the 44×44dp/px recommendation:
  - `OutletList.svelte`: Edit/Hapus/Kunjungan `px-2.5 py-1.5 text-xs`.
  - `VisitForm.svelte`: ± stepper buttons `px-2 py-1 text-sm`.
  - Master pages: “+ Tambah”, “Hapus bahan” `px-2 py-1 text-xs`.
- Text-only back link `← Kembali` and underline-only triggers have tiny hit areas.
- Topbar icon-only “Pengguna” / “Keluar” buttons rely on `aria-label` but the icon itself is only 16×16px.
- No tap-outside-to-close, drag-to-dismiss, or swipe-back on modals/sheets.
- No pull-to-refresh or momentum-scroll tuning (`overscroll-behavior`).
- `active:scale` feedback exists only on some buttons/cards; many list items have no active state.

## 4. Loading, empty, error state patterns

- Loading states are inconsistent:
  - `Dashboard.svelte` and `VisitList.svelte` show a spinner + text.
  - `OutletList.svelte`, `ProductList.svelte`, `RawMaterialList.svelte`, `VisitForm.svelte` show plain “Memuat…” text.
- No skeleton placeholders; content jumps when data arrives.
- Empty states exist on each page but use different border colors (green, amber, coffee, dashed variants) and inconsistent actions.
- Error display is inconsistent:
  - Errors hidden when `mode !== 'list'` in `OutletList.svelte` and `ProductList.svelte`.
  - Validation errors reuse a single top banner rather than per-field messages.
  - Delete confirmation does not surface its own error state clearly.
- `MasterPage.svelte` has no list-level loading/error skeleton at all.
- Success toast in `VisitForm` is inline and relies on `setTimeout` for navigation.

## 5. Navigation model

- Bottom tab bar: Beranda, Kunjungan, Warung, Master (`App.svelte`).
- “Pengguna” and “Pengaturan” are topbar links, not tabs (`App.svelte`, `role.ts`).
- `MasterPage.svelte` has an internal segmented control but it is not URL-backed.
- No native stack: `VisitForm` replaces the view with a text back link; no push/pop transition or gesture.
- Modal choices are mixed: create/edit use bottom sheets, delete uses a centered alert.
- No consistent layering/z-index system; overlays share `z-20` across pages.
- No unsaved-changes guard when closing modals or navigating away from `VisitForm`.

## 6. Design system / duplicate UI components

- Good: color/theme tokens and utility classes live in `src/web/app.css` (`@theme`, `btn`, `card-*`).
- Bad: no reusable components. Every page repeats:
  - Page header (`h1` + subtitle).
  - Toolbar with title + “+ Tambah”.
  - Error banner markup.
  - Empty state markup.
  - Modal/bottom-sheet shell.
  - Delete confirmation dialog.
  - Form label/input/select/textarea classes.
- `Icon.svelte` is hand-coded SVGs; scaling requires editing code.
- Missing: `Button`, `Input`, `Select`, `Modal`, `BottomSheet`, `EmptyState`, `PageShell`, `ListItem`, `ErrorAlert`, `Spinner`.

## 7. Performance concerns for mobile

- No code splitting / lazy route loading; all pages are eagerly imported in `App.svelte`.
- No service worker / runtime caching strategy.
- No prefetch of tab content; each tab fetches on mount.
- No list virtualization; long outlet/product/material lists render all DOM nodes.
- `App.svelte`, `MasterPage.svelte`, and individual pages each call `getCurrentUser()`, causing redundant `/api/auth/me` lookups on app startup.
- `VisitForm` saves the draft to `localStorage` on every state change via `$effect` (unthrottled).
- `watchGps` runs continuous high-accuracy geolocation watch (`enableHighAccuracy: true`, 10s maxAge, 30s timeout) without throttling or pause-on-background; battery impact likely.
- Photo compression is fixed to JPEG; no WebP option.
- Tailwind custom scrollbar styling may affect perceived scroll performance on low-end devices.

## 8. Accessibility issues

- Bottom tab buttons are inside `<nav>` but lack `aria-current="page"`; screen readers cannot tell which tab is active.
- Master segmented tabs have no `role="tablist"` / `role="tab"` / `aria-selected`.
- Modals are missing `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, and focus return.
- Form error messages are not linked to fields via `aria-describedby` / `aria-invalid`.
- The file input in `OutletList.svelte` has no accessible label.
- Only a few icon-only controls have `aria-label` (`App.svelte`); many small icon/text buttons rely on visible text only.
- No skip link, no focus-visible handling on touch, no reduced-motion support.
- Low text-size paragraphs (`text-[10px]`, `text-xs`) can hurt low-vision users on small screens.

## Critical bug found

- `App.svelte` renders `<VisitForm outletId={currentRoute.outletId} />` but does **not** pass the required `user` prop. `VisitForm.svelte` reads `user.role`, so owner override logic and form validation against role will break at runtime.

## Suggested next steps

1. Add PWA manifest, service worker, and mobile meta tags; lock font-size to 16px on inputs.
2. Introduce a small component library: `Button`, `Input`, `Field`, `Modal`, `BottomSheet`, `EmptyState`, `ErrorAlert`, `Spinner`, `PageShell`.
3. Move modal states and master sub-tabs into the URL (`/master/:section`, `?action=create|edit|delete`).
4. Replace tiny buttons with minimum 44×44 touch targets; add `touch-manipulation`, increase input font sizes, and use bottom-sheet drag-to-dismiss.
5. Standardize loading (skeleton), empty, and error patterns across all pages.
6. Add route-level code splitting and fetch `getCurrentUser()` once via context.
7. Add ARIA roles/labels and focus management to tabs, dialogs, and icon-only buttons.
