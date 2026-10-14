import {recordProofFailure} from './bot-check';
import {observationPayload,observationForJob,deferObservation} from "./crypto-observer";
import {exportJob,buildExportPage} from './own-data';
import crypto from 'node:crypto';
import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { dataExports, auditEvents, financialReconciliationResults, maintenanceResults, jobs, notifications, operationKeys, outbox, readManifest, schedulerRuns, users, chainObservations, withContext, withRequestContext, activeRequestId, type DbExecutor } from '@gifters/db';
import { validateRuntimeEnv } from '@gifters/config';
import { reconcile } from './reconcile';
import { advanceLedgerCounters,cleanupSchedulerRecords } from './maintenance';
import {cleanupAuthentication} from './auth-cleanup';
import {redactDeletedUserContent,enqueuePrivacyRedaction} from './privacy-redaction';

export const notificationPayload = z.object({
  user_id:z.string().uuid(),title_key:z.enum(['gift_sent','gift_received','withdrawal_settled','incoming_exception','financial_review','account_update','admin_message']),body:z.string().min(1).max(2000),
}).strict();

export async function enqueueNotification(database: DbExecutor, businessKey:string, payload:z.infer<typeof notificationPayload>) {
  const parsed=notificationPayload.parse(payload);
  const environment=validateRuntimeEnv().appEnv;
  const inserted=await database.insert(outbox).values({businessKey,environment,kind:'notification',payload:parsed}).onConflictDoNothing({target:outbox.businessKey}).returning({id:outbox.id});
  if (!inserted.length) {
    const [prior]=await database.select().from(outbox).where(eq(outbox.businessKey,businessKey)).limit(1);
    const original=notificationPayload.safeParse(prior?.payload);
    if (prior?.environment!==environment || prior.kind!=='notification' || !original.success || JSON.stringify(original.data)!==JSON.stringify(parsed)) throw new Error('VERSION_CONFLICT');
  }
}

export async function enqueueDailyReconciliation(database:DbExecutor) {
  const environment=validateRuntimeEnv().appEnv;
  const [clock]=await database.execute<{anchor:string}>(sql`select (clock_timestamp() at time zone 'UTC')::date::text as anchor`);
  const businessKey=`reconcile:${environment}:${clock.anchor}`;
  await database.insert(outbox).values({businessKey,environment,kind:'financial_reconciliation',payload:{anchor:clock.anchor}}).onConflictDoNothing({target:outbox.businessKey});
}
const reconciliationPayload=z.object({anchor:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const date=new Date(value+'T00:00:00Z');return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===value;})}).strict();
const maintenancePayload=reconciliationPayload.extend({page:z.number().int().min(0).max(1000000)}).strict();

export type RunFence={id:string;token:string;generation:number};
async function fence(database:DbExecutor,run?:RunFence) {
  if (!run) return;
  const [valid]=await database.select({id:schedulerRuns.id}).from(schedulerRuns)
    .where(and(eq(schedulerRuns.id,run.id),eq(schedulerRuns.leaseToken,run.token),eq(schedulerRuns.leaseGeneration,run.generation),isNull(schedulerRuns.completedAt),sql`${schedulerRuns.leaseUntil}>clock_timestamp()`)).limit(1).for('share');
  if (!valid) throw new Error('LEASE_LOST');
}

