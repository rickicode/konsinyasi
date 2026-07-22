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
