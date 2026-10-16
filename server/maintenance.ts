import { and, asc, eq, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { outbox, readManifest, schedulerNonces, schedulerRuns, type DbExecutor } from '@gifters/db';

export function operationalRetentionHeld() {
  const value=process.env.OPERATIONAL_RETENTION_HOLD??'false';
  if (!['true','false'].includes(value)) throw new Error('CONFIGURATION_INVALID');
  return value==='true';
}

// Only expendable scheduler coordination records are eligible. Durable work,
// delivery keys, reports and every financial/audit record remain untouched.
export async function cleanupSchedulerRecords(database:DbExecutor) {
  const manifest=await readManifest(database);
  const limit=Math.min(manifest.job_policy.chunk_size,100);
  // A deployment hold takes precedence over operational retention. Validate it
  // rather than interpreting a misspelling as permission to delete.
  if (operationalRetentionHeld()) return {nonces_deleted:0,runs_deleted:0,batch_limit:limit,held:true,more_possible:false};
  const nonceEligible=and(lt(schedulerNonces.expiresAt,sql`transaction_timestamp()`),lt(schedulerNonces.createdAt,sql`transaction_timestamp()-interval '600 seconds'`));
  const runEligible=and(isNotNull(schedulerRuns.completedAt),lt(schedulerRuns.completedAt,sql`transaction_timestamp()-${manifest.retention_policy.http_replay_days}*interval '1 day'`),
    lt(schedulerRuns.createdAt,sql`transaction_timestamp()-${manifest.retention_policy.http_replay_days}*interval '1 day'`),
    sql`case when ${schedulerRuns.runKey} ~ '^[0-9]{1,12}$' then ${schedulerRuns.runKey}::numeric*300 < extract(epoch from transaction_timestamp()-${manifest.retention_policy.http_replay_days}*interval '1 day') else false end`,
    lt(schedulerRuns.leaseUntil,sql`transaction_timestamp()`));
  const nonces=await database.select({id:schedulerNonces.id}).from(schedulerNonces)
    .where(nonceEligible)
    .orderBy(asc(schedulerNonces.expiresAt),asc(schedulerNonces.id)).limit(limit).for('update',{skipLocked:true});
  const runs=await database.select({id:schedulerRuns.id}).from(schedulerRuns)
    .where(runEligible)
    .orderBy(asc(schedulerRuns.completedAt),asc(schedulerRuns.id)).limit(limit).for('update',{skipLocked:true});
  if(nonces.length) await database.delete(schedulerNonces).where(inArray(schedulerNonces.id,nonces.map(row=>row.id)));
  if(runs.length) await database.delete(schedulerRuns).where(inArray(schedulerRuns.id,runs.map(row=>row.id)));
  // A locked row skipped above is still backlog, not proof cleanup is complete.
  const remainingNonces=await database.select({id:schedulerNonces.id}).from(schedulerNonces).where(nonceEligible).limit(1);
  const remainingRuns=await database.select({id:schedulerRuns.id}).from(schedulerRuns).where(runEligible).limit(1);
  return {nonces_deleted:nonces.length,runs_deleted:runs.length,batch_limit:limit,held:false,more_possible:!!(remainingNonces.length||remainingRuns.length)};
}

export async function enqueueDailyMaintenance(database:DbExecutor) {
  // The UTC anchor is PostgreSQL infrastructure, never a browser clock.
  const [clock]=await database.execute<{anchor:string;environment:string}>(sql`select (clock_timestamp() at time zone 'UTC')::date::text as anchor,current_setting('gw.environment') as environment`);
  const businessKey=`maintenance:${clock.environment}:${clock.anchor}:0`;
  await database.insert(outbox).values({businessKey,environment:clock.environment,kind:'operational_cleanup',payload:{anchor:clock.anchor,page:0}}).onConflictDoNothing({target:outbox.businessKey});
  const [prior]=await database.select({kind:outbox.kind,payload:outbox.payload,environment:outbox.environment}).from(outbox).where(eq(outbox.businessKey,businessKey)).limit(1);
  if(prior?.kind!=='operational_cleanup'||prior.environment!==clock.environment||!prior.payload||typeof prior.payload!=='object'||Array.isArray(prior.payload)) throw new Error('VERSION_CONFLICT');
  const payload=prior.payload as Record<string,unknown>;
  if(Object.keys(payload).length!==2||payload.anchor!==clock.anchor||payload.page!==0) throw new Error('VERSION_CONFLICT');
}

// Resumable bootstrap/marker compaction. Counter evidence is not a retention
// deletion: a retention hold must not prevent ordinary balance coverage.
export async function advanceLedgerCounters(database:DbExecutor) {
  const [row]=await database.execute<{result:{state:'backfilling'|'sealed'|'review';more_possible:boolean;reason?:string;markers_deleted?:number}}>(sql`select public.gw_counter_advance(100) as result`);
  if(!row||!['backfilling','sealed','review'].includes(row.result.state))throw new Error('FINANCIAL_SAFETY_PAUSE');
  return row.result;
}

export async function retireEphemeralPayloads(database:DbExecutor) {
  const policy=await readManifest(database);
  const held=operationalRetentionHeld();
  if(held)return {notifications:0,jobs:0,outbox:0,held:true,more_possible:false};
  await database.execute(sql`select set_config('gw.operational_retention_hold','false',true)`);
  const [row]=await database.execute<{result:{notifications:number;jobs:number;outbox:number;held:boolean;more_possible:boolean}}>(sql`select public.gw_retire_ephemeral_batch(${Math.min(policy.job_policy.chunk_size,100)}) as result`);
  if(!row)throw new Error('CONFIGURATION_INVALID');
  return row.result;
}
