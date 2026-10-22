import crypto from "node:crypto";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { z } from "zod";
import {
  unallocatedInflows,
  unallocatedRefundClaims,
  cryptoObligations,
  assets,
  priceQuotes,
  auditEvents,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import type { AssetRegistry } from "@gifters/chains";
import { assertFreshRates, principalUsdMicros, effectiveUsdLimitMicros, type RateSnapshot } from "@gifters/domain";
import {
  adapter,
  financialConfiguration,
  platformAddress,
  assertFinancialEnvironment,
  financialEnvironmentIn,
  assertExternalActivation,
} from "./financial-config";
import { account, postJournal, lockUser } from "./core";
const hash = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
export const unmatchedRefundInput = z
  .object({
    inflow_id: z.string().uuid(),
    signature: z.string().min(40).max(2048),
    proof_reference: z.string().regex(/^[-A-Za-z0-9:_]{5,200}$/),
    previous_obligation_id: z.string().uuid().optional(),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
async function staff(tx: DbExecutor, id: string) {
  assertFinancialEnvironment();
  const actor = await lockUser(tx, id),
    policy = await readManifest(tx);
  if (
    actor.role !== "admin" ||
    actor.status !== "active" ||
    !policy.feature_admin
  )
    throw new Error("FORBIDDEN");
  return policy;
}
function statement(row: typeof unallocatedInflows.$inferSelect) {
  return [
    "Gifters World — original sender refund v1",
    `Inflow: ${row.id}`,
    `Network: ${row.environment}/${row.chain}/${row.network}`,
    `Original sender: ${row.sender}`,
    `Principal base units: ${row.amountBaseUnits}`,
    `Verified transaction: ${row.txHash}:${row.eventIndex}`,
    "I authorize return of this full principal to the original sender wallet. Platform pays network costs. No account access or new destination is granted.",
  ].join("\n");
}
export async function unmatchedRefundStatement(
  tx: DbExecutor,
  actorId: string,
  id: string,
) {
  await staff(tx, actorId);
  const environment=await financialEnvironmentIn(tx);
  const [row] = await tx
    .select()
    .from(unallocatedInflows)
    .where(and(eq(unallocatedInflows.id, id),eq(unallocatedInflows.environment,environment)))
    .limit(1);
  if (!row) throw new Error("NOT_FOUND");
  return {
    inflow_id: id,
    statement: statement(row),
    sender: row.sender,
    amount_base_units: row.amountBaseUnits,
  };
}
export async function reserveUnmatchedRefund(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof unmatchedRefundInput>,
) {
  const policy = await staff(tx, actorId),environment=await financialEnvironmentIn(tx);
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`unallocated-refund:${input.inflow_id}`},0))`,
  );
  const [row] = await tx
    .select()
    .from(unallocatedInflows)
    .where(and(eq(unallocatedInflows.id, input.inflow_id),eq(unallocatedInflows.environment,environment)))
    .limit(1);
  if (!row) throw new Error("NOT_FOUND");
  const registry = row.registrySnapshot as AssetRegistry,
    chain = await adapter(registry),
    message = statement(row),
    signatureHash = hash(input.signature),
    [claim] = await tx
      .select()
      .from(unallocatedRefundClaims)
      .where(eq(unallocatedRefundClaims.inflowId, row.id))
      .limit(1);
  if (claim) {
    if (
      claim.signatureHash !== signatureHash ||
      claim.statementHash !== hash(message) ||
      claim.proofReference !== input.proof_reference
    )
      throw new Error("VERSION_CONFLICT");
  } else {
    if (
      !(await chain.verifyOwnershipProof(row.sender, message, input.signature))
    )
      throw new Error("INVALID_PROOF");
    await tx
      .insert(unallocatedRefundClaims)
      .values({
        inflowId: row.id,
        actorUserId: actorId,
        statementHash: hash(message),
        signatureHash,
        proofReference: input.proof_reference,
      });
  }
  const [latest] = await tx
    .select()
    .from(cryptoObligations)
    .where(
      like(cryptoObligations.businessKey, `unallocated-refund:${row.id}:leg:%`),
    )
    .orderBy(sql`split_part(${cryptoObligations.businessKey},':',4)::int desc`)
    .limit(1);
  let leg = 0;
  if (input.previous_obligation_id) {
    if (latest?.previousObligationId === input.previous_obligation_id)
      return { obligation_id: latest.id, status: latest.status };
    if (
      !latest ||
      latest.id !== input.previous_obligation_id ||
      !(
        latest.status === "cancelled" ||
        (latest.status === "exception" && latest.completedAt)
      )
    )
      throw new Error("PREVIOUS_OBLIGATION_NOT_CLOSED");
    leg = parseInt(latest.businessKey.split(":").at(-1)!, 10) + 1;
    if (leg > 1000) throw new Error("FINANCIAL_SAFETY_PAUSE");
  } else if (latest) return { obligation_id: latest.id, status: latest.status };
  const verified = await chain.verifyTransfer({
    asset: registry,
    hash: row.txHash,
    index: row.eventIndex,
    sender: row.sender,
    destination: row.destination,
    amount: BigInt(row.amountBaseUnits),
  });
  if (verified.state !== "confirmed" || verified.contradiction)
    throw new Error("INVALID_PROOF");
  const config = await financialConfiguration(tx, registry);
  await assertExternalActivation(tx, config.hash);
  const [asset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.id, row.assetId))
      .limit(1),
    [price] = await tx
      .select()
      .from(priceQuotes)
      .where(
        and(
          eq(priceQuotes.assetId, row.assetId),
          sql`${priceQuotes.expiresAt}>clock_timestamp()`,
        ),
      )
      .orderBy(desc(priceQuotes.observedAt))
      .limit(1);
  if (!price) throw new Error("PRICE_STALE");
  const rate: RateSnapshot = {
    assetUsd: price.assetUsd,
    nativeUsd: price.nativeUsd,
    assetDecimals: asset.decimals,
    nativeDecimals:
      registry.chain === "sol" ? 9 : registry.chain === "tron" ? 6 : 18,
    observedAt: price.observedAt.toISOString(),
    source: price.source,
  };
  assertFreshRates(rate, policy.price_max_age_minutes);
  if(principalUsdMicros(BigInt(row.amountBaseUnits),rate)>effectiveUsdLimitMicros(policy.payout_limits.signer_per_tx_usd,process.env.SIGNER_HARD_PER_TX_USD??'5000'))throw new Error('FINANCIAL_SAFETY_PAUSE');
  const sender = await platformAddress(registry, "RECEIVING"),
    amount = BigInt(row.amountBaseUnits),
    fee = await chain.estimateFee({
      asset: registry,
      sender,
      destination: row.sender,
      amount,
    }),
    key = `unallocated-refund:${row.id}:leg:${leg}`;
  const [obligation] = await tx
    .insert(cryptoObligations)
    .values({
      assetId: row.assetId,
      kind: "unallocated_refund",
      previousObligationId: input.previous_obligation_id,
      businessKey: key,
      requestHash: hash(
        JSON.stringify({
          inflow_id: row.id,
          signature_hash: signatureHash,
          previous: input.previous_obligation_id,
        }),
      ),
      environment,
      chain: registry.chain,
      treasuryFingerprint: config.treasuryFingerprint,
      treasurySender: sender,
      configurationHash: config.hash,
      registryHash: config.registryHash,
      registrySnapshot: registry,
      destination: row.sender,
      sourcePurpose: "unallocated_payable",
      grossBaseUnits: row.amountBaseUnits,
      chargeBaseUnits: "0",
      netBaseUnits: row.amountBaseUnits,
      nativeFeeQuote: fee.nativeFee.toString(),
      rateSnapshot: rate,
      feeSnapshot: {
        inflow_id: row.id,
        networkFee: (fee.networkFee ?? fee.nativeFee).toString(),
        accountSetupCost: (fee.accountSetupCost ?? 0n).toString(),
      },
      status: "approved",
      approvedAt: sql`clock_timestamp()`,
      quoteExpiresAt: new Date(
        Date.now() + policy.withdrawal_fee_policy.quote_ttl_minutes * 60000,
      ),
    })
    .returning();
  const owed = await account(
      tx,
      row.assetId,
      "system",
      null,
      "unallocated_payable",
      "credit",
    ),
    held = await account(
      tx,
      row.assetId,
      "platform",
      null,
      "held_payable",
      "credit",
    );
  await postJournal(
    tx,
    "UNALLOCATED_REFUND_HOLD",
    `unallocated-hold:${obligation.id}`,
    [
      { accountId: owed.id, direction: "debit", amount },
      { accountId: held.id, direction: "credit", amount },
    ],
    { obligation_id: obligation.id, inflow_id: row.id },
  );
  await tx
    .insert(auditEvents)
    .values({
      actorUserId: actorId,
      action: "unallocated.refund.hold",
      targetType: "crypto_obligation",
      targetId: obligation.id,
      reason: input.reason,
      afterState: { inflow_id: row.id, original_sender_only: true },
    });
  return { obligation_id: obligation.id, status: "approved" };
}
