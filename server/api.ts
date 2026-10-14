import {staffReorgs,staffAlerts,staffAlertsInput,staffUsers,staffCases,staffJobs,staffRecovery,staffUsersInput,staffCasesInput,staffJobsInput,staffRecoveryInput} from './staff-reads';
import {ownMemberRecords,memberRecordInput} from './member-records';
import {applicationError} from './errors';
import {admitPublicMiss} from './public-admission';
import {readStaffOperations,reportProviderQuota,quotaReportInput} from './operational-diagnostics';
import {selectedUserExport,selectedExportInput,portabilityStatus,prepareSiteSnapshot,siteSnapshotResponse,stageSnapshot} from './portability';
import {boundedJson} from './request-body';
import {registerCheckpoint,startRecoveryScan,recoverScanPage,checkpointInput,resolveRecoveryOutflow,outflowResolutionInput} from './chain-recovery';
import {unmatchedRefundStatement,reserveUnmatchedRefund,unmatchedRefundInput} from './unallocated-refunds';
import {recoverOperationalObligation} from './crypto-operational-recovery';
import {quoteTreasurySweep,confirmTreasurySweep,recoverTreasurySweep,sweepInput} from './treasury-sweeps';
import {ownNativeReceipts} from './native-receipts';
import {recordNativeReorg,reconfirmNativeReorg,nativeReorgHistory,nativeReviewInput,nativeResolutionInput} from './crypto-reorg';
import {quoteLiabilityRecovery,confirmLiabilityRecovery,cancelLiabilityRecovery,issueRecoveryView,recoveryQuote,recoveryProof} from './liability-recovery';
import {beginBotCheck,verifyBotCheck,botProof} from './bot-check';
import {verifySignedExpiry} from './crypto-expiry';
import {enqueueFinancialReminders,controlFinancialAlert,financialAlertList,scheduleDailyBusiness} from './financial-operations';
import {prepareNativeInvoice} from './crypto-checkout';
import {nativeFundingStatement,bookNativeFunding,nativeFundingInput} from './native-funding';
import {nativeCatalog,ownNativePortfolio} from './crypto-reads';
import {provisionNativeAsset,activateNativePlan,nativeProvision,nativePlanActivation} from './crypto-provisioning';
import {reserveOriginalRefund,refundInput} from './crypto-refunds';
import {monitorFinancials} from './financial-monitor';
import {cleanupFinancialEphemeral} from './financial-cleanup';
import {holdBusinessSettlement,businessInput} from './crypto-business';
import {ingestSignedPrice,signedPriceInput} from './crypto-prices';
import {challengeWallet,proveWallet,walletChallengeInput,walletProofInput} from './crypto-wallets';
import {cancelNativeInvoice,quoteCryptoInvoice,submitCryptoDeposit,verifyCryptoDeposit,cryptoInvoiceInput,cryptoSubmission} from './crypto-incoming';
import {quoteCryptoWithdrawal,confirmCryptoWithdrawal,cancelCryptoWithdrawal,requoteCryptoWithdrawal,approveCryptoObligation,cryptoWithdrawal} from './crypto-payouts';
import {authenticateWorker} from './worker-auth';
import {settleCryptoAttempt} from './crypto-settlement';
import {openFinancialAlert,deliverFinancialAlert} from './financial-alerts';
import {registryAsset,financialConfiguration} from './financial-config';
import {planEdit,editPlan,planState,changePlanState,planList,bootstrapEdit,editBootstrap} from './plans';
import {exportsList,requestExport,downloadExport,readOwnSection,ownRows} from './own-data';
import {accountAction,accountChange,reportInput,createReport,caseList,caseToken,appealInput,createAppeal,resolveCaseInput,resolveCase,changeOwnStatus,messageInput,sendAdminMessage} from './moderation';
import {editSetting,editPriority,editHelp,settings,settingInput,priorityInput,helpInput} from './administration';
import {notificationPage,seeNotifications,readNotification} from './notifications';
import crypto from 'node:crypto';
import {currentRequestId as requestId,withRequestContext} from '@gifters/db';
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
  userAccountBalances,
  pointEvents,assets,withdrawals,operationKeys,
  withContext,
  withMemberSnapshot,
  withSessionScope,
  authSessions,
  helpArticles,
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

import { getPublicStatistics,getPublicManifest,getPublicCatalog,getPublicNativeCatalog,getPublicHelp,getPublicHelpSearch,publicHelpSlug,invalidatePublicReads } from './public-reads';
import { authenticate,csrf,requireStepUp,requireWithdrawalAuth,issueSession,validateUsername,databaseNow,clearCookies } from './auth';
import { handleAuthRequest } from './auth-api';
import { enforceRate } from './rate-limits';


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

function fail(error:unknown){
 const typed=applicationError(error),id=requestId();
 console.error(JSON.stringify({event:'api_failed',request_id:id,code:typed.code,status:typed.status,retryable:typed.retryable}));
 return Response.json({error:{code:typed.code,message_key:'errors.'+typed.code.toLowerCase(),help_slug:'errors',retryable:typed.retryable},meta:{request_id:id}},{status:typed.status,headers:{'Cache-Control':'private, no-store'}});
}