export async function dispatchOutbox(limit:number,run?:RunFence) {
  return withContext({access:'service'},async database=>{
    await database.execute(sql`set local statement_timeout='2000ms'`);
    await fence(database,run);
    const manifest=await readManifest(database);
    const waiting=database.select({id:chainObservations.id}).from(chainObservations).where(and(eq(chainObservations.businessKey,outbox.businessKey),eq(chainObservations.status,'pending'),sql`${chainObservations.nextObservationAt}>clock_timestamp()`));
    const rows=await database.select().from(outbox).where(and(isNull(outbox.dispatchedAt),sql`not exists(${waiting})`)).orderBy(asc(outbox.createdAt),asc(outbox.id))
      .limit(Math.min(limit,manifest.job_policy.chunk_size,100)).for('update',{skipLocked:true});
    if (!rows.length) return 0;
    await database.insert(jobs).values(rows.map(row=>({outboxId:row.id,businessKey:row.businessKey,environment:row.environment,kind:row.kind,payload:row.payload,retryLimit:manifest.job_policy.max_attempts,redactedAt:row.redactedAt,redactedPayloadHash:row.redactedPayloadHash,requestId:row.requestId})))
      .onConflictDoNothing({target:jobs.businessKey});
    await database.update(outbox).set({dispatchedAt:sql`clock_timestamp()`}).where(inArray(outbox.id,rows.map(row=>row.id)));
    await fence(database,run);
    return rows.length;
  });
}

export async function claimJob(run?:RunFence) {
  return withContext({access:'service'},async database=>{
    await database.execute(sql`set local statement_timeout='2000ms'`);
    await fence(database,run);
    const manifest=await readManifest(database);
    const [row]=await database.select().from(jobs).where(or(
      and(inArray(jobs.status,['pending','retry_wait']),lte(jobs.dueAt,sql`clock_timestamp()`)),
      and(eq(jobs.status,'running'),lte(jobs.leaseUntil,sql`clock_timestamp()`)),
    )).orderBy(asc(jobs.dueAt),asc(jobs.id)).limit(1).for('update',{skipLocked:true});
    if (!row) return null;
    if (row.attempts>=row.retryLimit) {
      await database.update(jobs).set({status:'dead_letter',leaseToken:null,leaseUntil:null,completedAt:sql`clock_timestamp()`,lastErrorCode:'LEASE_EXPIRED',updatedAt:sql`clock_timestamp()`}).where(eq(jobs.id,row.id));
      return {id:row.id,leaseToken:null,generation:row.leaseGeneration};
    }
    const token=crypto.randomUUID();
    await database.update(jobs).set({status:'running',attempts:row.attempts+1,leaseGeneration:row.leaseGeneration+1,leaseToken:token,leaseUntil:sql`clock_timestamp()+${Math.min(manifest.job_policy.lease_seconds,300)}*interval '1 second'`,updatedAt:sql`clock_timestamp()`}).where(eq(jobs.id,row.id));
    await fence(database,run);
    return {id:row.id,leaseToken:token,generation:row.leaseGeneration+1};
  });
}

