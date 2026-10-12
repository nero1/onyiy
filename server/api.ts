import crypto from 'node:crypto';
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  financialReconciliationResults,
  maintenanceResults,
  jobs,
  planVersions,
  queueEntries,
  queuePartitions,
  users,
  withContext,
  withSessionScope,
  authSessions,
  simulationAccounts,
  readManifest,
} from '@gifters/db';
import {
  activatePlan,
  cancelWithdrawal,
  controlSimulationWithdrawal,
  resolveSimulationWithdrawal,
  confirmWithdrawal,
  consentUser,
  dashboard,
  getUser,
  linkSimulationWallet,
  quoteWithdrawal,
  sendGift,
} from './core';
import { reconcile } from './reconcile';
import { schedulerTick } from './scheduler';
import { replayDeadJob } from './jobs';
import {recordReorg,reconfirmReorg,reorgHistory} from './reorg';
import {quoteIncoming,submitIncoming,controlIncoming,resolveIncoming,ownInvoices,cancelIncomingQuote} from './incoming';

import { getPublicManifest,getPublicCatalog,invalidatePublicReads } from './public-reads';
import { authenticate,csrf,requireStepUp,requireWithdrawalAuth,issueSession,validateUsername,databaseNow,clearCookies } from './auth';
import { handleAuthRequest } from './auth-api';
import { enforceRate } from './rate-limits';

function requestId() { return crypto.randomUUID(); }

