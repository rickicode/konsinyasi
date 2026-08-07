// app.ts - Main client-side application logic
// Handles: geolocation, warung data, map, detail modal, brand updates

interface Warung {
  id: string;
  name: string;
  address?: string;
  photo_url?: string;
  latitude: number;
  longitude: number;
  products: Array<{
    name: string;
    available_qty: number;
    price: number;
  }>;
  _dist?: number;
}

// Shared helpers (single source: ./format.ts & ./config.ts)
import { escapeHtml as esc, formatNumber as fmt, formatDist } from './format';
import { apiBase, baseUrl } from './config';

// State
let warungs: Warung[] = [];
let selected: Warung | null = null;
let myLat: number | null = null;
let myLng: number | null = null;
let isRefreshing = false;

// DOM helper
const $ = (id: string) => document.getElementById(id);

// Search state
let searchTimeout: number | null = null;
let searchMarkers: any[] = [];

// Initialize search
function initSearch() {
  const input = $('map-search-input') as HTMLInputElement;
  const clearBtn = $('search-clear-btn');
  const results = $('search-results');
  
  if (!input || !clearBtn || !results) return;
  
  // Search input handler
  input.addEventListener('input', () => {
    const query = input.value.trim();
    
    // Show/hide clear button
    clearBtn.style.display = query ? 'flex' : 'none';
    
    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (query.length < 2) {
      results.classList.remove('active');
      results.innerHTML = '';
      return;
    }
    
    // Debounce search
    searchTimeout = window.setTimeout(() => searchLocation(query), 300);
  });
  
  // Clear button
  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    results.classList.remove('active');
    results.innerHTML = '';
    clearSearchMarkers();
    input.focus();
  });
  
  // Close results when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target as Node) && !results.contains(e.target as Node)) {
      results.classList.remove('active');
    }
  });
}

// Search local warungs only
async function searchLocation(query: string) {
  const results = $('search-results');
  if (!results) return;

  const localResults = warungs.filter(w => 
    w.name.toLowerCase().includes(query.toLowerCase()) ||
    (w.address && w.address.toLowerCase().includes(query.toLowerCase()))
  );

  if (!localResults.length) {
    results.innerHTML = '<div class="search-no-results">Warung tidak ditemukan</div>';
    results.classList.add('active');
    return;
  }

  results.innerHTML = localResults.map(w => {
    const dist = w._dist != null ? formatDist(w._dist) : '';
    return `
      <div class="search-result-item search-result-warung" data-lat="${w.latitude}" data-lon="${w.longitude}" data-name="${esc(w.name)}" data-warung-id="${w.id}">
        <div class="result-icon">☕</div>
        <div class="result-info">
          <div class="result-name">${esc(w.name)} ${dist ? '<span class="result-dist">' + dist + '</span>' : ''}</div>
          <div class="result-address">${esc(w.address || 'Warung kopi')}</div>
        </div>
      </div>
    `;
  }).join('');

  results.classList.add('active');

  // Add click handlers
  results.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const lat = parseFloat(item.getAttribute('data-lat')!);
      const lon = parseFloat(item.getAttribute('data-lon')!);
      const name = item.getAttribute('data-name')!;
      const warungId = item.getAttribute('data-warung-id');

      if (warungId) {
        openDetail(warungId);
      }

      goToLocation(lat, lon, name);
      results.classList.remove('active');
    });
  });
}

// Get icon based on location type
function getLocationIcon(type: string, cls: string): string {
  if (type === 'warung' || cls === 'shop') return '🏪';
  if (type === 'supermarket' || type === 'convenience') return '🛒';
  if (type === 'cafe' || type === 'restaurant') return '☕';
  if (type === 'school' || type === 'university') return '🏫';
  if (type === 'hospital' || type === 'clinic') return '🏥';
  if (type === 'mosque' || type === 'church') return '🕌';
  if (type === 'bank' || type === 'atm') return '🏦';
  if (type === 'pharmacy') return '💊';
  if (type === 'fuel') return '⛽';
  if (cls === 'highway' || cls === 'road') return '🛣️';
  if (cls === 'place') return '📍';
  return '📍';
}

