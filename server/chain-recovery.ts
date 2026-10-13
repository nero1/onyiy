import crypto from "node:crypto";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  databaseScopeFingerprint,
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
  ledgerPostings,
  auditEvents,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import type { AssetRegistry, ScannedTransfer } from "@gifters/chains";
import {
  registryAsset,
  adapter,
  platformAddress,
  financialConfiguration,
  assertRegistryBinding,
  assertFinancialEnvironment,
} from "./financial-config";
import { account, postJournal, lockUser } from "./core";
import { settleCryptoAttempt } from "./crypto-settlement";
const binding = () => databaseScopeFingerprint(process.env.DATABASE_URL ?? "");
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
  assertFinancialEnvironment();
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
  if (
    canonical.hash !== input.block_hash ||
    input.confirmation !==
      `checkpoint:${input.asset_key}:${input.height}:${canonical.hash}`
  )
    throw new Error("INVALID_PROOF");
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('financial-policy',0))`,
  );
  const config = await financialConfiguration(tx, registry),
    sender = await platformAddress(registry, "RECEIVING"),
    [asset] = await tx
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.environment, "testnet"),
          eq(assets.symbol, registry.key.toUpperCase()),
          eq(assets.chainId, registry.network),
        ),
      )
      .limit(1);
  if (!asset) throw new Error("PLAN_UNAVAILABLE");
  assertRegistryBinding(asset, registry);
  const [row] = await tx
    .insert(chainCheckpoints)
    .values({
      assetId: asset.id,
      bindingFingerprint: binding(),
      treasuryFingerprint: config.treasuryFingerprint,
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
export async function startRecoveryScan(
  tx: DbExecutor,
  actorId: string,
  checkpointId: string,
  through: string,
  requestKey: string,
) {
  assertFinancialEnvironment();
  await staff(tx, actorId);
  const [checkpoint] = await tx
    .select()
    .from(chainCheckpoints)
    .where(eq(chainCheckpoints.id, checkpointId))
    .limit(1);
  if (!checkpoint) throw new Error("NOT_FOUND");
  if (checkpoint.bindingFingerprint !== binding())
    throw new Error("RECOVERY_TARGET_MISMATCH");
  const target = BigInt(through),
    begin = BigInt(checkpoint.height);
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
  await chain.getCanonicalBlock(target);
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('financial-policy',0))`,
  );
  const [row] = await tx
    .insert(chainRecoveryRuns)
    .values({
      checkpointId,
      bindingFingerprint: binding(),
      throughHeight: through,
      cursorHeight: checkpoint.height,
    })
    .returning();
  const result = { run_id: row.id, status: "scanning" };
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
  const registry = checkpoint.registrySnapshot as AssetRegistry,
    key = `chain-event:testnet:${registry.chain}:${registry.network}:${candidate.hash}:${candidate.index}:${checkpoint.assetId}`,
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
      { unallocated_id: id, environment: "testnet" },
    );
  if (!journal) throw new Error("FINANCIAL_SAFETY_PAUSE");
  await tx.insert(unallocatedInflows).values({
    id,
    assetId: checkpoint.assetId,
    environment: "testnet",
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
export async function recoverScanPage(tx: DbExecutor, id: string) {
  assertFinancialEnvironment();
  const [lookup] = await tx
    .select()
    .from(chainRecoveryRuns)
    .where(eq(chainRecoveryRuns.id, id))
    .limit(1);
  if (!lookup) throw new Error("NOT_FOUND");
  if (lookup.bindingFingerprint !== binding())
    throw new Error("RECOVERY_TARGET_MISMATCH");
  const [checkpoint] = await tx
    .select()
    .from(chainCheckpoints)
    .where(eq(chainCheckpoints.id, lookup.checkpointId))
    .limit(1);
  const registry = checkpoint.registrySnapshot as AssetRegistry,
    chain = await adapter(registry),
    anchor = await chain.getCanonicalBlock(BigInt(checkpoint.height));
  if (anchor.hash !== checkpoint.blockHash)
    throw new Error("CHECKPOINT_REORGED");
  const before = BigInt(lookup.cursorHeight),
    end =
      before + 5n < BigInt(lookup.throughHeight)
        ? before + 5n
        : BigInt(lookup.throughHeight);
  if (lookup.state === "reconciled")
    return { status: lookup.state, run_id: id };
  const page =
    before < end
      ? await chain.scanTransfers(checkpoint.treasurySender, before, end)
      : { through: end, transfers: [] };
  const verified = [];
  for (const candidate of page.transfers) {
    const proof = await chain.verifyTransfer({
      asset: registry,
      hash: candidate.hash,
      index: candidate.index,
      sender: candidate.sender,
      destination: candidate.destination,
      amount: candidate.amount,
    });
    if (proof.state === "failed") {
      verified.push({ candidate, proof });
      continue;
    }
    if (
      proof.state !== "confirmed" ||
      proof.contradiction ||
      proof.blockHash !== candidate.blockHash ||
      proof.height !== candidate.height ||
      proof.amount !== candidate.amount
    )
      throw new Error("SCAN_INCOMPLETE");
    verified.push({ candidate, proof });
  }
  const [run] = await tx
    .select()
    .from(chainRecoveryRuns)
    .where(eq(chainRecoveryRuns.id, id))
    .for("update");
  if (run.state === "reconciled") return { status: "reconciled", run_id: id };
  if (
    run.revision !== lookup.revision ||
    run.cursorHeight !== lookup.cursorHeight
  )
    throw new Error("VERSION_CONFLICT");
  let incoming = 0,
    outgoing = 0,
    unexplained = false;
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
        await settleCryptoAttempt(tx, attempt.id, candidate.index);
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
  const revision = run.revision + 1;
  if (before < end)
    await tx.insert(chainScanPages).values({
      runId: id,
      revision,
      fromHeight: before.toString(),
      throughHeight: end.toString(),
      evidenceHash: digest(page),
      incomingCount: incoming,
      outgoingCount: outgoing,
    });
  const terminal = end === BigInt(run.throughHeight);
  let state = unexplained || run.state === "review" ? "review" : "scanning",
    reason = unexplained ? "UNKNOWN_OUTFLOW" : run.reasonCode;
  let knownCursor = run.knownAttemptCursor,
    knownComplete = false;
  if (terminal && state !== "review") {
    const known = await tx
      .select({
        id: signedAttemptStatus.id,
        hash: signedAttemptStatus.txHash,
        sender: cryptoObligations.treasurySender,
        destination: cryptoObligations.destination,
        status: cryptoObligations.status,
        completed: cryptoObligations.completedAt,
      })
      .from(signedAttemptStatus)
      .innerJoin(
        cryptoObligations,
        eq(cryptoObligations.id, signedAttemptStatus.obligationId),
      )
      .where(
        and(
          eq(cryptoObligations.assetId, checkpoint.assetId),
          eq(cryptoObligations.treasurySender, checkpoint.treasurySender),
          knownCursor ? gt(signedAttemptStatus.id, knownCursor) : undefined,
        ),
      )
      .orderBy(asc(signedAttemptStatus.id))
      .limit(100);
    let pending = false;
    for (const attempt of known) {
      if (
        !["settled", "cancelled"].includes(attempt.status) &&
        !attempt.completed
      ) {
        const index = await chain.findTransferIndex(
          attempt.hash,
          attempt.sender!,
          attempt.destination,
        );
        const result = await settleCryptoAttempt(tx, attempt.id, index ?? 0);
        if (result.status === "pending") {
          pending = true;
          reason = "KNOWN_ATTEMPT_PENDING";
          break;
        }
      }
      knownCursor = attempt.id;
    }
    knownComplete = !pending && known.length < 100;
  }
  if (terminal && state !== "review" && knownComplete) {
    const physical = await chain.getReconciledBalance(
        registry,
        checkpoint.treasurySender,
        BigInt(run.throughHeight),
      ),
      [book] = await tx
        .select({
          amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='debit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
        })
        .from(ledgerAccounts)
        .leftJoin(
          ledgerPostings,
          eq(ledgerPostings.accountId, ledgerAccounts.id),
        )
        .where(
          and(
            eq(ledgerAccounts.assetId, checkpoint.assetId),
            eq(ledgerAccounts.purpose, "treasury_asset"),
          ),
        );
    if (physical !== BigInt(book.amount)) {
      state = "review";
      reason = "UNEXPLAINED_BALANCE";
    } else {
      const [owed] = await tx
        .select({
          amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
        })
        .from(ledgerAccounts)
        .leftJoin(
          ledgerPostings,
          eq(ledgerPostings.accountId, ledgerAccounts.id),
        )
        .where(
          and(
            eq(ledgerAccounts.assetId, checkpoint.assetId),
            sql`${ledgerAccounts.purpose} in ('available_payable','held_payable','refund_payable','incoming_payable','unallocated_payable','marketing_payable','developer_payable','bootstrap_developer_payable','bootstrap_marketing_payable')`,
          ),
        );
      if (physical < BigInt(owed.amount)) {
        state = "review";
        reason = "CUSTODY_BELOW_LIABILITIES";
      } else state = "reconciled";
    }
  }
  await tx
    .update(chainRecoveryRuns)
    .set({
      cursorHeight: end.toString(),
      revision,
      knownAttemptCursor: knownCursor,
      incomingCount: run.incomingCount + incoming,
      outgoingCount: run.outgoingCount + outgoing,
      state,
      reasonCode: reason,
      completedAt:
        terminal && state !== "scanning" ? sql`clock_timestamp()` : null,
    })
    .where(eq(chainRecoveryRuns.id, id));
  return {
    run_id: id,
    status: state,
    cursor_height: end.toString(),
    incoming,
    outgoing,
    reason,
  };
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
  assertFinancialEnvironment();
  await staff(tx, actorId);
  const [outflow] = await tx
    .select()
    .from(recoveryOutflows)
    .where(eq(recoveryOutflows.id, input.outflow_id))
    .limit(1);
  if (!outflow || outflow.status !== "review") throw new Error("NOT_FOUND");
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
  const [run] = await tx
      .select()
      .from(chainRecoveryRuns)
      .where(eq(chainRecoveryRuns.id, outflow.runId))
      .limit(1),
    [checkpoint] = await tx
      .select()
      .from(chainCheckpoints)
      .where(eq(chainCheckpoints.id, run.checkpointId))
      .limit(1),
    registry = checkpoint.registrySnapshot as AssetRegistry,
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
        eq(assets.environment, "testnet"),
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
  if (networkFee > 0n) {
    const cash = await account(
        tx,
        native.id,
        "system",
        null,
        "treasury_asset",
        "debit",
      ),
      expense = await account(
        tx,
        native.id,
        "platform",
        null,
        "network_fee_expense",
        "debit",
      );
    gasJournal = await postJournal(
      tx,
      "RECOVERY_OUTFLOW_GAS",
      `recovery-outflow-gas:${id}`,
      [
        { accountId: expense.id, direction: "debit", amount: networkFee },
        { accountId: cash.id, direction: "credit", amount: networkFee },
      ],
      { resolution_id: id },
    );
  }
  if (setup > 0n) {
    const cash = await account(
        tx,
        native.id,
        "system",
        null,
        "treasury_asset",
        "debit",
      ),
      expense = await account(
        tx,
        native.id,
        "platform",
        null,
        "recipient_account_setup_expense",
        "debit",
      );
    setupJournal = await postJournal(
      tx,
      "RECOVERY_OUTFLOW_SETUP",
      `recovery-outflow-setup:${id}`,
      [
        { accountId: expense.id, direction: "debit", amount: setup },
        { accountId: cash.id, direction: "credit", amount: setup },
      ],
      { resolution_id: id },
    );
  }
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
