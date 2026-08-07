# Konsinyasi Issues & Fixes

## 🔴 Critical Issues

### 1. Routing Masih Hash-Based (`/#/`)
**Status:** ✅ Fixed (migrasi ke history-mode router)
**Problem:** App masih menggunakan `/#/warung` bukan `/warung`
**Root Cause:** svelte-spa-router v5.x adalah hash-based by design — tidak ada opsi `useHash={false}` / history mode.
**Fix Applied (sesi 2026-08-07):**
- **Migrasi penuh ke `@keenmate/svelte-spa-router` v5.3.0** (router Svelte 5 runes, dual-mode hash/history):
  - `main.ts`: `setHashRoutingEnabled(false)` + `setBasePath()` → URL 100% bersih, `#` tidak pernah muncul di address bar
  - `clean-url.ts` + spec-nya **dihapus total** — tidak ada lagi kode legacy `#/` di repo
  - Semua import `svelte-spa-router` → `@keenmate/svelte-spa-router` (30 file)
  - API migration: `router.location` → `location()`, `router.querystring` → `querystring()`, prop route `params` → `routeParams` (5 halaman)
  - `wrangler.toml` sudah punya `not_found_handling = "single-page-application"` ✓ (tidak berubah)
  - Test baru `history-mode.integration.spec.ts` (7 test): deep-link, push/replace clean URL, routeParams, popstate, catch-all — 261/261 hijau

### 2. Brand Name Berubah-Ubah
**Status:** ✅ Fixed
**Problem:** Brand name kadang "RERICoffee" kadang "Tempatkan Kopi"
**Root Cause:** `page-title.ts` hardcode `'Tempatkan Kopi'` untuk route `/`; heading `PlaceCoffeePage` hardcode; App.svelte baca route dari hash (kosong saat path routing → selalu jatuh ke title '/')
**Fix Applied:**
- Hardcode `'Tempatkan Kopi'` dihapus dari `page-title.ts` (route `/` → 'Beranda')
- Heading `PlaceCoffeePage.svelte` sekarang `appConfig.brandName` (load dari API)
- Placeholder settings di-netralkan (bukan nama brand milik user)

### 3. Text "Tarik ke bawah" Muncul
**Status:** ✅ Fixed
**Problem:** Ada text "Tarik ke bawah" yang tidak seharusnya muncul
**Root Cause:** `PullToRefresh.svelte` menampilkan indikator sejak `distance > 0` — geseran jari kecil di atas halaman (atau overscroll bounce native) memunculkan flash text.
**Fix Applied:** Deadzone 16px (`HINT_DEADZONE`) + `opacity-0` transition — hint hanya muncul saat pull yang disengaja.

---

## 🟡 UX Issues

### 4. FormattedInput untuk Semua Amount
**Status:** ✅ Done — semua input amount integer auto-format ribuan (10000 → 10.000)
**Problem:** User mau semua input amount auto-format (10000 → 10.000)
**Fix Applied (sesi 2026-08-07):**
- ProductForm & RawMaterialForm ✓ (sudah)
- ReceiptPhotoUploader (amount bon) ✓ (sudah)
- Settings: RadiusForm (radius) & cycle hours → FormattedInput (prefix kosong) ✓ (sudah)
- **QtyStepper** (VisitForm drop qty, DropSheet titip, CyclePickupForm pickup) → display `toLocaleString('id-ID')`: angka mentah saat fokus, terformat saat blur/ketik. Input dilebarkan `w-14` → `w-20` agar muat "10.000".
- **LabelPage** (jumlah batch) → FormattedInput (prefix kosong)
- **LabelPrintPage** (jumlah label) → `QtyStepper` `min={1} max={1000}` (menggantikan tombol +/− manual + `type="number"`)
- **UomManager** (faktor konversi) → state `number` + FormattedInput (prefix kosong); validasi integer > 0 tetap via submit
- **Catatan deep-check:** `min`/`max` TIDAK dipakai di FormattedInput — clamping saat mengetik membuat angka "ter-snap" (ketik 1 → jadi 20) dan display/value tidak sinkron. Validasi rentang tetap via submit (client error / schema worker). QtyStepper mengecualikan ini: ia men-clamp value & display secara konsisten (bounds dari props `min`/`max`).
- **Dikecualikan (bukan amount):** RecipeEditor kuantitas (mendukung desimal `step="any"` — format ribuan akan merusak 2.5 → 25) dan OutletFormSheet latitude/longitude (koordinat desimal). Reopen jika user tetap mau.

