import {withBoundedTransaction,remainingExecutionTime} from './execution-budget';
import {performance} from 'node:perf_hooks';
import {admissionFor} from './work-budget';
import {databaseConnectionOptions} from './connection-options';
import {databaseBinding} from './binding-fingerprint';
import {activeRequestId} from './request-context';
import { sql, eq, and } from 'drizzle-orm';
import { AsyncLocalStorage } from 'node:async_hooks';
import { validateRuntimeEnv } from '@gifters/config';
import { db, readManifest, type Database, type DbExecutor } from './index';
import { users,authSessions,authFactors } from './schema';
type SessionScope={userId:string;sessionId:string;accessHash:string;version:number;allowSuspended?:boolean;requiresAdult?:boolean;requiresWithdrawalProof?:boolean};
const sessionScopes=new AsyncLocalStorage<SessionScope>();
export function withSessionScope<T>(scope:SessionScope,fn:()=>T){return sessionScopes.run(scope,fn);}

export type DatabaseContext = { access: 'public' | 'member' | 'staff' | 'service'; actorId?: string; requireAdmin?: boolean; requireModerator?:boolean; snapshot?: boolean; reportSnapshot?: boolean };

export async function scopedTransaction<T>(database: Database, context: DatabaseContext, fn: (tx: DbExecutor) => Promise<T>) {
  if (context.actorId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(context.actorId)) throw new Error('INVALID_INPUT');
  if ((['member','staff'].includes(context.access) || context.requireAdmin || context.requireModerator) && !context.actorId) throw new Error('UNAUTHENTICATED');
  if (context.reportSnapshot && context.access!=='service') throw new Error('FORBIDDEN');
  const config = validateRuntimeEnv();
  return admissionFor(database,databaseConnectionOptions(config.databaseUrl).max).run(performance.now()+Math.min(1500,remainingExecutionTime()),()=>{remainingExecutionTime();return database.transaction(rawTx => withBoundedTransaction(rawTx,async (tx) => {
    await tx.execute(sql`select set_config('statement_timeout',${context.access==='public'?'3000':'5000'},true),set_config('lock_timeout','1500',true)`);
    await tx.execute(sql.raw('SET LOCAL search_path=pg_catalog,public,pg_temp'));
    // PostgreSQL metadata and transaction-local security context are deliberate
    // infrastructure exceptions. Domain queries continue to use Drizzle.
    const role = await tx.execute<{safe:boolean}>(sql`
      select not (r.rolsuper or r.rolbypassrls or r.rolcreatedb or r.rolcreaterole or r.rolinherit)
        and not exists (select 1 from pg_roles g where g.rolname in ('gw_read','gw_service') and (g.rolcanlogin or g.rolinherit or g.rolsuper or g.rolcreatedb or g.rolcreaterole or g.rolbypassrls))
        and not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles owner on owner.oid=c.relowner where n.nspname='public' and owner.rolname in (session_user,'gw_read','gw_service'))
        and not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles owner on owner.oid=p.proowner where n.nspname='public' and owner.rolname in (session_user,'gw_read','gw_service'))
        and not exists (select 1 from pg_database d join pg_roles owner on owner.oid=d.datdba where d.datname=current_database() and owner.rolname in (session_user,'gw_read','gw_service'))
        and not exists (select 1 from pg_namespace n join pg_roles owner on owner.oid=n.nspowner where n.nspname='public' and owner.rolname in (session_user,'gw_read','gw_service'))
        as safe from pg_roles r where r.rolname=session_user
    `);
    if (!role[0]?.safe) throw new Error('CONFIGURATION_INVALID');
    await tx.execute(context.access === 'service' ? sql.raw('SET LOCAL ROLE gw_service') : sql.raw('SET LOCAL ROLE gw_read'));
    const binding = await databaseBinding(tx, process.env.DATABASE_URL);
    await tx.execute(sql`select set_config('gw.request_id',${activeRequestId()??''},true)`);
    await tx.execute(sql`select set_config('gw.actor_id',${context.actorId ?? ''},true), set_config('gw.access',${context.access},true), set_config('gw.environment',${config.appEnv},true), set_config('gw.database_binding',${binding},true)`);
    const authenticated=sessionScopes.getStore();
    async function checkFamily(fence=false){
      if(!authenticated||context.actorId!==authenticated.userId)return;
      await tx.execute(sql.raw('SET LOCAL ROLE gw_service'));
      await tx.execute(sql`select set_config('gw.access','service',true)`);
      const [actor]=await tx.select({version:users.sessionVersion,status:users.status,role:users.role,age:users.ageMinimumAccepted,ageAt:users.ageConfirmedAt}).from(users).where(eq(users.id,authenticated.userId)).limit(1);
      const query=tx.select({id:authSessions.id,stepUpAt:authSessions.stepUpAt,createdAt:authSessions.createdAt}).from(authSessions).where(and(eq(authSessions.id,authenticated.sessionId),eq(authSessions.userId,authenticated.userId),eq(authSessions.accessHash,authenticated.accessHash),eq(authSessions.sessionVersion,authenticated.version),sql`${authSessions.revokedAt} is null and not ${authSessions.preAuth} and ${authSessions.accessExpiresAt}>clock_timestamp() and ${authSessions.idleExpiresAt}>clock_timestamp() and ${authSessions.absoluteExpiresAt}>clock_timestamp()`)).limit(1);
      const [family]=fence&&!context.snapshot?await query.for('share'):await query;
      if(!actor||!family||actor.version!==authenticated.version||(['banned','deleted'].includes(actor.status)||(actor.status==='suspended'&&!authenticated.allowSuspended)))throw new Error('UNAUTHENTICATED');
      if(authenticated.requiresAdult){const policy=await readManifest(tx);if(!actor.ageAt||actor.age===null||actor.age<policy.eligibility_min_age)throw new Error('CONSENT_REQUIRED');}
      if(authenticated.requiresWithdrawalProof){const policy=await readManifest(tx);const [factor]=await tx.select({active:authFactors.active}).from(authFactors).where(eq(authFactors.userId,authenticated.userId)).limit(1);const [clock]=await tx.execute<{now:Date}>(sql`select clock_timestamp() as now`);const now=new Date(clock.now).getTime(),budget=policy.staff_reauth_minutes*60000;if(factor?.active||['admin','moderator'].includes(actor.role)){if(!factor?.active||!family.stepUpAt||now-family.stepUpAt.getTime()>=budget)throw new Error('STEP_UP_REQUIRED');}else if(now-family.createdAt.getTime()>=budget)throw new Error('STEP_UP_REQUIRED');}
      if(context.requireAdmin||context.requireModerator){const policy=await readManifest(tx);const [now]=await tx.execute<{now:Date}>(sql`select clock_timestamp() as now`);if(!family.stepUpAt||new Date(now.now).getTime()-family.stepUpAt.getTime()>=policy.staff_reauth_minutes*60000)throw new Error('STEP_UP_REQUIRED');}
      await tx.execute(context.access==='service'?sql.raw('SET LOCAL ROLE gw_service'):sql.raw('SET LOCAL ROLE gw_read'));
      await tx.execute(sql`select set_config('gw.access',${context.access},true)`);
    }
    // Do not prelock the sender: financial services acquire sorted participant
    // locks. The completion fence runs after those locks and before commit.
    await checkFamily();
    if (context.access === 'staff' || context.requireAdmin || context.requireModerator) {
      const actor = (await tx.select({role:users.role,status:users.status}).from(users).where(eq(users.id,context.actorId!)).limit(1))[0];
      if (!actor || !(context.requireModerator?['admin','moderator'].includes(actor.role):actor.role==='admin') || actor.status !== 'active') throw new Error('FORBIDDEN');
    }
    const result=await fn(tx);await checkFamily(true);return result;
  }),context.snapshot ? {isolationLevel:'repeatable read',accessMode:'read only'} : context.reportSnapshot ? {isolationLevel:'repeatable read'} : undefined)});
}

export function withContext<T>(context: DatabaseContext, fn: (tx: DbExecutor) => Promise<T>) {
  return scopedTransaction(db(),context,fn);
}

/** Capture server policy and owned member views in the same repeatable snapshot.
 * Private policy stays under the service role; domain member reads use gw_read.
 * Completion returns to the service role for the ordinary live-family fence. */
export function withMemberSnapshot<T>(actorId:string,fn:(tx:DbExecutor,policy:Awaited<ReturnType<typeof readManifest>>)=>Promise<T>){
 return withContext({access:'service',actorId,reportSnapshot:true},async tx=>{
  const policy=await readManifest(tx);
  await tx.execute(sql`set local role gw_read`);await tx.execute(sql`select set_config('gw.access','member',true)`);
  const result=await fn(tx,policy);
  await tx.execute(sql`set local role gw_service`);await tx.execute(sql`select set_config('gw.access','service',true)`);
  return result;
 });
}
