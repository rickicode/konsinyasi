# UI Separation Implementation Summary

## Overview

This document summarizes the changes made to separate the admin/owner UI from the staff/field UI in the Konsinyasi application.

## Changes Made

### 1. Backend (RBAC & API)

#### `src/worker/lib/rbac.ts`

- Staff permissions limited to: `auth`, `dashboard:read`, `visit:read`, `visit:write`, `outlets:write`, `settings:read`, `products:read`, `products:write`
- Staff do NOT have: `visit:void`, `visit:override`, `reports:read`, `bom:write`, `raw_materials:read/write`, `users:manage`, `master:delete`

#### `src/worker/routes/dashboard.ts`

- Added `requirePermission('dashboard:read')` middleware
- Financial data (estimated_bill) only returned for owner role

#### `src/worker/routes/visit.ts`

- Financial data (hpp_snapshot, price_snapshot) only included for owner role
- Staff can only see their own visits

#### `src/worker/routes/products.ts`

- Financial data (hpp, hpp_override, price_to_outlet, recipe_lines) only included for owner role
- Staff cannot modify recipes or pricing

### 2. Frontend Routes

#### `src/web/routes.ts`

Split into two route configurations:

**Staff Routes:**

- `/beranda` → StaffDashboardPage (no financial data)
- `/kunjungan` → VisitListPage
- `/warung` → OutletListPage
- `/produk` → ProductListPage
- `/profil` → ProfilePage

**Owner Routes:**

- `/beranda` → OwnerDashboardPage (with financial data)
- `/admin` → AdminHubPage
- `/master` → MasterPage (bahan baku, produk, warung)
- `/laporan` → ReportsPage
- `/pengguna` → UsersPage
- `/pengaturan` → SettingsPage
- Plus all staff routes

### 3. Shell Components

#### Staff Shell (`src/web/features/shell/components/`)

- `StaffShell.svelte` - Layout for staff
- `StaffTopBar.svelte` - Green "Konsi Lapangan" header
- `StaffBottomNav.svelte` - Navigation: Beranda, Kunjungan, Warung, Produk, Profil

#### Owner Shell (`src/web/features/shell/components/`)

- `OwnerShell.svelte` - Layout for owner
- `TopBar.svelte` - Brown "Konsi" header with admin menu
- `BottomNav.svelte` - Navigation: Beranda, Kunjungan, Warung, Master, (+ Admin, Laporan, etc. in top menu)

### 4. Dashboard Components

#### Staff Dashboard (`src/web/features/dashboard/`)

- `StaffDashboardPage.svelte` - No financial data
- `StaffSummaryCards.svelte` - Shows: Total Warung, Botol di Pasar, Butuh Perhatian
- `StaffUrgencyCard.svelte` - No tagihan info

#### Owner Dashboard (`src/web/features/dashboard/`)

- `OwnerDashboardPage.svelte` - Full financial data
- `OwnerSummaryCards.svelte` - Shows: + Estimasi Tagihan
- `OwnerUrgencyCard.svelte` - Shows tagihan info

### 5. Admin Components

#### `src/web/features/admin/`

- `AdminHubPage.svelte` - Admin panel with quick access to all admin features
- `MasterPage.svelte` - Master data management (admin version)
- `MasterTabs.svelte` - Tabs for Bahan Baku, Produk, Warung

### 6. Role Configuration

#### `src/web/lib/role.ts`

- Separate navigation items for staff and owner
- Staff: 5 bottom nav items (Beranda, Kunjungan, Warung, Produk, Profil)
- Owner: 4 bottom nav items + top menu items

#### `src/web/lib/stores/auth.svelte.ts`

- Updated ROLE_CAPABILITIES to match backend permissions
- Added comments explaining staff restrictions

### 7. Mobile App (Flutter)

#### `mobile/lib/presentation/shell/main_shell.dart`

- Staff navigation: Beranda, Kunjungan, Warung, Profil
- Owner navigation: Beranda, Kunjungan, Warung, Admin, Profil
- Added role banner indicator at top

## Visual Summary

### Staff UI

```
┌─────────────────────────────────────────┐
│  🟢 Konsi Lapangan (Staff)              │
├─────────────────────────────────────────┤
│  [🏠] [📋] [🏪] [📦] [👤]              │
│  Beranda Kunjungan Warung Produk Profil │
└─────────────────────────────────────────┘
- No financial data
- No admin features
- Only see own visits
```

### Owner UI

```
┌─────────────────────────────────────────┐
│  🟤 Konsi (Owner) - Menu: Admin, Laporan│
├─────────────────────────────────────────┤
│  [🏠] [📋] [🏪] [📁] [👤]              │
│  Beranda Kunjungan Warung Master Profil │
└─────────────────────────────────────────┘
- Full financial data
- Admin panel access
- Reports & analytics
- User management
- Settings
```

## Security Notes

1. **Backend Enforcement**: All API endpoints enforce RBAC at the middleware level
2. **Frontend Filtering**: UI components conditionally render based on role
3. **Data Filtering**: Financial data is stripped from API responses for staff
4. **Route Guards**: Frontend routes are protected by role-based guards

## Testing Recommendations

1. Test login as staff - verify only staff features visible
2. Test login as owner - verify all features visible
3. Verify staff cannot access admin routes directly
4. Verify financial data not visible in API responses for staff
5. Test mobile app navigation for both roles
