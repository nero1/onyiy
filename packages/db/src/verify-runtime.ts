import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { validateRuntimeEnv } from '@gifters/config';
import { verifyDatabaseBinding } from './verify-binding';
import { closeDb, environmentInstances, migrationClient, readManifest, schema, withContext } from './index';

const config = validateRuntimeEnv();
if (!process.env.DATABASE_MIGRATION_URL) throw new Error('DATABASE_MIGRATION_URL is required for namespace verification');
const maintenance = migrationClient();
try {
  await verifyDatabaseBinding();
  const runtimeId = await withContext({access:'service'},async (tx) => {
    await readManifest(tx);
    return (await tx.select({id:environmentInstances.instanceId}).from(environmentInstances).where(eq(environmentInstances.environment,config.appEnv)).limit(1))[0]?.id;
  });
  const ownerId = (await drizzle(maintenance,{schema}).select({id:environmentInstances.instanceId}).from(environmentInstances).where(eq(environmentInstances.environment,config.appEnv)).limit(1))[0]?.id;
  if (!runtimeId || runtimeId !== ownerId) throw new Error('DATABASE_NAMESPACE_MISMATCH');
  console.log('Restricted runtime roles, seeded configuration and fresh database binding verified.');
} catch {
  throw new Error('Runtime database verification failed; check role memberships, migrations and namespace without exposing credentials');
} finally {
  await maintenance.end({timeout:3});
  await closeDb();
}
