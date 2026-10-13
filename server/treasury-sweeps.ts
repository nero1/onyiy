import {beneficiaryLiabilityPurposes} from '@gifters/domain';
import crypto from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  assets,
  cryptoObligations,
  ledgerAccounts,
  ledgerPostings,
  priceQuotes,
  signedAttemptStatus,
  signerHealth,
  auditEvents,
  operationKeys,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import {
  assertFreshRates,
  priceUnits,
  principalUsdMicros,
  usdLimitMicros,
  type RateSnapshot,
} from "@gifters/domain";
import type { AssetRegistry } from "@gifters/chains";
import {
  registryAsset,
  adapter,
  platformAddress,
  financialConfiguration,
  assertRegistryBinding,
  assertFinancialEnvironment,
  assertExternalActivation,
} from "./financial-config";
import { account, postJournal, lockUser } from "./core";
import { settleCryptoAttempt } from "./crypto-settlement";
import { verifySignedExpiry } from "./crypto-expiry";
export const sweepInput = z
  .object({
    asset_key: z.string().max(30),
    amount_base_units: z.string().regex(/^[1-9][0-9]{0,77}$/),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
const liabilityPurposes = beneficiaryLiabilityPurposes;
async function staff(tx: DbExecutor, id: string) {
  assertFinancialEnvironment();
  const actor = await lockUser(tx, id),
    policy = await readManifest(tx);
  if (
    actor.status !== "active" ||
    actor.role !== "admin" ||
    !policy.feature_admin
  )
    throw new Error("FORBIDDEN");
  return policy;
}
async function liability(tx: DbExecutor, assetId: string) {
  const [r] = await tx
    .select({
      amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
    })
    .from(ledgerAccounts)
    .leftJoin(ledgerPostings, eq(ledgerPostings.accountId, ledgerAccounts.id))
    .where(
      and(
        eq(ledgerAccounts.assetId, assetId),
        inArray(ledgerAccounts.purpose, liabilityPurposes),
      ),
    );
  return BigInt(r.amount);
}
async function authority(
  tx: DbExecutor,
  asset: typeof assets.$inferSelect,
  registry: AssetRegistry,
  amount: bigint,
  fee: bigint,
  networkFee: bigint,
  setup: bigint,
  rate: RateSnapshot,
  policy: any,
  config: any,
) {
  const chain = await adapter(registry),
    sender = await platformAddress(registry, "RECEIVING"),
    nativeSymbol = (
      { eth: "ETH", bnb: "BNB", sol: "SOL", tron: "TRX" } as const
    )[registry.chain],
    [native] = await tx
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.environment, "testnet"),
          eq(assets.chainId, registry.network),
          eq(assets.symbol, nativeSymbol),
        ),
      )
      .limit(1);
  if (!native) throw new Error("PLAN_UNAVAILABLE");
  const [physical, nativePhysical] = await Promise.all([
      chain.getBalance(registry, sender, true),
      chain.getNativeBalance(sender, true),
    ]),
    owed = await liability(tx, asset.id),
    nativeOwed = await liability(tx, native.id),
    [cash] = await tx
      .select({
        amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='debit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
      })
      .from(ledgerAccounts)
      .leftJoin(ledgerPostings, eq(ledgerPostings.accountId, ledgerAccounts.id))
      .where(
        and(
          eq(ledgerAccounts.assetId, asset.id),
          eq(ledgerAccounts.purpose, "treasury_asset"),
        ),
      ),
    [health] = await tx
      .select()
      .from(signerHealth)
      .where(eq(signerHealth.treasuryFingerprint, config.treasuryFingerprint))
      .limit(1),
    risk = policy[`crypto_risk_${asset.id}`],
    floor =
      (priceUnits(String(risk?.gas_low_usd ?? 20)) *
        10n ** BigInt(rate.nativeDecimals) +
        priceUnits(rate.nativeUsd) -
        1n) /
      priceUnits(rate.nativeUsd),
    budget =
      (networkFee *
        BigInt(100 + policy.withdrawal_fee_policy.platform_variance_pct)) /
        100n +
      setup;
  if (
    fee > budget ||
    amount > physical - owed ||
    amount > BigInt(cash.amount) - owed ||
    nativePhysical <
      nativeOwed +
        BigInt(health?.nativeReserved ?? "0") +
        budget +
        floor +
        (registry.kind === "native" ? amount : 0n) ||
    principalUsdMicros(amount, rate) >
      usdLimitMicros(policy.payout_limits.signer_per_tx_usd)
  )
    throw new Error("FINANCIAL_SAFETY_PAUSE");
  return { floor, physical, recorded_cash: cash.amount, liability: owed };
}
export async function quoteTreasurySweep(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof sweepInput>,
  requestKey: string,
) {
  const policy = await staff(tx, actorId);
  if (!policy.feature_wallets) throw new Error("FEATURE_DISABLED");
  const registry = registryAsset(input.asset_key),
    config = await financialConfiguration(tx, registry);
  await assertExternalActivation(tx, config.hash);
  const sender = await platformAddress(registry, "RECEIVING"),
    destination = await platformAddress(registry, "SWEEP");
  if (sender === destination) throw new Error("INVALID_INPUT");
  const key = `treasury-sweep:${actorId}:${requestKey}`,
    digest = crypto
      .createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex"),
    [old] = await tx
      .select()
      .from(cryptoObligations)
      .where(eq(cryptoObligations.businessKey, key))
      .limit(1);
  if (old) {
    if (old.requestHash !== digest) throw new Error("VERSION_CONFLICT");
    return sweepDto(old);
  }
  const [asset] = await tx
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
  const [price] = await tx
    .select()
    .from(priceQuotes)
    .where(
      and(
        eq(priceQuotes.assetId, asset.id),
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
  const amount = BigInt(input.amount_base_units),
    chain = await adapter(registry),
    fee = await chain.estimateFee({
      asset: registry,
      sender,
      destination,
      amount,
    }),
    network = fee.networkFee ?? fee.nativeFee,
    setup = fee.accountSetupCost ?? 0n,
    observed = await authority(
      tx,
      asset,
      registry,
      amount,
      fee.nativeFee,
      network,
      setup,
      rate,
      policy,
      config,
    );
  const [row] = await tx
    .insert(cryptoObligations)
    .values({
      assetId: asset.id,
      kind: "sweep",
      businessKey: key,
      requestHash: digest,
      environment: "testnet",
      chain: registry.chain,
      treasuryFingerprint: config.treasuryFingerprint,
      treasurySender: sender,
      configurationHash: config.hash,
      registryHash: config.registryHash,
      registrySnapshot: registry,
      destination,
      sourcePurpose: "treasury_sweep_clearing",
      grossBaseUnits: amount.toString(),
      chargeBaseUnits: "0",
      netBaseUnits: amount.toString(),
      nativeFeeQuote: fee.nativeFee.toString(),
      rateSnapshot: rate,
      feeSnapshot: {
        networkFee: network.toString(),
        accountSetupCost: setup.toString(),
        nativeFloor: observed.floor.toString(),
      },
      quoteExpiresAt: new Date(
        Date.now() + policy.withdrawal_fee_policy.quote_ttl_minutes * 60000,
      ),
    })
    .returning();
  await tx
    .insert(auditEvents)
    .values({
      actorUserId: actorId,
      action: "treasury.sweep.quote",
      targetType: "crypto_obligation",
      targetId: row.id,
      reason: input.reason,
      afterState: {
        amount_base_units: amount.toString(),
        asset_key: registry.key,
      },
    });
  return sweepDto(row);
}
function sweepDto(row: typeof cryptoObligations.$inferSelect) {
  const registry = row.registrySnapshot as AssetRegistry;
  return {
    asset: registry.key.toUpperCase(),
    decimals: registry.decimals,
    native_asset: (
      { eth: "ETH", bnb: "BNB", sol: "SOL", tron: "TRX" } as const
    )[registry.chain],
    native_decimals:
      registry.chain === "sol" ? 9 : registry.chain === "tron" ? 6 : 18,
    id: row.id,
    status: row.status,
    amount_base_units: row.netBaseUnits,
    destination: row.destination,
    native_fee_base_units: row.nativeFeeQuote,
    expires_at: row.quoteExpiresAt,
  };
}
export async function confirmTreasurySweep(
  tx: DbExecutor,
  actorId: string,
  id: string,
  reason: string,
) {
  const policy = await staff(tx, actorId);
  if (!policy.feature_wallets) throw new Error("FEATURE_DISABLED");
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('treasury-sweep-budget',0))`,
  );
  const [row] = await tx
    .select()
    .from(cryptoObligations)
    .where(eq(cryptoObligations.id, id))
    .for("update");
  if (!row || row.kind !== "sweep" || row.userId !== null)
    throw new Error("NOT_FOUND");
  const confirmKey = `treasury-sweep-confirm:${id}`,
    confirmHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ actorId, id, reason }))
      .digest("hex"),
    [confirmed] = await tx
      .select()
      .from(operationKeys)
      .where(eq(operationKeys.businessKey, confirmKey))
      .limit(1);
  if (confirmed) {
    if (confirmed.requestHash !== confirmHash)
      throw new Error("VERSION_CONFLICT");
    return confirmed.result;
  }
  if (row.status !== "quoted") throw new Error("VERSION_CONFLICT");
  const registry = row.registrySnapshot as AssetRegistry,
    config = await financialConfiguration(tx, registry);
  await assertExternalActivation(tx, config.hash);
  const [clock] = await tx.execute<{ now: Date }>(
    sql`select clock_timestamp() as now`,
  );
  if (row.quoteExpiresAt <= new Date(clock.now))
    throw new Error("QUOTE_EXPIRED");
  if (
    config.hash !== row.configurationHash ||
    (await platformAddress(registry, "SWEEP")) !== row.destination ||
    (await platformAddress(registry, "RECEIVING")) !== row.treasurySender
  )
    throw new Error("VERSION_CONFLICT");
  const [asset] = await tx
    .select()
    .from(assets)
    .where(eq(assets.id, row.assetId))
    .limit(1);
  assertRegistryBinding(asset, registry);
  const rate = row.rateSnapshot as RateSnapshot;
  assertFreshRates(rate, policy.price_max_age_minutes);
  const snapshot = row.feeSnapshot as any,
    amount = BigInt(row.netBaseUnits);
  await authority(
    tx,
    asset,
    registry,
    amount,
    BigInt(row.nativeFeeQuote),
    BigInt(snapshot.networkFee),
    BigInt(snapshot.accountSetupCost),
    rate,
    policy,
    config,
  );
  const clearing = await account(
      tx,
      row.assetId,
      "system",
      null,
      "treasury_sweep_clearing",
      "debit",
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
    "TREASURY_SWEEP_HOLD",
    `treasury-sweep-hold:${row.id}`,
    [
      { accountId: clearing.id, direction: "debit", amount },
      { accountId: held.id, direction: "credit", amount },
    ],
    { obligation_id: row.id },
  );
  await tx
    .insert(operationKeys)
    .values({
      businessKey: confirmKey,
      requestHash: confirmHash,
      result: { id: row.id, status: "approved" },
    });
  await tx
    .update(cryptoObligations)
    .set({ status: "approved", approvedAt: sql`clock_timestamp()` })
    .where(eq(cryptoObligations.id, row.id));
  await tx
    .insert(auditEvents)
    .values({
      actorUserId: actorId,
      action: "treasury.sweep.confirm",
      targetType: "crypto_obligation",
      targetId: row.id,
      reason,
    });
  return { id: row.id, status: "approved" };
}
export async function recoverTreasurySweep(
  tx: DbExecutor,
  actorId: string,
  id: string,
  reason: string,
) {
  await staff(tx, actorId);
  const [row] = await tx
    .select()
    .from(cryptoObligations)
    .where(eq(cryptoObligations.id, id))
    .for("update");
  if (!row || row.kind !== "sweep" || row.userId !== null)
    throw new Error("NOT_FOUND");
  const recoveryKey = `treasury-sweep-recovery:${id}`,
    recoveryHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ actorId, id, reason }))
      .digest("hex"),
    [recovered] = await tx
      .select()
      .from(operationKeys)
      .where(eq(operationKeys.businessKey, recoveryKey))
      .limit(1);
  if (recovered) {
    if (recovered.requestHash !== recoveryHash)
      throw new Error("VERSION_CONFLICT");
    return recovered.result;
  }
  if (row.completedAt) throw new Error("VERSION_CONFLICT");
  const attempts = await tx
      .select()
      .from(signedAttemptStatus)
      .where(eq(signedAttemptStatus.obligationId, id))
      .limit(20),
    chain = await adapter(row.registrySnapshot as AssetRegistry);
  const evidence: { id: string; state: string; hash: string }[] = [];
  for (const attempt of attempts) {
    if (attempt.status === "superseded") {
      evidence.push({
        id: attempt.id,
        state: "superseded",
        hash: crypto.createHash("sha256").update(attempt.txHash).digest("hex"),
      });
      continue;
    }
    const proof = await chain.verifyTransfer({
      asset: row.registrySnapshot as AssetRegistry,
      hash: attempt.txHash,
      index: 0,
      sender: row.treasurySender!,
      destination: row.destination,
      amount: BigInt(row.netBaseUnits),
    });
    if (proof.state === "failed" && !proof.contradiction) {
      await settleCryptoAttempt(tx, attempt.id, 0);
      evidence.push({
        id: attempt.id,
        state: "failed",
        hash: crypto
          .createHash("sha256")
          .update(
            JSON.stringify(proof, (_, v) =>
              typeof v === "bigint" ? v.toString() : v,
            ),
          )
          .digest("hex"),
      });
      continue;
    }
    if (
      !(await verifySignedExpiry(tx, attempt.id)).status.includes(
        "expiry_verified",
      )
    )
      throw new Error("FINANCIAL_SAFETY_PAUSE");
    evidence.push({
      id: attempt.id,
      state: "expired",
      hash: crypto.createHash("sha256").update(attempt.txHash).digest("hex"),
    });
  }
  if (
    ![
      "quoted",
      "approved",
      "signing",
      "broadcast",
      "awaiting_requote",
      "exception",
    ].includes(row.status)
  )
    throw new Error("VERSION_CONFLICT");
  if (row.status !== "quoted") {
    const clearing = await account(
        tx,
        row.assetId,
        "system",
        null,
        "treasury_sweep_clearing",
        "debit",
      ),
      held = await account(
        tx,
        row.assetId,
        "platform",
        null,
        "held_payable",
        "credit",
      ),
      amount = BigInt(row.grossBaseUnits);
    await postJournal(
      tx,
      "TREASURY_SWEEP_RELEASE",
      `treasury-sweep-release:${row.id}`,
      [
        { accountId: held.id, direction: "debit", amount },
        { accountId: clearing.id, direction: "credit", amount },
      ],
      { obligation_id: row.id },
    );
  }
  await tx
    .insert(operationKeys)
    .values({
      businessKey: recoveryKey,
      requestHash: recoveryHash,
      result: {
        id,
        status: attempts.length ? "failed_closed" : "cancelled",
        attempts: evidence,
      },
    });
  await tx
    .update(cryptoObligations)
    .set({
      status: attempts.length ? "exception" : "cancelled",
      completedAt: sql`clock_timestamp()`,
    })
    .where(eq(cryptoObligations.id, row.id));
  await tx
    .insert(auditEvents)
    .values({
      actorUserId: actorId,
      action: "treasury.sweep.recover",
      targetType: "crypto_obligation",
      targetId: row.id,
      reason,
    });
  return {
    id: row.id,
    status: attempts.length ? "failed_closed" : "cancelled",
  };
}
