// config.ts — shared client configuration.
// The values are injected once by BaseLayout.astro via `<script is:inline define:vars>`,
// so every page gets them automatically — no per-page config scripts needed.

export function apiBase(): string {
  return (window as any).__API_BASE_URL__ || '';
}

export function baseUrl(): string {
  return (window as any).__BASE_URL__ || 'https://kopi.hijitoko.com';
}
