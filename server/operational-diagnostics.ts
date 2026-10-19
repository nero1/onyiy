import {and,asc,eq,inArray,isNull,sql} from 'drizzle-orm';
import {z} from 'zod';
import crypto from 'node:crypto';
import {jobs,outbox,chainObservations,operationKeys,operationalAlerts,operationalDiagnostics,providerQuotaReports,auditEvents,users,readManifest,withContext,workloadLockHealth,scopedDatabaseBinding,type DbExecutor} from '@gifters/db';
import {validateRuntimeEnv} from '@gifters/config';
import {openFinancialAlert} from './financial-alerts';
async function quotaBinding(tx:DbExecutor){return crypto.createHash('sha256').update([await scopedDatabaseBinding(tx),process.env.WEB_ORIGIN??'',process.env.VERCEL_PROJECT_ID??'',process.env.VERCEL_ORG_ID??''].join('|')).digest('hex')}
export const quotaReportInput=z.object({provider:z.enum(['postgres','vercel','cache','rpc']),used:z.string().regex(/^(0|[1-9][0-9]{0,17})$/),capacity:z.string().regex(/^[1-9][0-9]{0,17}$/),observed_at:z.string().datetime(),revision:z.number().int().min(0),proof_reference:z.string().regex(/^[-A-Za-z0-9:_]{5,200}$/)}).strict();
export async function reportProviderQuota(tx:DbExecutor,actorId:string,input:z.infer<typeof quotaReportInput>){
 const [actor]=await tx.select({role:users.role,status:users.status}).from(users).where(eq(users.id,actorId)).for('no key update');if(actor?.role!=='admin'||actor.status!=='active')throw new Error('FORBIDDEN');
 const environment=validateRuntimeEnv().appEnv,[clock]=await tx.execute<{now:Date}>(sql`select clock_timestamp() as now`),observed=new Date(input.observed_at),now=new Date(clock.now).getTime();if(observed.getTime()>now+30000||now-observed.getTime()>86400000)throw new Error('INVALID_INPUT');
 const [old]=await tx.select().from(providerQuotaReports).where(and(eq(providerQuotaReports.environment,environment),eq(providerQuotaReports.provider,input.provider))).for('update');if((old?.revision??0)!==input.revision)throw new Error('VERSION_CONFLICT');
 const value={used:input.used,capacity:input.capacity,observedAt:observed,revision:input.revision+1,actorUserId:actorId,proofReference:input.proof_reference,bindingFingerprint:await quotaBinding(tx)};
 await tx.insert(providerQuotaReports).values({environment,provider:input.provider,...value}).onConflictDoUpdate({target:[providerQuotaReports.environment,providerQuotaReports.provider],set:value});await tx.insert(auditEvents).values({actorUserId:actorId,action:'operations.quota_report',targetType:'provider_quota',targetId:input.provider,afterState:{revision:value.revision,used:input.used,capacity:input.capacity,observed_at:input.observed_at,proof_reference:input.proof_reference}});
 return {provider:input.provider,revision:value.revision};
}
export async function monitorOperations(){
 const policy=await readManifest(),locks=await workloadLockHealth(policy.alert_policy.lock_wait_ms);
 return withContext({access:'service'},tx=>captureOperations(tx,locks));
}
export async function captureOperations(tx:DbExecutor,locks:{waiting:number;scope:'web_role'}){
 const environment=validateRuntimeEnv().appEnv as 'simulation'|'testnet'|'mainnet',policy=(await readManifest(tx)).alert_policy;
 const due=and(eq(jobs.environment,environment),sql`(${jobs.status} in ('pending','retry_wait') and ${jobs.dueAt}<=clock_timestamp()) or (${jobs.status}='running' and ${jobs.leaseUntil}<=clock_timestamp())`);
 const queued=await tx.select({id:jobs.id}).from(jobs).where(due).orderBy(asc(jobs.dueAt)).limit(policy.backlog+1);
 const dead=await tx.select({id:jobs.id}).from(jobs).where(and(eq(jobs.environment,environment),eq(jobs.status,'dead_letter'))).limit(policy.dlq+1);
 const waiting=tx.select({id:chainObservations.id}).from(chainObservations).where(and(eq(chainObservations.businessKey,outbox.businessKey),eq(chainObservations.status,'pending'),sql`${chainObservations.nextObservationAt}>clock_timestamp()`));
 const pending=await tx.select({id:outbox.id}).from(outbox).where(and(eq(outbox.environment,environment),isNull(outbox.dispatchedAt),sql`not exists(${waiting})`)).orderBy(asc(outbox.createdAt)).limit(policy.backlog+1);
 const [oldest]=await tx.select({seconds:sql<string>`greatest(0,extract(epoch from clock_timestamp()-${jobs.dueAt}))::text`}).from(jobs).where(due).orderBy(asc(jobs.dueAt)).limit(1);
 const [clock]=await tx.execute<{now:Date;day:string}>(sql`select clock_timestamp() as now,(clock_timestamp() at time zone 'UTC')::date::text as day`),prefix=`alert-http:${environment}:${clock.day}:`;
 const budget=await tx.select({id:operationKeys.businessKey}).from(operationKeys).where(sql`${operationKeys.businessKey}>=${prefix} and ${operationKeys.businessKey}<${prefix+'~'}`).limit(policy.daily_limit+1);
 const reports=await tx.select().from(providerQuotaReports).where(eq(providerQuotaReports.environment,environment)).limit(4),fraction=BigInt(Math.ceil(policy.quota_warning_fraction*1000000));
 const binding=await quotaBinding(tx);
 const quota=reports.map(row=>({provider:row.provider,used:row.used,capacity:row.capacity,observed_at:row.observedAt.toISOString(),stale:row.bindingFingerprint!==binding||new Date(clock.now).getTime()-row.observedAt.getTime()>86400000,warning:BigInt(row.used)*1000000n>=BigInt(row.capacity)*fraction,revision:row.revision}));
 const conditions=[['backlog',queued.length+pending.length>policy.backlog,'job_backlog','warning','JOB_BACKLOG_THRESHOLD'],['dlq',dead.length>=policy.dlq,'job_dlq','critical','JOB_DLQ_THRESHOLD'],['age',Number(oldest?.seconds??0)>Math.max(60,policy.public_rpc_minutes*60),'job_backlog','warning','JOB_AGE_THRESHOLD'],['locks',locks.waiting>0,'lock_wait','warning','WEB_LOCK_WAIT_THRESHOLD'],['alert-quota',BigInt(budget.length)*1000000n>=BigInt(policy.daily_limit)*fraction,'quota_budget','warning','ALERT_HTTP_BUDGET_WARNING'],...quota.map(row=>['quota-'+row.provider,!row.stale&&row.warning,'quota_budget','warning','PROVIDER_QUOTA_WARNING'])] as const;
 for(const [label,active,category,severity,reason] of conditions){const key=`ops:${environment}:${label}`;if(active)await openFinancialAlert(tx,key,String(category),severity as 'warning'|'critical',{reason:String(reason)},environment);else await tx.update(operationalAlerts).set({status:'resolved',resolvedAt:sql`clock_timestamp()`}).where(and(eq(operationalAlerts.conditionKey,key),sql`${operationalAlerts.status}<>'resolved'`));}
 const snapshot={observed_at:new Date(clock.now).toISOString(),environment,pending_jobs_at_least:queued.length,pending_outbox_at_least:pending.length,dead_letters_at_least:dead.length,oldest_due_seconds:Number(oldest?.seconds??0),lock_waits:locks.waiting,lock_scope:locks.scope,alert_budget_used:budget.length,alert_budget_limit:policy.daily_limit,provider_quotas:quota,unreported_providers:['postgres','vercel','cache','rpc'].filter(provider=>!quota.some(row=>row.provider===provider))};
 await tx.insert(operationalDiagnostics).values({environment,snapshot,observedAt:sql`clock_timestamp()`}).onConflictDoUpdate({target:operationalDiagnostics.environment,set:{snapshot,observedAt:sql`clock_timestamp()`}});
 return snapshot;
}
const snapshotShape=z.object({observed_at:z.string().datetime(),environment:z.enum(['simulation','testnet','mainnet']),pending_jobs_at_least:z.number().int().min(0).max(10001),pending_outbox_at_least:z.number().int().min(0).max(10001),dead_letters_at_least:z.number().int().min(0).max(10001),oldest_due_seconds:z.number().nonnegative(),lock_waits:z.number().int().nonnegative(),lock_scope:z.literal('web_role'),alert_budget_used:z.number().int().min(0).max(10001),alert_budget_limit:z.number().int().min(1).max(10000),provider_quotas:z.array(z.object({provider:z.enum(['postgres','vercel','cache','rpc']),used:z.string().regex(/^[0-9]{1,18}$/),capacity:z.string().regex(/^[0-9]{1,18}$/),observed_at:z.string().datetime(),stale:z.boolean(),warning:z.boolean(),revision:z.number().int().positive()}).strict()).max(4),unreported_providers:z.array(z.enum(['postgres','vercel','cache','rpc'])).max(4)}).strict();
export async function readOperations(tx:DbExecutor){
 const environment=validateRuntimeEnv().appEnv,[row]=await tx.select().from(operationalDiagnostics).where(eq(operationalDiagnostics.environment,environment)).limit(1);
 const parsed=snapshotShape.safeParse(row?.snapshot);if(!row||!parsed.success)return {state:'unknown'};
 const [clock]=await tx.execute<{now:Date}>(sql`select clock_timestamp() as now`);
 return {...parsed.data,stale:new Date(clock.now).getTime()-row.observedAt.getTime()>300000};
}

