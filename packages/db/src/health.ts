import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { loadManifest, validateRuntimeEnv } from '@gifters/config';
import { databaseConnectionOptions, readManifest, type Database } from './index';
import { schema } from './schema';
import { scopedTransaction } from './context';

let pending: Promise<boolean> | undefined;

async function probe() {
  const config = validateRuntimeEnv();
  const deadlineMs = loadManifest().health_timeout_ms;
  // A separate bounded connection cannot cancel a live financial transaction.
  const client = postgres(config.databaseUrl, {
    ...databaseConnectionOptions(config.databaseUrl), max: 1, prepare: false,
    fetch_types: false, connect_timeout: Math.max(1,Math.ceil(deadlineMs / 1000)),
    connection: { statement_timeout: deadlineMs },
  });
  const database: Database = drizzle(client,{schema});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const started = performance.now();
  try {
    const ready = scopedTransaction(database,{access:'service'},(tx) => readManifest(tx)).then((manifest) => {
      // The bootstrap ceiling bounds cold-start lookup; the DB can shorten it.
      return performance.now() - started < Math.min(deadlineMs,manifest.health_timeout_ms);
    });
    return await Promise.race([
      ready,
      new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false),deadlineMs); }),
    ]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    // Force-close timed-out probes instead of leaving unreachable work queued.
    await client.end({ timeout: 0 });
  }
}

export function databaseHealthy() {
  if (!pending) pending = probe().catch(() => false).finally(() => { pending = undefined; });
  return pending;
}
