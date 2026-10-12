const SCHEMA_VERSION = 'v1';
const ACTIVE_USER_KEY = `gw:${SCHEMA_VERSION}:active-user`;

type Envelope<T> = {
  owner: string;
  session: string;
  schema: string;
  createdAt: number;
  expiresAt: number;
  value: T;
};

function publicKey(key: string) { return `gw:${SCHEMA_VERSION}:public:${key}`; }
function userPrefix(owner: string, session = 'simulation') { return `gw:${SCHEMA_VERSION}:user:${owner}:${session}:`; }
function userKey(owner: string, key: string, session = 'simulation') { return `${userPrefix(owner, session)}${key}`; }

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function savePublicSnapshot<T>(key: string, value: T, ttlMs: number) {
  const now = Date.now();
  localStorage.setItem(publicKey(key), JSON.stringify({ owner: 'public', session: 'public', schema: SCHEMA_VERSION, createdAt: now, expiresAt: now + ttlMs, value } satisfies Envelope<T>));
}

export function loadPublicSnapshot<T>(key: string): T | null {
  const item = safeParse<Envelope<T>>(localStorage.getItem(publicKey(key)));
  if (!item || item.owner !== 'public' || item.schema !== SCHEMA_VERSION || item.expiresAt <= Date.now()) return null;
  return item.value;
}

export function saveUserSnapshot<T>(owner: string, key: string, value: T, ttlMs: number, session = 'simulation') {
  const now = Date.now();
  localStorage.setItem(userKey(owner, key, session), JSON.stringify({ owner, session, schema: SCHEMA_VERSION, createdAt: now, expiresAt: now + ttlMs, value } satisfies Envelope<T>));
}

export function loadUserSnapshot<T>(owner: string, key: string, session = 'simulation'): T | null {
  const item = safeParse<Envelope<T>>(localStorage.getItem(userKey(owner, key, session)));
  if (!item || item.owner !== owner || item.session !== session || item.schema !== SCHEMA_VERSION || item.expiresAt <= Date.now()) return null;
  return item.value;
}

export function clearUserScope(owner: string, session = 'simulation') {
  const prefix = userPrefix(owner, session);
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) localStorage.removeItem(key);
  }
}

export function activateUserScope(owner: string, session = 'simulation') {
  const previous = localStorage.getItem(ACTIVE_USER_KEY);
  if (previous && previous !== owner) clearUserScope(previous, session);
  localStorage.setItem(ACTIVE_USER_KEY, owner);
}

export function clearActiveUserScope() {
  const owner = localStorage.getItem(ACTIVE_USER_KEY);
  if (owner) clearUserScope(owner);
  localStorage.removeItem(ACTIVE_USER_KEY);
}
