export type CacheSetOptions = { ttlSeconds?: number };

export interface CacheProvider {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  dispose(): Promise<void>;
}

export type MemoryCacheBudget = { maxEntries: number; maxBytes: number };
const DEFAULT_BUDGET: MemoryCacheBudget = { maxEntries: 100, maxBytes: 5 * 1024 * 1024 };
function expiry(ttlSeconds?: number) {
  if (ttlSeconds === undefined) return undefined;
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds > 1_000_000) throw new Error('Invalid cache TTL');
  return Date.now() + ttlSeconds * 1000;
}

export class MemoryCache implements CacheProvider {
  private readonly values = new Map<string, { value: string; expiresAt?: number; bytes: number }>();
  private usedBytes = 0;
  constructor(private readonly budget: MemoryCacheBudget = DEFAULT_BUDGET) {
    if (!Number.isSafeInteger(budget.maxEntries) || budget.maxEntries <= 0 || !Number.isSafeInteger(budget.maxBytes) || budget.maxBytes <= 0) throw new Error('Invalid cache budget');
    this.budget = { ...budget };
  }
  private remove(key: string) {
    const row = this.values.get(key);
    if (row) { this.usedBytes -= row.bytes; this.values.delete(key); }
  }
  private prune() {
    for (const [key, row] of this.values) if (row.expiresAt !== undefined && row.expiresAt <= Date.now()) this.remove(key);
  }
  private read<T>(key: string): T | null {
    this.prune();
    const row = this.values.get(key);
    if (!row) return null;
    this.values.delete(key); this.values.set(key, row);
    return JSON.parse(row.value) as T;
  }
  private store(key: string, value: unknown, expiresAt?: number) {
    const raw = JSON.stringify(value);
    if (raw === undefined) throw new Error('Invalid cache value');
    const bytes = Buffer.byteLength(key) + Buffer.byteLength(raw);
    this.prune(); this.remove(key);
    if (bytes > this.budget.maxBytes) return;
    while (this.values.size >= this.budget.maxEntries || this.usedBytes + bytes > this.budget.maxBytes) this.remove(this.values.keys().next().value!);
    this.values.set(key, { value: raw, expiresAt, bytes }); this.usedBytes += bytes;
  }
  async dispose() { this.values.clear(); this.usedBytes = 0; }
  async get<T>(key: string): Promise<T | null> { return this.read<T>(key); }
  async set<T>(key: string, value: T, options: CacheSetOptions = {}) { this.store(key, value, expiry(options.ttlSeconds)); }
  async del(key: string) { this.remove(key); }
  async incr(key: string, ttlSeconds?: number) {
    const expiresAt = expiry(ttlSeconds);
    // No await between reading and writing: concurrent calls cannot lose increments.
    const current = this.read<number>(key) ?? 0;
    if (!Number.isSafeInteger(current) || current < 0 || current === Number.MAX_SAFE_INTEGER) throw new Error('Invalid cache counter');
    const existingExpiry = this.values.get(key)?.expiresAt;
    const next = current + 1;
    this.store(key, next, existingExpiry ?? expiresAt);
    return next;
  }
}

// One Redis operation establishes a fixed window and repairs an unexpired legacy
// counter missing its expiry. A later increment never extends a live window.
const INCREMENT_SCRIPT = `local value = redis.call('INCR', KEYS[1])
if tonumber(ARGV[1]) > 0 and redis.call('TTL', KEYS[1]) == -1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return value`;

const IO_TIMEOUT_MS = 3000;
const MAX_IO_BYTES = 1024 * 1024;
function validKey(key: string) {
  if (!key || Buffer.byteLength(key) > 4096) throw new Error('CACHE_INPUT_INVALID');
}
function encode(value: unknown) {
  const raw = JSON.stringify(value);
  if (raw === undefined || Buffer.byteLength(raw) > MAX_IO_BYTES) throw new Error('CACHE_INPUT_INVALID');
  return raw;
}
function decode<T>(raw: unknown): T | null {
  if (raw === null) return null;
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > MAX_IO_BYTES) throw new Error('CACHE_RESPONSE_INVALID');
  try { return JSON.parse(raw) as T; } catch { throw new Error('CACHE_RESPONSE_INVALID'); }
}

