import crypto from 'node:crypto';
import {z} from 'zod';
import {staffCursor,staffPageScope,staffPositionAfter,staffPositionCursor} from './staff-page';
import {and,asc,eq,isNull,sql} from 'drizzle-orm';
import {archiveMonths,auditEvents,jobs,operationKeys,readManifest,schedulerRuns,withContext,type DbExecutor} from '@gifters/db';
import {operationalRetentionHeld} from './maintenance';
import {openFinancialAlert} from './financial-alerts';
import type {RunFence} from './jobs';

const archiveStep=z.object({state:z.enum(['held','busy','idle','hashing','verifying','archived','review']),source_table:z.enum(['audit_events','chain_scan_pages','ledger_postings']).optional(),month:z.string().regex(/^[0-9]{4}-[0-9]{2}-01$/).optional(),processed:z.number().int().min(0).max(100).optional(),rows:z.string().regex(/^[0-9]+$/).optional(),reason:z.enum(['ARCHIVE_DEFAULT_BACKLOG_REVIEW','ARCHIVE_CHECKSUM_MISMATCH']).nullable().optional(),more_possible:z.boolean()}).strict();
export type ArchiveStep=z.infer<typeof archiveStep>;
export async function advanceArchives(tx:DbExecutor):Promise<ArchiveStep>{
 const policy=await readManifest(tx);
 const held=operationalRetentionHeld();
 await tx.execute(sql`select set_config('gw.operational_retention_hold',${String(held)},true)`);
 if(held)return {state:'held',more_possible:false};
 const [row]=await tx.execute<{result:ArchiveStep}>(sql`select public.gw_advance_monthly_archive(${Math.min(policy.job_policy.chunk_size,100)}) as result`);
 if(!row||!archiveStep.safeParse(row.result).success)throw new Error('CONFIGURATION_INVALID');
 if(row.result.state==='review'||row.result.reason){
  const [scope]=await tx.execute<{environment:'simulation'|'testnet'|'mainnet'}>(sql`select current_setting('gw.environment') as environment`);
  await openFinancialAlert(tx,`retention:${scope.environment}:${row.result.source_table??'default'}`,'job_backlog',row.result.reason==='ARCHIVE_CHECKSUM_MISMATCH'?'critical':'warning',{reason:row.result.reason??'ARCHIVE_REVIEW_REQUIRED'},scope.environment);
 }
 return row.result;
}

/** Run partition DDL in a fresh READ COMMITTED transaction. The job's later
 * report snapshot remains repeatable, and stale/reclaimed leases cannot commit
 * archival progress. No owner URL or signing capability enters the web app. */
export async function advanceArchivesForJob(id:string,token:string,generation:number,run?:RunFence){
 return withContext({access:'service'},async tx=>{
  async function fence(){
   const [job]=await tx.select({id:jobs.id}).from(jobs).where(and(eq(jobs.id,id),eq(jobs.kind,'operational_cleanup'),eq(jobs.status,'running'),eq(jobs.leaseToken,token),eq(jobs.leaseGeneration,generation),sql`${jobs.leaseUntil}>clock_timestamp()`)).limit(1).for('share');
   if(!job)throw new Error('LEASE_LOST');
   if(run){const [scheduler]=await tx.select({id:schedulerRuns.id}).from(schedulerRuns).where(and(eq(schedulerRuns.id,run.id),eq(schedulerRuns.leaseToken,run.token),eq(schedulerRuns.leaseGeneration,run.generation),isNull(schedulerRuns.completedAt),sql`${schedulerRuns.leaseUntil}>clock_timestamp()`)).limit(1).for('share');if(!scheduler)throw new Error('LEASE_LOST');}
  }
  const key=`archive-job-step:${id}:${generation}`,hash=crypto.createHash('sha256').update(key).digest('hex');
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key},0))`);
  await fence();
  const [prior]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);
  if(prior){if(prior.requestHash!==hash)throw new Error('VERSION_CONFLICT');return archiveStep.parse(prior.result);}
  const result=await advanceArchives(tx);await fence();
  await tx.insert(operationKeys).values({businessKey:key,requestHash:hash,result});return result;
 });
}
const archiveSources=z.enum(['audit_events','chain_scan_pages','ledger_postings']);
const archiveMonth=z.string().regex(/^[2-9][0-9]{3}-(?:0[1-9]|1[012])-01$/);
export const retentionInput=z.object({view:z.enum(['current','history']).default('current'),cursor:staffCursor,source:archiveSources.optional()}).strict();
export async function retentionStatus(tx:DbExecutor,actorId:string,input:z.infer<typeof retentionInput>){
 const manifest=await readManifest(tx),policy=manifest.retention_policy,size=Math.min(manifest.pagination_policy.max_size,50);
 const scope=staffPageScope(actorId,'retention',{view:input.view,source:input.source});
 const after=staffPositionAfter(input.cursor,scope,z.tuple([archiveMonth,archiveSources]));
 const rows=await tx.select().from(archiveMonths).where(and(input.view==='current'?sql`${archiveMonths.state}<>'archived'`:undefined,input.source?eq(archiveMonths.sourceTable,input.source):undefined,
  after?sql`(${archiveMonths.monthStart},${archiveMonths.sourceTable})>(${after[0]}::date,${after[1]})`:undefined))
  .orderBy(asc(archiveMonths.monthStart),asc(archiveMonths.sourceTable)).limit(size+1);
 const page=rows.slice(0,size),last=page.at(-1);
 return {held:operationalRetentionHeld(),policy,storage:'same_database_online_partitions' as const,financial_deletion:false,
  rows:page.map(row=>({source_table:row.sourceTable,month:row.monthStart,state:row.state,processed_rows:row.walkCount.toString(),verified_rows:row.expectedCount?.toString()??null,frozen_at:row.frozenAt?.toISOString()??null,archived_at:row.archivedAt?.toISOString()??null})),
  next_cursor:rows.length>size&&last?staffPositionCursor([last.monthStart,last.sourceTable],scope):null};
}
export async function manualArchiveStep(tx:DbExecutor,actorId:string,reason:string,requestKey:string){
 const key=`retention-step:${actorId}:${requestKey}`,hash=crypto.createHash('sha256').update(reason).digest('hex');
 await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key},0))`);
 const [prior]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1);
 if(prior){if(prior.requestHash!==hash)throw new Error('VERSION_CONFLICT');return prior.result;}
 const result=await advanceArchives(tx);
 await tx.insert(operationKeys).values({businessKey:key,requestHash:hash,result});
 await tx.insert(auditEvents).values({actorUserId:actorId,action:'retention.manual.step',targetType:'archive',reason,afterState:result});
 return result;
}
