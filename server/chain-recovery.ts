import {bookChainFees} from './chain-fees';
import {verifySignedExpiry} from './crypto-expiry';
import {beneficiaryLiabilityPurposes} from '@gifters/domain';
import crypto from "node:crypto";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  scopedDatabaseBinding,
  assets,
  chainCheckpoints,
  chainRecoveryRuns,
  chainScanPages,
  unallocatedInflows,
  recoveryOutflows,
  recoveryOutflowResolutions,
  signedAttemptStatus,
  cryptoObligations,
  operationKeys,
  ledgerAccounts,
  assetLedgerBalance,
  auditEvents,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import {withRpcBudget} from "@gifters/chains";
import type { AssetRegistry, ScannedTransfer,TransferEvidence,TransferScanCursor } from "@gifters/chains";
import {
  registryAsset,
  adapter,
  platformAddress,
  financialConfiguration,
  assertRegistryBinding,
  financialEnvironmentIn,
} from "./financial-config";
import { account, postJournal, lockUser } from "./core";
import { settleCryptoAttempt } from "./crypto-settlement";
import { assertKnownTreasury, treasuryFingerprint, treasuryInventory } from "../packages/db/src/treasury-inventory";
const binding = scopedDatabaseBinding;
const digest = (v: unknown) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x)),
    )
    .digest("hex");
