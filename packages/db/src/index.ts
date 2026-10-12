import postgres, { type Sql } from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { loadManifest, validateRuntimeEnv } from '@gifters/config';
import { schema, xManifest } from './schema';

export type Database = PostgresJsDatabase<typeof schema>;
export type DbExecutor = Pick<Database, 'select' | 'insert' | 'update' | 'delete' | 'execute'>;

let runtimeClient: Sql | undefined;
let runtimeDb: Database | undefined;

function runtimeOptions() {
  const cfg = validateRuntimeEnv();
  const serverless = process.env.VERCEL === '1' || cfg.dbProvider === 'supabase';
  return {
    max: Number(process.env.DATABASE_POOL_MAX ?? (serverless ? 1 : 10)),
    idle_timeout: Number(process.env.DATABASE_IDLE_TIMEOUT_SECONDS ?? 20),
    connect_timeout: Number(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS ?? 10),
    prepare: cfg.dbProvider === 'supabase' ? false : true,
  };
}

export function sqlClient(): Sql {
  if (!runtimeClient) {
    const { databaseUrl } = validateRuntimeEnv();
    runtimeClient = postgres(databaseUrl, runtimeOptions());
  }
  return runtimeClient;
}

export function db(): Database {
  if (!runtimeDb) runtimeDb = drizzle(sqlClient(), { schema });
  return runtimeDb;
}

export async function closeDb() {
  if (runtimeClient) await runtimeClient.end({ timeout: 3 });
  runtimeClient = undefined;
  runtimeDb = undefined;
}

export async function withTx<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  return db().transaction(async (tx) => fn(tx));
}

export function migrationClient(): Sql {
  const cfg = validateRuntimeEnv();
  const url = process.env.DATABASE_MIGRATION_URL ?? cfg.databaseUrl;
  return postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10, prepare: false });
}

export async function getManifestValue<T>(key: string): Promise<T | undefined> {
  const rows = await db().select({ value: xManifest.value }).from(xManifest).where(eq(xManifest.key, key)).limit(1);
  return rows[0]?.value as T | undefined;
}

export async function seedManifest() {
  const manifest = loadManifest();
  for (const [key, value] of Object.entries(manifest)) {
    const scope = ['activity_statements','mainnet_enabled','default_locale','supported_locales','eligibility_min_age','cycle_max_concurrent','cycle_rejoin_cooldown_hours','payment_split_bps','simulation_policy','ui_show_queue_total','ui_rotation_policy','notification_page_size','pagination_policy','deployment_profile','product_content'].includes(key) || key.startsWith('feature_') ? 'public' : 'private';
    await db().insert(xManifest).values({
      key,
      value,
      type: Array.isArray(value) ? 'json' : typeof value,
      scope,
      description: `seeded ${key}`,
    }).onConflictDoNothing({ target: xManifest.key });
  }
}

export * from './schema';
