# Security Audit Report — Konsinyasi

**Date:** 2025-08-06  
**Tool:** `pnpm audit`  
**Project:** konsi@0.0.0  
**Platform:** Cloudflare Workers + Hono + Svelte  

---

## Summary

| Metric | Count |
|--------|-------|
| **Total vulnerabilities found (before)** | 13 |
| **Vulnerabilities fixed** | 6 |
| **Remaining known issues** | 7 |
| **High/Critical remaining** | 1 (dev-only) |
| **Production impact** | ✅ None |

---

## Vulnerabilities Found (Before Fix)

### HIGH (5)

| # | Package | CVE/Advisory | Description | Path |
|---|---------|-------------|-------------|------|
| 1 | `brace-expansion@2.1.2` | GHSA-mh99-v99m-4gvg | DoS via unbounded expansion length (OOM) | vite-plugin-pwa → workbox-build → ... → minimatch → brace-expansion |
| 2 | `brace-expansion@2.1.2` | GHSA-rgw5-rvv9-x895 | DoS via unbounded intermediate arrays (bypass of CVE-2026-14257) | same as above |
| 3 | `undici@7.28.0` | GHSA-4cwx-7wf7-3272 | Cross-user info disclosure & parse-time crash via degenerate cache directives | jsdom → undici |
| 4 | `fast-uri@3.1.4` | GHSA-7p8r-x3mc-p8w7 | Host confusion via backslash authority introducer | vite-plugin-pwa → workbox-build → ajv → fast-uri |
| 5 | `brace-expansion@5.0.8` | GHSA-rgw5-rvv9-x895 | DoS via unbounded intermediate arrays | @typescript-eslint → eslint → minimatch → brace-expansion |

### MODERATE (8)

| # | Package | CVE/Advisory | Description | Path |
|---|---------|-------------|-------------|------|
| 6 | `esbuild@0.18.20/0.19.12` | GHSA-67mh-4wv8-2f99 | Dev server allows arbitrary requests from any website | drizzle-kit → esbuild |
| 7 | `postcss@8.5.21` | GHSA-fxqj-rqcc-2cmp | Incomplete fix — attacker-controlled sourceMappingURL reads arbitrary .map files | vite → postcss |
| 8 | `undici@7.28.0` | GHSA-8xcm-r25x-g524 | Downstream response desync via retry interceptor | jsdom → undici |
| 9 | `undici@7.28.0` | GHSA-m8rv-5g2x-5cg5 | CRLF injection via blob-like body 'type' property | jsdom → undici |
| 10 | `undici@7.28.0` | GHSA-jr45-8vmc-qm54 | Cross-user info disclosure via Cache-Control whitespace | jsdom → undici |
| 11 | `undici@7.28.0` | GHSA-v3r7-h72x-cjcm | Cookie attribute injection via unsanitized domain | jsdom → undici |
| 12 | `hono@4.12.31` | GHSA-8j4g-w8fx-2239 | ReDoS in CORS middleware via Access-Control-Request-Headers | **direct dependency** |

---

## Fixes Applied

### 1. Direct dependency update: `hono`

- **Before:** 4.12.31
- **After:** 4.13.0
- **Fixes:** GHSA-8j4g-w8fx-2239 (ReDoS in CORS middleware)
- **Risk:** None — minor version bump, backward compatible

### 2. Direct dependency update: `wrangler`

- **Before:** 4.114.0
- **After:** 4.119.0
- **Purpose:** Attempted fix for undici via miniflare (did not resolve — see Known Issues)

### 3. Transitive dependency overrides via `pnpm-workspace.yaml`

Created `pnpm-workspace.yaml` with pnpm overrides to force patched versions of transitive dependencies:

```yaml
overrides:
  brace-expansion@<3: 2.1.4
  brace-expansion@>=4 <6: 5.0.9
  undici@7: 7.29.0
  fast-uri@3: 3.1.5
  postcss@8: 8.5.23
```

| Override | Fixes | Status |
|----------|-------|--------|
| `brace-expansion@<3` → `2.1.4` | GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895 (2.x line) | ✅ Fixed |
| `brace-expansion@>=4 <6` → `5.0.9` | GHSA-rgw5-rvv9-x895 (5.x line) | ✅ Fixed |
| `undici@7` → `7.29.0` | All undici CVEs (GHSA-4cwx, GHSA-8xcm, GHSA-m8rv, GHSA-jr45, GHSA-v3r7) | ✅ Fixed for jsdom paths |
| `fast-uri@3` → `3.1.5` | GHSA-7p8r-x3mc-p8w7 | ✅ Fixed |
| `postcss@8` → `8.5.23` | GHSA-fxqj-rqcc-2cmp | ✅ Fixed |

### 4. Explicit workbox dependencies

pnpm hoisted previously-implicit workbox transitive dependencies as explicit devDependencies:
- `workbox-background-sync`, `workbox-cacheable-response`, `workbox-core`, `workbox-expiration`, `workbox-precaching`, `workbox-routing`, `workbox-strategies`