async function executeJobWithinContext(id:string,token:string,generation:number,run?:RunFence) {
  return withContext({access:'service',reportSnapshot:true},async database=>{
    await database.execute(sql`set local statement_timeout='2000ms'`);
    await fence(database,run);
    const [row]=await database.select().from(jobs).where(and(eq(jobs.id,id),eq(jobs.status,'running'),eq(jobs.leaseToken,token),eq(jobs.leaseGeneration,generation),sql`${jobs.leaseUntil}>clock_timestamp()`)).limit(1).for('update');
    if (!row) throw new Error('LEASE_LOST');
    if (row.kind==='notification') {
      const payload=notificationPayload.safeParse(row.payload);
      if (!payload.success) throw new Error('INVALID_JOB');
      const [recipient]=await database.select({status:users.status}).from(users).where(eq(users.id,payload.data.user_id)).limit(1);
      if(recipient?.status!=='deleted')await database.insert(notifications).values({deliveryKey:row.businessKey,userId:payload.data.user_id,titleKey:payload.data.title_key,body:payload.data.body})
        .onConflictDoNothing({target:notifications.deliveryKey});
    } else if(row.kind==='privacy_redaction'){
      const payload=z.object({user_id:z.string().uuid(),page:z.number().int().min(0).max(1000000)}).strict().safeParse(row.payload);if(!payload.success)throw new Error('INVALID_JOB');
      const result=await redactDeletedUserContent(database,payload.data.user_id);
      if(result.more_possible){if(payload.data.page>=1000000)throw new Error('INVALID_JOB');await enqueuePrivacyRedaction(database,payload.data.user_id,payload.data.page+1);}
    } else if(row.kind==='own_export'){const parsed=exportJob.safeParse(row.payload);if(!parsed.success)throw new Error('INVALID_JOB');await buildExportPage(database,parsed.data.export_id,parsed.data.part);
    } else if (row.kind==='financial_reconciliation') {
      const payload=reconciliationPayload.safeParse(row.payload);
      if (!payload.success) throw new Error('INVALID_JOB');
      const result=await reconcile(database);
      if (Buffer.byteLength(JSON.stringify(result),'utf8')>131072) throw new Error('INVALID_JOB');
      await database.insert(financialReconciliationResults).values({sourceJobId:row.id,environment:row.environment,runDate:payload.data.anchor,balanced:result.balanced,consistent:result.consistent,lineageComplete:result.lineage_complete,result}).onConflictDoNothing({target:financialReconciliationResults.sourceJobId});
    } else if(row.kind==='chain_observation'){
      const payload=observationPayload.safeParse(row.payload);if(!payload.success)throw new Error('INVALID_JOB');
      const observation=await observationForJob(database,payload.data,row.id);
      if(observation.status==='pending'&&observation.sourceJobId===row.id){
        const [clock]=await database.execute<{now:Date}>(sql`select clock_timestamp() as now`);
        let next=observation;
        if(observation.nextObservationAt<=new Date(clock.now)){
          const {verifyCryptoDeposit}=await import('./crypto-incoming');const result=await verifyCryptoDeposit(database,payload.data.user_id,payload.data);
          if(result.status==='pending'){
            if(observation.rounds>=2880){
              await database.update(chainObservations).set({status:'review'}).where(eq(chainObservations.id,observation.id));await fence(database,run);
              const reviewed=await database.update(jobs).set({status:'dead_letter',leaseToken:null,leaseUntil:null,completedAt:sql`clock_timestamp()`,lastErrorCode:'PERMANENT_FAILURE',updatedAt:sql`clock_timestamp()`}).where(and(eq(jobs.id,id),eq(jobs.leaseToken,token),eq(jobs.leaseGeneration,generation),sql`${jobs.leaseUntil}>clock_timestamp()`)).returning({id:jobs.id});
              if(!reviewed.length)throw new Error('LEASE_LOST');return true;
            }
            next=await deferObservation(database,observation);
          }else await database.update(chainObservations).set({status:'done'}).where(eq(chainObservations.id,observation.id));
        }
        const [state]=await database.select({status:chainObservations.status}).from(chainObservations).where(eq(chainObservations.id,observation.id)).limit(1);
        if(state.status==='pending'){
          if(row.retryLimit>=1000000)throw new Error('OBSERVATION_REVIEW_REQUIRED');
          await fence(database,run);
          const deferred=await database.update(jobs).set({status:'retry_wait',dueAt:next.nextObservationAt,retryLimit:row.retryLimit+1,leaseToken:null,leaseUntil:null,lastErrorCode:null,updatedAt:sql`clock_timestamp()`}).where(and(eq(jobs.id,id),eq(jobs.leaseToken,token),eq(jobs.leaseGeneration,generation),sql`${jobs.leaseUntil}>clock_timestamp()`)).returning({id:jobs.id});
          if(!deferred.length)throw new Error('LEASE_LOST');
          return true;
        }
      }
    } else if (row.kind==='operational_cleanup') {
      const payload=maintenancePayload.safeParse(row.payload);
      if (!payload.success) throw new Error('INVALID_JOB');
      const result=await cleanupSchedulerRecords(database);
      const authentication=await cleanupAuthentication(database);
      const counters=await advanceLedgerCounters(database);
      result.more_possible=result.more_possible||authentication.more_possible||counters.more_possible;
      await database.insert(maintenanceResults).values({sourceJobId:row.id,environment:row.environment,runDate:payload.data.anchor,pageNumber:payload.data.page,leaseGeneration:generation,
        noncesDeleted:result.nonces_deleted,runsDeleted:result.runs_deleted,batchLimit:result.batch_limit,held:result.held,morePossible:result.more_possible,
      });
      // Dispatch happens only at the next tick. A backlog cannot turn this job
      // into an unbounded loop or discard work after a capped page.
      if(result.more_possible && (!result.held||counters.more_possible)) {
        if(payload.data.page===1000000) throw new Error('INVALID_JOB');
        const nextPage=payload.data.page+1;
        await database.insert(outbox).values({businessKey:`maintenance:${row.environment}:${payload.data.anchor}:${nextPage}`,
          environment:row.environment,kind:'operational_cleanup',payload:{anchor:payload.data.anchor,page:nextPage}}).onConflictDoNothing({target:outbox.businessKey});
      }
    } else throw new Error('INVALID_JOB');
    await fence(database,run);
    const done=await database.update(jobs).set({status:'done',leaseToken:null,leaseUntil:null,completedAt:sql`clock_timestamp()`,lastErrorCode:null,updatedAt:sql`clock_timestamp()`})
      .where(and(eq(jobs.id,id),eq(jobs.leaseToken,token),eq(jobs.leaseGeneration,generation),sql`${jobs.leaseUntil}>clock_timestamp()`)).returning({id:jobs.id});
    if (!done.length) throw new Error('LEASE_LOST');
    return true;
  });
}