async function current(request:Request){return (await authenticate(request)).user;}
async function admin(request:Request){const identity=await authenticate(request);if(identity.user.role!=='admin'||identity.user.status!=='active')throw new Error('FORBIDDEN');await requireStepUp(identity);const policy=await readManifest();if(!policy.feature_admin&&request.method!=='GET')throw new Error('FEATURE_DISABLED');return identity.user;}

async function moderator(request:Request){const identity=await authenticate(request);if(!['admin','moderator'].includes(identity.user.role)||identity.user.status!=='active')throw new Error('FORBIDDEN');await requireStepUp(identity);return identity.user;}

async function json(request: Request) {
  return boundedJson(request);
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

    if(method==='GET'&&route==='/statistics'){const value=await getPublicStatistics(request);return publicOk(value.data,value.ttlSeconds,request);}
    if(method==='GET'&&route==='/crypto/catalog'){const value=await getPublicNativeCatalog(request);return publicOk(value.data,value.ttlSeconds,request);}
    if(method==='GET'&&route==='/me/records'){const actor=await current(request),params=new URL(request.url).searchParams,input=memberRecordInput.parse(Object.fromEntries(params));return ok(await withContext({access:'service',actorId:actor.id,reportSnapshot:true},tx=>ownMemberRecords(tx,actor.id,input)));}
    if(method==='GET'&&route==='/me/crypto'){const actor=await current(request);return ok(await withContext({access:'service',actorId:actor.id,reportSnapshot:true},tx=>ownNativePortfolio(tx,actor.id)));}
    if(method==='POST'&&route==='/internal/financial'){
      const input=z.discriminatedUnion('action',[z.object({action:z.literal('scan'),run_id:z.string().uuid()}).strict(),z.object({action:z.literal('expiry'),attempt_id:z.string().uuid()}).strict(),z.object({action:z.literal('settle'),attempt_id:z.string().uuid(),event_index:z.number().int().min(0).max(1000)}).strict(),z.object({action:z.literal('verify'),user_id:z.string().uuid(),invoice_id:z.string().uuid(),tx_hash:z.string().min(20).max(128),event_index:z.number().int().min(-1).max(1000)}).strict(),z.object({action:z.literal('alerts')}).strict(),z.object({action:z.literal('cleanup')}).strict(),z.object({action:z.literal('monitor_inventory')}).strict(),z.object({action:z.literal('monitor'),asset_key:z.string().max(30).optional()}).strict(),z.object({action:z.literal('business_daily')}).strict(),z.object({action:z.literal('reminders')}).strict()]).parse(await authenticateWorker(request,'financial'));
      if(input.action==='scan')return ok(await withContext({access:'service'},tx=>recoverScanPage(tx,input.run_id)));
      if(input.action==='expiry')return ok(await withContext({access:'service'},tx=>verifySignedExpiry(tx,input.attempt_id)));
      if(input.action==='monitor_inventory'){const {readRegistry}=await import('@gifters/chains');return ok({asset_keys:readRegistry().filter(v=>v.enabled&&v.verified).map(v=>v.key).slice(0,8)})}
      if(input.action==='monitor')return ok(await monitorFinancials(input.asset_key));
      if(input.action==='business_daily')return ok(await scheduleDailyBusiness());
      if(input.action==='reminders')return ok(await withContext({access:'service'},enqueueFinancialReminders));
      if(input.action==='cleanup')return ok(await withContext({access:'service'},cleanupFinancialEphemeral));
      if(input.action==='alerts')return ok(await deliverFinancialAlert());
      return ok(await withContext<unknown>({access:'service'},tx=>input.action==='settle'?settleCryptoAttempt(tx,input.attempt_id,input.event_index):verifyCryptoDeposit(tx,input.user_id,input)));
    }
    if(method==='GET'&&route==='/admin/crypto/obligations'){const actor=await admin(request),params=new URL(request.url).searchParams,after=params.has('after')?z.string().uuid().parse(params.get('after')):undefined;return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},async tx=>{const {cryptoObligations,assets}=await import('@gifters/db');const rows=await tx.select({id:cryptoObligations.id,user_id:cryptoObligations.userId,asset:assets.symbol,decimals:assets.decimals,network:assets.chainId,kind:cryptoObligations.kind,status:cryptoObligations.status,source_purpose:cryptoObligations.sourcePurpose,gross_base_units:cryptoObligations.grossBaseUnits,charge_base_units:cryptoObligations.chargeBaseUnits,net_base_units:cryptoObligations.netBaseUnits,destination:sql<string>`left(${cryptoObligations.destination},6)||'…'||right(${cryptoObligations.destination},4)`,created_at:cryptoObligations.createdAt,completed_at:cryptoObligations.completedAt}).from(cryptoObligations).innerJoin(assets,eq(assets.id,cryptoObligations.assetId)).where(after?gt(cryptoObligations.id,after):undefined).orderBy(asc(cryptoObligations.id)).limit(100);return {rows,next_after:rows.length===100?rows.at(-1)!.id:null}}));}
    if(method==='GET'&&route==='/admin/portability'){const actor=await admin(request);return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},portabilityStatus));}
    if(method==='POST'&&route==='/admin/portability/users'){const actor=await admin(request),input=selectedExportInput.parse(await json(request));return withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>selectedUserExport(tx,actor.id,input));}
    if(method==='POST'&&route==='/admin/portability/site'){const actor=await admin(request),input=z.object({confirmation:z.literal('download-encrypted-site'),reason:z.string().trim().min(10).max(500)}).strict().parse(await json(request));const snapshot=await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>prepareSiteSnapshot(tx,actor.id,input.reason));return siteSnapshotResponse(snapshot);}
    if(method==='POST'&&route==='/admin/portability/stage'){const actor=await admin(request);return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>stageSnapshot(tx,actor.id,request)));}
    if(method==='GET'&&route==='/admin/crypto/recovery-state'){const actor=await admin(request),input=staffRecoveryInput.parse(Object.fromEntries(new URL(request.url).searchParams));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>staffRecovery(tx,actor.id,input)));}
    if(method==='POST'&&route==='/admin/crypto/scans/resolve'){const actor=await admin(request),input=outflowResolutionInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>resolveRecoveryOutflow(tx,actor.id,input)));}
    if(method==='POST'&&route==='/admin/crypto/checkpoints'){const actor=await admin(request),input=checkpointInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>registerCheckpoint(tx,actor.id,input,idempotencyKey(request))));}
    if(method==='POST'&&route==='/admin/crypto/scans/start'){const actor=await admin(request),input=z.object({checkpoint_id:z.string().uuid(),through_height:z.string().regex(/^(0|[1-9][0-9]{0,77})$/)}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>startRecoveryScan(tx,actor.id,input.checkpoint_id,input.through_height,idempotencyKey(request))));}
    if(method==='POST'&&route==='/admin/crypto/scans/page'){const actor=await admin(request),input=z.object({run_id:z.string().uuid()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>recoverScanPage(tx,input.run_id)));}
    if(method==='POST'&&route==='/admin/crypto/unmatched/statement'){const actor=await admin(request),input=z.object({inflow_id:z.string().uuid()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>unmatchedRefundStatement(tx,actor.id,input.inflow_id)));}
    if(method==='POST'&&route==='/admin/crypto/unmatched/refund'){const actor=await admin(request),input=unmatchedRefundInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>reserveUnmatchedRefund(tx,actor.id,input)));}
    if(method==='POST'&&route==='/admin/crypto/operational/recover'){const actor=await admin(request),input=z.object({obligation_id:z.string().uuid(),reason:z.string().trim().min(10).max(500)}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>recoverOperationalObligation(tx,actor.id,input.obligation_id,input.reason)));}
    if(method==='POST'&&route==='/admin/crypto/sweeps/quote'){const actor=await admin(request),input=sweepInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>quoteTreasurySweep(tx,actor.id,input,idempotencyKey(request))));}
    if(method==='POST'&&(route==='/admin/crypto/sweeps/confirm'||route==='/admin/crypto/sweeps/recover')){const actor=await admin(request),input=z.object({obligation_id:z.string().uuid(),reason:z.string().trim().min(10).max(500)}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>route.endsWith('/confirm')?confirmTreasurySweep(tx,actor.id,input.obligation_id,input.reason):recoverTreasurySweep(tx,actor.id,input.obligation_id,input.reason)));}
    if(method==='GET'&&route==='/admin/crypto/reorg'){const actor=await admin(request),input=staffAlertsInput.parse(Object.fromEntries(new URL(request.url).searchParams));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>staffReorgs(tx,actor.id,'testnet',input)));}
    if(method==='POST'&&route==='/admin/crypto/reorg'){const actor=await admin(request),input=nativeReviewInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>recordNativeReorg(tx,actor.id,input,idempotencyKey(request))));}
    if(method==='POST'&&route==='/admin/crypto/reorg/reconfirm'){const actor=await admin(request),input=nativeResolutionInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>reconfirmNativeReorg(tx,actor.id,input,idempotencyKey(request))));}
    if(method==='POST'&&route==='/admin/crypto/recovery/link'){const actor=await admin(request),input=z.object({recovery_id:z.string().uuid()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>issueRecoveryView(tx,actor.id,input.recovery_id)));}
    if(method==='POST'&&route==='/admin/crypto/recovery/cancel'){const actor=await admin(request),input=z.object({recovery_id:z.string().uuid(),reason:z.string().trim().min(10).max(500)}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>cancelLiabilityRecovery(tx,actor.id,input.recovery_id,input.reason)));}
    if(method==='POST'&&route==='/admin/crypto/recovery/quote'){const actor=await admin(request),input=recoveryQuote.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>quoteLiabilityRecovery(tx,actor.id,input,idempotencyKey(request))));}
    if(method==='POST'&&route==='/admin/crypto/recovery/confirm'){const actor=await admin(request),input=recoveryProof.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>confirmLiabilityRecovery(tx,actor.id,input)));}
    if(method==='GET'&&route==='/admin/crypto/alerts'){const actor=await admin(request),input=staffAlertsInput.parse(Object.fromEntries(new URL(request.url).searchParams));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>staffAlerts(tx,actor.id,input)));}
    if(method==='POST'&&route==='/admin/crypto/alerts'){const actor=await admin(request),input=z.object({alert_id:z.string().uuid(),action:z.enum(['acknowledge','resolve']),reason:z.string().trim().min(5).max(500)}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>controlFinancialAlert(tx,actor.id,input.alert_id,input.action,input.reason)));}
    if(method==='POST'&&route==='/admin/crypto/funding/statement'){const actor=await admin(request),input=nativeFundingInput.omit({signature:true,reason:true}).parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},async tx=>{const value=await nativeFundingStatement(tx,actor.id,input,idempotencyKey(request));return {message:value.message,hash:value.hash,sender:value.sender,destination:value.destination}}));}
    if(method==='POST'&&route==='/admin/crypto/funding'){const actor=await admin(request),input=nativeFundingInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>bookNativeFunding(tx,actor.id,input,idempotencyKey(request))));}
    if(method==='POST'&&route==='/admin/crypto/assets'){const actor=await admin(request),input=nativeProvision.parse(await json(request));const result=await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>provisionNativeAsset(tx,actor.id,input,idempotencyKey(request)));invalidatePublicReads();return ok(result);}
    if(method==='POST'&&route==='/admin/crypto/plans'){const actor=await admin(request),input=nativePlanActivation.parse(await json(request));const result=await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>activateNativePlan(tx,actor.id,input,idempotencyKey(request)));invalidatePublicReads();return ok(result);}
    if(method==='POST'&&route==='/admin/crypto/refunds'){const actor=await admin(request),input=refundInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>reserveOriginalRefund(tx,actor.id,input)));}
    if(method==='POST'&&route==='/admin/crypto/business'){const actor=await admin(request),input=businessInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>holdBusinessSettlement(tx,actor.id,input,idempotencyKey(request))));}
    if(method==='POST'&&route==='/admin/crypto/prices'){const actor=await admin(request),input=signedPriceInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>ingestSignedPrice(tx,input)));}
    if(method==='POST'&&route==='/admin/crypto/alert-probe'){const actor=await admin(request),body=z.object({asset_key:z.string().max(30)}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},async tx=>{const config=await financialConfiguration(tx,registryAsset(body.asset_key));const alert=await openFinancialAlert(tx,`activation:${config.hash}`,'activation_probe','critical',{configuration_hash:config.hash});return {alert_id:alert.id,configuration_hash:config.hash}}));}
    if(method==='POST'&&route==='/me/bot-check'){const identity=await authenticate(request);if(!identity.session)throw new Error('UNAUTHENTICATED');const input=z.object({surface:z.enum(['consent','suspicious_checkout'])}).strict().parse(await json(request));if(identity.user.status==='pending_consent'&&input.surface!=='consent')throw new Error('CONSENT_REQUIRED');return ok(await withContext({access:'service',actorId:identity.user.id},tx=>beginBotCheck(tx,identity.user.id,identity.session!.generation,input.surface)));}
    if(method==='POST'&&route==='/me/wallets/challenge'){const identity=await authenticate(request);await requireWithdrawalAuth(identity);const input=walletChallengeInput.parse(await json(request));if(input.session_generation!==identity.session?.generation)throw new Error('VERSION_CONFLICT');return ok(await withContext({access:'service',actorId:identity.user.id},tx=>challengeWallet(tx,identity.user.id,input)));}
    if(method==='POST'&&route==='/me/wallets/proof'){const identity=await authenticate(request);await requireWithdrawalAuth(identity);if(!identity.session)throw new Error('UNAUTHENTICATED');const input=walletProofInput.parse(await json(request));return ok(await withContext({access:'service',actorId:identity.user.id},tx=>proveWallet(tx,identity.user.id,identity.session!.generation,input)));}
    if(method==='POST'&&route==='/gifts/crypto/invoices'){const identity=await authenticate(request);if(!identity.session)throw new Error('UNAUTHENTICATED');const input=cryptoInvoiceInput.extend({bot_proof:botProof.optional()}).parse(await json(request)),key=idempotencyKey(request);return ok(await withContext({access:'service',actorId:identity.user.id},async tx=>{await verifyBotCheck(tx,identity.user.id,identity.session!.generation,'suspicious_checkout',input.bot_proof,key);return quoteCryptoInvoice(tx,identity.user.id,identity.session!.generation,{asset_key:input.asset_key,plan_id:input.plan_id},key)}));}
    if(method==='POST'&&route==='/gifts/crypto/cancel'){const actor=await current(request);const input=z.object({invoice_id:z.string().uuid()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id},tx=>cancelNativeInvoice(tx,actor.id,input.invoice_id)));}
    if(method==='POST'&&route==='/gifts/crypto/prepare'){const identity=await authenticate(request);if(!identity.session)throw new Error('UNAUTHENTICATED');const input=z.object({invoice_id:z.string().uuid()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:identity.user.id},tx=>prepareNativeInvoice(tx,identity.user.id,identity.session!.generation,input.invoice_id)));}
    if(method==='POST'&&route==='/gifts/crypto/transaction'){const actor=await current(request),input=cryptoSubmission.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id},tx=>submitCryptoDeposit(tx,actor.id,input)));}
    if(method==='POST'&&route==='/me/withdrawals/crypto/requote'){const identity=await authenticate(request);if(!identity.session)throw new Error('UNAUTHENTICATED');const input=z.object({obligation_id:z.string().uuid()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:identity.user.id},tx=>requoteCryptoWithdrawal(tx,identity.user.id,identity.session!.generation,input.obligation_id,idempotencyKey(request))));}
    if(method==='POST'&&route==='/me/withdrawals/crypto/quotes'){const identity=await authenticate(request);if(!identity.session)throw new Error('UNAUTHENTICATED');const input=cryptoWithdrawal.parse(await json(request));return ok(await withContext({access:'service',actorId:identity.user.id},tx=>quoteCryptoWithdrawal(tx,identity.user.id,identity.session!.generation,input,idempotencyKey(request))));}
    if(method==='POST'&&['/me/withdrawals/crypto/confirm','/me/withdrawals/crypto/cancel'].includes(route)){const identity=await authenticate(request);if(!identity.session)throw new Error('UNAUTHENTICATED');await requireWithdrawalAuth(identity);const input=z.object({obligation_id:z.string().uuid()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:identity.user.id},tx=>route.endsWith('/confirm')?confirmCryptoWithdrawal(tx,identity.user.id,identity.session!.generation,input.obligation_id):cancelCryptoWithdrawal(tx,identity.user.id,input.obligation_id)));}
    if(method==='POST'&&route==='/admin/crypto/approve'){const actor=await admin(request),input=z.object({obligation_id:z.string().uuid(),reason:z.string().min(5).max(500)}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>approveCryptoObligation(tx,actor.id,input.obligation_id,input.reason)));}

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
      const actor=await admin(request),input=staffAlertsInput.parse(Object.fromEntries(new URL(request.url).searchParams));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>staffReorgs(tx,actor.id,'simulation',input)));
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
      const identity=await authenticate(request),user=identity.user,body=z.object({plan_id:z.string().uuid(),bot_proof:botProof.optional()}).strict().parse(await json(request)),key=idempotencyKey(request);
      return ok(await withContext({access:'service',actorId:user.id},async tx=>{if(!identity.tool)await verifyBotCheck(tx,user.id,identity.session!.generation,'suspicious_checkout',body.bot_proof,key);return quoteIncoming(tx,user.id,body.plan_id,key)}));
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

    if(method==='GET'&&route==='/admin/operations'){const actor=await admin(request);return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},readStaffOperations));}
    if(method==='POST'&&route==='/admin/operations/quota'){const actor=await admin(request),input=quotaReportInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>reportProviderQuota(tx,actor.id,input)));}

    if(method==='GET'&&route==='/admin/jobs'){const actor=await admin(request),input=staffJobsInput.parse(Object.fromEntries(new URL(request.url).searchParams));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>staffJobs(tx,actor.id,input)));}

    if (method === 'GET' && route === '/manifest') {
      const value=await getPublicManifest(request);return publicOk(value.data,value.ttlSeconds,request);
    }

    if(method==='GET'&&route==='/help'){
      const query=new URL(request.url).searchParams,locale=z.enum(['en','fr']).parse(query.get('locale')??'en');const slug=query.get('slug');
      if(query.has('q')){
       if(query.has('slug'))z.never().parse(query.get('slug'));
       const search=z.string().trim().min(1).max(100).refine(value=>!/[\u0000-\u001f\u007f]/.test(value)).parse(query.get('q')?.normalize('NFKC')).replace(/\s+/g,' ');
       const response=await getPublicHelpSearch(locale,search,request);return publicOk(response.data,response.ttlSeconds,request);
      }
      if(slug){z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/).parse(slug);const response=await getPublicHelp(locale,request);const canonical=await publicHelpSlug(locale,slug,request);const article=(response.data as any[]).find(article=>article.slug===canonical);if(!article)throw new Error('NOT_FOUND');return publicOk(article,response.ttlSeconds,request);}
      const response=await getPublicHelp(locale,request);return publicOk(response.data,response.ttlSeconds,request);
    }
    if(route==='/admin/settings'){
      const actor=await admin(request);if(method==='GET')return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},settings));
      if(method==='POST'){const input=settingInput.parse(await json(request));const result=await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>editSetting(tx,actor.id,input,idempotencyKey(request)));invalidatePublicReads();return ok(result);}
    }
    if(method==='POST'&&route==='/admin/priority'){const actor=await admin(request);const input=priorityInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>editPriority(tx,actor.id,input,idempotencyKey(request))));}
    if(route==='/admin/help'){
      const actor=await admin(request);if(method==='GET'){const id=new URL(request.url).searchParams.get('id');if(id){z.string().uuid().parse(id);const rows=await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>tx.select().from(helpArticles).where(eq(helpArticles.id,id)).limit(1));if(!rows[0])throw new Error('NOT_FOUND');return ok(rows[0]);}return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>tx.select({id:helpArticles.id,locale:helpArticles.locale,slug:helpArticles.slug,title:helpArticles.title,published:helpArticles.published,version:helpArticles.version}).from(helpArticles).orderBy(asc(helpArticles.locale),asc(helpArticles.slug)).limit(200)));}
      if(method==='POST'){if(!(await readManifest()).feature_help)throw new Error('FEATURE_DISABLED');const input=helpInput.parse(await json(request));const result=await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>editHelp(tx,actor.id,input,idempotencyKey(request)));invalidatePublicReads();return ok(result);}
    }
    if(route==='/me/notifications'&&method==='GET'){const user=await current(request);const params=new URL(request.url).searchParams;const limit=params.has('limit')?z.coerce.number().int().positive().max(100).parse(params.get('limit')):undefined;return ok(await withContext({access:'service',actorId:user.id,reportSnapshot:true},tx=>notificationPage(tx,user.id,limit,params.get('cursor')??undefined)));}
    if(route==='/me/notifications/seen'&&method==='POST'){const user=await current(request);const input=z.object({newest_id:z.string().uuid()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:user.id},tx=>seeNotifications(tx,user.id,input.newest_id)));}
    if(route==='/me/notifications/read'&&method==='POST'){const user=await current(request);const input=z.object({id:z.string().uuid()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:user.id},tx=>readNotification(tx,user.id,input.id)));}

    if (method === 'GET' && route === '/sim/users') {
      await admitPublicMiss(request);
      const rows = await withContext({access:'public'},(tx) => tx.select().from(simulationAccounts).orderBy(desc(simulationAccounts.role),asc(simulationAccounts.username)).limit(101));
      if(rows.length>100)throw new Error('CONFIGURATION_INVALID');
      return ok(rows);
    }

    if(route==='/admin/plans'&&method==='GET'){const actor=await admin(request);return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},planList));}
    if(route==='/admin/plans'&&method==='POST'){const actor=await admin(request),input=planEdit.parse(await json(request));const result=await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>editPlan(tx,actor.id,input,idempotencyKey(request)));invalidatePublicReads();return ok(result);}
    if(route==='/admin/plans/state'&&method==='POST'){const actor=await admin(request),input=planState.parse(await json(request));const result=await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>changePlanState(tx,actor.id,input,idempotencyKey(request)));invalidatePublicReads();return ok(result);}
    if(route==='/admin/bootstrap'&&method==='POST'){const actor=await admin(request),input=bootstrapEdit.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>editBootstrap(tx,actor.id,input,idempotencyKey(request))));}

    if(route==='/me/points'&&method==='GET'){const actor=await current(request),after=new URL(request.url).searchParams.get('after');if(after)z.string().uuid().parse(after);return ok(await withContext({access:'service',actorId:actor.id},async tx=>{if(!(await readManifest(tx)).feature_points)throw new Error('FEATURE_DISABLED');const [total]=await tx.select({points:sql<string>`coalesce(sum(${pointEvents.points}),0)::text`}).from(pointEvents).where(eq(pointEvents.userId,actor.id));const rows=await ownRows(tx,actor.id,'points',after??undefined);return {total:total.points,rows,next_after:rows.length===100?String(rows.at(-1)!.id):null}}));}
    if(route==='/me/referrals'&&method==='GET'){const actor=await current(request);return ok(await withContext({access:'service',actorId:actor.id},async tx=>{if(!(await readManifest(tx)).feature_referrals)throw new Error('FEATURE_DISABLED');return (await ownRows(tx,actor.id,'referrals'))[0]}));}
    if(route==='/me/receipts'&&method==='GET'){const actor=await current(request),params=new URL(request.url).searchParams,id=params.has('id')?z.string().uuid().parse(params.get('id')):undefined,after=params.has('after')?z.string().uuid().parse(params.get('after')):undefined;return ok(await withContext({access:'service',actorId:actor.id},async tx=>{if(!(await readManifest(tx)).feature_shares)throw new Error('FEATURE_DISABLED');const environment=z.enum(['simulation','testnet']).parse(params.get('environment')??'simulation');if(environment==='testnet'){const rows=await ownNativeReceipts(tx,actor.id,id,after);if(id&&!rows.length)throw new Error('NOT_FOUND');return {rows,next_after:rows.length===100?rows.at(-1)!.id:null}}const rows=await tx.select({id:withdrawals.id,asset:assets.symbol,decimals:assets.decimals,environment:assets.environment,chain_id:assets.chainId,gross_base_units:withdrawals.grossBaseUnits,net_base_units:withdrawals.netBaseUnits,fee_base_units:withdrawals.feeBaseUnits,settled_at:withdrawals.settledAt}).from(withdrawals).innerJoin(assets,eq(assets.id,withdrawals.assetId)).where(and(eq(withdrawals.userId,actor.id),eq(withdrawals.status,'settled'),id?eq(withdrawals.id,id):undefined,after?gt(withdrawals.id,after):undefined)).orderBy(asc(withdrawals.id)).limit(100);if(id&&!rows.length)throw new Error('NOT_FOUND');return {rows,next_after:rows.length===100?rows.at(-1)!.id:null}}));}

    if(route==='/me/exports'&&method==='GET'){const actor=await current(request);return ok(await withContext({access:'service',actorId:actor.id},tx=>exportsList(tx,actor.id)));}
    if(route==='/me/exports'&&method==='POST'){const actor=await current(request);z.object({}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id},tx=>requestExport(tx,actor.id,idempotencyKey(request))),202);}
    if(route==='/me/exports/download'&&method==='GET'){const actor=await current(request),params=new URL(request.url).searchParams;const id=z.string().uuid().parse(params.get('id')),part=z.coerce.number().int().min(0).max(10000).parse(params.get('part')),format=z.enum(['json','csv']).parse(params.get('format'));const result=await withContext({access:'service',actorId:actor.id},tx=>downloadExport(tx,actor.id,id,part,format));return new Response(result.content,{headers:{'Cache-Control':'private, no-store','Content-Type':result.type+'; charset=utf-8','Content-Disposition':`attachment; filename="${result.filename}"`,'X-Content-Type-Options':'nosniff'}});}
    if(route==='/me/data'&&method==='GET'){const actor=await current(request),params=new URL(request.url).searchParams;return ok(await withContext({access:'service',actorId:actor.id},tx=>readOwnSection(tx,actor.id,params.get('section')??'profile',params.get('after')??undefined,params.get('cutoff')??undefined)));}
    if(route==='/me/history'&&method==='GET'){const actor=await current(request),params=new URL(request.url).searchParams;const section=z.enum(['ledger','payouts','invoices','native_invoices','native_events','native_payouts']).parse(params.get('section')??'ledger'),after=params.has('after')?z.string().uuid().parse(params.get('after')):undefined;return ok(await withContext({access:'service',actorId:actor.id},async tx=>{const m=await readManifest(tx);if(!m.feature_wallets||!m.entitlements_member.history)throw new Error('FEATURE_DISABLED');const rows=await ownRows(tx,actor.id,section,after);return {rows,next_after:rows.length===100?String(rows.at(-1)!.id):null}}));}

    if(method==='POST'&&route==='/admin/messages'){const actor=await admin(request),input=messageInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireAdmin:true},tx=>sendAdminMessage(tx,actor.id,input,idempotencyKey(request))));}
    if(method==='GET'&&route==='/me/account'){const actor=await current(request);return ok(await withContext({access:'member',actorId:actor.id},async tx=>{const [user]=await tx.select({id:users.id,username:users.username,status:users.status,role:users.role,revision:users.accountRevision,suspension_until:users.suspensionUntil}).from(users).where(eq(users.id,actor.id)).limit(1);const balances=await tx.select({asset_id:userAccountBalances.assetId,purpose:userAccountBalances.purpose,balance:userAccountBalances.balance}).from(userAccountBalances).where(eq(userAccountBalances.userId,actor.id));return {...user,balances}}));}
    if(method==='POST'&&route==='/me/account'){const identity=await authenticate(request),input=z.object({action:z.enum(['deactivate','reactivate']),revision:z.number().int().positive()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:identity.user.id},tx=>changeOwnStatus(tx,identity,input,idempotencyKey(request))));}
    if(route==='/me/reports'&&method==='GET'){const actor=await current(request);return ok(await withContext({access:'service',actorId:actor.id},tx=>caseList(tx,actor.id)));}
    if(route==='/me/reports'&&method==='POST'){const actor=await current(request),input=reportInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id},tx=>createReport(tx,actor.id,input,idempotencyKey(request))));}
    if(route==='/me/appeals/token'&&method==='POST'){const identity=await authenticate(request),actor=identity.user,input=z.object({report_id:z.string().uuid()}).strict().parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id},tx=>caseToken(tx,actor.id,input.report_id,identity.session?.generation??'isolated-tool')));}
    if(route==='/me/appeals'&&method==='POST'){const identity=await authenticate(request),actor=identity.user,input=appealInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id},tx=>createAppeal(tx,actor.id,input,idempotencyKey(request),identity.session?.generation??'isolated-tool')));}
    if(route==='/moderation/cases'&&method==='GET'){const actor=await moderator(request),input=staffCasesInput.parse(Object.fromEntries(new URL(request.url).searchParams));return ok(await withContext({access:'service',actorId:actor.id,requireModerator:true},tx=>staffCases(tx,actor.id,input)));}
    if(route==='/moderation/cases'&&method==='POST'){const actor=await moderator(request),input=resolveCaseInput.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireModerator:true},tx=>resolveCase(tx,actor.id,input,idempotencyKey(request))));}
    if(route==='/moderation/users'&&method==='GET'){const actor=await moderator(request),input=staffUsersInput.parse(Object.fromEntries(new URL(request.url).searchParams));return ok(await withContext({access:'service',actorId:actor.id,requireModerator:true},tx=>staffUsers(tx,actor.id,input)));}
    if(route==='/moderation/users'&&method==='POST'){const actor=await moderator(request),input=accountAction.parse(await json(request));return ok(await withContext({access:'service',actorId:actor.id,requireModerator:true},tx=>accountChange(tx,actor.id,input,idempotencyKey(request))));}

    if(method==='POST'&&route==='/me/consent'){
      const identity=await authenticate(request);const user=identity.user;
      const input=z.object({accepted:z.literal(true),referral_code:z.string().uuid().optional(),terms_version:z.string().max(100).optional(),adult:z.literal(true).optional(),minimum_age:z.number().int().positive().optional(),username:z.string().max(64).optional(),bot_proof:botProof.optional()}).strict().parse(await json(request));
      const result=await withContext({access:'service',actorId:user.id},async tx=>{
        await tx.select({id:users.id}).from(users).where(eq(users.id,user.id)).for('no key update');
        if(!identity.tool){const [family]=await tx.select({id:authSessions.id}).from(authSessions).where(and(eq(authSessions.id,identity.session!.id),eq(authSessions.accessHash,identity.accessHash!),sql`${authSessions.revokedAt} is null and ${authSessions.accessExpiresAt}>clock_timestamp()`)).for('share');if(!family)throw new Error('UNAUTHENTICATED');}
        const manifest=await readManifest(tx);
        if(!identity.tool)await verifyBotCheck(tx,user.id,identity.session!.generation,'consent',input.bot_proof,idempotencyKey(request));
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

    if(method==='GET'&&route==='/me/dashboard'){
      const user=await current(request);
      return ok(await withMemberSnapshot(user.id,async(tx,manifest)=>{if(!manifest.entitlements_member.dashboard)throw new Error('FEATURE_DISABLED');return dashboard(tx,user,manifest)}));
    }

    if (method === 'GET' && route === '/plans') {
      const value=await getPublicCatalog(request);return publicOk(value.data,value.ttlSeconds,request);
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
        partition_revision:queuePartitions.revision,
        ticket: queueEntries.ticket,
        kind: queueEntries.kind,
        status: queueEntries.status,
        credited_count: queueEntries.creditedCount,
        required_count: queueEntries.requiredCount,
        beneficiary_user_id: queueEntries.beneficiaryUserId,
        username: users.username,
        platform_role: queueEntries.platformRole,
        priority_ticket: queueEntries.priorityTicket,
        priority_revision:queueEntries.priorityRevision,
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


async function routeApiRequest(method:string,path:string[],request:Request){
 try{
  const route='/'+path.join('/');
  if(route.startsWith('/auth/'))return await handleAuthRequest(method,route,request);
  if(route==='/sim/users'&&(process.env.AUTH_PROVIDER??'simulation')!=='simulation')throw new Error('FEATURE_DISABLED');
  if(['/manifest','/statistics','/plans','/help','/sim/users','/internal/tick','/internal/financial','/crypto/catalog'].includes(route))return await dispatchApiRequest(method,path,request);
  const identity=await authenticate(request);
  const account=request.headers.get('x-client-account');const generation=request.headers.get('x-client-session');if(!identity.tool&&((account&&account!==identity.user.username)||(generation&&generation!==identity.session!.generation)))throw new Error('VERSION_CONFLICT');
  if(identity.user.status==='pending_consent'&&!['/me/consent','/me/bot-check'].includes(route))throw new Error('CONSENT_REQUIRED');
  const restricted=['/me/account','/me/reports','/me/appeals','/me/appeals/token','/me/exports','/me/exports/download','/me/data'].includes(route);
  if(identity.user.status==='suspended'&&(!restricted||(method!=='GET'&&route==='/me/account')))throw new Error('ACCOUNT_RESTRICTED');
  if(method!=='GET')csrf(request,identity);
  let exportReplay=false;if(route==='/me/exports'&&method==='POST'){z.object({}).strict().parse(await json(request.clone()));const key=`own-export:${identity.user.id}:${idempotencyKey(request)}`;exportReplay=!!(await withContext({access:'service'},async tx=>(await tx.select({key:operationKeys.businessKey}).from(operationKeys).where(eq(operationKeys.businessKey,key)).limit(1))[0]));}
  if(!identity.tool){const family=route==='/admin/portability/stage'?'import_reset':route==='/admin/crypto/business'?'business_settlement':route==='/me/bot-check'?'consent':(route.startsWith('/admin/')||route.startsWith('/moderation/'))?'staff':route.includes('/reports')||route.includes('/appeals')?'reports':((route.startsWith('/me/exports')||route==='/me/data')&&method!=='GET'&&!exportReplay)?'own_data':route==='/me/consent'?'consent':route.startsWith('/gifts/')?(route.endsWith('/transaction')?'payment_proof':'invoice'):route.includes('/notifications')?'notifications':route.includes('/wallets')?'wallet':route.includes('/withdrawals')?'withdrawal':method==='GET'?'reads':'mutation';await enforceRate(request,family,identity.user.id);}
  if(identity.tool||route==='/me/consent'||(route==='/me/account'&&method==='POST'))return await dispatchApiRequest(method,path,request);
  return await withSessionScope({userId:identity.user.id,sessionId:identity.session!.id,accessHash:identity.accessHash!,version:identity.user.sessionVersion,allowSuspended:restricted,requiresAdult:route.startsWith('/gifts/'),requiresWithdrawalProof:route==='/me/withdrawals/confirm'||route==='/me/withdrawals/crypto/confirm'||route==='/me/wallets/challenge'||route==='/me/wallets/proof'},()=>dispatchApiRequest(method,path,request));
 }catch(error){return fail(error);}
}

export async function handleApiRequest(method:string,path:string[],request:Request){
 return withRequestContext(async()=>{
  const response=await routeApiRequest(method,path,request),headers=new Headers(response.headers);
  headers.set('X-Request-ID',requestId());
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 });
}
