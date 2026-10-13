import crypto from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  assets,
  cryptoObligations,
  priceQuotes,
  walletLinks,
  ledgerAccounts,
  ledgerPostings,
  readManifest,
  auditEvents,
  signedAttemptStatus,
  type DbExecutor,
} from "@gifters/db";
import {
  withdrawalBreakdown,
  assertFreshRates,
  principalUsdMicros,
  usdLimitMicros,
  attributableRefund,
  type RateSnapshot,
} from "@gifters/domain";
import {
  registryAsset,
  adapter,
  platformAddress,
  financialConfiguration,
  assertFinancialEnvironment,
  assertExternalActivation,
  assertRegistryBinding,
} from "./financial-config";
import { account, postJournal, lockUser } from "./core";
import { assertUnfrozen } from "./financial-review";
export const cryptoWithdrawal = z
  .object({
    asset_key: z.string().max(30),
    gross_base_units: z.string().regex(/^[1-9][0-9]{0,77}$/),
  })
  .strict();
async function balance(
  tx: DbExecutor,
  asset: string,
  ownerId: string | null,
  purpose: string,
) {
  const [row] = await tx
    .select({
      amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
    })
    .from(ledgerAccounts)
    .leftJoin(ledgerPostings, eq(ledgerPostings.accountId, ledgerAccounts.id))
    .where(
      and(
        eq(ledgerAccounts.assetId, asset),
        ownerId
          ? eq(ledgerAccounts.ownerId, ownerId)
          : sql`${ledgerAccounts.ownerId} is null`,
        eq(ledgerAccounts.purpose, purpose),
      ),
    );
  return BigInt(row.amount);
}
export async function quoteCryptoWithdrawal(
  tx: DbExecutor,
  userId: string,
  generation: string,
  input: z.infer<typeof cryptoWithdrawal>,
  requestKey: string,
) {
  assertFinancialEnvironment();
  const registry = registryAsset(input.asset_key);
  await assertExternalActivation(
    tx,
    (await financialConfiguration(tx, registry)).hash,
  );
  const user = await lockUser(tx, userId),
    policy = await readManifest(tx);
  if (!policy.feature_wallets) throw new Error("FEATURE_DISABLED");
  if (!["active", "deactivated"].includes(user.status) || !user.consentedAt)
    throw new Error("ACCOUNT_RESTRICTED");
  const [asset] = await tx
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.symbol, registry.key.toUpperCase()),
        eq(assets.environment, "testnet"),
        eq(assets.chainId, registry.network),
        eq(assets.enabled, true),
      ),
    )
    .limit(1);
  if (!asset) throw new Error("PLAN_UNAVAILABLE");
  assertRegistryBinding(asset, registry);
  const businessKey = `crypto-withdrawal:${userId}:${requestKey}`,
    requestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
  const [old] = await tx
    .select()
    .from(cryptoObligations)
    .where(eq(cryptoObligations.businessKey, businessKey))
    .limit(1);
  if (old) {
    if (old.requestHash !== requestHash) throw new Error("VERSION_CONFLICT");
    return old;
  }
  await assertUnfrozen(tx, userId, asset.id);
  const [wallet] = await tx
    .select()
    .from(walletLinks)
    .where(
      and(
        eq(walletLinks.userId, userId),
        eq(walletLinks.environment, "testnet"),
        eq(walletLinks.chainId, registry.network),
      ),
    )
    .limit(1);
  if (!wallet || (wallet.coolingUntil && wallet.coolingUntil > new Date()))
    throw new Error("INVALID_ADDRESS");
  const [rate] = await tx
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
  if (!rate) throw new Error("PRICE_STALE");
  const snapshot: RateSnapshot = {
    assetUsd: rate.assetUsd,
    nativeUsd: rate.nativeUsd,
    assetDecimals: asset.decimals,
    nativeDecimals:
      registry.chain === "sol" ? 9 : registry.chain === "tron" ? 6 : 18,
    observedAt: rate.observedAt.toISOString(),
    source: rate.source,
  };
  assertFreshRates(snapshot, policy.price_max_age_minutes);
  const gross = BigInt(input.gross_base_units);
  if ((await balance(tx, asset.id, userId, "available_payable")) < gross)
    throw new Error("INSUFFICIENT_BALANCE");
  if (
    principalUsdMicros(gross, snapshot) >
    usdLimitMicros(policy.payout_limits.signer_per_tx_usd)
  )
    throw new Error("FINANCIAL_SAFETY_PAUSE");
  const sender = await platformAddress(registry, "RECEIVING"),
    chain = await adapter(registry),
    fee = await chain.estimateFee({
      asset: registry,
      sender,
      destination: wallet.address,
      amount: gross,
    }),
    quote = withdrawalBreakdown(
      gross,
      fee.nativeFee,
      snapshot,
      BigInt(registry.dust),
    );
  const config = await financialConfiguration(tx, registry);
  const feeSnapshot = {
    ...fee,
    nativeFee: fee.nativeFee.toString(),
    gasLimit: fee.gasLimit.toString(),
    unitPrice: fee.unitPrice.toString(),
    priorityPrice: fee.priorityPrice?.toString(),
    validity: fee.validity
      ? {
          blockhash: fee.validity.blockhash,
          lastValidBlockHeight: fee.validity.lastValidBlockHeight.toString(),
        }
      : undefined,
  };
  return (
    await tx
      .insert(cryptoObligations)
      .values({
        userId,
        assetId: asset.id,
        kind: "withdrawal",
        businessKey,
        requestHash,
        environment: "testnet",
        chain: registry.chain,
        treasuryFingerprint: config.treasuryFingerprint,
        configurationHash: config.hash,
        registryHash: config.registryHash,
        registrySnapshot: registry,
        destination: wallet.address,
        sourcePurpose: "available_payable",
        walletRevision: wallet.revision,
        sessionGeneration: generation,
        grossBaseUnits: gross.toString(),
        chargeBaseUnits: quote.charge.toString(),
        netBaseUnits: quote.net.toString(),
        nativeFeeQuote: fee.nativeFee.toString(),
        rateSnapshot: snapshot,
        feeSnapshot,
        status: "quoted",
        quoteExpiresAt: new Date(
          Date.now() + policy.withdrawal_fee_policy.quote_ttl_minutes * 60000,
        ),
      })
      .returning()
  )[0];
}
export async function confirmCryptoWithdrawal(
  tx: DbExecutor,
  userId: string,
  generation: string,
  id: string,
) {
  assertFinancialEnvironment();
  const user = await lockUser(tx, userId);
  if (!["active", "deactivated"].includes(user.status) || !user.consentedAt)
    throw new Error("ACCOUNT_RESTRICTED");
  const [row] = await tx
    .select()
    .from(cryptoObligations)
    .where(
      and(eq(cryptoObligations.id, id), eq(cryptoObligations.userId, userId)),
    )
    .for("update");
  if (!row) throw new Error("NOT_FOUND");
  if (row.kind !== "withdrawal") throw new Error("FORBIDDEN");
  if (
    ["held", "approved", "signing", "broadcast", "settled"].includes(row.status)
  )
    return row;
  if (
    row.status !== "quoted" ||
    row.sessionGeneration !== generation ||
    row.quoteExpiresAt <= new Date()
  )
    throw new Error("QUOTE_EXPIRED");
  const policy = await readManifest(tx);
  if (!policy.feature_wallets) throw new Error("FEATURE_DISABLED");
  const [asset] = await tx
    .select()
    .from(assets)
    .where(eq(assets.id, row.assetId))
    .limit(1);
  const registry = registryAsset(asset.symbol.toLowerCase()),
    config = await financialConfiguration(tx, registry);
  if (config.hash !== row.configurationHash)
    throw new Error("VERSION_CONFLICT");
  const [wallet] = await tx
    .select()
    .from(walletLinks)
    .where(
      and(
        eq(walletLinks.userId, userId),
        eq(walletLinks.environment, "testnet"),
        eq(walletLinks.chainId, registry.network),
      ),
    )
    .limit(1);
  if (
    !wallet ||
    wallet.address !== row.destination ||
    wallet.revision !== row.walletRevision ||
    (wallet.coolingUntil && wallet.coolingUntil > new Date())
  )
    throw new Error("DESTINATION_CHANGED");
  await assertUnfrozen(tx, userId, row.assetId);
  assertFreshRates(
    row.rateSnapshot as RateSnapshot,
    policy.withdrawal_fee_policy.max_rate_age_minutes,
  );
  const gross = BigInt(row.grossBaseUnits);
  if ((await balance(tx, row.assetId, userId, "available_payable")) < gross)
    throw new Error("INSUFFICIENT_BALANCE");
  const available = await account(
      tx,
      row.assetId,
      "user",
      userId,
      "available_payable",
      "credit",
    ),
    held = await account(
      tx,
      row.assetId,
      "user",
      userId,
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
    { obligation_id: row.id, environment: "testnet" },
  );
  const auto =
    principalUsdMicros(gross, row.rateSnapshot as RateSnapshot) <=
    usdLimitMicros(policy.payout_limits.auto_approve_usd);
  return (
    await tx
      .update(cryptoObligations)
      .set({
        status: auto ? "approved" : "held",
        approvedAt: auto ? new Date() : null,
      })
      .where(eq(cryptoObligations.id, id))
      .returning()
  )[0];
}
export async function cancelCryptoWithdrawal(
  tx: DbExecutor,
  userId: string,
  id: string,
) {
  await lockUser(tx, userId);
  const [row] = await tx
    .select()
    .from(cryptoObligations)
    .where(
      and(eq(cryptoObligations.id, id), eq(cryptoObligations.userId, userId)),
    )
    .for("update");
  if (!row) throw new Error("NOT_FOUND");
  if (row.kind !== "withdrawal") throw new Error("FORBIDDEN");
  if (row.status === "cancelled") return row;
  const attempts = await tx
    .select()
    .from(signedAttemptStatus)
    .where(eq(signedAttemptStatus.obligationId, id))
    .limit(1);
  if (
    attempts.length ||
    !["quoted", "held", "approved", "awaiting_requote"].includes(row.status)
  )
    throw new Error("FINANCIAL_SAFETY_PAUSE");
  if (row.status !== "quoted") {
    const held = await account(
        tx,
        row.assetId,
        "user",
        userId,
        "held_payable",
        "credit",
      ),
      available = await account(
        tx,
        row.assetId,
        "user",
        userId,
        "available_payable",
        "credit",
      );
    await postJournal(
      tx,
      "HOLD_RELEASE",
      `crypto-cancel:${id}`,
      [
        {
          accountId: held.id,
          direction: "debit",
          amount: BigInt(row.grossBaseUnits),
        },
        {
          accountId: available.id,
          direction: "credit",
          amount: BigInt(row.grossBaseUnits),
        },
      ],
      { obligation_id: id },
    );
  }
  return (
    await tx
      .update(cryptoObligations)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(eq(cryptoObligations.id, id))
      .returning()
  )[0];
}
export async function approveCryptoObligation(
  tx: DbExecutor,
  actorId: string,
  id: string,
  reason: string,
) {
  const actor = await lockUser(tx, actorId);
  if (actor.role !== "admin" || actor.status !== "active")
    throw new Error("FORBIDDEN");
  const [row] = await tx
    .select()
    .from(cryptoObligations)
    .where(eq(cryptoObligations.id, id))
    .for("update");
  if (!row) throw new Error("NOT_FOUND");
  if (row.status === "approved") return row;
  if (row.status !== "held") throw new Error("VERSION_CONFLICT");
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "crypto.approve",
    targetType: "obligation",
    targetId: id,
    reason,
  });
  return (
    await tx
      .update(cryptoObligations)
      .set({ status: "approved", approvedAt: new Date() })
      .where(eq(cryptoObligations.id, id))
      .returning()
  )[0];
}