function transient(error:unknown):boolean {
  if(error instanceof Error&&['RPC_UNAVAILABLE','RPC_CAPACITY_EXCEEDED','OBSERVATION_UNAVAILABLE'].includes(error.message))return true;
  const code=error && typeof error==='object' && 'code' in error ? String(error.code) : '';
  if (['40001','40P01','57014','53300','57P01','57P02','57P03','CONNECTION_CLOSED','CONNECT_TIMEOUT','CONNECTION_ENDED','EPIPE','ECONNRESET','ETIMEDOUT'].includes(code) || /^08/.test(code)) return true;
  // Drizzle wraps database errors without changing the underlying SQLSTATE.
  return !!(error && typeof error==='object' && 'cause' in error && error.cause!==error && transient(error.cause));
}
export async function failJob(id:string,token:string,generation:number,error:unknown,run?:RunFence) {
  if (error instanceof Error && error.message==='LEASE_LOST') return;
  return withContext({access:'service'},async database=>{
    await database.execute(sql`set local statement_timeout='2000ms'`);
    await fence(database,run);
    const [row]=await database.select().from(jobs).where(and(eq(jobs.id,id),eq(jobs.status,'running'),eq(jobs.leaseToken,token),eq(jobs.leaseGeneration,generation),sql`${jobs.leaseUntil}>clock_timestamp()`)).limit(1).for('update');
    if (!row) return;
    console.error(JSON.stringify({event:'job_failed',request_id:row.requestId??activeRequestId()??null,scheduler_request_id:activeRequestId()??null,job_id:id,generation,retryable:transient(error)}));
    const policy=(await readManifest(database)).job_policy;
    const retry=transient(error) && row.attempts<row.retryLimit;
    const delay=Math.min(policy.max_delay_seconds,policy.base_delay_seconds*2**Math.min(row.attempts-1,20));
    const jitter=1+(crypto.randomInt(0,2000001)/1000000-1)*policy.jitter_fraction;
    const seconds=Math.min(86400,Math.max(1,Math.ceil(delay*jitter)));
    const changed=await database.update(jobs).set({status:retry?'retry_wait':'dead_letter',leaseToken:null,leaseUntil:null,
      dueAt:retry?sql`clock_timestamp()+${seconds}*interval '1 second'`:row.dueAt,
      completedAt:retry?null:sql`clock_timestamp()`,lastErrorCode:transient(error)?'TRANSIENT_FAILURE':error instanceof Error && error.message==='INVALID_JOB'?'INVALID_JOB':'PERMANENT_FAILURE',updatedAt:sql`clock_timestamp()`})
      .where(and(eq(jobs.id,id),eq(jobs.leaseToken,token),eq(jobs.leaseGeneration,generation),sql`${jobs.leaseUntil}>clock_timestamp()`)).returning({id:jobs.id});
    if(!changed.length)throw new Error('LEASE_LOST');
    if(!retry&&row.kind==='chain_observation'&&error instanceof Error&&['TRANSFER_MISMATCH','WRONG_TOKEN','INVALID_PROOF'].includes(error.message)){const parsed=observationPayload.safeParse(row.payload);if(parsed.success)await recordProofFailure(database,parsed.data.user_id,parsed.data.invoice_id+':'+parsed.data.tx_hash+':'+parsed.data.event_index);}
    if(!retry&&row.kind==='own_export'){const parsed=exportJob.safeParse(row.payload);if(parsed.success)await database.update(dataExports).set({status:'failed',errorCode:'BUILD_FAILED',completedAt:sql`clock_timestamp()`}).where(and(eq(dataExports.id,parsed.data.export_id),eq(dataExports.status,'building')));}
    await fence(database,run);
  });
}