function ok(data: unknown, status = 200) {
  return Response.json({ data, meta: { request_id: requestId() } }, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function publicOk(data:unknown,ttlSeconds:number,request:Request) {
  const etag=`W/"${crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')}"`;
  const headers={'ETag':etag,'Cache-Control':`public, max-age=0, s-maxage=${ttlSeconds}`};
  const candidates=(request.headers.get('if-none-match')??'').split(',').map(value=>value.trim());
  if(candidates.some(value=>value==='*'||value.replace(/^W\//,'')===etag.replace(/^W\//,'')))return new Response(null,{status:304,headers});
  return Response.json({data,meta:{request_id:requestId()}},{headers});
}

function fail(error: unknown) {
  const message = error instanceof z.ZodError ? 'INVALID_INPUT' : error instanceof Error ? error.message : 'INTERNAL_ERROR';
  const statusMap: Record<string, number> = {
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    ACCOUNT_RESTRICTED: 403,
    CONSENT_REQUIRED: 403,
    NOT_FOUND: 404,
    INVALID_INPUT: 400,
    INVALID_ADDRESS: 400,
    ACTIVE_CYCLE_EXISTS: 409,
    ACTIVE_INVOICE_EXISTS: 409,
    COOLDOWN_ACTIVE: 409,
    PLAN_UNAVAILABLE: 409,
    QUOTE_EXPIRED: 409,
    VERSION_CONFLICT: 409,
    INSUFFICIENT_BALANCE: 409,
    CONFIGURATION_INVALID: 503,
    RECONCILIATION_TIMEOUT: 503,
    SCHEDULER_UNAVAILABLE: 503,
    SCHEDULER_REPLAY: 409,
    LEASE_LOST: 409,
    STEP_UP_REQUIRED:403,
    INVALID_PROOF:400,
    RATE_LIMITED:429,
    PROVIDER_UNAVAILABLE:503,
    FEATURE_DISABLED: 404,
    CYCLE_LIMIT_REACHED: 409,
    DESTINATION_CHANGED: 409,
    NO_RECEIVER_AVAILABLE: 409,
    FINANCIAL_SAFETY_PAUSE: 503,
  };
  const code = Object.hasOwn(statusMap, message) ? message : 'INTERNAL_ERROR';
  return Response.json(
    { error: { code, message_key: `errors.${code.toLowerCase()}`, help_slug: 'simulation', retryable: code==='RECONCILIATION_TIMEOUT' }, meta: { request_id: requestId() } },
    { status: statusMap[code] ?? 500, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

async function current(request:Request){return (await authenticate(request)).user;}
async function admin(request:Request){const identity=await authenticate(request);if(identity.user.role!=='admin'||identity.user.status!=='active')throw new Error('FORBIDDEN');await requireStepUp(identity);return identity.user;}

async function json(request: Request) {
  try { return await request.json(); } catch { throw new Error('INVALID_INPUT'); }
}

function idempotencyKey(request: Request) {
  const key = request.headers.get('Idempotency-Key');
  if (!key) throw new Error('INVALID_INPUT');
  return z.string().uuid().parse(key).toLowerCase();
}

// Route Handlers can retain the public URL after a rewrite. Resolve the public
// path first so a caller's query cannot override the ID in that path.
function resourceId(request: Request, queryKey: string, publicPath: RegExp) {
  const url = new URL(request.url);
  const match = publicPath.exec(url.pathname);
  return z.string().uuid().parse(match?.[1] ?? url.searchParams.get(queryKey));
}

async function dispatchApiRequest(method: string, path: string[], request: Request) {
  try {
    const route = `/${path.join('/')}`;

    if (method === 'POST' && route === '/internal/tick') return ok(await schedulerTick(request));

    if (method === 'POST' && route === '/admin/jobs/replay') {
      const actor=await admin(request);
      z.object({}).strict().parse(await json(request));
      const jobId=resourceId(request,'job_id',/^\/api\/v1\/admin\/jobs\/([^/]+)\/replay\/?$/);
      return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>replayDeadJob(tx,actor.id,jobId,idempotencyKey(request))));
    }

    if (method === 'POST' && (route === '/admin/simulation/withdrawals/control' || route === '/admin/simulation/withdrawals/resolve')) {
      const actor=await admin(request);
      const withdrawalId=resourceId(request,'withdrawal_id',/^\/api\/v1\/admin\/simulation\/withdrawals\/([^/]+)\/(?:control|resolve)\/?$/);
      if (route.endsWith('/control')) {
        const body=z.object({outcome:z.enum(['hold','reject']),reason:z.string().min(5).max(500)}).strict().parse(await json(request));
        return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>controlSimulationWithdrawal(tx,actor.id,withdrawalId,body.outcome,body.reason,idempotencyKey(request))));
      }
      const body=z.object({action:z.enum(['settle','cancel']),reason:z.string().min(5).max(500)}).strict().parse(await json(request));
      return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>resolveSimulationWithdrawal(tx,actor.id,withdrawalId,body.action,body.reason,idempotencyKey(request))));
    }

    if(method==='POST' && (route==='/admin/simulation/allocations/reorg' || route==='/admin/simulation/reorgs/reconfirm')){
      const actor=await admin(request);const body=z.object({reason:z.string().min(5).max(500)}).strict().parse(await json(request));
      if(route.endsWith('/reorg')){
        const id=resourceId(request,'allocation_id',/^\/api\/v1\/admin\/simulation\/allocations\/([^/]+)\/reorg\/?$/);
        return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>recordReorg(tx,actor.id,id,body.reason,idempotencyKey(request))));
      }
      const id=resourceId(request,'review_id',/^\/api\/v1\/admin\/simulation\/reorgs\/([^/]+)\/reconfirm\/?$/);
      return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>reconfirmReorg(tx,actor.id,id,body.reason,idempotencyKey(request))));
    }
    if(method==='GET' && route==='/admin/simulation/reorgs'){
      const actor=await admin(request);return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>reorgHistory(tx)));
    }

    if (method==='POST' && (route==='/admin/simulation/invoices/control' || route==='/admin/simulation/invoices/resolve')) {
      const actor=await admin(request);
      const id=resourceId(request,'invoice_id',/^\/api\/v1\/admin\/simulation\/invoices\/([^/]+)\/(?:control|resolve)\/?$/);
      if(route.endsWith('/control')) {
        const body=z.object({outcome:z.enum(['reject','under','over','late','delay']),reason:z.string().min(5).max(500),actual_base_units:z.string().max(78).regex(/^(0|[1-9][0-9]*)$/).optional()}).strict().parse(await json(request));
        return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>controlIncoming(tx,actor.id,id,body.outcome,body.reason,idempotencyKey(request),body.actual_base_units)));
      }
      const body=z.object({action:z.enum(['confirm','refund','cancel']),reason:z.string().min(5).max(500)}).strict().parse(await json(request));
      return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>resolveIncoming(tx,actor.id,id,body.action,body.reason,idempotencyKey(request))));
    }
    if(method==='POST' && route==='/gifts/invoices') {
      const user=await current(request);const body=z.object({plan_id:z.string().uuid()}).strict().parse(await json(request));
      return ok(await withContext({access:'service',actorId:user.id},tx=>quoteIncoming(tx,user.id,body.plan_id,idempotencyKey(request))));
    }
    if(method==='POST' && route==='/gifts/invoices/transaction') {
      const user=await current(request);z.object({}).strict().parse(await json(request));
      const id=resourceId(request,'invoice_id',/^\/api\/v1\/gifts\/invoices\/([^/]+)\/transaction\/?$/);
      // The server-issued GIV invoice ID is a single-use submission identity.
      return ok(await withContext({access:'service',actorId:user.id},tx=>submitIncoming(tx,user.id,id)));
    }
    if(method==='POST' && route==='/gifts/invoices/cancel') {
      const user=await current(request);z.object({}).strict().parse(await json(request));
      const id=resourceId(request,'invoice_id',/^\/api\/v1\/gifts\/invoices\/([^/]+)\/cancel\/?$/);
      return ok(await withContext({access:'service',actorId:user.id},tx=>cancelIncomingQuote(tx,user.id,id)));
    }
    if(method==='GET' && route==='/me/gift-invoices') {
      const user=await current(request);return ok(await withContext({access:'service',actorId:user.id},tx=>ownInvoices(tx,user.id)));
    }

    if (method === 'GET' && (route === '/admin/reconcile/reports' || route === '/admin/reconcile/report')) {
      const actor=await admin(request);
      return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},async tx=>{
        if (route.endsWith('/report')) {
          const id=resourceId(request,'report_id',/^\/api\/v1\/admin\/reconcile\/reports\/([^/]+)\/?$/);
          const [report]=await tx.select().from(financialReconciliationResults).where(eq(financialReconciliationResults.id,id)).limit(1);
          if (!report) throw new Error('NOT_FOUND');return report;
        }
        const pagination=(await readManifest(tx)).pagination_policy;
        const limit=Math.min(pagination.default_size,pagination.max_size,100);
        return tx.select({id:financialReconciliationResults.id,run_date:financialReconciliationResults.runDate,balanced:financialReconciliationResults.balanced,consistent:financialReconciliationResults.consistent,lineage_complete:financialReconciliationResults.lineageComplete,snapshot_started_at:financialReconciliationResults.snapshotStartedAt,checked_at:financialReconciliationResults.checkedAt})
          .from(financialReconciliationResults).orderBy(desc(financialReconciliationResults.checkedAt),desc(financialReconciliationResults.id)).limit(limit);
      }));
    }

    if (method === 'GET' && route === '/admin/maintenance/reports') {
      const actor=await admin(request);
      return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},async tx=>{
        const pagination=(await readManifest(tx)).pagination_policy;
        return tx.select({id:maintenanceResults.id,run_date:maintenanceResults.runDate,page_number:maintenanceResults.pageNumber,nonces_deleted:maintenanceResults.noncesDeleted,
          runs_deleted:maintenanceResults.runsDeleted,batch_limit:maintenanceResults.batchLimit,held:maintenanceResults.held,
          more_possible:maintenanceResults.morePossible,checked_at:maintenanceResults.checkedAt})
          .from(maintenanceResults).orderBy(desc(maintenanceResults.checkedAt),desc(maintenanceResults.id)).limit(Math.min(pagination.default_size,pagination.max_size,100));
      }));
    }

    if (method === 'GET' && route === '/admin/jobs') {
      const actor=await admin(request);
      const data=await withContext({access:'service',actorId:actor.id,requireAdmin:true},async tx=>{
        const limit=(await readManifest(tx)).pagination_policy.max_size;
        const counts=await tx.select({status:jobs.status,count:sql<string>`count(*)::text`}).from(jobs).groupBy(jobs.status);
        const rows=await tx.select({id:jobs.id,status:jobs.status,kind:jobs.kind,attempts:jobs.attempts,last_error_code:jobs.lastErrorCode,due_at:jobs.dueAt}).from(jobs).orderBy(desc(jobs.createdAt),desc(jobs.id)).limit(limit);
        return {counts,rows,sample_limit:limit};
      });
      return ok(data);
    }

    if (method === 'GET' && route === '/manifest') {
      const value=await getPublicManifest();return publicOk(value.data,value.ttlSeconds,request);
    }

    if (method === 'GET' && route === '/sim/users') {
      const rows = await withContext({access:'public'},(tx) => tx.select().from(simulationAccounts).orderBy(desc(simulationAccounts.role),asc(simulationAccounts.username)));
      return ok(rows);
    }

    if(method==='POST'&&route==='/me/consent'){
      const identity=await authenticate(request);const user=identity.user;
      const input=z.object({accepted:z.literal(true),referral_code:z.string().uuid().optional(),terms_version:z.string().max(100).optional(),adult:z.literal(true).optional(),minimum_age:z.number().int().positive().optional(),username:z.string().max(64).optional()}).strict().parse(await json(request));
      const result=await withContext({access:'service',actorId:user.id},async tx=>{
        await tx.select({id:users.id}).from(users).where(eq(users.id,user.id)).for('no key update');
        if(!identity.tool){const [family]=await tx.select({id:authSessions.id}).from(authSessions).where(and(eq(authSessions.id,identity.session!.id),eq(authSessions.accessHash,identity.accessHash!),sql`${authSessions.revokedAt} is null and ${authSessions.accessExpiresAt}>clock_timestamp()`)).for('share');if(!family)throw new Error('UNAUTHENTICATED');}
        const manifest=await readManifest(tx);
        if(!identity.tool&&(input.terms_version!==manifest.terms_content.version||!input.adult||input.minimum_age!==manifest.eligibility_min_age||!input.username))throw new Error('CONSENT_REQUIRED');
        let username=user.username;
        if(!identity.tool&&user.status==='pending_consent')await validateUsername(tx,input.username!);
        if(input.username&&input.username!==user.username){if(user.consentedAt)throw new Error('VERSION_CONFLICT');username=await validateUsername(tx,input.username);await tx.update(users).set({username}).where(eq(users.id,user.id));}
        await tx.update(users).set({ageConfirmedAt:await databaseNow(tx),ageMinimumAccepted:manifest.eligibility_min_age}).where(eq(users.id,user.id));
        return consentUser(tx,username,input.referral_code);
      });
      if(identity.tool)return ok(result);
      return issueSession(request,user.id);
    }

    if (method === 'GET' && route === '/me/dashboard') {
      const user = await current(request);
      const manifest = await readManifest();
      return ok(await withContext({access:'member',actorId:user.id},(tx) => dashboard(tx,user,manifest)));
    }

    if (method === 'GET' && route === '/plans') {
      const value=await getPublicCatalog();return publicOk(value.data,value.ttlSeconds,request);
    }

    if (method === 'POST' && route === '/gifts/simulate') {
      const user = await current(request);
      const body = z.object({ plan_id: z.string().uuid() }).strict().parse(await json(request));
      return ok(await withContext({access:'service',actorId:user.id},(tx) => sendGift(tx, user, body.plan_id, idempotencyKey(request))));
    }

    if (method === 'POST' && route === '/me/wallets/simulate') {
      const user = await current(request);
      z.object({}).strict().parse(await json(request));
      return ok(await withContext({access:'service',actorId:user.id},(tx) => linkSimulationWallet(tx, user)));
    }

    if (method === 'POST' && route === '/me/withdrawals/quotes') {
      const user = await current(request);
      const body = z.object({ gross_base_units: z.string().max(78).regex(/^[1-9][0-9]*$/) }).strict().parse(await json(request));
      return ok(await withContext({access:'service',actorId:user.id},(tx) => quoteWithdrawal(tx, user, BigInt(body.gross_base_units), idempotencyKey(request))));
    }

    if (method === 'POST' && route === '/me/withdrawals/cancel') {
      const user=await current(request);
      z.object({}).strict().parse(await json(request));
      const withdrawalId=resourceId(request,'withdrawal_id',/^\/api\/v1\/me\/withdrawals\/([^/]+)\/cancel\/?$/);
      return ok(await withContext({access:'service',actorId:user.id},tx=>cancelWithdrawal(tx,user,withdrawalId)));
    }

    if (method === 'POST' && route === '/me/withdrawals/confirm') {
      await requireWithdrawalAuth(await authenticate(request));
      const user = await current(request);
      z.object({}).strict().parse(await json(request));
      const withdrawalId = resourceId(request, 'withdrawal_id', /^\/api\/v1\/me\/withdrawals\/([^/]+)\/confirm\/?$/);
      return ok(await withContext({access:'service',actorId:user.id},(tx) => confirmWithdrawal(tx, user, withdrawalId)));
    }

    if (method === 'POST' && route === '/admin/plans/activate') {
      const user = await admin(request);
      z.object({}).strict().parse(await json(request));
      const planId = resourceId(request, 'plan_id', /^\/api\/v1\/admin\/plans\/([^/]+)\/activate\/?$/);
      const result=await withContext({access:'service',actorId:user.id,requireAdmin:true},tx=>activatePlan(tx,planId,user.id,idempotencyKey(request)));
      invalidatePublicReads();return ok(result);
    }

    if (method === 'GET' && route === '/admin/queue') {
      const actor = await admin(request);
      const planId = resourceId(request, 'plan_id', /^\/api\/v1\/admin\/queue\/([^/]+)\/?$/);
      const manifest = await readManifest();
      const params = new URL(request.url).searchParams;
      const limit = params.has('limit') ? z.string().regex(/^[1-9][0-9]*$/).transform(Number).pipe(z.number().int().max(manifest.pagination_policy.max_size)).parse(params.get('limit')) : Math.min(manifest.pagination_policy.default_size,manifest.pagination_policy.max_size);
      const partition = params.has('partition_id') ? z.string().uuid().parse(params.get('partition_id')) : undefined;
      const after = params.has('after_ticket') ? z.string().max(13).regex(/^[0-9]+$/).transform(Number).pipe(z.number().int().max(1099511627775)).parse(params.get('after_ticket')) : undefined;
      if (after !== undefined && !partition) throw new Error('INVALID_INPUT');
      const rows = await withContext({access:'staff',actorId:actor.id},(tx) => tx.select({
        id: queueEntries.id,
        partition_id: queueEntries.partitionId,
        ticket: queueEntries.ticket,
        kind: queueEntries.kind,
        status: queueEntries.status,
        credited_count: queueEntries.creditedCount,
        required_count: queueEntries.requiredCount,
        beneficiary_user_id: queueEntries.beneficiaryUserId,
        username: users.username,
        platform_role: queueEntries.platformRole,
        priority_ticket: queueEntries.priorityTicket,
        serving_position: sql<number>`public.gw_queue_rank(${queueEntries.id},'serving')`.mapWith((value) => value === null ? null : Number(value)),
      }).from(queueEntries)
        .innerJoin(queuePartitions, eq(queuePartitions.id, queueEntries.partitionId))
        .innerJoin(planVersions, eq(planVersions.id, queuePartitions.planVersionId))
        .leftJoin(users, eq(users.id, queueEntries.beneficiaryUserId))
        .where(and(eq(planVersions.planId, planId),partition ? eq(queueEntries.partitionId,partition) : undefined,after !== undefined ? gt(queueEntries.ticket,after) : undefined))
        .orderBy(asc(queueEntries.partitionId),asc(queueEntries.ticket)).limit(limit));
      return ok(rows);
    }

    if (method === 'GET' && route === '/admin/reconcile') {
      const actor = await admin(request);
      return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true,snapshot:true},reconcile));
    }

    throw new Error('NOT_FOUND');
  } catch (error) {
    if (error instanceof z.ZodError) return fail(new Error('INVALID_INPUT'));
    return fail(error);
  }
}