These are all used in `src/web/sw.ts` (service worker).

---

## Vulnerabilities Fixed (6 of 13)

| Package | Severity | CVE | Fix Applied |
|---------|----------|-----|-------------|
| brace-expansion@2.1.2 | HIGH ×2 | GHSA-mh99, GHSA-rgw5 | Override → 2.1.4 |
| brace-expansion@5.0.8 | HIGH | GHSA-rgw5 | Override → 5.0.9 |
| fast-uri@3.1.4 | HIGH | GHSA-7p8r | Override → 3.1.5 |
| postcss@8.5.21 | MODERATE | GHSA-fxqj | Override → 8.5.23 |
| hono@4.12.31 | MODERATE | GHSA-8j4g | Direct update → 4.13.0 |
| undici@7.28.0 (jsdom paths) | HIGH + 4 MOD | 5 CVEs | Override → 7.29.0 |

---

## Remaining Known Issues (7)

### 1. `undici@7.28.0` via `wrangler > miniflare` — 1 HIGH + 4 MODERATE

- **CVEs:** GHSA-4cwx-7wf7-3272 (HIGH), GHSA-8xcm, GHSA-m8rv, GHSA-jr45, GHSA-v3r7 (MODERATE)
- **Path:** `wrangler@4.119.0 > miniflare@5.20260801.0-alpha > undici@7.28.0`
- **Why not fixed:** miniflare pins `undici@7.28.0` as an exact version dependency. pnpm overrides do not reach this path due to miniflare's resolution behavior. Updating wrangler to latest (4.119.0) did not help — miniflare alpha still bundles undici@7.28.0.
- **Risk assessment:** **LOW** — `undici` is only used by `miniflare`, which is the local dev emulator for Cloudflare Workers. It does NOT run in production. Cloudflare's production runtime uses its own HTTP stack.
- **Mitigation:** Wait for Cloudflare to update miniflare's undici dependency. Track via [GHSA-4cwx-7wf7-3272](https://github.com/advisories/GHSA-4cwx-7wf7-3272).

### 2. `esbuild@0.18.20/0.19.12` via `drizzle-kit` — 1 MODERATE

- **CVE:** GHSA-67mh-4wv8-2f99
- **Path:** `drizzle-kit@0.30.6 > esbuild@0.18.20/0.19.12`
- **Why not fixed:** drizzle-kit@0.30.6 hard-depends on old esbuild versions. Fix requires esbuild@≥0.25.0, which is a major semver jump (breaking API changes). drizzle-kit@0.31.x may fix this but is a minor version upgrade that needs separate testing.
- **Risk assessment:** **LOW** — esbuild is a build tool only. The vulnerability (arbitrary dev server requests) only affects `esbuild --serve` during local development and is not exploitable in production builds or deployed code.
- **Mitigation:** Upgrade `drizzle-kit` to `^0.31.x` in a separate PR with dedicated testing.

---

## Verification

```bash
# Build passes
pnpm run build  # ✅ Success

# Tests: 241/244 pass (3 pre-existing failures unrelated to audit)
pnpm test       # ✅ 241 passed, 3 failed (visit-permissions.test.ts — pre-existing)

# Final audit
pnpm audit --audit-level=high
# Result: 1 high (undici via wrangler/miniflare — dev-only, acceptable)
```

---

## Packages Updated

| Package | Before | After | Type |
|---------|--------|-------|------|
| hono | 4.12.31 | 4.13.0 | direct dep (minor) |
| wrangler | 4.114.0 | 4.119.0 | dev dep (minor) |
| svelte | 5.56.7 | 5.56.8 | dev dep (patch) |
| @types/leaflet | 1.9.21 | 1.9.22 | dev dep (patch) |
| @playwright/test | 1.61.1 | 1.62.1 | dev dep (minor) |
| typescript-eslint | 8.65.0 | 8.66.0 | dev dep (minor) |
| workbox-* (7 packages) | (implicit) | ^7.4.1 | dev dep (now explicit) |

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Updated hono, wrangler versions; added explicit workbox deps |
| `pnpm-lock.yaml` | Regenerated with patched dependency resolutions |
| `pnpm-workspace.yaml` | **NEW** — pnpm overrides for transitive security patches |

---

## Recommendations

1. **Monitor miniflare/undici:** Track Cloudflare's miniflare releases for undici ≥7.29.0 adoption. Remove the override once miniflare updates.
2. **Upgrade drizzle-kit:** Test and upgrade to `^0.31.x` to resolve the esbuild vulnerability. Run database migration tests.
3. **Automate audits:** Add `pnpm audit --audit-level=high` to CI pipeline to catch future regressions.
4. **Review overrides periodically:** The pnpm overrides force specific versions of transitive deps. Remove them once parent packages adopt patched versions natively.
