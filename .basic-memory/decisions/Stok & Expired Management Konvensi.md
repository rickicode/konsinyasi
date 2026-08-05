---
title: Stok & Expired Management Konvensi
type: note
permalink: konsinyasi/decisions/stok-expired-management-konvensi
---

# Sistem Stok & Management Expired — Konvensi

## Sistem Stok Konsinyasi
- `qty_dropped` (dititip) · `qty_sold` (terjual) · `qty_remaining_good` (sisa baik, **tetap di warung**) · `qty_return_damaged` (sisa rusak, ditarik).
- Terjual AUTO: `sold = dropped − remaining_good − damaged`. Cycle auto-close saat `qty_remaining_good = 0`.

## Expiry handling (diterapkan sesi ini)
- `consignment_cycles.expires_at` — opsional, diisi saat drop (DropSheet, min = hari ini).
- Route `visit.ts` (visit state) menambah `expires_at` + `expiry_status` (`'none'|'ok'|'expiring'|'expired'`). Ambang expiring = ≤48 jam.
- `CyclePickupForm.svelte` menampilkan badge (merah=expired, amber=expiring, biru=ok) + sorting cycle dalam grup produk: expired dulu.
- Dashboard `expired_count`/`expiring_soon_count` menghitung **unit** (`qty_remaining_good`), bukan cycle. Label card = "N unit expired".
- Endpoint riwayat `/cycles/:id/history` kini expose `expires_at` (audit trail).
- **Tidak ada auto-close** untuk cycle expired — staf harus tarik manual sebagai 'rusak'.

## Schema
- `visitCycleStateSchema` (visit.schema.ts): tambah `expires_at?: string`, `expiry_status?: 'none'|'ok'|'expiring'|'expired'` (optional).
- `dashboardItemSchema` (report.schema.ts): `expired_count`/`expiring_soon_count` tetap `int`, sekarang diisi unit.