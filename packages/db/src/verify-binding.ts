import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { validateRuntimeEnv } from '@gifters/config';
import { deploymentBindingChallenges, migrationClient, schema, withContext } from './index';

// Stored namespace IDs can be cloned in backups. Only a newly committed owner
// challenge observed through the restricted runtime proves this deployment's
// connection binding. No credential or challenge value is printed/exported.
export async function verifyDatabaseBinding(bootstrap=false) {
  if (!process.env.DATABASE_MIGRATION_URL) throw new Error('DATABASE_MIGRATION_URL_REQUIRED');
  const config=validateRuntimeEnv();
  const owner=migrationClient();const id=crypto.randomUUID();
  const database=drizzle(owner,{schema});
  try {
    if (bootstrap) {
      const ddl=fs.readFileSync(path.join(process.cwd(),'packages/db/src/migrations/014_deployment_binding_challenge.sql'),'utf8');
      await owner.begin(async tx=>{await tx.unsafe(ddl)});
    }
    await database.insert(deploymentBindingChallenges).values({id,environment:config.appEnv,expiresAt:sql`clock_timestamp()+interval '120 seconds'`});
    const matched=await withContext({access:'service'},async tx=>{
      await tx.execute(sql`set local statement_timeout='2000ms'`);
      return (await tx.select({id:deploymentBindingChallenges.id}).from(deploymentBindingChallenges).where(and(eq(deploymentBindingChallenges.id,id),eq(deploymentBindingChallenges.environment,config.appEnv),sql`${deploymentBindingChallenges.expiresAt}>clock_timestamp()`)).limit(1))[0];
    });
    if (!matched) throw new Error('DATABASE_NAMESPACE_MISMATCH');
  } catch {
    throw new Error('Database binding failed; verify restricted runtime and owner targets without exposing credentials');
  } finally {
    try { await database.delete(deploymentBindingChallenges).where(eq(deploymentBindingChallenges.id,id)); }
    catch { /* Failed bootstrap/connection has no successful binding claim. */ }
    await owner.end({timeout:3});
  }
}
