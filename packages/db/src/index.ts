import postgres, { type Sql } from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { loadManifest, parseManifest, manifestDefinition, validateManifestValue, validateSecurityCeilings, validateRuntimeEnv } from '@gifters/config';
import { schema, xManifest } from './schema';
import { databaseConnectionOptions } from './connection-options';
import { withContext } from './context';
import { drainAdmission } from './work-budget';

export type Database = PostgresJsDatabase<typeof schema>;
export type DbExecutor = Pick<Database, 'select' | 'insert' | 'update' | 'delete' | 'execute'>;

let runtimeClient: Sql | undefined;
let runtimeDb: Database | undefined;

export function sqlClient(): Sql {
  if (!runtimeClient) {
    const { databaseUrl } = validateRuntimeEnv();
    runtimeClient = postgres(databaseUrl, databaseConnectionOptions(databaseUrl));
  }
  return runtimeClient;
}

export function db(): Database {
  if (!runtimeDb) runtimeDb = drizzle(sqlClient(), { schema });
  return runtimeDb;
}

export async function closeDb() {
  if (runtimeDb) drainAdmission(runtimeDb);
  if (runtimeClient) await runtimeClient.end({ timeout: 3 });
  runtimeClient = undefined;
  runtimeDb = undefined;
}

export function migrationClient(options:{quiet?:boolean}={}): Sql {
  const cfg = validateRuntimeEnv();
  const url = process.env.DATABASE_MIGRATION_URL ?? cfg.databaseUrl;
  return postgres(url, { ...databaseConnectionOptions(url), max: 1, idle_timeout: 5, prepare: false, ...(options.quiet?{onnotice:()=>{}}:{}) });
}

export async function getManifestValue<T>(key: string): Promise<T | undefined> {
  return (await readManifest())[key] as T | undefined;
}

export async function readManifest(database?: DbExecutor): Promise<ReturnType<typeof parseManifest>> {
  if (!database) return withContext({access:'service'},(tx) => readManifest(tx));
  const rows = await database.select({key:xManifest.key,value:xManifest.value,scope:xManifest.scope}).from(xManifest);
  const values: Record<string,unknown> = {};
  for (const row of rows) {
    const definition = manifestDefinition(row.key);
    if (!definition) continue; // Legacy/unknown rows are quarantined from outputs.
    if (row.scope !== definition.scope) throw new Error('CONFIGURATION_INVALID');
    values[row.key] = row.value;
  }
  const manifest = parseManifest(values);
  validateSecurityCeilings(manifest);
  return manifest;
}

export async function seedManifest(database: DbExecutor) {
  const manifest = loadManifest();
  for (const [key, value] of Object.entries(manifest)) {
    await seedManifestValue(database,key,value);
  }
}

export async function seedManifestValue(database: DbExecutor, key: string, value: unknown) {
  const parsed = validateManifestValue(key,value);
  await database.insert(xManifest).values({
    key, value:parsed, type:typeof parsed === 'object' ? 'json' : typeof parsed,
    scope:manifestDefinition(key)!.scope, description:`seeded ${key}`,
  }).onConflictDoNothing({ target:xManifest.key });
}

export * from './schema';
export { databaseConnectionOptions } from './connection-options';
export { databaseHealthy } from './health';
export { withSessionScope, withContext, withMemberSnapshot, scopedTransaction, type DatabaseContext } from './context';

export {databaseScopeFingerprint, databaseBinding, scopedDatabaseBinding} from './binding-fingerprint';
export {activeRequestId,currentRequestId,withRequestContext} from './request-context';
export {workloadLockHealth} from './lock-health';

export {withExecutionBudget,withExecutionScope,withBoundedTransaction,remainingExecutionTime} from './execution-budget';

export {assetLedgerBalance} from './ledger-counters';