### 5. Harga Resep Per Item Tidak Muncul
**Status:** ✅ Fixed
**Problem:** User mau lihat harga per item di samping tombol Hapus di recipe editor
**Fix Applied:** `RecipeEditor.svelte` — tiap baris resep menampilkan harga per satuan (mis. `Rp18/g`) + subtotal baris di samping tombol Hapus. Total HPP tetap tampil di bawah.

---

## 🟢 Sudah Diperbaiki

### ✅ CORS untuk *.hijitoko.com dan *.rericoffee.me
- Wildcard support di cors middleware
- ALLOWED_ORIGINS updated

### ✅ Cache Invalidation
- Cache API keys() tidak supported di Cloudflare Workers
- Sudah fix dengan direct URL deletion

### ✅ Error Details di Response
- Error handler sekarang return `details` object
- Stack trace di development mode

### ✅ Base Unit Conversion
- Krimer: kg (35.000/kg)
- Susu/Gula: L (20.000/L, 40.000/L)
- Espresso: ml (25/ml)

### ✅ Master Page Tabs
- Tabs sekarang muncul di /master
- Active tab detection dari query param

### ✅ HPP Calculation
- Total HPP ditampilkan di form produk
- Konversi satuan otomatis

### ✅ Clean URLs
- Routing tanpa `#` via sync layer (lihat Issue 1)
- Terverifikasi dengan integration test memakai **router asli** (bukan mock): deep-link render, push/replace bersihkan URL, params, back/forward — 6 integration test + 6 unit test lulus

## 🔬 Hasil Deep-Check (Verifikasi Mandiri)

- **`useHash={false}` (Issue 1)**: klaim ISSUES.md SALAH — svelte-spa-router v5.1.1 tidak punya prop itu (hash-only by design). Fix asli = sync layer `clean-url.ts`.
- **Brand name (Issue 2)**: cache worker + invalidasi sudah benar (fix pra-sesi); `/api/public/brand` tidak di-cache. Penyebab "berubah-ubah" = hardcode frontend (`page-title.ts` route `/` & heading PlaceCoffeePage) — sudah dihapus. Nilai DB `'Tempatkan Kopi'` hanya ada di fresh seed.
- **visit-permissions.test.ts gagal (1 test)**: ✅ FIXED — akar masalahnya `ReferenceError: caches is not defined` di `lib/cache.ts` (Cache API Workers tidak ada di environment test Node). Cache middleware di `/api/settings` crash (500) SEBELUM guard permission sempat jalan (403). Fix: guard `isCacheAvailable()` di semua helper cache (getCache → null, setCache/deleteCache/invalidateResourceCache → no-op) — middleware jadi transparent no-op di lingkungan tanpa Cache API, perilaku produksi (Workers, `caches` selalu ada) tidak berubah. Full suite kini **256/256 hijau**.
- **`npm run check` error di `src/web/sw.ts`**: PRE-EXISTING (Service Worker typing), bukan dari sesi ini.
- **`text-[10px]` dsb**: 0 temuan; satu advisory font-size ada di `public/offline.html` (halaman statis, pra-sesi).
- **Skip link `#main-content` (App.svelte)**: bug pra-eksis — klik anchor fragment memicu hashchange, `getLocation()` lib memetakan fragment non-`#/` ke `/`, route ter-reset ke `/`. Sudah difix dengan `preventDefault()` + fokus manual.
- **Keterbatasan jsdom**: `push()` asli tidak memicu hashchange di jsdom saat komponen ter-mount (bug jsdom, bukan kode). Integration test memakai mekanisme `replace()` lib (replaceState + dispatch manual) yang identik di browser, plus test back-to-back navigation untuk perilaku deferred-strip.
- **NEW — `stripHash()` di handler `popstate` (clean-url.ts)**: BUG POTENSIAL NYATA ditemukan di cek verifikasi. Browser menembakkan `popstate` dulu, LALU `hashchange` saat back/forward ke history entry legacy `#/...`. Jika popstate men-strip fragment secara sinkron, listener hashchange lib (terdaftar pertama) membaca URL yang sudah bersih → `getLocation()` mengembalikan `/` → route ter-reset ke Beranda padahal URL tampak benar. Fix: popstate hanya `syncFromUrl()` (fragment dibiarkan); stripping diserahkan ke handler hashchange (deferred microtask, membaca fragment sebelum dibersihkan). Ditambah regression test — akan gagal pada kode lama. 12/12 test routing lulus.