export const checkpointInput = z
  .object({
    asset_key: z.string().max(30),
    treasury_address: z.string().min(1).max(128).optional(),
    height: z.string().regex(/^(0|[1-9][0-9]{0,77})$/),
    block_hash: z.string().min(20).max(100),
    proof_reference: z.string().regex(/^[-A-Za-z0-9:_]{5,200}$/),
    confirmation: z.string().min(20).max(250),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
async function staff(tx: DbExecutor, id: string) {
  const actor = await lockUser(tx, id);
  if (
    actor.role !== "admin" ||
    actor.status !== "active" ||
    !(await readManifest(tx)).feature_admin
  )
    throw new Error("FORBIDDEN");
}
export async function registerCheckpoint(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof checkpointInput>,
  requestKey: string,
) {
  const environment=await financialEnvironmentIn(tx);
  await staff(tx, actorId);
  const key = `checkpoint:${actorId}:${requestKey}`,
    hash = digest(input),
    [old] = await tx
      .select()
      .from(operationKeys)
      .where(eq(operationKeys.businessKey, key))
      .limit(1);
  if (old) {
    if (old.requestHash !== hash) throw new Error("VERSION_CONFLICT");
    return old.result;
  }
  const registry = registryAsset(input.asset_key),
    chain = await adapter(registry),
    height = BigInt(input.height),
    canonical = await chain.getCanonicalBlock(height);
  const selectedAddress=input.treasury_address===undefined?undefined:await chain.normalizeAddress(input.treasury_address);
  if (
    canonical.hash !== input.block_hash ||
    input.confirmation !==
      `checkpoint:${input.asset_key}:${selectedAddress===undefined?'':selectedAddress+':'}${input.height}:${canonical.hash}`
  )
    throw new Error("INVALID_PROOF");
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('financial-policy',0))`,
  );
  const config = await financialConfiguration(tx, registry),
    currentSender = await platformAddress(registry, "RECEIVING"),
    [asset] = await tx
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.environment, environment),
          eq(assets.symbol, registry.key.toUpperCase()),
          eq(assets.chainId, registry.network),
        ),
      )
      .limit(1);
  if (!asset) throw new Error("PLAN_UNAVAILABLE");
  assertRegistryBinding(asset, registry);
  const sender = selectedAddress ?? currentSender;
  if (sender !== currentSender) await assertKnownTreasury(tx, asset.id, sender);
  const [row] = await tx
    .insert(chainCheckpoints)
    .values({
      assetId: asset.id,
      bindingFingerprint: await binding(tx),
      treasuryFingerprint: treasuryFingerprint(registry, sender),
      treasurySender: sender,
      registrySnapshot: registry,
      configurationHash: config.hash,
      height: height.toString(),
      blockHash: canonical.hash,
      actorUserId: actorId,
      proofReference: input.proof_reference,
    })
    .returning();
  const result = { checkpoint_id: row.id, height: row.height };
  await tx
    .insert(operationKeys)
    .values({ businessKey: key, requestHash: hash, result });
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "chain.checkpoint.register",
    targetType: "chain_checkpoint",
    targetId: row.id,
    reason: input.reason,
    afterState: result,
  });
  return result;
}

export async function listTreasuries(tx: DbExecutor, actorId: string, assetKey: string, after?: string) {
  const environment=await financialEnvironmentIn(tx);
  await staff(tx, actorId);
  const registry = registryAsset(assetKey);
  const [asset] = await tx.select().from(assets).where(and(
    eq(assets.environment, environment), eq(assets.symbol, registry.key.toUpperCase()),
    eq(assets.chainId, registry.network),
  )).limit(1);
  if (!asset) throw new Error("PLAN_UNAVAILABLE");
  assertRegistryBinding(asset, registry);
  const current = await platformAddress(registry, "RECEIVING");
  const rows = await treasuryInventory(tx, asset.id, after, 101);
  const page = rows.slice(0, 100);
  return { asset_id: asset.id, current_address: current,
    rows: page.map(row => ({ address: row.address, current: row.address === current,
      treasury_fingerprint: treasuryFingerprint(registry, row.address), monitoring_required: true })),
    next_after: rows.length > 100 ? page.at(-1)!.address : null };
}
export async function startRecoveryScan(
  tx: DbExecutor,
  actorId: string,
  checkpointId: string,
  through: string,
  requestKey: string,
) {
  await financialEnvironmentIn(tx);
  await staff(tx, actorId);
  const [checkpoint] = await tx
    .select()
    .from(chainCheckpoints)
    .where(eq(chainCheckpoints.id, checkpointId))
    .limit(1);
  if (!checkpoint) throw new Error("NOT_FOUND");
  if (checkpoint.bindingFingerprint !== await binding(tx))
    throw new Error("RECOVERY_TARGET_MISMATCH");
  let target = BigInt(through);
  const begin = BigInt(checkpoint.height);
  if (target <= begin || target - begin > 100000n)
    throw new Error("SCAN_RANGE_INVALID");
  const key = `recovery-start:${actorId}:${requestKey}`,
    hash = digest({ checkpointId, through }),
    [old] = await tx
      .select()
      .from(operationKeys)
      .where(eq(operationKeys.businessKey, key))
      .limit(1);
  if (old) {
    if (old.requestHash !== hash) throw new Error("VERSION_CONFLICT");
    return old.result;
  }
  const chain = await adapter(checkpoint.registrySnapshot as AssetRegistry),
    anchor = await chain.getCanonicalBlock(begin);
  if (anchor.hash !== checkpoint.blockHash)
    throw new Error("CHECKPOINT_REORGED");
  const registry=checkpoint.registrySnapshot as AssetRegistry;
  let balanceWitness:FinalizedBalanceWitness|undefined;
  if(['sol','tron'].includes(registry.chain)){
    if(!chain.getFinalizedBalanceSnapshot)throw new Error('FINALITY_UNAVAILABLE');
    const snapshot=await withRpcBudget(()=>chain.getFinalizedBalanceSnapshot!(registry,checkpoint.treasurySender,target));
    if(snapshot.height<target||snapshot.height-begin>100000n)throw new Error('SCAN_RANGE_INVALID');
    target=snapshot.height;
    balanceWitness={format:'gw-finalized-balance-v1',asset_key:registry.key,checkpoint_id:checkpointId,
      binding_fingerprint:checkpoint.bindingFingerprint,address:checkpoint.treasurySender,
      height:target.toString(),block_hash:snapshot.blockHash,amount_base_units:snapshot.amount.toString()};
  }else await chain.getCanonicalBlock(target);
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('financial-policy',0))`,
  );
  const [row] = await tx
    .insert(chainRecoveryRuns)
    .values({
      checkpointId,
      bindingFingerprint: await binding(tx),
      throughHeight: target.toString(),
      balanceWitness,
      cursorHeight: checkpoint.height,
    })
    .returning();
  const result = { run_id: row.id, status: "scanning", through_height:target.toString() };
  await tx
    .insert(operationKeys)
    .values({ businessKey: key, requestHash: hash, result });
  return result;
}
async function bookUnmatched(
  tx: DbExecutor,
  checkpoint: typeof chainCheckpoints.$inferSelect,
  candidate: ScannedTransfer,
) {
  const environment=await financialEnvironmentIn(tx);
  const registry = checkpoint.registrySnapshot as AssetRegistry,
    key = `chain-event:${environment}:${registry.chain}:${registry.network}:${candidate.hash}:${candidate.index}:${checkpoint.assetId}`,
    [claimed] = await tx
      .insert(operationKeys)
      .values({
        businessKey: key,
        requestHash: digest({
          purpose: "unallocated",
          asset_id: checkpoint.assetId,
        }),
        result: { purpose: "unallocated" },
      })
      .onConflictDoNothing()
      .returning();
  if (!claimed) return false;
  const id = crypto.randomUUID(),
    cash = await account(
      tx,
      checkpoint.assetId,
      "system",
      null,
      "treasury_asset",
      "debit",
    ),
    owed = await account(
      tx,
      checkpoint.assetId,
      "system",
      null,
      "unallocated_payable",
      "credit",
    ),
    journal = await postJournal(
      tx,
      "CHAIN_UNALLOCATED",
      `unallocated:${id}`,
      [
        { accountId: cash.id, direction: "debit", amount: candidate.amount },
        { accountId: owed.id, direction: "credit", amount: candidate.amount },
      ],
      { unallocated_id: id, environment },
    );
  if (!journal) throw new Error("FINANCIAL_SAFETY_PAUSE");
  await tx.insert(unallocatedInflows).values({
    id,
    assetId: checkpoint.assetId,
    environment,
    chain: registry.chain,
    network: registry.network,
    txHash: candidate.hash,
    eventIndex: candidate.index,
    sender: candidate.sender,
    destination: candidate.destination,
    amountBaseUnits: candidate.amount.toString(),
    blockHash: candidate.blockHash,
    blockHeight: candidate.height.toString(),
    registrySnapshot: registry,
    treasuryFingerprint: checkpoint.treasuryFingerprint,
    journalId: journal,
  });
  return true;
}
/** One five-block page per authenticated invocation. No signing or admission. */
const scanCursorSchema=z.object({height:z.string().regex(/^(0|[1-9][0-9]{0,77})$/),transaction:z.number().int().min(0).max(100000),event:z.number().int().min(0).max(100000),blockHash:z.string().min(1).max(100).optional()}).strict();
const scanCandidateSchema=z.object({hash:z.string().min(1).max(100),index:z.number().int().min(0).max(2147483647),sender:z.string().min(1).max(128),destination:z.string().min(1).max(128),
amount:z.string().regex(/^[1-9][0-9]{0,77}$/),height:z.string().regex(/^(0|[1-9][0-9]{0,77})$/),blockHash:z.string().min(1).max(100),direction:z.enum(['incoming','outgoing'])}).strict();
const storedEvidenceSchema=z.object({state:z.enum(['confirmed','failed']),hash:z.string().min(1).max(100),index:z.number().int().min(0).max(2147483647),
observedAt:z.string().datetime(),blockHash:z.string().min(1).max(100),height:z.string().regex(/^(0|[1-9][0-9]{0,77})$/),sender:z.string().max(128).optional(),destination:z.string().max(128).optional(),
amount:z.string().regex(/^(0|[1-9][0-9]{0,77})$/).optional(),actualNativeFee:z.string().regex(/^(0|[1-9][0-9]{0,77})$/).optional(),actualNetworkFee:z.string().regex(/^(0|[1-9][0-9]{0,77})$/).optional(),accountSetupCost:z.string().regex(/^(0|[1-9][0-9]{0,77})$/).optional(),contradiction:z.literal(false).optional()}).strict();
const custodyWitnessSchema=z.object({format:z.literal('gw-address-custody-v1'),asset_id:z.string().uuid(),binding_fingerprint:z.string().regex(/^[a-f0-9]{64}$/),address:z.string().min(1).max(128),height:z.string().regex(/^(0|[1-9][0-9]{0,77})$/),block_hash:z.string().min(1).max(100),amount_base_units:z.string().regex(/^(0|[1-9][0-9]{0,77})$/)}).strict();
const scanProgressSchema=z.object({stage:z.enum(['discover','verify','book','known_next','known_index','known_settle','known_expiry','balance']),custodyWitness:custodyWitnessSchema.optional(),cursor:scanCursorSchema,candidate:scanCandidateSchema.optional(),afterCursor:scanCursorSchema.optional(),afterHeight:z.string().regex(/^(0|[1-9][0-9]{0,77})$/).optional(),proof:storedEvidenceSchema.optional(),attemptId:z.string().uuid().optional(),eventIndex:z.number().int().min(0).max(2147483647).optional()}).strict().superRefine((value,context)=>{
 if(['verify','book'].includes(value.stage)&&(!value.candidate||!value.afterCursor||value.afterHeight===undefined))context.addIssue({code:'custom',message:'SCAN_PROGRESS_INVALID'});
 if(value.stage==='book'&&!value.proof)context.addIssue({code:'custom',message:'SCAN_PROGRESS_INVALID'});
 if(['known_index','known_settle','known_expiry'].includes(value.stage)&&!value.attemptId)context.addIssue({code:'custom',message:'SCAN_PROGRESS_INVALID'});
 if(value.stage==='known_settle'&&value.eventIndex===undefined)context.addIssue({code:'custom',message:'SCAN_PROGRESS_INVALID'});
});
const finalizedBalanceWitness=z.object({format:z.literal('gw-finalized-balance-v1'),asset_key:z.string().min(1).max(30),checkpoint_id:z.string().uuid(),
 binding_fingerprint:z.string().regex(/^[0-9a-f]{64}$/),address:z.string().min(1).max(128),height:z.string().regex(/^(0|[1-9][0-9]{0,77})$/),
 block_hash:z.string().min(1).max(100),amount_base_units:z.string().regex(/^(0|[1-9][0-9]{0,77})$/)}).strict();
