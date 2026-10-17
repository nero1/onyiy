import {ensureRecoveryTargetEmpty} from './recovery-target';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import {closeDb,readManifest} from './index';
import {recoveryEnvironment,recoveryMaintenance} from './recovery-maintenance';
import { recoveryExtensions, provisionRecoveryExtensions } from './recovery-extensions';
import {provisionRecoveryRoles} from './recovery-roles';
import { canonical, digest, migrationFingerprint, recoveryInventory, schemaContractVersion } from './recovery-inventory';
import { archiveChecksum, authenticatedCopy, encryptedDump, exclusiveFile, nativeDatabaseName, recoveryKey, recoveryPath, restoreArchive } from './recovery-files';

const hash=z.string().regex(/^[0-9a-f]{64}$/);
const inventorySchema=z.object({
  format:z.enum(['gw-simulation-backup-v1','gw-financial-backup-v2']),environment:z.enum(['simulation','testnet','mainnet']),created_at:z.string().datetime(),
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
  const environment=recoveryEnvironment();
  const file=recoveryPath(process.argv[3]);
  const url=process.env.DATABASE_MIGRATION_URL;
  if(!url) throw new Error('DATABASE_MIGRATION_URL_REQUIRED');
  const databaseName=nativeDatabaseName(url);
  if(mode==='restore'&&process.env.RECOVERY_RESTORE_CONFIRM!==`restore:${databaseName}`) throw new Error('RECOVERY_TARGET_CONFIRMATION_REQUIRED');
  const maintenance=recoveryMaintenance(),{owner,database}=maintenance;
  const key=recoveryKey();
  let input:Awaited<ReturnType<typeof authenticatedCopy>>|undefined;
  try {
    if(mode==='backup') {
      for(const output of [file,file+'.json']) {
        try {await fs.stat(output);throw new Error('RECOVERY_OUTPUT_EXISTS');}
        catch(error) {if(!error||typeof error!=='object'||!('code'in error)||error.code!=='ENOENT') throw error;}
      }
      await maintenance.verifyBinding();
      // Source hashes and native pg_dump share one repeatable-read snapshot.
      const inventory=await database.transaction(async transaction=>{
        await transaction.execute(sql`set local search_path=pg_catalog,public,pg_temp`);
        await transaction.execute(sql`set local statement_timeout='60s'`);
        const captured=await recoveryInventory(transaction);
        const [snapshot]=await transaction.execute<{id:string}>(sql`select pg_export_snapshot() as id`);
        await encryptedDump(file,snapshot.id,key);
        return {format:environment!=='simulation'?'gw-financial-backup-v2' as const:'gw-simulation-backup-v1' as const,environment,created_at:new Date().toISOString(),
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
      await ensureRecoveryTargetEmpty(owner);
      await maintenance.verifyBinding();
      await maintenance.closeRuntime(); // Staging must not see our proof client.
      await ensureRecoveryTargetEmpty(owner);
      // Schema-scoped native dumps exclude provider auth/storage/vault data.
      // Provision only authenticated, closed dependencies after empty-target checks.
      await provisionRecoveryRoles(owner);
      await provisionRecoveryExtensions(owner,expected.extensions);
      await restoreArchive(input.file,key);
    }
    await maintenance.verifyBinding();
    const actual=await database.transaction(async transaction=>{
      await transaction.execute(sql`set local search_path=pg_catalog,public,pg_temp`);
      await transaction.execute(sql`set local statement_timeout='60s'`);
      return recoveryInventory(transaction);
    },{isolationLevel:'repeatable read',accessMode:'read only'});
    if(expected.schema_sha256!==actual.schema_sha256||expected.migrations_sha256!==actual.migrations_sha256||digest(expected.records)!==digest(actual.records)||digest(expected.extensions)!==digest(actual.extensions)) throw new Error('RECOVERY_CONTENT_MISMATCH');
    // Fresh runtime configuration/role checks are separate from copied IDs.
    await maintenance.readRuntime(async database=>{await readManifest(database);await database.execute(sql`set local statement_timeout='2000ms'`);});
    console.log('Exact financial rows, schema/RLS/grants, queue counters, work and financial history verified. Staging remains unpublished; reconcile and explicitly review before starting any scheduler.');
  } finally {
    key.fill(0);
    const cleanup=await Promise.allSettled([input?.release(),maintenance.close(),closeDb()]);
    if(cleanup.some(result=>result.status==='rejected')){console.error('Financial recovery cleanup failed; staging remains unpublished.');process.exitCode=1;}
  }
}

main().catch(async(error:unknown)=>{
  await closeDb();
  // Drivers/native tools can attach private SQL/connection details. Emit only a
  // fixed category; failure never publishes, repairs or automatically resumes.
  const safe=new Set(['RECOVERY_INPUT_INVALID','RECOVERY_PATH_INVALID','RECOVERY_KEY_REQUIRED','RECOVERY_ENVIRONMENT_INVALID','RECOVERY_SCHEDULER_MUST_BE_OFF','DATABASE_MIGRATION_URL_REQUIRED','RECOVERY_TARGET_CONFIRMATION_REQUIRED',
    'RECOVERY_TARGET_NOT_EMPTY','RECOVERY_TARGET_ACTIVE','RECOVERY_INVENTORY_INVALID','RECOVERY_ARCHIVE_INVALID','RECOVERY_VERSION_MISMATCH','RECOVERY_CONTENT_MISMATCH','RECOVERY_SCHEMA_UNCLASSIFIED','RECOVERY_CONFIG_UNCLASSIFIED','RECOVERY_NATIVE_TOOL_FAILED','RECOVERY_OUTPUT_EXISTS','CONFIGURATION_INVALID']);
  safe.add('RECOVERY_ROLE_UNSAFE');safe.add('RECOVERY_SIGNER_MUST_BE_OFF');safe.add('DATABASE_NAMESPACE_MISMATCH');
  const category=error instanceof Error&&safe.has(error.message)?error.message:'RECOVERY_FAILED';
  console.error(`Financial recovery failed (${category}). Check guards, bindings, native tools and the preserved inventory; staging must remain unpublished.`);
  process.exitCode=1;
});
