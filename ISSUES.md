# Konsinyasi Issues & Fixes

## 🔴 Critical Issues

### 1. Routing Masih Hash-Based (`/#/`)
**Status:** Belum fix  
**Problem:** App masih menggunakan `/#/warung` bukan `/warung`  
**Root Cause:** svelte-spa-router + SPA fallback belum sinkron  
**Fix Needed:**
- Pastikan `useHash={false}` di Router component
- Pastikan wrangler.toml ada `not_found_handling = "single-page-application"`
- Pastikan Worker fallback serve index.html untuk semua non-API routes
- Update semua internal links dari `#/path` ke `/path`

### 2. Brand Name Berubah-Ubah
**Status:** Intermittent  
**Problem:** Brand name kadang "RERICoffee" kadang "Tempatkan Kopi"  
**Root Cause:** 
- `page-title.ts` hardcode `'Tempatkan Kopi'` untuk route `/`
- App config store default ke `'Konsi'`
- Migration pakai `INSERT OR IGNORE` tapi kadang masih overwrite

**Fix Needed:**
- Hapus hardcode di `page-title.ts`
- Pastikan app-config load dari API setiap kali
- Jangan hardcode brand name di frontend

### 3. Text "Tarik ke bawah" Muncul
**Status:** Belum investigasi  
**Problem:** Ada text "Tarik ke bawah" yang tidak seharusnya muncul  
**Root Cause:** Kemungkinan dari PullToRefresh component  
**Fix Needed:** Check PullToRefresh component visibility logic

---

## 🟡 UX Issues

### 4. FormattedInput untuk Semua Amount
**Status:** Partial (hanya ProductForm & RawMaterialForm)  
**Problem:** User mau semua input amount auto-format (10000 → 10.000)  
**Fix Needed:**
- ReceiptPhotoUploader (amount bon)
- Settings (cycle hours, geofence radius)
- VisitForm (quantities)

### 5. Harga Resep Per Item Tidak Muncul
**Status:** Belum fix  
**Problem:** User mau lihat harga per item di samping tombol Hapus di recipe editor  
**Root Cause:** Template Svelte复杂, sulit edit  
**Fix Needed:** Tambah price display per recipe line

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

---

## 📋 TODO Priority

1. **[HIGH]** Fix routing ke clean URLs (hapus #)
2. **[HIGH]** Fix brand name consistency
3. **[MEDIUM]** Hapus text "Tarik ke bawah"
4. **[MEDIUM]** FormattedInput untuk semua amount
5. **[LOW]** Harga per item di recipe editor

---

## 🔧 Technical Debt

- Banyak komponen masih pakai `type="number"` untuk harga
- Cache invalidation bisa lebih granular
- Error handling bisa lebih konsisten
- Perlu integration tests untuk critical flows
