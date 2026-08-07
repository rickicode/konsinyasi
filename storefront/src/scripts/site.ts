// site.ts — global site entry, imported by BaseLayout.astro so it runs on EVERY page.
import { loadBrand } from './brand';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void loadBrand());
} else {
  void loadBrand();
}
