# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Konsi serves two internal user groups in one bottled-coffee consignment business:

- **Owner:** oversees outlet urgency, field operations, master data, users, geofence settings, financial reports, and visit corrections.
- **Field staff:** works from a smartphone while traveling between warungs, prioritizes visits, records pickups and new stock drops, updates outlet information, and collects the server-calculated amount due without seeing sensitive cost or margin data.

The critical usage context is in the field on smartphone browsers or the installed PWA, primarily in portrait viewports around 360–430 px.

## Product Purpose

Konsi is an internal web application for running bottled-coffee consignment operations across neighborhood warungs. It helps the team know which outlets need attention, complete pickup-and-drop visits accurately, maintain outlet and product records, and preserve trustworthy operational and financial history.

Success means a user can complete the full visit workflow quickly from one phone, with current stock urgency, location validation, role-appropriate information, and no duplicate or internally inconsistent submissions.

## Positioning

Konsi organizes work around the actual age of each consignment stock cycle rather than a fixed visit schedule. A single visit closes every open cycle for an outlet and can open new drops atomically, while preserving historical price and cost snapshots. GPS geofencing, idempotent submission, and role-aware financial access make that workflow auditable without turning it into a general inventory or cash-reconciliation system.

## Operating Context

- Visits happen on flexible routes every few days rather than on a uniform schedule.
- Bottles must be withdrawn once they reach four days (96 hours) from their recorded drop time.
- Users need to see outlet urgency, directions, stock age, quantities, and location status while standing at or traveling to a warung.
- The visit flow combines pickup, sold/returned quantity reconciliation, amount-due review, and optional new stock drop in one submission.
- Connectivity can be unreliable. Visit input may be saved locally as a draft, but final submission requires an online connection and valid device location.
- Outlet coordinates and storefront photos are captured and maintained through the web interface.
- The owner performs administrative and financial work in the same web application; larger layouts may enhance those screens, but smartphone operation remains the primary acceptance context.

## Capabilities and Constraints

- The Impeccable product scope is the Svelte web/PWA under `src/web/`. The Flutter application under `mobile/` is explicitly excluded.
- The UI language is Bahasa Indonesia. Source code, API contracts, and developer-facing identifiers use English.
- The web client is a Svelte 5 and TypeScript SPA built with Vite and Tailwind CSS v4.
- The web client uses the existing Hono API and shared Zod contracts, deployed with static assets in one Cloudflare Worker backed by D1 and R2.
- Core web capabilities include authentication, role-aware dashboards, outlet management, GPS and map handling, visit pickup/drop submission, local visit drafts, product and raw-material management, user and geofence settings, reports, analytics, and PDF export where supported.
- Stock urgency is based on elapsed time: under 72 hours is safe, 72–96 hours is approaching the limit, and 96 hours or more requires withdrawal.
- Every final visit submission must be online, idempotent, reconcile all quantities, include valid GPS data, and satisfy the configured geofence unless an owner supplies an audited override reason.
- Owner and staff access must remain distinct. Server-side authorization is authoritative; hiding UI alone is never considered access control.
- Sensitive product cost, margin, user management, reporting, geofence override, and visit-void capabilities are owner-only.
- Money is represented as integer rupiah, and historical visits retain price and cost snapshots.
- The product is for one business with multiple users, not a public registration flow or multi-tenant SaaS.
- Full warehouse inventory, payment processing, and physical cash reconciliation are outside the current product scope.

## Brand Commitments

- The product name is **Konsi**.
- User-facing language is concise, practical Bahasa Indonesia suited to field work.
- Established domain terms such as **Beranda**, **Kunjungan**, **Warung**, **Titip**, **Tarik**, **Bahan Baku**, **Laporan**, and **Pengaturan** should remain recognizable unless the product owner explicitly changes them.
- Existing product truth and operational terminology take precedence over generic commerce language; Konsi is an internal consignment tool, not a customer-facing storefront.

## Evidence on Hand

- `PRD.md` — primary business rules, user roles, web UX requirements, feature scope, and technical constraints.
- `docs/FRONTEND_ARCHITECTURE.md` — web-only Svelte architecture, route model, responsive strategy, state management, and PWA requirements.
- `docs/UI_SEPARATION.md` and `docs/WEB_FRONTEND_SUMMARY.md` — owner/staff separation and implemented navigation model.
- `src/web/` — incumbent web interface and current operational copy.
- `src/shared/schemas/` — shared request and response contracts used by the web client and Worker.
- `openspec/specs/` — domain requirements for authentication, dashboard, outlets, visits, products, reports, settings, and related services.
- There is no approved public-customer storefront scope, customer testimonial set, external benchmark, or marketing proof in the current product record; future design work must not fabricate them.

## Product Principles

1. **Field completion comes first.** Optimize critical workflows for one-handed smartphone use, large touch targets, minimal typing, and clear progress at the warung.
2. **Operational truth must stay visible.** Make stock age, required actions, network state, GPS accuracy, distance, geofence status, and submission constraints understandable before the user commits.
3. **Accuracy outranks convenience at submission.** Preserve quantity equations, complete-cycle handling, online-only final submission, idempotency, and server-authoritative validation.
4. **Show only what each role needs.** Staff receive enough information to perform and collect during a visit without exposing HPP, margin, or administrative controls; owners retain complete oversight.
5. **Degrade honestly.** Allow useful local drafts and recovery during poor connectivity, but never imply that an offline draft has been finalized or synced.

## Accessibility & Inclusion

- Critical controls should provide at least a 44×44 px touch target.
- The application must remain usable with keyboard navigation and visible focus states, even though touch is the primary input.
- Status must not rely on color alone; urgency, geofence, network, error, and success states need text or icon reinforcement.
- Inputs should use mobile-appropriate types and a readable base size that avoids unwanted iOS zoom.
- Safe areas, on-screen keyboards, reduced-motion preferences, loading states, errors, and empty states must be handled without blocking core field tasks.
