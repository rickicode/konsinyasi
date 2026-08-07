// api.ts — shared API client for storefront pages.
import { apiBase } from './config';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Fetch a JSON endpoint relative to the API base URL (always absolute). */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiBase() + path, init);
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // Guards against HTML fallbacks (SPA/404 pages) being parsed as JSON —
    // e.g. when the API base URL is empty and the fetch hits the Pages origin.
    throw new Error('Respons bukan JSON — periksa API base URL');
  }
  return (await res.json()) as T;
}