// Go to searched location
function goToLocation(lat: number, lon: number, name: string) {
  const L = (window as any).L;
  if (!L || !map) return;
  
  // Clear previous search markers
  clearSearchMarkers();
  
  // Add marker
  const icon = L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center">
        <div style="background:white;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700;color:#3e2a24;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);margin-bottom:4px;border:1.5px solid #e0ccaf">
          ${esc(name)}
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid white;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.1))"></div>
        <div style="width:32px;height:32px;background:#c8956c;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.25)">
          <span style="color:white;font-size:14px">📍</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [16, 50],
  });
  
  const marker = L.marker([lat, lon], { icon }).addTo(map);
  searchMarkers.push(marker);
  
  // Pan to location
  map.setView([lat, lon], 16);
}

// Clear search markers
function clearSearchMarkers() {
  searchMarkers.forEach(m => {
    if (map) map.removeLayer(m);
  });
  searchMarkers = [];
}

// Initialize
let pullStartY = 0;
let pullDist = 0;
const PULL_THRESHOLD = 80;

document.addEventListener('DOMContentLoaded', () => {
  load();
  initPullToRefresh();
  initFilters();
});

// Pull to Refresh
function initPullToRefresh() {
  const main = document.querySelector('.main');
  if (!main) return;

  // Create pull indicator
  const indicator = document.createElement('div');
  indicator.className = 'pull-indicator';
  indicator.innerHTML = `
    <div class="pull-spinner"></div>
    <span>Tarik untuk memuat ulang</span>
  `;
  main.prepend(indicator);

  main.addEventListener('touchstart', (e) => {
    if (main.scrollTop <= 0 && !isRefreshing) {
      pullStartY = (e as TouchEvent).touches[0].clientY;
    }
  }, { passive: true });

  main.addEventListener('touchmove', (e) => {
    if (pullStartY <= 0 || isRefreshing) return;
    pullDist = (e as TouchEvent).touches[0].clientY - pullStartY;
    
    if (pullDist > 0 && main.scrollTop <= 0) {
      indicator.style.transform = `translateY(${Math.min(pullDist * 0.5, 60) - 60}px)`;
      indicator.style.opacity = String(Math.min(pullDist / PULL_THRESHOLD, 1));
      
      if (pullDist > PULL_THRESHOLD) {
        indicator.classList.add('ready');
      } else {
        indicator.classList.remove('ready');
      }
    }
  }, { passive: true });

  main.addEventListener('touchend', () => {
    if (pullDist > PULL_THRESHOLD && !isRefreshing) {
      // Trigger refresh
      isRefreshing = true;
      indicator.classList.add('refreshing');
      indicator.style.transform = 'translateY(0)';
      
      // Reload data
      load().finally(() => {
        isRefreshing = false;
        indicator.classList.remove('refreshing', 'ready');
        indicator.style.transform = '';
        indicator.style.opacity = '0';
      });
    } else {
      // Reset
      indicator.style.transform = '';
      indicator.style.opacity = '0';
      indicator.classList.remove('ready');
    }
    pullStartY = 0;
    pullDist = 0;
  });
}

