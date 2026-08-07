// format.ts — shared formatting helpers + reusable list-state markup.
// The CSS for .loading/.spinner/.empty-state/.error-state lives once in design-system.css.

export function escapeHtml(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n);
}

export function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// --- Reusable list states (single source, shared CSS) ---

export function loadingHtml(label = 'Memuat...'): string {
  return `
    <div class="loading">
      <div class="spinner"></div>
      <p>${escapeHtml(label)}</p>
    </div>`;
}

export function emptyHtml(title: string, desc: string): string {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(desc)}</p>
    </div>`;
}

export function errorHtml(title = 'Gagal Memuat', desc = 'Coba refresh halaman'): string {
  return `
    <div class="error-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(desc)}</p>
    </div>`;
}
