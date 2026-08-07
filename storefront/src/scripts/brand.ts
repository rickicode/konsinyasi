// brand.ts — shared brand loading, runs on EVERY storefront page (via BaseLayout).
import { apiBase } from './config';

export function updateBrand(brandName: string, logoUrl: string | null) {
  const pageTitle = brandName + ' — Temukan Kopi';
  document.title = pageTitle;

  const siteName = document.querySelector('meta[property="og:site_name"]');
  if (siteName) siteName.setAttribute('content', brandName);

  document
    .querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]')
    .forEach((m) => m.setAttribute('content', pageTitle));

  const logoText = document.getElementById('brand-logo-text');
  if (logoText) logoText.textContent = brandName;

  const logoImg = document.getElementById('brand-logo-img') as HTMLImageElement | null;
  const fallback = document.getElementById('brand-logo-fallback');

  if (logoImg) {
    if (logoUrl) {
      const fullUrl = logoUrl.startsWith('/') ? apiBase() + logoUrl : logoUrl;
      logoImg.src = fullUrl;
      logoImg.style.display = '';
      if (fallback) fallback.style.display = 'none';
    } else {
      logoImg.style.display = 'none';
      if (fallback) fallback.style.display = '';
    }
  }

  const link = document.getElementById('brand-favicon') as HTMLLinkElement | null;
  if (link) {
    if (logoUrl) {
      link.href = logoUrl;
      link.type = 'image/png';
    } else {
      link.href = '/favicon.svg';
      link.type = 'image/svg+xml';
    }
  }
}

/** Fetch brand settings once and apply them. Safe to call on any page. */
export async function loadBrand(): Promise<void> {
  try {
    const res = await fetch(apiBase() + '/api/public/brand');
    if (!res.ok) throw new Error('Brand fetch failed');
    const data = (await res.json()) as { brand_name?: string; logo_url?: string | null };
    if (data.brand_name) updateBrand(data.brand_name, data.logo_url || null);
  } catch {
    // Keep defaults (Konsi + fallback icon) when the API is unreachable.
  }
}
