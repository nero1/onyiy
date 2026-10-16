import {eq, ne, sql} from 'drizzle-orm';
import type {DbExecutor} from './index';
import {environmentInstances, xManifest} from './schema';

// Promotion and simulation requests share this transaction-scoped fence. A
// committed testnet namespace permanently retires demo access to this database.
const modeLock = 'gw:shared-database:payment-mode:v1';

export async function fenceSimulationDatabase(tx: DbExecutor) {
  const [state] = await tx.execute<{installed:boolean}>(sql`select pg_advisory_xact_lock_shared(hashtextextended(${modeLock},0)), to_regclass('public.environment_instances') is not null as installed`);
  if (!state?.installed) return; // Fresh binding preflight runs before schema installation.
  // Row locking detects a promotion committed after a repeatable snapshot
  // began: PostgreSQL rejects the stale snapshot rather than reading past it.
  await tx.select({key:xManifest.key}).from(xManifest)
    .where(eq(xManifest.key,'deployment_profile')).for('share');
  // The runtime is gw_service here. Use the existing scoped namespace policy;
  // no extra grant, owner connection, DDL or unscoped identity read is needed.
  await tx.execute(sql`select set_config('gw.environment','testnet',true)`);
  const [promoted] = await tx.select({id:environmentInstances.instanceId})
    .from(environmentInstances).where(eq(environmentInstances.environment,'testnet')).limit(1);
  if (promoted) throw new Error('DATABASE_PROMOTED_TO_TESTNET');
}

export async function fenceOwnerInitialization(tx: DbExecutor, environment: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${modeLock},0))`);
  if (environment === 'testnet') {
    // A physical row revision, with every configuration value/version unchanged.
    // This pairs with the runtime share lock for repeatable-read transactions.
    await tx.update(xManifest).set({value:sql`${xManifest.value}`})
      .where(eq(xManifest.key,'deployment_profile'));
  }
  if (environment === 'simulation') {
    const [promoted] = await tx.select({id:environmentInstances.instanceId})
      .from(environmentInstances).where(ne(environmentInstances.environment,'simulation')).limit(1);
    if (promoted) throw new Error('DATABASE_PROMOTED_TO_TESTNET');
  }
}
