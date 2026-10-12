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
  if (response.status===401 && username) clearActiveUserScope(username);
  const body=await response.json().catch(()=>null);
  if (!response.ok) throw new ApiError(body?.error?.code ?? (response.status===401?'UNAUTHENTICATED':'INTERNAL_ERROR'));
  if (!body) throw new ApiError('INTERNAL_ERROR');
  return body.data as T;
}

export function mutation<T>(path: string, username: string, body: unknown, method = 'POST') {
  return api<T>(path, username, {
    method,
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(body),
  });
}
