import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { z } from 'zod';
import { validateRuntimeEnv } from '@gifters/config';
import { closeDb, migrationClient, readManifest, schema, withContext } from './index';
import { verifyDatabaseBinding } from './verify-binding';
import { recoveryExtensions, provisionRecoveryExtensions } from './recovery-extensions';
import { canonical, digest, migrationFingerprint, recoveryInventory, schemaContractVersion } from './recovery-inventory';
import { archiveChecksum, authenticatedCopy, encryptedDump, exclusiveFile, nativeDatabaseName, recoveryKey, recoveryPath, restoreArchive } from './recovery-files';

const hash=z.string().regex(/^[0-9a-f]{64}$/);
const inventorySchema=z.object({
  format:z.enum(['gw-simulation-backup-v1','gw-financial-backup-v2']),environment:z.enum(['simulation','testnet']),created_at:z.string().datetime(),
  archive_sha256:hash,schema_sha256:hash,migrations_sha256:hash,
  schema_contract_version:z.literal(schemaContractVersion),
  extensions:recoveryExtensions,
  records:z.record(z.object({rows:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),sha256:hash}).strict()),
}).strict().refine(v=>(v.format==='gw-simulation-backup-v1')===(v.environment==='simulation'));
const packetSchema=z.object({inventory:inventorySchema,signature:hash}).strict();
function signature(value:unknown,key:Buffer) {
  const signing=crypto.createHmac('sha256',key).update('gw-recovery-inventory-v1').digest();
  return crypto.createHmac('sha256',signing).update(canonical(value)).digest('hex');
}

async function ensureEmpty(owner:ReturnType<typeof migrationClient>) {
  // This is PostgreSQL restore infrastructure, not application table access.
  const tables=await owner<{name:string}[]>`select c.relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','S') limit 1`;
  const functions=await owner`select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and not exists(select 1 from pg_depend d where d.objid=p.oid and d.classid='pg_proc'::regclass and d.deptype='e') limit 1`;
  if(tables.length||functions.length) throw new Error('RECOVERY_TARGET_NOT_EMPTY');
  // Require a dedicated staging target without other clients. A native restore
  // has no --clean path and commits as one transaction; it never merges data.
  const clients=await owner`select pid from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() limit 1`;
  if(clients.length) throw new Error('RECOVERY_TARGET_ACTIVE');
}

async function validatePacket(file:string,key:Buffer) {
  const stats=await fs.stat(file+'.json');
  if(!stats.isFile()||stats.size>262144) throw new Error('RECOVERY_INVENTORY_INVALID');
  const raw=JSON.parse(await fs.readFile(file+'.json','utf8'));
  if(raw?.inventory?.schema_contract_version!==schemaContractVersion)throw new Error('RECOVERY_VERSION_MISMATCH');
  const parsed=packetSchema.safeParse(raw);
  if(!parsed.success) throw new Error('RECOVERY_INVENTORY_INVALID');
  const packet=parsed.data;
  if(!crypto.timingSafeEqual(Buffer.from(packet.signature,'hex'),Buffer.from(signature(packet.inventory,key),'hex'))) throw new Error('RECOVERY_INVENTORY_INVALID');
  if(packet.inventory.environment!==process.env.APP_ENV)throw new Error('RECOVERY_ENVIRONMENT_INVALID');
  if(packet.inventory.migrations_sha256!==await migrationFingerprint()) throw new Error('RECOVERY_VERSION_MISMATCH');
  return packet.inventory;
}

