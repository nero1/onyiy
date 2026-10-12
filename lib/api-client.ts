import { clearActiveUserScope } from './storage';

const BASE = '/api/v1';

export class ApiError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

export async function api<T>(path: string, username: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (username) headers.set('x-sim-user', username);

  const response = await fetch(`${BASE}${path}`, { ...init, headers, cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401) clearActiveUserScope();
    throw new ApiError(body?.error?.code ?? 'INTERNAL_ERROR');
  }
  return body.data as T;
}

export function mutation<T>(path: string, username: string, body: unknown, method = 'POST') {
  return api<T>(path, username, {
    method,
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(body),
  });
}
