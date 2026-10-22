import {financialEnvironmentIn} from './financial-config';
import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  recoveryViewCaps,
  liabilityRecoveries,
  cryptoObligations,
  assets,
  ledgerAccounts,
  ledgerPostings,
  walletLinks,
  auditEvents,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import { quoteCryptoWithdrawal } from "./crypto-payouts";
import {
  adapter,
  financialConfiguration,
  assertExternalActivation,
} from "./financial-config";
import type { AssetRegistry } from "@gifters/chains";
import { lockUser, account, postJournal } from "./core";
import { assertUnfrozen } from "./financial-review";
import { assertFreshRates, type RateSnapshot } from "@gifters/domain";
export const recoveryQuote = z
  .object({
    user_id: z.string().uuid(),
    asset_key: z.string().max(30),
    gross_base_units: z.string().regex(/^[1-9][0-9]{0,77}$/),
    proof_reference: z.string().regex(/^[-A-Za-z0-9:_]{5,200}$/),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
export const recoveryProof = z
  .object({
    recovery_id: z.string().uuid(),
    signature: z.string().min(40).max(2048),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
const hash = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
export async function quoteLiabilityRecovery(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof recoveryQuote>,
  requestKey: string,
) {
  const environment=await financialEnvironmentIn(tx);
  const obligation = await quoteCryptoWithdrawal(
    tx,
    input.user_id,
    crypto.randomUUID(),
    { asset_key: input.asset_key, gross_base_units: input.gross_base_units },
    requestKey,
    { actorId, proofReference: input.proof_reference, reason: input.reason },
  );
  const [old] = await tx
    .select()
    .from(liabilityRecoveries)
    .where(eq(liabilityRecoveries.obligationId, obligation.id))
    .limit(1);
  if (old)
    return {
      recovery_id: old.id,
      statement: old.statement,
      obligation_id: obligation.id,
    };
  const [asset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.id, obligation.assetId))
      .limit(1),
    id = crypto.randomUUID(),
    statement = [
      "Gifters World — liability recovery v1",
      `Recovery: ${id}`,
      `Financial account: ${input.user_id}`,
      `Asset: ${asset.symbol}`,
      `Network: ${environment}/${obligation.chain}/${asset.chainId}`,
      `Original linked destination: ${obligation.destination}`,
      `Gross base units: ${obligation.grossBaseUnits}`,
      `Approved charge base units: ${obligation.chargeBaseUnits}`,
      `Net base units: ${obligation.netBaseUnits}`,
      `Network charge: ${(obligation.feeSnapshot as any).network_charge_base_units}`,
      `Account setup charge: ${(obligation.feeSnapshot as any).account_setup_charge_base_units}`,
      `Expires: ${obligation.quoteExpiresAt.toISOString()}`,
      `Reviewed identity case: ${input.proof_reference}`,
      "I authorize this payout and its stated costs to my original verified linked wallet. This grants no account access, identity reassignment or new destination.",
    ].join("\n");
  await tx.insert(liabilityRecoveries).values({
    id,
    userId: input.user_id,
    assetId: asset.id,
    actorUserId: actorId,
    obligationId: obligation.id,
    proofReference: input.proof_reference,
    statement,
    statementHash: hash(statement),
    expiresAt: obligation.quoteExpiresAt,
  });
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "liability.recovery.quote",
    targetType: "liability_recovery",
    targetId: id,
    reason: input.reason,
    afterState: {
      user_id: input.user_id,
      asset_id: asset.id,
      proof_reference: input.proof_reference,
    },
  });
  return { recovery_id: id, statement, obligation_id: obligation.id };
}
export async function confirmLiabilityRecovery(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof recoveryProof>,
) {
  const environment=await financialEnvironmentIn(tx);
  const [lookup] = await tx
    .select()
    .from(liabilityRecoveries)
    .where(eq(liabilityRecoveries.id, input.recovery_id))
    .limit(1);
  if (!lookup) throw new Error("NOT_FOUND");
  for (const id of [...new Set([actorId, lookup.userId])].sort())
    await lockUser(tx, id);
  const actor = await lockUser(tx, actorId),
    policy = await readManifest(tx);
  if (
    actor.role !== "admin" ||
    actor.status !== "active" ||
    !policy.feature_admin ||
    !policy.feature_wallets
  )
    throw new Error("FORBIDDEN");
  const [recovery] = await tx
      .select()
      .from(liabilityRecoveries)
      .where(eq(liabilityRecoveries.id, lookup.id))
      .for("update"),
    [row] = await tx
      .select()
      .from(cryptoObligations)
      .where(eq(cryptoObligations.id, recovery.obligationId))
      .for("update");
  const confirmationHash = hash(
    JSON.stringify({
      actor_id: actorId,
      signature_hash: hash(input.signature),
      reason: input.reason,
    }),
  );
  if (recovery.confirmedAt) {
    if (recovery.confirmationHash !== confirmationHash)
      throw new Error("VERSION_CONFLICT");
    return { status: row.status, obligation_id: row.id };
  }
  const [clock] = await tx.execute<{ now: Date }>(
    sql`select clock_timestamp() as now`,
  );
  if (
    row.status !== "quoted" ||
    recovery.expiresAt <= new Date(clock.now) ||
    row.kind !== "recovery"
  )
    throw new Error("QUOTE_EXPIRED");
  const registry = row.registrySnapshot as AssetRegistry,
    chain = await adapter(registry),
    config = await financialConfiguration(tx, registry);
  await assertExternalActivation(tx, config.hash);
  if (config.hash !== row.configurationHash)
    throw new Error("VERSION_CONFLICT");
  const [wallet] = await tx
    .select()
    .from(walletLinks)
    .where(
      and(
        eq(walletLinks.userId, recovery.userId),
        eq(walletLinks.environment, environment),
        eq(walletLinks.chainId, registry.network),
      ),
    )
    .limit(1);
  if (
    !wallet ||
    wallet.address !== row.destination ||
    wallet.revision !== row.walletRevision ||
    (wallet.coolingUntil && wallet.coolingUntil > new Date(clock.now))
  )
    throw new Error("DESTINATION_CHANGED");
  if (
    !(await chain.verifyOwnershipProof(
      row.destination,
      recovery.statement,
      input.signature,
    ))
  )
    throw new Error("INVALID_PROOF");
  await assertUnfrozen(tx, recovery.userId, row.assetId);
  assertFreshRates(
    row.rateSnapshot as RateSnapshot,
    policy.withdrawal_fee_policy.max_rate_age_minutes,
  );
  const [balance] = await tx
    .select({
      amount: sql<string>`coalesce(sum(public.gw_account_balance(${ledgerAccounts.id})),0)::text`,
    })
    .from(ledgerAccounts)
    .where(
      and(
        eq(ledgerAccounts.assetId, row.assetId),
        eq(ledgerAccounts.ownerId, recovery.userId),
        eq(ledgerAccounts.purpose, "available_payable"),
      ),
    );
  const gross = BigInt(row.grossBaseUnits);
  if (BigInt(balance.amount) < gross) throw new Error("INSUFFICIENT_BALANCE");
  const available = await account(
      tx,
      row.assetId,
      "user",
      recovery.userId,
      "available_payable",
      "credit",
    ),
    held = await account(
      tx,
      row.assetId,
      "user",
      recovery.userId,
      "held_payable",
      "credit",
    );
  await postJournal(
    tx,
    "PAYOUT_HOLD",
    `crypto-hold:${row.id}`,
    [
      { accountId: available.id, direction: "debit", amount: gross },
      { accountId: held.id, direction: "credit", amount: gross },
    ],
    { obligation_id: row.id, recovery_id: recovery.id },
  );
  await tx
    .update(liabilityRecoveries)
    .set({
      signatureHash: hash(input.signature),
      confirmationHash,
      confirmedAt: sql`clock_timestamp()`,
    })
    .where(eq(liabilityRecoveries.id, recovery.id));
  await tx
    .update(cryptoObligations)
    .set({ status: "approved", approvedAt: sql`clock_timestamp()` })
    .where(eq(cryptoObligations.id, row.id));
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "liability.recovery.confirm",
    targetType: "liability_recovery",
    targetId: recovery.id,
    reason: input.reason,
    afterState: { obligation_id: row.id, original_destination_only: true },
  });
  return { status: "approved", obligation_id: row.id };
}
export async function cancelLiabilityRecovery(
  tx: DbExecutor,
  actorId: string,
  id: string,
  reason: string,
) {
  await financialEnvironmentIn(tx);
  const [recovery] = await tx
    .select()
    .from(liabilityRecoveries)
    .where(eq(liabilityRecoveries.id, id))
    .limit(1);
  if (!recovery) throw new Error("NOT_FOUND");
  for (const userId of [...new Set([actorId, recovery.userId])].sort())
    await lockUser(tx, userId);
  const actor = await lockUser(tx, actorId),
    policy = await readManifest(tx);
  if (
    actor.role !== "admin" ||
    actor.status !== "active" ||
    !policy.feature_admin
  )
    throw new Error("FORBIDDEN");
  const [row] = await tx
    .select()
    .from(cryptoObligations)
    .where(eq(cryptoObligations.id, recovery.obligationId))
    .for("update");
  if (row.status === "cancelled") return { status: "cancelled" };
  const { signedAttemptStatus } = await import("@gifters/db");
  const attempts = await tx
    .select({ id: signedAttemptStatus.id })
    .from(signedAttemptStatus)
    .where(eq(signedAttemptStatus.obligationId, row.id))
    .limit(1);
  if (
    attempts.length ||
    !["quoted", "approved", "held", "awaiting_requote"].includes(row.status)
  )
    throw new Error("FINANCIAL_SAFETY_PAUSE");
  if (row.status !== "quoted") {
    const held = await account(
        tx,
        row.assetId,
        "user",
        row.userId,
        "held_payable",
        "credit",
      ),
      available = await account(
        tx,
        row.assetId,
        "user",
        row.userId,
        "available_payable",
        "credit",
      ),
      gross = BigInt(row.grossBaseUnits);
    await postJournal(
      tx,
      "HOLD_RELEASE",
      `crypto-recovery-cancel:${row.id}`,
      [
        { accountId: held.id, direction: "debit", amount: gross },
        { accountId: available.id, direction: "credit", amount: gross },
      ],
      { obligation_id: row.id, recovery_id: recovery.id },
    );
  }
  await tx
    .update(cryptoObligations)
    .set({ status: "cancelled", completedAt: sql`clock_timestamp()` })
    .where(eq(cryptoObligations.id, row.id));
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "liability.recovery.cancel",
    targetType: "liability_recovery",
    targetId: recovery.id,
    reason,
  });
  return { status: "cancelled" };
}