/** Display cache only: callers decide whether an unavailable cache may fall back. */
export class UpstashRestCache implements CacheProvider {
  private closed = false;
  private readonly controllers = new Set<AbortController>();
  constructor(private readonly url: string, private readonly token: string, fixture = false) {
    const parsed = new URL(url);
    if (parsed.username || parsed.password || parsed.hash ||
        (parsed.protocol !== 'https:' && !(fixture && parsed.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname))) ||
        !token || token.length > 8192 || /[\r\n]/.test(token)) throw new Error('CACHE_CONFIGURATION_INVALID');
  }
  async dispose() {
    this.closed = true;
    for (const controller of this.controllers) controller.abort();
    this.controllers.clear();
  }
  private async command<T>(parts: Array<string | number>): Promise<T> {
    if (this.closed || this.controllers.size >= 8) throw new Error('CACHE_UNAVAILABLE');
    const body = encode(parts), controller = new AbortController();
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), IO_TIMEOUT_MS);
    try {
      const response = await fetch(this.url, {
        method: 'POST', redirect: 'error',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body, signal: controller.signal,
      });
      if (!response.ok) throw new Error('CACHE_UNAVAILABLE');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('CACHE_RESPONSE_INVALID');
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > MAX_IO_BYTES) { await reader.cancel(); throw new Error('CACHE_RESPONSE_INVALID'); }
        chunks.push(next.value);
      }
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.error !== undefined || !Object.hasOwn(payload, 'result')) throw new Error('CACHE_RESPONSE_INVALID');
      return payload.result as T;
    } catch { throw new Error('CACHE_UNAVAILABLE'); }
    finally { clearTimeout(timer); this.controllers.delete(controller); }
  }
  async get<T>(key: string): Promise<T | null> {
    validKey(key);
    return decode<T>(await this.command<string | null>(['GET', key]));
  }
  async set<T>(key: string, value: T, options: CacheSetOptions = {}) {
    validKey(key);
    const args: Array<string | number> = ['SET', key, encode(value)];
    expiry(options.ttlSeconds);
    if (options.ttlSeconds !== undefined) args.push('EX', options.ttlSeconds);
    if (await this.command(args) !== 'OK') throw new Error('CACHE_RESPONSE_INVALID');
  }
  async del(key: string) {
    validKey(key);
    const result = await this.command<number>(['DEL', key]);
    if (result !== 0 && result !== 1) throw new Error('CACHE_RESPONSE_INVALID');
  }
  async incr(key: string, ttlSeconds?: number) {
    validKey(key); expiry(ttlSeconds);
    const value = await this.command<number>(['EVAL', INCREMENT_SCRIPT, 1, key, ttlSeconds ?? 0]);
    if (!Number.isSafeInteger(value) || value < 1) throw new Error('CACHE_RESPONSE_INVALID');
    return value;
  }
}

/** Structural adapter so an ioredis-compatible client can be injected without coupling domain code to ioredis. */
export interface IORedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  set(key: string, value: string, expiryMode: 'EX', seconds: number): Promise<unknown>;
  del(key: string): Promise<number>;
  eval(script: string, numKeys: number, key: string, ttlSeconds: number): Promise<unknown>;
  disconnect?(): void;
}

