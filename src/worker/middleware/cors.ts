import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';

function isOriginAllowed(origin: string, allowedPatterns: string[]): boolean {
  // Hostnames are case-insensitive per RFC 3986, and a malformed Origin header
  // (e.g. sent by a non-browser client) must never crash the request with 500 —
  // it should simply be treated as not allowed.
  let originHost: string;
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  const normalizedOrigin = origin.toLowerCase();
  for (const pattern of allowedPatterns) {
    // Exact match
    if (pattern.toLowerCase() === normalizedOrigin) return true;

    // Wildcard match: *.domain.com matches sub.domain.com (and the apex)
    if (pattern.startsWith('*.')) {
      const domain = pattern.slice(2).toLowerCase(); // Remove *.
      if (originHost === domain || originHost.endsWith('.' + domain)) {
        return true;
      }
    }
  }
  return false;
}

export function corsMiddleware(): MiddlewareHandler {
  return cors({
    origin: (requestOrigin, c) => {
      const raw: string = (c.env?.ALLOWED_ORIGINS ?? '').trim();
      
      if (raw === '') {
        return requestOrigin;
      }
      
      const allowed: string[] = raw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      
      if (allowed.length === 0) {
        return requestOrigin;
      }
      
      // Check if origin matches any pattern (exact or wildcard)
      if (requestOrigin && isOriginAllowed(requestOrigin, allowed)) {
        return requestOrigin;
      }
      
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });
}

export default corsMiddleware;
