# Base URL Configuration

Konfigurasi base URL terpisah untuk **storefront** (publik) dan **backend API**.

## Storefront

File konfigurasi: `storefront/.env`

```env
# Storefront public base URL (no trailing slash)
VITE_BASE_URL=https://kopi.hijitoko.com
```

Digunakan untuk:

- `canonical` URL
- Open Graph (`og:url`, `og:image`)
- Twitter Card (`twitter:image`)
- JSON-LD schema (`url`)

Ganti nilai ini saat deploy ke domain lain.

## Backend API

File lokal: `.dev.vars`

```env
PUBLIC_API_BASE_URL=http://localhost:5003
STOREFRONT_BASE_URL=https://kopi.hijitoko.com
```

### Binding tersedia di worker

| Variable              | Tipe      | Kegunaan                                                                              |
| --------------------- | --------- | ------------------------------------------------------------------------------------- |
| `PUBLIC_API_BASE_URL` | `string?` | URL publik API itu sendiri. Digunakan untuk generate absolute URL seperti brand logo. |
| `STOREFRONT_BASE_URL` | `string?` | URL publik storefront. Tersedia jika backend perlu link balik ke storefront.          |

### Production

Untuk production, set variable di Cloudflare dashboard:

1. Buka Workers & Pages → `konsi`
2. Settings → Variables
3. Tambah:
   - `PUBLIC_API_BASE_URL` = `https://api.kopi.hijitoko.com`
   - `STOREFRONT_BASE_URL` = `https://kopi.hijitoko.com`

Atau gunakan `wrangler secret put`.

### Default lokal

Saat `npm run dev`, worker membaca `.dev.vars` otomatis. Admin/CRUD frontend tidak terpengaruh konfigurasi ini.