async function main() {
  const mode=process.argv[2];
  if(!['backup','restore','verify'].includes(mode)||process.argv.length!==4) throw new Error('RECOVERY_INPUT_INVALID');
  const file=recoveryPath(process.argv[3]);const key=recoveryKey();
  const environment=process.env.APP_ENV;if(!['simulation','testnet'].includes(environment??'')||process.env.MAINNET_ENABLED!=='false'||process.env.SIGNER_PROVIDER!=='disabled'
    ||process.env.VERCEL==='1'||process.env.RECOVERY_CONFIRM!==`isolated-${environment}`) throw new Error('RECOVERY_ENVIRONMENT_INVALID');
  if(process.env.SCHEDULER_HMAC_KEY||process.env.SCHEDULER_HMAC_PREVIOUS_KEY) throw new Error('RECOVERY_SCHEDULER_MUST_BE_OFF');
  validateRuntimeEnv();
  const url=process.env.DATABASE_MIGRATION_URL;
  if(!url) throw new Error('DATABASE_MIGRATION_URL_REQUIRED');
  const databaseName=nativeDatabaseName(url);
  if(mode==='restore'&&process.env.RECOVERY_RESTORE_CONFIRM!==`restore:${databaseName}`) throw new Error('RECOVERY_TARGET_CONFIRMATION_REQUIRED');
  const owner=migrationClient({quiet:true});
  const database=drizzle(owner,{schema});
  let input:Awaited<ReturnType<typeof authenticatedCopy>>|undefined;
  try {
    if(mode==='backup') {
      for(const output of [file,file+'.json']) {
        try {await fs.stat(output);throw new Error('RECOVERY_OUTPUT_EXISTS');}
        catch(error) {if(!error||typeof error!=='object'||!('code'in error)||error.code!=='ENOENT') throw error;}
      }
      await verifyDatabaseBinding(false,true);
      // Source hashes and native pg_dump share one repeatable-read snapshot.
      const inventory=await database.transaction(async transaction=>{
        await transaction.execute(sql`set local search_path=pg_catalog,public,pg_temp`);
        await transaction.execute(sql`set local statement_timeout='60s'`);
        const captured=await recoveryInventory(transaction);
        const [snapshot]=await transaction.execute<{id:string}>(sql`select pg_export_snapshot() as id`);
        await encryptedDump(file,snapshot.id,key);
        return {format:environment==='testnet'?'gw-financial-backup-v2' as const:'gw-simulation-backup-v1' as const,environment:environment as 'simulation'|'testnet',created_at:new Date().toISOString(),
          archive_sha256:await archiveChecksum(file),...captured};
      },{isolationLevel:'repeatable read',accessMode:'read only'});
      await exclusiveFile(file+'.json',canonical({inventory,signature:signature(inventory,key)})+'\n');
      console.log(`Encrypted financial backup and signed inventory saved (${Object.keys(inventory.records).length} retained tables). No scheduler or signer ran.`);
      return;
    }
    // Verify both signed metadata and AEAD before even bootstrapping the target.
    const expected=await validatePacket(file,key);
    input=await authenticatedCopy(file,key,expected.archive_sha256);
    if(mode==='restore') {
      await ensureEmpty(owner);
      await verifyDatabaseBinding(true,true);
      await closeDb(); // The staging-target check must not see our proof client.
      await ensureEmpty(owner);
      // Schema-scoped native dumps exclude provider auth/storage/vault data.
      // Provision only authenticated, closed dependencies after empty-target checks.
      await provisionRecoveryExtensions(owner,expected.extensions);
      await restoreArchive(input.file,key);
    }
    await verifyDatabaseBinding(false,true);
    const actual=await database.transaction(async transaction=>{
      await transaction.execute(sql`set local search_path=pg_catalog,public,pg_temp`);
      await transaction.execute(sql`set local statement_timeout='60s'`);
      return recoveryInventory(transaction);
    },{isolationLevel:'repeatable read',accessMode:'read only'});
    if(expected.schema_sha256!==actual.schema_sha256||expected.migrations_sha256!==actual.migrations_sha256||digest(expected.records)!==digest(actual.records)||digest(expected.extensions)!==digest(actual.extensions)) throw new Error('RECOVERY_CONTENT_MISMATCH');
    // Fresh runtime configuration/role checks are separate from copied IDs.
    await withContext({access:'service'},async database=>{await readManifest(database);await database.execute(sql`set local statement_timeout='2000ms'`);});
    console.log('Exact financial rows, schema/RLS/grants, queue counters, work and financial history verified. Staging remains unpublished; reconcile and explicitly review before starting any scheduler.');
  } finally {await input?.release();await owner.end({timeout:3});await closeDb();key.fill(0);}
}

main().catch(async(error:unknown)=>{
  await closeDb();
  // Drivers/native tools can attach private SQL/connection details. Emit only a
  // fixed category; failure never publishes, repairs or automatically resumes.
  const safe=new Set(['RECOVERY_INPUT_INVALID','RECOVERY_PATH_INVALID','RECOVERY_KEY_REQUIRED','RECOVERY_ENVIRONMENT_INVALID','RECOVERY_SCHEDULER_MUST_BE_OFF','DATABASE_MIGRATION_URL_REQUIRED','RECOVERY_TARGET_CONFIRMATION_REQUIRED',
    'RECOVERY_TARGET_NOT_EMPTY','RECOVERY_TARGET_ACTIVE','RECOVERY_INVENTORY_INVALID','RECOVERY_ARCHIVE_INVALID','RECOVERY_VERSION_MISMATCH','RECOVERY_CONTENT_MISMATCH','RECOVERY_SCHEMA_UNCLASSIFIED','RECOVERY_CONFIG_UNCLASSIFIED','RECOVERY_NATIVE_TOOL_FAILED','RECOVERY_OUTPUT_EXISTS','CONFIGURATION_INVALID']);
  const category=error instanceof Error&&safe.has(error.message)?error.message:'RECOVERY_FAILED';
  console.error(`Financial recovery failed (${category}). Check guards, bindings, native tools and the preserved inventory; staging must remain unpublished.`);
  process.exitCode=1;
});
