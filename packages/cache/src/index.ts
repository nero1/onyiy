export type CacheSetOptions = { ttlSeconds?: number };

export interface CacheProvider {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
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

/** Upstash-compatible REST adapter using fetch, avoiding a vendor SDK dependency. */
export class UpstashRestCache implements CacheProvider {
  constructor(private readonly url: string, private readonly token: string) {}
  private async command<T>(parts: Array<string | number>): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(parts),
    });
    if (!response.ok) throw new Error(`Upstash Redis error: ${response.status}`);
    const payload = await response.json() as { result?: T; error?: unknown };
    if (payload.error !== undefined || !Object.prototype.hasOwnProperty.call(payload, 'result')) throw new Error('Redis command failed');
    return payload.result as T;
  }
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.command<string | null>(['GET', key]);
    return raw === null ? null : JSON.parse(raw) as T;
  }
  async set<T>(key: string, value: T, options: CacheSetOptions = {}) {
    const args: Array<string | number> = ['SET', key, JSON.stringify(value)];
    expiry(options.ttlSeconds);
    if (options.ttlSeconds !== undefined) args.push('EX', options.ttlSeconds);
    await this.command(args);
  }
  async del(key: string) { await this.command<number>(['DEL', key]); }
  async incr(key: string, ttlSeconds?: number) {
    expiry(ttlSeconds);
    const value = await this.command<number>(['EVAL', INCREMENT_SCRIPT, 1, key, ttlSeconds ?? 0]);
    if (!Number.isSafeInteger(value)) throw new Error('Invalid cache counter response');
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
}

export class IORedisCache implements CacheProvider {
  constructor(private readonly client: IORedisLike) {}
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw === null ? null : JSON.parse(raw) as T;
  }
  async set<T>(key: string, value: T, options: CacheSetOptions = {}) {
    expiry(options.ttlSeconds);
    if (options.ttlSeconds !== undefined) await this.client.set(key, JSON.stringify(value), 'EX', options.ttlSeconds);
    else await this.client.set(key, JSON.stringify(value));
  }
  async del(key: string) { await this.client.del(key); }
  async incr(key: string, ttlSeconds?: number) {
    expiry(ttlSeconds);
    const value = await this.client.eval(INCREMENT_SCRIPT, 1, key, ttlSeconds ?? 0);
    if (!Number.isSafeInteger(value)) throw new Error('Invalid cache counter response');
    return value as number;
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
    const client = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    await client.connect();
    return new IORedisCache(client);
  }
  if (provider !== 'postgres_memory') throw new Error('Unsupported cache provider');
  // postgres_memory intentionally maps to process-local memory; PostgreSQL remains the durable fallback.
  return new MemoryCache();
}
