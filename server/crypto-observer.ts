import {and,eq,sql} from 'drizzle-orm';
import {z} from 'zod';
import {outbox,chainObservations,readManifest,type DbExecutor} from '@gifters/db';
import {validateRuntimeEnv} from '@gifters/config';
export const observationPayload=z.object({user_id:z.string().uuid(),invoice_id:z.string().uuid(),tx_hash:z.string().min(20).max(128),event_index:z.number().int().min(-1).max(1000),round:z.number().int().min(0).max(2880)}).strict();
export async function enqueueObservation(tx:DbExecutor,input:z.infer<typeof observationPayload>){
 const parsed=observationPayload.parse(input),environment=validateRuntimeEnv().appEnv,key=`chain-observe:${parsed.invoice_id}:${parsed.tx_hash}:${parsed.event_index}:0`,policy=(await readManifest(tx)).crypto_monitor_policy;
 const [record]=await tx.insert(chainObservations).values({businessKey:key,userId:parsed.user_id,invoiceId:parsed.invoice_id,txHash:parsed.tx_hash,eventIndex:parsed.event_index,nextObservationAt:sql`clock_timestamp()+${policy.first_poll_seconds}*interval '1 second'`}).onConflictDoNothing().returning();
 if(!record){const [old]=await tx.select().from(chainObservations).where(eq(chainObservations.businessKey,key)).limit(1);if(!old||old.userId!==parsed.user_id||old.invoiceId!==parsed.invoice_id||old.txHash!==parsed.tx_hash||old.eventIndex!==parsed.event_index)throw new Error('VERSION_CONFLICT');}
 await tx.insert(outbox).values({businessKey:key,environment,kind:'chain_observation',payload:{...parsed,round:0}}).onConflictDoNothing({target:outbox.businessKey});
 const [source]=await tx.select().from(outbox).where(eq(outbox.businessKey,key)).limit(1),saved=observationPayload.safeParse(source?.payload);
 if(!saved.success||source.kind!=='chain_observation'||source.environment!==environment||JSON.stringify(saved.data)!==JSON.stringify({...parsed,round:0}))throw new Error('VERSION_CONFLICT');
}
/** One persistent observation and one driver job per submitted deposit. */
export async function observationForJob(tx:DbExecutor,input:z.infer<typeof observationPayload>,jobId:string){
 await enqueueObservation(tx,input);
 const key=`chain-observe:${input.invoice_id}:${input.tx_hash}:${input.event_index}:0`;
 const [row]=await tx.select().from(chainObservations).where(eq(chainObservations.businessKey,key)).for('update');
 if(!row.sourceJobId){const [assigned]=await tx.update(chainObservations).set({sourceJobId:jobId}).where(and(eq(chainObservations.id,row.id),sql`${chainObservations.sourceJobId} is null`)).returning();return assigned;}
 return row;
}
export async function deferObservation(tx:DbExecutor,row:typeof chainObservations.$inferSelect){
 const policy=await readManifest(tx),[clock]=await tx.execute<{now:Date}>(sql`select clock_timestamp() as now`);
 const elapsed=new Date(clock.now).getTime()-row.createdAt.getTime(),base=elapsed<policy.crypto_monitor_policy.active_poll_minutes*60000?policy.crypto_monitor_policy.first_poll_seconds:policy.crypto_monitor_policy.later_poll_seconds;
 const cap=Math.max(base,policy.job_policy.max_delay_seconds);
 const delay=Math.min(cap,Math.max(base,Math.round(Math.min(cap,base*2**Math.min(8,Math.floor(row.rounds/20)))*(1+Math.random()*policy.job_policy.jitter_fraction))));
 const [updated]=await tx.update(chainObservations).set({rounds:row.rounds+1,nextObservationAt:sql`clock_timestamp()+${delay}*interval '1 second'`}).where(eq(chainObservations.id,row.id)).returning();
 return updated;
}