type FinalizedBalanceWitness=z.infer<typeof finalizedBalanceWitness>;
type ScanProgress=z.infer<typeof scanProgressSchema>;
type CustodyWitness=z.infer<typeof custodyWitnessSchema>;
/** All addresses must finish discovery/known-attempt resolution at one exact
 * canonical cutoff. A missing page, address, or witness remains pending; an
 * equal amount at a different height is not evidence for this cutoff. */
async function custodySet(tx:DbExecutor,checkpoint:typeof chainCheckpoints.$inferSelect,witness:CustodyWitness,runId:string){
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('financial-policy',0))`);
  const current=await platformAddress(checkpoint.registrySnapshot as AssetRegistry,'RECEIVING');
  // PostgreSQL lateral selection and JSON validation are infrastructure SQL:
  // aggregate the complete address set under the statement deadline instead of
  // declaring a capped page complete or loading unbounded history into Node.
  const [result]=await tx.execute<{complete:boolean;total:string}>(sql`
    with addresses as (
      select address from public.treasury_addresses where asset_id=${checkpoint.assetId}::uuid
      union select ${current}::text
    ), observed as (
      select a.address,c.binding_fingerprint as checkpoint_binding,r.binding_fingerprint as run_binding,r.through_height,r.state,
        case when r.id=${runId}::uuid then 'balance' else r.scan_progress->>'stage' end as stage,
        case when r.id=${runId}::uuid then ${JSON.stringify(witness)}::jsonb else r.scan_progress->'custodyWitness' end as witness
      from addresses a
      left join lateral (select * from public.chain_checkpoints where asset_id=${checkpoint.assetId}::uuid and treasury_sender=a.address order by created_at desc,id desc limit 1) c on true
      left join lateral (select * from public.chain_recovery_runs where checkpoint_id=c.id order by created_at desc,id desc limit 1) r on true
    ) select coalesce(bool_and((checkpoint_binding=${checkpoint.bindingFingerprint} and run_binding=${checkpoint.bindingFingerprint}
      and through_height=${witness.height}::numeric and state in ('scanning','reconciled') and stage='balance'
      and witness->>'format'='gw-address-custody-v1' and witness->>'asset_id'=${witness.asset_id}
      and witness->>'binding_fingerprint'=${witness.binding_fingerprint} and witness->>'address'=address
      and witness->>'height'=${witness.height} and witness->>'block_hash'=${witness.block_hash}
      and (witness->>'amount_base_units') ~ '^(0|[1-9][0-9]{0,77})$') is true),false) as complete,
      coalesce(sum(case when (witness->>'amount_base_units') ~ '^(0|[1-9][0-9]{0,77})$' then (witness->>'amount_base_units')::numeric else 0 end),0)::text as total from observed
  `);
  return {complete:result?.complete===true,total:BigInt(result?.total??'0')};
}
const stored=(value:unknown)=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='bigint'?v.toString():v));
function evidence(value:z.infer<typeof storedEvidenceSchema>):TransferEvidence{return {...value,height:BigInt(value.height),amount:value.amount===undefined?undefined:BigInt(value.amount),actualNativeFee:value.actualNativeFee===undefined?undefined:BigInt(value.actualNativeFee),actualNetworkFee:value.actualNetworkFee===undefined?undefined:BigInt(value.actualNetworkFee),accountSetupCost:value.accountSetupCost===undefined?undefined:BigInt(value.accountSetupCost)}}
// The EVM balance step checks the checkpoint and both cutoff anchors plus two
// historical balances: 26 requests. Keep the existing 18-second total budget.
export function recoverScanPage(tx:DbExecutor,id:string){return withRpcBudget(()=>recoverPagedStep(tx,id),18000,32)}
async function recoverPagedStep(tx:DbExecutor,id:string){

  await financialEnvironmentIn(tx);
  const [lookup]=await tx.select().from(chainRecoveryRuns).where(eq(chainRecoveryRuns.id,id)).limit(1);
  if(!lookup)throw new Error('NOT_FOUND');
  if(lookup.bindingFingerprint!==await binding(tx))throw new Error('RECOVERY_TARGET_MISMATCH');
  if(lookup.state==='reconciled')return {status:lookup.state,run_id:id};
  const [checkpoint]=await tx.select().from(chainCheckpoints).where(eq(chainCheckpoints.id,lookup.checkpointId)).limit(1);
  const registry=checkpoint.registrySnapshot as AssetRegistry,chain=await adapter(registry),anchor=await chain.getCanonicalBlock(BigInt(checkpoint.height));
  if(anchor.hash!==checkpoint.blockHash)throw new Error('CHECKPOINT_REORGED');
  const before=BigInt(lookup.cursorHeight),target=BigInt(lookup.throughHeight);
  let progress:ScanProgress=lookup.scanProgress?scanProgressSchema.parse(lookup.scanProgress):{stage:before<target?'discover':'known_next',cursor:{height:(before+1n).toString(),transaction:0,event:0}};
  if(before===target&&lookup.state==='review')return {status:'review',run_id:id,reason:lookup.reasonCode,cursor_height:lookup.cursorHeight};
  const priorProgress=stored(progress);
  let end=before,pageEvidence:unknown=priorProgress;
  const verified:Array<{candidate:ScannedTransfer;proof:TransferEvidence}>=[];
  if(progress.stage==='discover'){
    if(before===target)progress={stage:'known_next',cursor:progress.cursor};
    else{
      const page=await chain.scanTransferPage(checkpoint.treasurySender,before,target,progress.cursor);pageEvidence=page;
      if(page.transfers.length>1||page.through<before||page.through>target)throw new Error('SCAN_INCOMPLETE');
      if(page.transfers.length){progress={stage:'verify',cursor:progress.cursor,candidate:scanCandidateSchema.parse(stored(page.transfers[0])),afterCursor:page.cursor,afterHeight:page.through.toString()}}
      else {end=page.through;progress={stage:end===target?'known_next':'discover',cursor:page.cursor}}
    }
  }else if(progress.stage==='verify'){
    const candidate=scanCandidateSchema.parse(progress.candidate),proof=await chain.verifyTransfer({asset:registry,hash:candidate.hash,index:candidate.index,sender:candidate.sender,destination:candidate.destination,amount:BigInt(candidate.amount)});
    if(!['confirmed','failed'].includes(proof.state)||proof.contradiction||proof.hash!==candidate.hash||proof.index!==candidate.index||proof.blockHash!==candidate.blockHash||proof.height!==BigInt(candidate.height)||(proof.state==='confirmed'&&(proof.amount!==BigInt(candidate.amount)||proof.sender!==candidate.sender||proof.destination!==candidate.destination)))throw new Error('SCAN_INCOMPLETE');
    progress={...progress,stage:'book',proof:storedEvidenceSchema.parse(stored(proof))};pageEvidence=progress.proof;
  }else if(progress.stage==='book'){
    const candidate=scanCandidateSchema.parse(progress.candidate),proof=evidence(storedEvidenceSchema.parse(progress.proof));
    const current=await chain.getCanonicalBlock(BigInt(candidate.height));
    if(current.hash!==candidate.blockHash||proof.blockHash!==candidate.blockHash||proof.height!==BigInt(candidate.height))throw new Error('RPC_SCAN_CONTRADICTION');
    verified.push({candidate:{...candidate,amount:BigInt(candidate.amount),height:BigInt(candidate.height)},proof});
    end=BigInt(progress.afterHeight!);progress={stage:end===target?'known_next':'discover',cursor:scanCursorSchema.parse(progress.afterCursor)};pageEvidence={candidate,proof};
  }
  const [run]=await tx.select().from(chainRecoveryRuns).where(eq(chainRecoveryRuns.id,id)).for('update');
  if(run.revision!==lookup.revision||run.cursorHeight!==lookup.cursorHeight)throw new Error('VERSION_CONFLICT');
  let incoming=0,outgoing=0,unexplained=false;
  for (const { candidate, proof } of verified) {
    if (candidate.direction === "incoming") {
      if (
        proof.state === "confirmed" &&
        (await bookUnmatched(tx, checkpoint, candidate))
      )
        incoming++;
      continue;
    }
    const [attempt] = await tx
      .select({
        id: signedAttemptStatus.id,
        obligationId: signedAttemptStatus.obligationId,
      })
      .from(signedAttemptStatus)
      .where(eq(signedAttemptStatus.txHash, candidate.hash))
      .limit(1);
    let obligationId: string | null = null;
    if (attempt) {
      const [obligation] = await tx
        .select()
        .from(cryptoObligations)
        .where(eq(cryptoObligations.id, attempt.obligationId))
        .limit(1);
      if (
        obligation.assetId === checkpoint.assetId &&
        obligation.treasurySender === candidate.sender &&
        obligation.destination === candidate.destination &&
        BigInt(obligation.netBaseUnits) === candidate.amount
      ) {
        await settleCryptoAttempt(tx, attempt.id, candidate.index, proof);
        obligationId = obligation.id;
      }
    }
    const [resolved] = await tx
      .select({ id: recoveryOutflowResolutions.id })
      .from(recoveryOutflowResolutions)
      .where(
        and(
          eq(recoveryOutflowResolutions.assetId, checkpoint.assetId),
          eq(recoveryOutflowResolutions.txHash, candidate.hash),
          eq(recoveryOutflowResolutions.eventIndex, candidate.index),
        ),
      )
      .limit(1);
    if (!obligationId && !resolved) unexplained = true;
    await tx
      .insert(recoveryOutflows)
      .values({
        runId: id,
        assetId: checkpoint.assetId,
        txHash: candidate.hash,
        eventIndex: candidate.index,
        sender: candidate.sender,
        destination: candidate.destination,
        amountBaseUnits:
          proof.state === "failed" ? "0" : candidate.amount.toString(),
        blockHeight: candidate.height.toString(),
        status: obligationId ? "matched" : "review",
        obligationId,
        evidenceHash: digest(proof),
      })
      .onConflictDoNothing();
    outgoing++;
  }

  let state=unexplained||run.state==='review'?'review':'scanning',reason=unexplained?'UNKNOWN_OUTFLOW':run.reasonCode,knownCursor=run.knownAttemptCursor;
  let expiredAttempt:{attempt_id:string;obligation_id:string;kind:string}|undefined;
  // Discovery, verification and booking are separate committed steps. Terminal
  // known-attempt verification and expiry also retain their own bounded stages.
  if(priorProgress.stage==='known_next'&&state!=='review'){
    const [attempt]=await tx.select({id:signedAttemptStatus.id,status:cryptoObligations.status,completed:cryptoObligations.completedAt}).from(signedAttemptStatus).innerJoin(cryptoObligations,eq(cryptoObligations.id,signedAttemptStatus.obligationId)).where(and(eq(cryptoObligations.assetId,checkpoint.assetId),eq(cryptoObligations.treasurySender,checkpoint.treasurySender),knownCursor?gt(signedAttemptStatus.id,knownCursor):undefined)).orderBy(asc(signedAttemptStatus.id)).limit(1);
    if(!attempt)progress={stage:'balance',cursor:progress.cursor};
    else if(['settled','cancelled'].includes(attempt.status)||attempt.completed)knownCursor=attempt.id;
    else progress={stage:'known_index',cursor:progress.cursor,attemptId:attempt.id};
  }else if(['known_index','known_settle','known_expiry'].includes(priorProgress.stage)&&state!=='review'){
    const [attempt]=await tx.select({id:signedAttemptStatus.id,hash:signedAttemptStatus.txHash,sender:cryptoObligations.treasurySender,destination:cryptoObligations.destination,obligationId:cryptoObligations.id,kind:cryptoObligations.kind}).from(signedAttemptStatus).innerJoin(cryptoObligations,eq(cryptoObligations.id,signedAttemptStatus.obligationId)).where(and(eq(signedAttemptStatus.id,progress.attemptId!),eq(cryptoObligations.assetId,checkpoint.assetId),eq(cryptoObligations.treasurySender,checkpoint.treasurySender))).limit(1);
    if(!attempt)throw new Error('INVALID_PROOF');
    if(progress.stage==='known_index')progress={stage:'known_settle',cursor:progress.cursor,attemptId:attempt.id,eventIndex:await chain.findTransferIndex(attempt.hash,attempt.sender!,attempt.destination)??0};
    else if(progress.stage==='known_settle'){
      const result=await settleCryptoAttempt(tx,attempt.id,progress.eventIndex!);
      if(result.status==='pending'){progress={stage:'known_expiry',cursor:progress.cursor,attemptId:attempt.id};reason='KNOWN_ATTEMPT_PENDING'}
      else {knownCursor=attempt.id;progress={stage:'known_next',cursor:progress.cursor}}
    }else{
      const expiry=await verifySignedExpiry(tx,attempt.id);
      if(expiry.status==='expiry_verified'){state='review';reason='KNOWN_ATTEMPT_EXPIRY_VERIFIED';expiredAttempt={attempt_id:attempt.id,obligation_id:attempt.obligationId,kind:attempt.kind}}
      else {reason='KNOWN_ATTEMPT_PENDING';progress={stage:'known_index',cursor:progress.cursor,attemptId:attempt.id}}
    }
  }else if(priorProgress.stage==='balance'&&state!=='review'){
    const balanceAnchor=await chain.getCanonicalBlock(target);
    if(!balanceAnchor.finalized)throw new Error('FINALITY_UNAVAILABLE');
    let physical:bigint;
    if(run.balanceWitness!==null){
      const witness=finalizedBalanceWitness.parse(run.balanceWitness);
      if(!['sol','tron'].includes(registry.chain)||witness.asset_key!==registry.key||witness.checkpoint_id!==checkpoint.id||witness.binding_fingerprint!==checkpoint.bindingFingerprint||witness.address!==checkpoint.treasurySender||BigInt(witness.height)!==target)throw new Error('RPC_EVIDENCE_INVALID');
      const cutoff=await chain.getCanonicalBlock(target);
      if(!cutoff.finalized||cutoff.hash!==witness.block_hash)throw new Error('CHECKPOINT_REORGED');
      physical=BigInt(witness.amount_base_units);
    }else physical=await chain.getReconciledBalance(registry,checkpoint.treasurySender,target);
    const cutoff=await chain.getCanonicalBlock(target);
    if(!cutoff.finalized||cutoff.hash!==balanceAnchor.hash)throw new Error('CHECKPOINT_REORGED');
    const witness:CustodyWitness={format:'gw-address-custody-v1',asset_id:checkpoint.assetId,binding_fingerprint:checkpoint.bindingFingerprint,address:checkpoint.treasurySender,height:target.toString(),block_hash:cutoff.hash,amount_base_units:physical.toString()};
    progress={...progress,custodyWitness:witness};pageEvidence=witness;
    const custody=await custodySet(tx,checkpoint,witness,id);
    const book= -await assetLedgerBalance(tx,checkpoint.assetId,['treasury_asset']);
    if(!custody.complete){state='scanning';reason='ADDRESS_CUSTODY_INCOMPLETE'}
    else if(custody.total!==book){state='review';reason='UNEXPLAINED_BALANCE'}else{
      const owed=await assetLedgerBalance(tx,checkpoint.assetId,beneficiaryLiabilityPurposes);
      if(custody.total<owed){state='review';reason='CUSTODY_BELOW_LIABILITIES'}else{state='reconciled';reason=null}
    }

  }
  const revision=run.revision+1;
  await tx.insert(chainScanPages).values({runId:id,revision,fromHeight:before.toString(),throughHeight:end.toString(),evidenceHash:digest(pageEvidence),progressBefore:priorProgress,progressAfter:stored(progress),incomingCount:incoming,outgoingCount:outgoing});
  await tx.update(chainRecoveryRuns).set({cursorHeight:end.toString(),revision,scanProgress:stored(progress),knownAttemptCursor:knownCursor,incomingCount:run.incomingCount+incoming,outgoingCount:run.outgoingCount+outgoing,state,reasonCode:reason,completedAt:end===target&&state!=='scanning'?sql`clock_timestamp()`:null}).where(eq(chainRecoveryRuns.id,id));
  return {run_id:id,status:state,cursor_height:end.toString(),scan_stage:progress.stage,scan_cursor:progress.cursor,incoming,outgoing,reason,...(expiredAttempt?{expiry_closure:expiredAttempt}:{})};
}
export const outflowResolutionInput = z
  .object({
    outflow_id: z.string().uuid(),
    proof_reference: z.string().regex(/^[-A-Za-z0-9:_]{5,200}$/),
    confirmation: z.string().max(200),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
/** Explicit loss is a company expense. No beneficiary is debited, no signed
 * transfer is invented, and a separate full scan is required before resumption. */
export async function resolveRecoveryOutflow(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof outflowResolutionInput>,
) {
  const environment=await financialEnvironmentIn(tx);
  await staff(tx, actorId);
  const [outflow] = await tx
    .select()
    .from(recoveryOutflows)
    .where(eq(recoveryOutflows.id, input.outflow_id))
    .limit(1);
  if (!outflow || outflow.status !== "review") throw new Error("NOT_FOUND");
  const [run] = await tx.select().from(chainRecoveryRuns)
    .where(eq(chainRecoveryRuns.id, outflow.runId)).limit(1);
  if (!run || run.bindingFingerprint !== await binding(tx))
    throw new Error("RECOVERY_TARGET_MISMATCH");
  if (input.confirmation !== `loss:${outflow.id}:${outflow.amountBaseUnits}`)
    throw new Error("INVALID_INPUT");
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`recovery-loss:${outflow.assetId}:${outflow.txHash}:${outflow.eventIndex}`},0))`,
  );
  const [previous] = await tx
    .select()
    .from(recoveryOutflowResolutions)
    .where(
      and(
        eq(recoveryOutflowResolutions.assetId, outflow.assetId),
        eq(recoveryOutflowResolutions.txHash, outflow.txHash),
        eq(recoveryOutflowResolutions.eventIndex, outflow.eventIndex),
      ),
    )
    .limit(1);
  if (previous) {
    if (
      previous.actorUserId !== actorId ||
      previous.proofReference !== input.proof_reference ||
      previous.reason !== input.reason
    )
      throw new Error("VERSION_CONFLICT");
    return {
      resolution_id: previous.id,
      status: "reviewed_loss",
      rescan_required: true,
    };
  }
  const [checkpoint] = await tx
      .select()
      .from(chainCheckpoints)
      .where(eq(chainCheckpoints.id, run.checkpointId))
      .limit(1);
  if (!checkpoint || checkpoint.bindingFingerprint !== run.bindingFingerprint)
    throw new Error("RECOVERY_TARGET_MISMATCH");
  const registry = checkpoint.registrySnapshot as AssetRegistry,
    chain = await adapter(registry),
    proof = await chain.verifyTransfer({
      asset: registry,
      hash: outflow.txHash,
      index: outflow.eventIndex,
      sender: outflow.sender,
      destination: outflow.destination,
    });
  if (
    !["confirmed", "failed"].includes(proof.state) ||
    proof.contradiction ||
    proof.height !== BigInt(outflow.blockHeight) ||
    proof.actualNativeFee === undefined ||
    proof.actualNativeFee < 0n ||
    (proof.state === "confirmed" ? proof.amount : 0n) !==
      BigInt(outflow.amountBaseUnits)
  )
    throw new Error("INVALID_PROOF");
  const [native] = await tx
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.environment, environment),
        eq(assets.chainId, registry.network),
        eq(
          assets.symbol,
          ({ eth: "ETH", bnb: "BNB", sol: "SOL", tron: "TRX" } as const)[
            registry.chain
          ],
        ),
      ),
    )
    .limit(1);
  if (!native) throw new Error("CONFIGURATION_INVALID");
  const id = crypto.randomUUID(),
    principal = BigInt(outflow.amountBaseUnits),
    fee = proof.actualNativeFee,
    setup = proof.accountSetupCost ?? 0n,
    networkFee = proof.actualNetworkFee ?? fee;
  if (setup < 0n || networkFee < 0n || setup + networkFee !== fee)
    throw new Error("INVALID_PROOF");
  let principalJournal: string | null | undefined,
    gasJournal: string | null | undefined,
    setupJournal: string | null | undefined;
  if (principal > 0n) {
    const cash = await account(
        tx,
        outflow.assetId,
        "system",
        null,
        "treasury_asset",
        "debit",
      ),
      loss = await account(
        tx,
        outflow.assetId,
        "platform",
        null,
        "chain_loss_expense",
        "debit",
      );
    principalJournal = await postJournal(
      tx,
      "RECOVERY_OUTFLOW_LOSS",
      `recovery-outflow-loss:${id}`,
      [
        { accountId: loss.id, direction: "debit", amount: principal },
        { accountId: cash.id, direction: "credit", amount: principal },
      ],
      { resolution_id: id },
    );
  }
  const feeClaim=await bookChainFees(tx,{registry,hash:outflow.txHash,nativeAssetId:native.id,networkFee,setup,recovery:true,metadata:{resolution_id:id,block_hash:proof.blockHash}});
  gasJournal=feeClaim.gasJournalId;setupJournal=feeClaim.setupJournalId;
  if (
    (principal > 0n && !principalJournal) ||
    (networkFee > 0n && !gasJournal) ||
    (setup > 0n && !setupJournal)
  )
    throw new Error("FINANCIAL_SAFETY_PAUSE");
  await tx.insert(recoveryOutflowResolutions).values({
    accountSetupBaseUnits: setup.toString(),
    setupJournalId: setupJournal,
    id,
    outflowId: outflow.id,
    assetId: outflow.assetId,
    txHash: outflow.txHash,
    eventIndex: outflow.eventIndex,
    principalBaseUnits: outflow.amountBaseUnits,
    nativeAssetId: native.id,
    nativeFeeBaseUnits: fee.toString(),
    principalJournalId: principalJournal,
    gasJournalId: gasJournal,
    actorUserId: actorId,
    proofReference: input.proof_reference,
    reason: input.reason,
    evidenceHash: digest(proof),
  });
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "chain.recovery.loss",
    targetType: "recovery_outflow",
    targetId: outflow.id,
    reason: input.reason,
    afterState: {
      resolution_id: id,
      principal: principal.toString(),
      fee: fee.toString(),
      rescan_required: true,
    },
  });
  return { resolution_id: id, status: "reviewed_loss", rescan_required: true };
}
