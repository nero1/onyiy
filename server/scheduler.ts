import {expireSuspensions} from './account-expiry';
import crypto from 'node:crypto';
import { and, asc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { readManifest, schedulerNonces, schedulerRuns, withContext } from '@gifters/db';
import { validateRuntimeEnv } from '@gifters/config';
import { enqueueDailyReconciliation, runNonSigningJobs, type RunFence } from './jobs';
import { enqueueDailyMaintenance, operationalRetentionHeld } from './maintenance';

const PATH='/api/v1/internal/tick';
function keyFor(id:string) {
  const raw=id==='current'?process.env.SCHEDULER_HMAC_KEY:id==='previous'?process.env.SCHEDULER_HMAC_PREVIOUS_KEY:undefined;
  if (!raw || !/^[A-Za-z0-9_-]{43,128}$/.test(raw)) throw new Error('SCHEDULER_UNAVAILABLE');
  const key=Buffer.from(raw,'base64url');
  if (key.length<32 || key.toString('base64url')!==raw) throw new Error('SCHEDULER_UNAVAILABLE');
  return key;
}

async function bodyText(request:Request) {
  if (request.headers.get('content-type')?.split(';')[0]!=='application/json') throw new Error('INVALID_INPUT');
  if (!request.body) throw new Error('INVALID_INPUT');
  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];let bytes=0;
  try {
    while (true) {
      const part=await reader.read();if (part.done) break;
      bytes+=part.value.byteLength;
      if (bytes>1024) { await reader.cancel();throw new Error('INVALID_INPUT'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

export async function schedulerTick(request:Request) {
  const url=new URL(request.url);
  if (request.method!=='POST' || url.pathname!==PATH || url.search) throw new Error('INVALID_INPUT');
  const environment=validateRuntimeEnv().appEnv;
  const parsedNonce=z.string().uuid().safeParse(request.headers.get('x-scheduler-nonce'));
  if (!parsedNonce.success) throw new Error('UNAUTHENTICATED');
  const nonce=parsedNonce.data.toLowerCase();
  const keyId=request.headers.get('x-scheduler-key-id')??'';
  if (!['current','previous'].includes(keyId)) throw new Error('UNAUTHENTICATED');
  const timestamp=request.headers.get('x-scheduler-timestamp')??'';
  const signature=request.headers.get('x-scheduler-signature')??'';
  if (!/^[1-9][0-9]{9,11}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) throw new Error('UNAUTHENTICATED');
  const key=keyFor(keyId);
  const body=await bodyText(request);
  const canonical=['v1','POST',PATH,environment,keyId,timestamp,nonce,crypto.createHash('sha256').update(body).digest('hex')].join('\n');
  const expected=crypto.createHmac('sha256',key).update(canonical).digest();
  if (!crypto.timingSafeEqual(expected,Buffer.from(signature,'hex'))) throw new Error('UNAUTHENTICATED');
  try { z.object({}).strict().parse(JSON.parse(body)); } catch { throw new Error('INVALID_INPUT'); }
  const token=crypto.randomUUID();
  const run=await withContext({access:'service'},async database=>{
    await database.execute(sql`set local statement_timeout='2000ms'`);
    const policy=(await readManifest(database)).scheduler_auth_policy;
    // PostgreSQL server time is an infrastructure-specific SQL expression.
    const [time]=await database.execute<{valid:boolean;runKey:string}>(sql`select abs(extract(epoch from clock_timestamp())-${timestamp}::numeric)<=${policy.max_clock_skew_seconds} as valid,floor(extract(epoch from clock_timestamp())/300)::text as "runKey"`);
    if (!time.valid) throw new Error('UNAUTHENTICATED');
    const consumed=await database.insert(schedulerNonces).values({environment,nonce,expiresAt:sql`clock_timestamp()+${policy.replay_ttl_seconds}*interval '1 second'`})
      .onConflictDoNothing().returning({id:schedulerNonces.id});
    if (!consumed.length) throw new Error('SCHEDULER_REPLAY');
    const expired=await database.select({id:schedulerNonces.id}).from(schedulerNonces).where(and(lt(schedulerNonces.expiresAt,sql`clock_timestamp()`),lt(schedulerNonces.createdAt,sql`clock_timestamp()-interval '600 seconds'`))).orderBy(asc(schedulerNonces.expiresAt),asc(schedulerNonces.id)).limit(100).for('update',{skipLocked:true});
    if (expired.length && !operationalRetentionHeld()) await database.delete(schedulerNonces).where(inArray(schedulerNonces.id,expired.map(item=>item.id)));
    const [inserted]=await database.insert(schedulerRuns).values({environment,runKey:time.runKey,leaseToken:token,leaseUntil:sql`clock_timestamp()+interval '60 seconds'`}).onConflictDoNothing().returning({id:schedulerRuns.id,generation:schedulerRuns.leaseGeneration});
    if (inserted) return {id:inserted.id,token,generation:inserted.generation};
    const [prior]=await database.select().from(schedulerRuns).where(and(eq(schedulerRuns.environment,environment),eq(schedulerRuns.runKey,time.runKey))).limit(1).for('update');
    if (prior.completedAt) return null;
    const reclaimed=await database.update(schedulerRuns).set({leaseToken:token,leaseGeneration:prior.leaseGeneration+1,leaseUntil:sql`clock_timestamp()+interval '60 seconds'`})
      .where(and(eq(schedulerRuns.id,prior.id),lt(schedulerRuns.leaseUntil,sql`clock_timestamp()`))).returning({id:schedulerRuns.id,generation:schedulerRuns.leaseGeneration});
    return reclaimed[0]?{id:prior.id,token,generation:reclaimed[0].generation}:null;
  });
  if (!run) return {status:'already_claimed'};
  await withContext({access:'service'},async tx=>{await expireSuspensions(tx);await enqueueDailyReconciliation(tx);await enqueueDailyMaintenance(tx);});
  const result=await runNonSigningJobs(run,request.signal);
  await completeRun(run);
  return {status:'done',...result};
}
async function completeRun(run:RunFence) {
  return withContext({access:'service'},async database=>{
    await database.execute(sql`set local statement_timeout='2000ms'`);
    const completed=await database.update(schedulerRuns).set({completedAt:sql`clock_timestamp()`})
      .where(and(eq(schedulerRuns.id,run.id),eq(schedulerRuns.leaseToken,run.token),eq(schedulerRuns.leaseGeneration,run.generation),isNull(schedulerRuns.completedAt),sql`${schedulerRuns.leaseUntil}>clock_timestamp()`)).returning({id:schedulerRuns.id});
    if (!completed.length) throw new Error('LEASE_LOST');
  });
}