async function load() {
  // Auto-activate location if permission already granted
  if (navigator.permissions && navigator.geolocation) {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      
      if (permission.state === 'granted') {
        // Permission already granted - activate immediately
        activateLocationSilently();
      }
      
      // Listen for permission changes
      permission.onchange = () => {
        if (permission.state === 'granted') {
          activateLocationSilently();
        }
      };
    } catch (e) {
      // Fallback: try to get location anyway
      activateLocationSilently();
    }
  } else if (navigator.geolocation) {
    // No permissions API, try anyway
    activateLocationSilently();
  }

  try {
    const res = await fetch(apiBase() + '/api/public/warungs');
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    warungs = data.warungs || [];
    renderList();
    updateJsonLd();

    // Try to get location automatically
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => onLocation(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  } catch (e) {
    console.error('Failed to load warungs:', e);
    const list = $('list');
    const skeleton = $('skeleton-loading');
    if (skeleton) skeleton.style.display = 'none';
    if (list) {
      // Determine error type for better message
      let errorTitle = 'Gagal Memuat Data';
      let errorDesc = 'Terjadi kesalahan saat mengambil data warung.';
      let showRetry = true;
      
      if (e instanceof TypeError && e.message.includes('fetch')) {
        errorTitle = 'Tidak Ada Koneksi';
        errorDesc = 'Periksa koneksi internet Anda dan coba lagi.';
      } else if (e instanceof Error) {
        if (e.message.includes('HTTP 500')) {
          errorTitle = 'Server Bermasalah';
          errorDesc = 'Server sedang mengalami gangguan. Coba beberapa saat lagi.';
        } else if (e.message.includes('HTTP 404')) {
          errorTitle = 'Data Tidak Ditemukan';
          errorDesc = 'Endpoint API tidak ditemukan. Pastikan server berjalan.';
        } else if (e.message.includes('HTTP')) {
          errorTitle = `Error ${e.message.split(' ')[1]}`;
          errorDesc = 'Terjadi kesalahan pada server.';
        }
      }

      list.innerHTML = `
        <div class="error-state">
          <div class="error-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h3 class="error-title">${errorTitle}</h3>
          <p class="error-desc">${errorDesc}</p>
          ${showRetry ? `
          <button class="error-retry" onclick="window.retryLoad?.()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Coba Lagi
          </button>
          <p class="error-hint">Mencoba otomatis dalam <span id="retry-countdown">5</span> detik...</p>
          ` : ''}
        </div>
      `;
      
      // Auto-retry countdown
      if (showRetry) {
        let countdown = 5;
        const countdownEl = document.getElementById('retry-countdown');
        const interval = setInterval(() => {
          countdown--;
          if (countdownEl) countdownEl.textContent = String(countdown);
          if (countdown <= 0) {
            clearInterval(interval);
            window.retryLoad?.();
          }
        }, 1000);
      }
    }
  }
}

