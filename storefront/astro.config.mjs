import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [sitemap()],
  site: 'https://kopi.hijitoko.com',
  output: 'static',
  // `file` format + `never` trailing slash → pages served at /produk
  // (produk.html), not redirected to /produk/ by Cloudflare Pages.
  trailingSlash: 'never',
  build: {
    format: 'file',
    outDir: 'dist',
    empty: true,
  },
  server: {
    port: 5001,
    host: true,
  },
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5003',
          changeOrigin: true,
        },
      },
    },
    define: {
      'import.meta.env.VITE_BASE_URL': JSON.stringify(process.env.VITE_BASE_URL || ''),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
    },
  },
});