export class IORedisCache implements CacheProvider {
  private closed = false;
  private pending = 0;
  private readonly cancellations = new Set<() => void>();
  constructor(private readonly client: IORedisLike, private readonly owned = false) {}
  async dispose() {
    this.closed = true;
    for (const cancel of this.cancellations) cancel();
    this.cancellations.clear();
    if (this.owned) this.client.disconnect?.();
  }
  private async command<T>(load: () => Promise<T>): Promise<T> {
    if (this.closed || this.pending >= 8) throw new Error('CACHE_UNAVAILABLE');
    this.pending++;
    // Count a borrowed client's unresolved I/O even after the caller deadline.
    // It cannot create unlimited abandoned commands or close another owner's socket.
    const operation = Promise.resolve().then(() => { if (this.closed) throw new Error("CACHE_UNAVAILABLE"); return load(); }).finally(() => { this.pending--; });
    let timer: ReturnType<typeof setTimeout> | undefined, cancel: (() => void) | undefined;
    try {
      return await Promise.race([operation, new Promise<never>((_resolve, reject) => {
        cancel = () => reject(new Error('CACHE_UNAVAILABLE'));
        this.cancellations.add(cancel);
        timer = setTimeout(() => { if (this.owned) void this.dispose(); cancel!(); }, IO_TIMEOUT_MS);
      })]);
    } catch { throw new Error('CACHE_UNAVAILABLE'); }
    finally { if (timer) clearTimeout(timer); if (cancel) this.cancellations.delete(cancel); }
  }
  async get<T>(key: string): Promise<T | null> {
    validKey(key);
    return decode<T>(await this.command(() => this.client.get(key)));
  }
  async set<T>(key: string, value: T, options: CacheSetOptions = {}) {
    validKey(key); expiry(options.ttlSeconds);
    const raw = encode(value);
    const result = await this.command(() => options.ttlSeconds !== undefined
      ? this.client.set(key, raw, 'EX', options.ttlSeconds)
      : this.client.set(key, raw));
    if (result !== 'OK') throw new Error('CACHE_RESPONSE_INVALID');
  }
  async del(key: string) {
    validKey(key);
    const result = await this.command(() => this.client.del(key));
    if (result !== 0 && result !== 1) throw new Error('CACHE_RESPONSE_INVALID');
  }
  async incr(key: string, ttlSeconds?: number) {
    validKey(key); expiry(ttlSeconds);
    const value = await this.command(() => this.client.eval(INCREMENT_SCRIPT, 1, key, ttlSeconds ?? 0));
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw new Error('CACHE_RESPONSE_INVALID');
    return value;
  }
}

export async function createDefaultCache(env: NodeJS.ProcessEnv = process.env, injectedRedis?: IORedisLike): Promise<CacheProvider> {
  const provider = env.CACHE_PROVIDER ?? 'upstash';
  if (provider === 'upstash') {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      if (env.VERCEL === '1' || env.NODE_ENV === 'production') throw new Error('Upstash credentials are required for hosted production');
      return new MemoryCache();
    }
    return new UpstashRestCache(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  }
  if (provider === 'ioredis' || provider === 'redis') {
    if (injectedRedis) return new IORedisCache(injectedRedis);
    if (!env.REDIS_URL) throw new Error('Redis configuration is required for the selected adapter');
    const { default: Redis } = await import('ioredis');
    const endpoint = new URL(env.REDIS_URL);
    if (endpoint.protocol !== 'rediss:' || endpoint.hash) throw new Error('CACHE_CONFIGURATION_INVALID');
    const client = new Redis(env.REDIS_URL, { lazyConnect: true, connectTimeout: IO_TIMEOUT_MS, commandTimeout: IO_TIMEOUT_MS, maxRetriesPerRequest: 1, retryStrategy: () => null, enableOfflineQueue: false });
    try { await client.connect(); } catch { client.disconnect(); throw new Error('CACHE_UNAVAILABLE'); }
    return new IORedisCache(client, true);
  }
  if (provider !== 'postgres_memory') throw new Error('Unsupported cache provider');
  // postgres_memory intentionally maps to process-local memory; PostgreSQL remains the durable fallback.
  return new MemoryCache();
}