export async function readStaffOperations(tx:DbExecutor){
 const snapshot=await readOperations(tx),environment=validateRuntimeEnv().appEnv,policy=(await readManifest(tx)).alert_policy,binding=await quotaBinding(tx),[clock]=await tx.execute<{now:Date}>(sql`select clock_timestamp() as now`);
 const reports=await tx.select().from(providerQuotaReports).where(eq(providerQuotaReports.environment,environment)).limit(4),fraction=BigInt(Math.ceil(policy.quota_warning_fraction*1000000));
 const quota=reports.map(row=>({provider:row.provider,used:row.used,capacity:row.capacity,observed_at:row.observedAt.toISOString(),stale:row.bindingFingerprint!==binding||new Date(clock.now).getTime()-row.observedAt.getTime()>86400000,warning:BigInt(row.used)*1000000n>=BigInt(row.capacity)*fraction,revision:row.revision}));
 return {...snapshot,provider_quotas:quota,unreported_providers:['postgres','vercel','cache','rpc'].filter(provider=>!quota.some(row=>row.provider===provider))};
}
export async function publicOperationsHealth(tx:DbExecutor){
 const snapshot=await readOperations(tx);
 if('state' in snapshot)return {state:'unknown'};
 return {state:snapshot.stale?'stale':'observed',backlog_at_least:snapshot.pending_jobs_at_least+snapshot.pending_outbox_at_least,dead_letters_at_least:snapshot.dead_letters_at_least,lock_waits:snapshot.lock_waits,quota_warning:snapshot.alert_budget_used/snapshot.alert_budget_limit>=1||snapshot.provider_quotas.some(row=>row.warning&&!row.stale),unreported_quotas:snapshot.unreported_providers.length};
}
