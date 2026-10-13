import crypto from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  assets,
  cryptoObligations,
  priceQuotes,
  ledgerAccounts,
  ledgerPostings,
  operationKeys,
  readManifest,
  auditEvents,
  type DbExecutor,
} from "@gifters/db";
import {
  priceUnits,
  assertFreshRates,
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
export const businessInput = z
  .object({
    asset_key: z.string().max(30),
    role: z.enum([
      "marketing",
      "developer",
      "bootstrap_developer",
      "bootstrap_marketing",
    ]),
    reason: z.string().min(5).max(500),
  })
  .strict();
export async function holdBusinessSettlement(
  tx: DbExecutor,
  actorId: string | null,
  input: z.infer<typeof businessInput>,
  requestKey: string,
  scheduled = false,
) {
  assertFinancialEnvironment();
  if (actorId) {
    const actor = await lockUser(tx, actorId);
    if (actor.role !== "admin" || actor.status !== "active")
      throw new Error("FORBIDDEN");
  } else if (!scheduled) throw new Error("FORBIDDEN");
  const policy = await readManifest(tx);
  if (
    !(scheduled
      ? policy.business_settlement_policy.daily_enabled
      : policy.business_settlement_policy.manual_enabled)
  )
    throw new Error("FEATURE_DISABLED");
  const registry = registryAsset(input.asset_key),
    config = await financialConfiguration(tx, registry);
  await assertExternalActivation(tx, config.hash);
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
  const [clock] = await tx.execute<{
      day: string;
    }>(sql`select (clock_timestamp() at time zone 'UTC')::date::text as day`),
    sourcePurpose = `${input.role}_payable`,
    key = scheduled
      ? `business-daily:testnet:${asset.id}:${input.role}:${clock.day}`
      : `business-manual:${actorId}:${requestKey}:${asset.id}:${input.role}`,
    digest = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          asset_key: input.asset_key,
          role: input.role,
          reason: scheduled ? "UTC_DAILY" : input.reason,
        }),
      )
      .digest("hex");
  const source = await account(
    tx,
    asset.id,
    "platform",
    null,
    sourcePurpose,
    "credit",
  );
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${"business-account:" + source.id},0))`,
  );
  const [old] = await tx
    .select()
    .from(operationKeys)
    .where(eq(operationKeys.businessKey, key))
    .limit(1);
  if (old) {
    if (old.requestHash !== digest) throw new Error("VERSION_CONFLICT");
    return old.result;
  }
  const [value] = await tx
    .select({
      amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
    })
    .from(ledgerPostings)
    .where(eq(ledgerPostings.accountId, source.id));
  const amount = BigInt(value.amount);
  if (amount <= 0n) {
    const empty = { leg_ids: [], total_base_units: "0", status: "empty" };
    await tx
      .insert(operationKeys)
      .values({ businessKey: key, requestHash: digest, result: empty });
    return empty;
  }
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
  const max =
    (priceUnits(String(policy.payout_limits.signer_per_tx_usd)) *
      10n ** BigInt(asset.decimals)) /
    priceUnits(rate.assetUsd);
  if (max <= 0n || amount > max * 100n)
    throw new Error("FINANCIAL_SAFETY_PAUSE");
  const destination = await platformAddress(
      registry,
      input.role.endsWith("developer") ? "DEV" : "MARKETING",
    ),
    sender = await platformAddress(registry, "RECEIVING"),
    chain = await adapter(registry),
    held = await account(
      tx,
      asset.id,
      "platform",
      null,
      "held_payable",
      "credit",
    ),
    legIds: string[] = [];
  let remaining = amount;
  while (remaining > 0n) {
    const principal = remaining > max ? max : remaining;
    if (principal < BigInt(registry.dust))
      throw new Error("WITHDRAWAL_NOT_VIABLE");
    const fee = await chain.estimateFee({
      asset: registry,
      sender,
      destination,
      amount: principal,
    });
    const [leg] = await tx
      .insert(cryptoObligations)
      .values({
        assetId: asset.id,
        kind: "business",
        businessKey: `${key}:leg:${legIds.length}`,
        requestHash: digest,
        environment: "testnet",
        chain: registry.chain,
        treasuryFingerprint: config.treasuryFingerprint,
        configurationHash: config.hash,
        registryHash: config.registryHash,
        registrySnapshot: registry,
        destination,
        sourcePurpose,
        grossBaseUnits: principal.toString(),
        chargeBaseUnits: "0",
        netBaseUnits: principal.toString(),
        nativeFeeQuote: fee.nativeFee.toString(),
        rateSnapshot: snapshot,
        feeSnapshot: {
          nativeFee: fee.nativeFee.toString(),
          gasLimit: fee.gasLimit.toString(),
          unitPrice: fee.unitPrice.toString(),
          observedAt: fee.observedAt,
        },
        status: "approved",
        approvedAt: sql`clock_timestamp()`,
        quoteExpiresAt: sql`clock_timestamp()+interval '5 minutes'`,
      })
      .returning();
    await postJournal(
      tx,
      "BUSINESS_SETTLEMENT_HOLD",
      `business-hold:${leg.id}`,
      [
        { accountId: source.id, direction: "debit", amount: principal },
        { accountId: held.id, direction: "credit", amount: principal },
      ],
      { obligation_id: leg.id, role: input.role },
    );
    legIds.push(leg.id);
    remaining -= principal;
  }
  const result = {
    leg_ids: legIds,
    total_base_units: amount.toString(),
    status: "approved",
  };
  await tx
    .insert(operationKeys)
    .values({ businessKey: key, requestHash: digest, result });
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "crypto.business_hold",
    targetType: "asset",
    targetId: asset.id,
    reason: scheduled ? "UTC daily settlement" : input.reason,
    afterState: result,
  });
  return result;
}