export async function issueRecoveryView(
  tx: DbExecutor,
  actorId: string,
  id: string,
) {
  await financialEnvironmentIn(tx);
  const actor = await lockUser(tx, actorId);
  if (
    actor.role !== "admin" ||
    actor.status !== "active" ||
    !(await readManifest(tx)).feature_admin
  )
    throw new Error("FORBIDDEN");
  const [recovery] = await tx
    .select()
    .from(liabilityRecoveries)
    .where(eq(liabilityRecoveries.id, id))
    .limit(1);
  if (!recovery || recovery.confirmedAt) throw new Error("NOT_FOUND");
  const [obligation] = await tx
    .select({ id: cryptoObligations.id })
    .from(cryptoObligations)
    .where(
      and(
        eq(cryptoObligations.id, recovery.obligationId),
        eq(cryptoObligations.status, "quoted"),
        sql`${cryptoObligations.quoteExpiresAt}>clock_timestamp()`,
      ),
    )
    .limit(1);
  if (!obligation) throw new Error("NOT_FOUND");
  const token = crypto.randomBytes(32).toString("base64url");
  await tx
    .insert(recoveryViewCaps)
    .values({
      recoveryId: id,
      tokenHash: hash(token),
      expiresAt: recovery.expiresAt,
    });
  return { recovery_id: id, view_token: token };
}
export async function recoveryStatementView(
  tx: DbExecutor,
  id: string,
  token: string,
) {
  const environment=await financialEnvironmentIn(tx);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("NOT_FOUND");
  const [cap] = await tx
    .select()
    .from(recoveryViewCaps)
    .where(
      and(
        eq(recoveryViewCaps.recoveryId, id),
        eq(recoveryViewCaps.tokenHash, hash(token)),
        sql`${recoveryViewCaps.expiresAt}>clock_timestamp()`,
      ),
    )
    .limit(1);
  if (!cap) throw new Error("NOT_FOUND");
  const [recovery] = await tx
    .select()
    .from(liabilityRecoveries)
    .where(eq(liabilityRecoveries.id, id))
    .limit(1);
  if (!recovery || recovery.confirmedAt) throw new Error("NOT_FOUND");
  const [row] = await tx
    .select()
    .from(cryptoObligations)
    .where(
      and(
        eq(cryptoObligations.id, recovery.obligationId),
        eq(cryptoObligations.status, "quoted"),
        sql`${cryptoObligations.quoteExpiresAt}>clock_timestamp()`,
      ),
    )
    .limit(1);
  if (!row) throw new Error("NOT_FOUND");
  const registry = row.registrySnapshot as AssetRegistry,
    [asset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.id, row.assetId))
      .limit(1);
  return {
    recovery_id: id,
    statement: recovery.statement,
    destination: row.destination,
    expires_at: row.quoteExpiresAt.toISOString(),
    currency: {
      id: asset.id,
      key: registry.key,
      symbol: asset.symbol,
      network: registry.network,
      decimals: registry.decimals,
      kind: registry.kind,
      contract: registry.contract,
      mint: registry.mint,
      enabled: true,
      environment,
    },
  };
}