## 🔬 Audit Perubahan Worker (Uncommitted) — Round 2

**Latar:** audit menyeluruh file worker yang belum di-commit (index.ts, lib/analytics.ts, lib/cache.ts, middleware/cache.ts, middleware/cors.ts, routes/products.ts).

### ✅ Cache API guard (fix, lihat di atas)
`isCacheAvailable()` di `lib/cache.ts` — Cache API (`caches`) tidak ada di environment test Node → middleware cache crash 500 sebelum cek permission. Sekarang semua helper cache no-op graceful. Test permissions lulus.

### ✅ CORS wildcard + Origin malformed (fix nyata)
`middleware/cors.ts` — `isOriginAllowed()` baru memanggil `new URL(origin)` tanpa guard: **Origin header malformed (klien non-browser) → TypeError → 500**, padahal seharusnya hanya dianggap tidak diizinkan. Fix: try/catch + pencocokan hostname case-insensitive (RFC 3986). Test baru `middleware/__tests__/cors.test.ts` (7 test: exact, wildcard subdomain+apex, lookalike domain, case-insensitive, malformed, dev-mode reflect).

### ✅ Analytics middleware — hipotesis awal SALAH, dikoreksi dengan bukti
Hipotesis awal: "error 4xx/5xx melompati trackRequest karena `await next()` reject" — **SALAH**. Baca source Hono `compose.js`: dispatch level menangkap error, mengubahnya jadi response via `onError`, lalu **`next()` resolve normal** (error tidak pernah mereject middleware). `c.res.status` sudah merefleksikan status error (403 untuk AppError dengan onError proyek). Kode original sebenarnya benar. Bukti empiris: probe `writeFileSync` di dalam `catch` middleware tidak pernah tereksekusi meski handler melempar.

Yang TERSISA sebagai perbaikan sah: `try/finally` — jaring pengaman untuk non-Error throw (`throw 'oops'`) yang tidak bisa dirute compose ke onError, supaya tracking tetap jalan dan status default 500. Komentar middleware dikoreksi agar sesuai kenyataan. Test baru `lib/__tests__/analytics.test.ts` (3 test) membuktikan AppError 403 TERCATAT dengan status aslinya via jalur onError.

### ✅ Produk lain diverifikasi aman
- `routes/products.ts` (+2): `is_public` — kolom ada di schema (line 123) ✓
- `RESOURCE_TTL` dihapus — tidak ada referensi tersisa ✓
- `index.ts` onError: detail + stack di debug ✓
- `middleware/cache.ts`: X-Cache HIT pada stored response memang disengaja (pembaca berikutnya dapat HIT); penghapusan 304-handling = perubahan perilaku wajar (CDN layer menangani revalidation) ✓

---

## 📋 TODO Priority

1. **[DONE]** Fix routing ke clean URLs (hapus #)
2. **[DONE]** Fix brand name consistency
3. **[DONE]** Hapus text "Tarik ke bawah"
4. **[DONE]** FormattedInput untuk semua amount integer (QtyStepper, Label, LabelPrint, UomManager ikut; RecipeEditor & koordinat dikecualikan — lihat Issue 4)
5. **[DONE]** Harga per item di recipe editor

---

## 🔧 Technical Debt

- RecipeEditor kuantitas resep & lat/lng outlet sengaja tidak diformat ribuan (mendukung desimal) — lihat Issue 4
- Cache invalidation bisa lebih granular
- Error handling bisa lebih konsisten
- Perlu integration tests untuk critical flows
- ~~Pertimbangkan migrasi ke router ber-history-mode native~~ ✅ DONE (sesi 2026-08-07): migrasi ke `@keenmate/svelte-spa-router` history mode — URL & href DOM bersih tanpa `#`