export async function handleApiRequest(method:string,path:string[],request:Request){
 try{
  const route='/'+path.join('/');
  if(route.startsWith('/auth/'))return await handleAuthRequest(method,route,request);
  if(route==='/sim/users'&&(process.env.AUTH_PROVIDER??'simulation')!=='simulation')throw new Error('FEATURE_DISABLED');
  if(['/manifest','/plans','/sim/users','/internal/tick'].includes(route))return await dispatchApiRequest(method,path,request);
  const identity=await authenticate(request);
  const account=request.headers.get('x-client-account');const generation=request.headers.get('x-client-session');if(!identity.tool&&((account&&account!==identity.user.username)||(generation&&generation!==identity.session!.generation)))throw new Error('VERSION_CONFLICT');
  if(identity.user.status==='pending_consent'&&route!=='/me/consent')throw new Error('CONSENT_REQUIRED');
  if(method!=='GET')csrf(request,identity);
  if(!identity.tool){const family=route.startsWith('/admin/')?'staff':route==='/me/consent'?'consent':route.startsWith('/gifts/')?(route.endsWith('/transaction')?'payment_proof':'invoice'):route.includes('/notifications')?'notifications':route.includes('/wallets')?'wallet':route.includes('/withdrawals')?'withdrawal':method==='GET'?'reads':'mutation';await enforceRate(request,family,identity.user.id);}
  if(identity.tool||route==='/me/consent')return await dispatchApiRequest(method,path,request);
  return await withSessionScope({userId:identity.user.id,sessionId:identity.session!.id,accessHash:identity.accessHash!,version:identity.user.sessionVersion,requiresAdult:route.startsWith('/gifts/'),requiresWithdrawalProof:route==='/me/withdrawals/confirm'},()=>dispatchApiRequest(method,path,request));
 }catch(error){return fail(error);}
}
