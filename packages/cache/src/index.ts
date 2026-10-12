export type CacheSetOptions = { ttlSeconds?: number };

export interface CacheProvider {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
}

export class MemoryCache implements CacheProvider {
  private readonly values = new Map<string, { value: string; expiresAt?: number }>();
  async get<T>(key: string): Promise<T | null> {
    const row = this.values.get(key);
    if (!row) return null;
    if (row.expiresAt && row.expiresAt <= Date.now()) { this.values.delete(key); return null; }
    return JSON.parse(row.value) as T;
  }
  async set<T>(key: string, value: T, options: CacheSetOptions = {}) {
    this.values.set(key, { value: JSON.stringify(value), expiresAt: options.ttlSeconds ? Date.now() + options.ttlSeconds * 1000 : undefined });
  }
  async del(key: string) { this.values.delete(key); }
  async incr(key: string, ttlSeconds?: number) {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next, { ttlSeconds });
    return next;
  }
}

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
    const payload = await response.json() as { result: T };
    return payload.result;
  }
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.command<string | null>(['GET', key]);
    return raw === null ? null : JSON.parse(raw) as T;
  }
  async set<T>(key: string, value: T, options: CacheSetOptions = {}) {
    const args: Array<string | number> = ['SET', key, JSON.stringify(value)];
    if (options.ttlSeconds) args.push('EX', options.ttlSeconds);
    await this.command(args);
  }
  async del(key: string) { await this.command<number>(['DEL', key]); }
  async incr(key: string, ttlSeconds?: number) {
    const value = await this.command<number>(['INCR', key]);
    if (ttlSeconds && value === 1) await this.command<number>(['EXPIRE', key, ttlSeconds]);
    return value;
  }
}

/** Structural adapter so an ioredis-compatible client can be injected without coupling domain code to ioredis. */
export interface IORedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  set(key: string, value: string, expiryMode: 'EX', seconds: number): Promise<unknown>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

export class IORedisCache implements CacheProvider {
  constructor(private readonly client: IORedisLike) {}
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw === null ? null : JSON.parse(raw) as T;
  }
  async set<T>(key: string, value: T, options: CacheSetOptions = {}) {
    if (options.ttlSeconds) await this.client.set(key, JSON.stringify(value), 'EX', options.ttlSeconds);
    else await this.client.set(key, JSON.stringify(value));
  }
  async del(key: string) { await this.client.del(key); }
  async incr(key: string, ttlSeconds?: number) {
    const value = await this.client.incr(key);
    if (ttlSeconds && value === 1) await this.client.expire(key, ttlSeconds);
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
    if (!env.REDIS_URL) return new MemoryCache();
    const { default: Redis } = await import('ioredis');
    const client = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    await client.connect();
    return new IORedisCache(client);
  }
  // postgres_memory intentionally maps to process-local memory; PostgreSQL remains the durable fallback.
  return new MemoryCache();
}
