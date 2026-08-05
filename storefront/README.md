# Konsi Storefront - Astro Version

Public storefront for Konsi - Temukan kopi di warung sekitarmu.

## Features

- 🚀 **Astro 5** - Static site generation for maximum performance
- 📍 **Geolocation** - Find nearest warungs based on your location
- 🗺️ **Interactive Map** - Leaflet-powered map with satellite view
- 📱 **Mobile-First** - Optimized for smartphone browsers
- 🔍 **SEO Optimized** - JSON-LD, Open Graph, Twitter Cards
- ⚡ **Fast Loading** - Critical CSS inline, lazy loading, minimal JS

## Tech Stack

- [Astro](https://astro.build/) - Static site generator
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [Cloudflare Pages](https://pages.cloudflare.com/) - Hosting

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:3000

### Build

```bash
npm run build
```

### Deploy

```bash
npm run deploy
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_BASE_URL` | Canonical URL for SEO | `https://kopi.hijitoko.com` |
| `VITE_API_BASE_URL` | API endpoint (empty for same-origin) | `` |

## Project Structure

```
storefront-astro/
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── LocationBanner.astro
│   │   ├── Stats.astro
│   │   ├── WarungCard.astro
│   │   ├── MapOverlay.astro
│   │   └── DetailModal.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   └── index.astro
│   ├── scripts/
│   │   └── app.ts
│   └── styles/
│       └── design-system.css
├── astro.config.mjs
├── tsconfig.json
├── wrangler.jsonc
└── package.json
```

## Performance

- **First Contentful Paint**: < 1s
- **Largest Contentful Paint**: < 2s
- **Cumulative Layout Shift**: 0
- **Total Bundle Size**: ~15KB gzipped

## SEO

- ✅ Semantic HTML5
- ✅ Open Graph meta tags
- ✅ Twitter Card meta tags
- ✅ JSON-LD Structured Data
- ✅ robots.txt
- ✅ sitemap.xml
- ✅ Canonical URLs

## License

MIT