// Activate location silently (no button click needed)
function activateLocationSilently() {
  navigator.geolocation.getCurrentPosition(
    (pos) => onLocation(pos.coords.latitude, pos.coords.longitude),
    () => {}, // Silent fail
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

// Location
function requestLocation() {
  if (!navigator.geolocation) {
    alert('GPS tidak tersedia di perangkat ini');
    return;
  }
  
  const btn = $('loc-btn');
  if (btn) btn.textContent = 'Memuat...';
  
  navigator.geolocation.getCurrentPosition(
    (pos) => onLocation(pos.coords.latitude, pos.coords.longitude),
    (err) => {
      if (btn) btn.textContent = 'Coba Lagi';
      const msg = err.code === 1 
        ? 'Izinkan akses lokasi di pengaturan browser'
        : err.code === 2 
          ? 'Lokasi tidak tersedia'
          : 'Waktu permintaan lokasi habis';
      alert(msg);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function onLocation(lat: number, lng: number) {
  myLat = lat;
  myLng = lng;

  const title = $('loc-title');
  const desc = $('loc-desc');
  const btn = $('loc-btn');

  if (title) title.textContent = 'Lokasi Aktif';
  if (desc) desc.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  if (btn) btn.style.display = 'none';

  // Add status badge
  const banner = $('loc-banner');
  if (banner && !$('loc-status')) {
    const badge = document.createElement('span');
    badge.id = 'loc-status';
    badge.className = 'loc-status';
    badge.textContent = '✓ Aktif';
    banner.appendChild(badge);
  }

  // Reverse geocoding
  fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
    {
      headers: { 'Accept-Language': 'id' },
    }
  )
    .then((r) => r.json())
    .then((data) => {
      if (data.address) {
        const addr = data.address;
        const parts: string[] = [];
        if (addr.road) parts.push(addr.road);
        if (addr.village || addr.suburb || addr.neighbourhood)
          parts.push(addr.village || addr.suburb || addr.neighbourhood);
        if (addr.city || addr.town || addr.regency)
          parts.push(addr.city || addr.town || addr.regency);
        if (parts.length && desc) {
          desc.textContent = parts.join(', ');
        }
      }
    })
    .catch(() => {});

  sortAndRender();
}

// Utilities
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// Render
function sortAndRender() {
  if (myLat && myLng) {
    warungs.forEach((w) => {
      w._dist = haversine(myLat!, myLng!, w.latitude, w.longitude);
    });
    warungs.sort((a, b) => (a._dist || 0) - (b._dist || 0));
  }
  renderList();
}

function renderList() {
  const list = $('list');
  const skeleton = $('skeleton-loading');
  if (!list) return;

  // Hide skeleton when data is loaded
  if (skeleton) skeleton.style.display = 'none';

  // Apply sorting
  const sortedWarungs = applySort(warungs);

  if (!sortedWarungs.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <rect x="10" y="30" width="60" height="36" rx="6" fill="#e0ccaf"/>
            <rect x="16" y="36" width="48" height="24" rx="4" fill="#5d4037"/>
            <path d="M10 30L40 14L70 30" stroke="#5d4037" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="32" y="42" width="16" height="18" rx="3" fill="#c8956c"/>
            <rect x="20" y="26" width="6" height="10" rx="2" fill="#7d5a38"/>
            <circle cx="58" cy="26" r="3" fill="#c8956c"/>
            <path d="M36 54h8" stroke="#f7f3eb" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h3 class="empty-title">Belum Ada Warung</h3>
        <p class="empty-desc">Warung kopi terdekat akan muncul di sini. Cek kembali nanti atau aktifkan lokasi.</p>
        <div class="empty-hint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Aktifkan lokasi untuk menemukan warung terdekat</span>
        </div>
      </div>
    `;
    return;
  }

  let h = '';
  sortedWarungs.forEach((w) => {
    const dist = w._dist != null ? formatDist(w._dist) : null;
    const totalStock = w.products.reduce((sum, p) => sum + p.available_qty, 0);
    const thumbHtml = w.photo_url
      ? `<img src="${esc(w.photo_url)}" alt="${esc(w.name)}" width="56" height="56" loading="lazy" decoding="async" class="warung-card__thumb-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';

    const placeholderHtml = `
      <div class="warung-card__thumb-placeholder" ${w.photo_url ? 'style="display:none"' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
    `;

    h += `<button class="warung-card" data-id="${w.id}" aria-label="Lihat detail ${esc(w.name)}">
      <div class="warung-card__thumb">
        ${thumbHtml}
        ${placeholderHtml}
      </div>
      <div class="warung-card__content">
        <div class="warung-card__row">
          <h3 class="warung-card__name">${esc(w.name)}</h3>
          ${dist ? `<span class="warung-card__dist">${dist}</span>` : ''}
        </div>
        <p class="warung-card__addr">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          ${esc(w.address || '-')}
        </p>
      </div>
    </button>`;
  });

  list.innerHTML = h;

  // Add click handlers
  list.querySelectorAll('.warung-card').forEach((card) => {
    const id = card.getAttribute('data-id');
    if (id) {
      card.addEventListener('click', () => openDetail(id));
      card.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          e.preventDefault();
          openDetail(id);
        }
      });
    }
  });
}