export async function runNonSigningJobs(run?:RunFence,signal?:AbortSignal) {
  const started=performance.now();
  const policy=(await readManifest()).job_policy;
  const max=Math.min(policy.chunk_size,100);
  if (signal?.aborted) return {dispatched:0,processed:0};
  const dispatched=await dispatchOutbox(max,run);
  let processed=0;
  while (processed<max && performance.now()-started<15000 && !signal?.aborted) {
    const job=await claimJob(run);
    if (!job) break;
    if (job.leaseToken) {
      try { await executeJob(job.id,job.leaseToken,job.generation,run); }
      catch(error) { await failJob(job.id,job.leaseToken,job.generation,error,run); }
    }
    processed++;
  }
  return {dispatched,processed};
}

export async function replayDeadJob(database:DbExecutor,actorId:string,jobId:string,nonce:string) {
  const [actor]=await database.select({role:users.role,status:users.status}).from(users).where(eq(users.id,actorId)).limit(1).for('no key update');
  if (actor?.role!=='admin' || actor.status!=='active') throw new Error('FORBIDDEN');
  const key=`admin-job-replay:${actorId}:${nonce.toLowerCase()}`;
  const requestHash=crypto.createHash('sha256').update(jobId.toLowerCase()).digest('hex');
  const [prior]=await database.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);
  if (prior) {
    if (prior.requestHash!==requestHash) throw new Error('VERSION_CONFLICT');
    return prior.result;
  }
  const [job]=await database.select().from(jobs).where(eq(jobs.id,jobId)).limit(1).for('update');
  if (!job) throw new Error('NOT_FOUND');
  if (job.status!=='dead_letter') throw new Error('VERSION_CONFLICT');
  if (job.lastErrorCode==='INVALID_JOB') throw new Error('INVALID_INPUT');
  const policy=(await readManifest(database)).job_policy;
  if (job.attempts+policy.max_attempts>1000000) throw new Error('FINANCIAL_SAFETY_PAUSE');
  await database.update(jobs).set({status:'pending',retryLimit:job.attempts+policy.max_attempts,dueAt:sql`clock_timestamp()`,completedAt:null,updatedAt:sql`clock_timestamp()`}).where(eq(jobs.id,job.id));
  await database.insert(auditEvents).values({actorUserId:actorId,action:'job_replay',targetType:'job',targetId:job.id,reason:'Explicit dead-letter retry; source identity and attempt count preserved',beforeState:{status:job.status,attempts:job.attempts},afterState:{status:'pending'}});
  const result={job_id:job.id,status:'pending'};
  await database.insert(operationKeys).values({businessKey:key,requestHash,result});
  return result;
}

export async function executeJob(id:string,token:string,generation:number,run?:RunFence){
 const [origin]=await withContext({access:'service'},tx=>tx.select({requestId:jobs.requestId}).from(jobs).where(eq(jobs.id,id)).limit(1));
 return withRequestContext(()=>executeJobWithinContext(id,token,generation,run),origin?.requestId);
}
