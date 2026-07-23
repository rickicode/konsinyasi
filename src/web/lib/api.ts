type User = { id: string | number; email: string; name: string; role: string; status?: string };

let authMeCache:
  | {
      promise: Promise<User | null>;
      startedAt: number;
    }
  | undefined;

const AUTH_ME_TTL_MS = 2000;

export async function api(path: string, options?: RequestInit): Promise<Response> {
  const shouldSetJson =
    options?.body && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams);
  return fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      ...(shouldSetJson ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });
}

/**
 * Memanggil /api/auth/me dengan cache singkat agar tidak membanjiri server
 * saat beberapa komponen membutuhkan user role secara bersamaan.
 */
export async function getCurrentUser(): Promise<User | null> {
  const now = Date.now();
  if (authMeCache && now - authMeCache.startedAt < AUTH_ME_TTL_MS) {
    return authMeCache.promise;
  }

  const promise = api('/api/auth/me')
    .then(async (res) => {
      if (!res.ok) return null;
      try {
        return (await res.json()) as User;
      } catch {
        return null;
      }
    })
    .catch(() => null);

  authMeCache = { promise, startedAt: now };
  return promise;
}