// Detail
function openDetail(id: string) {
  const w = warungs.find((x) => x.id === id);
  if (!w) return;
  selected = w;

  const title = $('d-title');
  const addr = $('d-addr');
  const dist = $('d-dist');
  const photo = $('d-photo') as HTMLImageElement;
  const products = $('d-products');

  if (title) title.textContent = w.name;
  if (addr) addr.textContent = w.address || '-';
  if (dist) dist.textContent = w._dist != null ? `📍 ${formatDist(w._dist)} dari lokasi Anda` : '';

  if (photo) {
    if (w.photo_url) {
      photo.src = w.photo_url;
      photo.alt = w.name;
      photo.style.display = '';
    } else {
      photo.style.display = 'none';
    }
  }

  if (products) {
    let h = '';
    w.products.forEach((p) => {
      h += `<div class="detail-product">
        <div class="detail-product__info">
          <div class="detail-product__name">${esc(p.name)}</div>
          <div class="detail-product__qty">stok terakhir ${p.available_qty}</div>
        </div>
        <div class="detail-product__price">Rp ${fmt(p.price)}</div>
      </div>`;
    });
    products.innerHTML = h;
  }

  const overlay = $('detail-overlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeDetail(e?: Event) {
  if (e && e.target !== $('detail-overlay')) return;
  closeDetailDirect();
}

function closeDetailDirect() {
  const overlay = $('detail-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function openMaps() {
  if (!selected) return;
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`,
    '_blank'
  );
}

function openPeta() {
  if (myLat && myLng) {
    window.open(
      `https://www.google.com/maps/@${myLat},${myLng},15z`,
      '_blank'
    );
  } else {
    window.open('https://www.google.com/maps', '_blank');
  }
}

// JSON-LD
function updateJsonLd() {
  const el = document.getElementById('json-ld');
  if (!el) return;
  const brand = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || 'Konsi';
  const siteBaseUrl = baseUrl();

  const stores = warungs.map((w) => ({
    '@type': 'Store',
    name: w.name,
    description: `Warung kopi dengan ${w.products?.length || 0} produk tersedia`,
    url: siteBaseUrl + '/',
    address: {
      '@type': 'PostalAddress',
      streetAddress: w.address || '',
      addressCountry: 'ID',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: w.latitude,
      longitude: w.longitude,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Menu Kopi',
      itemListElement: (w.products || []).map((p) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Product',
          name: p.name,
          offers: {
            '@type': 'Offer',
            price: String(p.price || 0),
            priceCurrency: 'IDR',
            availability:
              p.available_qty > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
          },
        },
      })),
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: brand,
        url: siteBaseUrl + '/',
        description:
          'Temukan warung kopi terdekat yang masih punya stok kopi segar. Cek lokasi, produk tersedia, dan navigasi langsung ke warung kesukaanmu.',
        inLanguage: 'id-ID',
      },
      {
        '@type': 'ItemList',
        itemListElement: stores.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: s,
        })),
      },
    ],
  };

  el.textContent = JSON.stringify(jsonLd);
}


// Filter and Sort
let currentSort = 'distance';

function initFilters() {
  const filterBtn = $('filter-btn');
  const filterBar = $('filter-bar');
  
  if (!filterBtn || !filterBar) return;
  
  // Toggle filter bar
  filterBtn.addEventListener('click', () => {
    const isVisible = filterBar.style.display !== 'none';
    filterBar.style.display = isVisible ? 'none' : 'flex';
  });
  
  // Sort chips
  filterBar.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Update active state
      filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      // Apply sort
      currentSort = chip.getAttribute('data-sort') || 'distance';
      sortAndRender();
    });
  });
}

// Sort warungs based on current sort
function applySort(warungsToSort: Warung[]): Warung[] {
  const sorted = [...warungsToSort];
  
  switch (currentSort) {
    case 'stock':
      sorted.sort((a, b) => {
        const stockA = a.products.reduce((sum, p) => sum + p.available_qty, 0);
        const stockB = b.products.reduce((sum, p) => sum + p.available_qty, 0);
        return stockB - stockA;
      });
      break;
    case 'products':
      sorted.sort((a, b) => b.products.length - a.products.length);
      break;
    case 'distance':
    default:
      if (myLat && myLng) {
        sorted.sort((a, b) => (a._dist || Infinity) - (b._dist || Infinity));
      }
      break;
  }
  
  return sorted;
}

// Brand loading now lives in ./brand.ts and runs globally via BaseLayout (site.ts).

// Expose functions to global scope for onclick handlers
(window as any).requestLocation = requestLocation;
(window as any).openDetail = openDetail;
(window as any).closeDetail = closeDetail;
(window as any).closeDetailDirect = closeDetailDirect;
(window as any).openMaps = openMaps;
(window as any).openPeta = openPeta;
(window as any).retryLoad = () => load();
