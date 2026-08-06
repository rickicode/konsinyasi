/**
 * Security headers middleware for Konsinyasi API.
 *
 * Sets a comprehensive set of HTTP security headers on every response:
 * - Content-Security-Policy (CSP) with nonce-based strict-dynamic
 * - X-Frame-Options: DENY
 * - X-Content-Type-Options: nosniff
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy: camera=(), microphone=(), geolocation=()
 * - Strict-Transport-Security (HSTS): max-age=31536000; includeSubDomains
 *
 * The per-request CSP nonce is stored in `c.get('cspNonce')` so downstream
 * handlers (e.g. HTML templating) can inject it into <script nonce="…"> tags.
 */
import type { MiddlewareHandler } from 'hono';

/**
 * Generate a cryptographically secure, URL-safe nonce (base64, 128-bit).
 * Uses the Web Crypto API available in Cloudflare Workers.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Build the Content-Security-Policy header value.
 *
 * Uses `strict-dynamic` with a per-request nonce so only scripts carrying the
 * nonce execute; scripts loaded by a trusted script inherit trust transitively.
 * `unsafe-inline` is kept as a fallback for older browsers that do not support
 * `strict-dynamic` (it is ignored by browsers that do).
 *
 * CSP directives reference the current production asset origins:
 * - Worker origin: https://konsi.rickicode.workers.dev
 * - R2 CDN:        https://cdn.kopi.hijitoko.com
 * - OpenStreetMap tile servers
 * - ArcGIS imagery
 */
function buildCsp(nonce: string): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'strict-dynamic' 'nonce-${nonce}' 'unsafe-inline' https: http:`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com`,
    `img-src 'self' data: blob: https://konsi.rickicode.workers.dev https://cdn.kopi.hijitoko.com https://*.tile.openstreetmap.org https://server.arcgisonline.com`,
    `connect-src 'self' https://konsi.rickicode.workers.dev https://nominatim.openstreetmap.org`,
    `font-src 'self' https://fonts.gstatic.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];
  return directives.join('; ');
}

/**
 * Hono middleware that injects security headers into every response.
 */
export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    const nonce = generateNonce();

    // Expose nonce to downstream handlers (e.g. HTML templating).
    c.set('cspNonce', nonce);

    // Content-Security-Policy — nonce-based strict-dynamic.
    c.header('Content-Security-Policy', buildCsp(nonce));

    // Prevent the page from being rendered inside an iframe.
    c.header('X-Frame-Options', 'DENY');

    // Stop browsers from MIME-sniffing the response content type.
    c.header('X-Content-Type-Options', 'nosniff');

    // Limit the Referer header sent with navigations away from the origin.
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Disable powerful browser features that the app does not use.
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Enforce HTTPS for one year (standard max-age).
    c.header(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );

    await next();
  };
}

export default securityHeaders;
