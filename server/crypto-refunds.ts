import crypto from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  assets,
  cryptoInvoices,
  cryptoEvents,
  cryptoObligations,
  priceQuotes,
  ledgerPostings,
  readManifest,
  auditEvents,
  type DbExecutor,
} from "@gifters/db";
import {
  assertFreshRates,
  principalUsdMicros,
  usdLimitMicros,
  type RateSnapshot,
} from "@gifters/domain";
import { account, postJournal, lockGiftParticipants } from "./core";
import {
  adapter,
  financialConfiguration,
  platformAddress,
  assertFinancialEnvironment,
  assertExternalActivation,
} from "./financial-config";
import type { AssetRegistry } from "@gifters/chains";
export const refundInput = z
  .object({ event_id: z.string().uuid(), reason: z.string().min(5).max(500) })
  .strict();
export async function reserveOriginalRefund(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof refundInput>,
) {
  assertFinancialEnvironment();
  const [event] = await tx
    .select()
    .from(cryptoEvents)
    .where(eq(cryptoEvents.id, input.event_id))
    .limit(1);
  if (!event) throw new Error("NOT_FOUND");
  const [invoice] = await tx
    .select()
    .from(cryptoInvoices)
    .where(eq(cryptoInvoices.id, event.invoiceId))
    .limit(1);
  const policy = await readManifest(tx);
  const participants = await lockGiftParticipants(tx, invoice.userId, policy, [
    actorId,
  ]);
  const actor = participants.participants.get(actorId);
  if (
    actor?.role !== "admin" ||
    actor.status !== "active" ||
    !policy.feature_admin
  )
    throw new Error("FORBIDDEN");
  const [locked] = await tx
    .select()
    .from(cryptoInvoices)
    .where(eq(cryptoInvoices.id, invoice.id))
    .for("update");
  const registry = locked.registrySnapshot as AssetRegistry,
    config = await financialConfiguration(tx, registry);
  await assertExternalActivation(tx, config.hash);
  const key = `refund:${event.id}:leg:0`,
    digest = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({ event_id: event.id, destination: invoice.sender }),
      )
      .digest("hex"),
    [old] = await tx
      .select()
      .from(cryptoObligations)
      .where(eq(cryptoObligations.businessKey, key))
      .limit(1);
  if (old) return { obligation_id: old.id, status: old.status };
  const refundable =
    event.status === "exception"
      ? BigInt(event.amountBaseUnits)
      : event.status === "credited"
        ? BigInt(event.amountBaseUnits) - BigInt(invoice.expectedBaseUnits)
        : 0n;
  if (refundable <= 0n) throw new Error("FINANCIAL_SAFETY_PAUSE");
  const [asset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.id, event.assetId))
      .limit(1),
    [price] = await tx
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
  if (
    principalUsdMicros(refundable, rate) >
    usdLimitMicros(policy.payout_limits.signer_per_tx_usd)
  )
    throw new Error("FINANCIAL_SAFETY_PAUSE");
  const source = await account(
      tx,
      asset.id,
      "user",
      invoice.userId,
      "refund_payable",
      "credit",
    ),
    held = await account(
      tx,
      asset.id,
      "user",
      invoice.userId,
      "held_payable",
      "credit",
    );
  const [available] = await tx
    .select({
      amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
    })
    .from(ledgerPostings)
    .where(eq(ledgerPostings.accountId, source.id));
  if (BigInt(available.amount) < refundable)
    throw new Error("INSUFFICIENT_BALANCE");
  const fee = await (
      await adapter(registry)
    ).estimateFee({
      asset: registry,
      sender: await platformAddress(registry, "RECEIVING"),
      destination: invoice.sender,
      amount: refundable,
    }),
    [row] = await tx
      .insert(cryptoObligations)
      .values({
        userId: invoice.userId,
        assetId: asset.id,
        kind: "refund",
        businessKey: key,
        requestHash: digest,
        environment: "testnet",
        chain: registry.chain,
        treasuryFingerprint: config.treasuryFingerprint,
        configurationHash: config.hash,
        registryHash: config.registryHash,
        registrySnapshot: registry,
        destination: invoice.sender,
        sourcePurpose: "refund_payable",
        grossBaseUnits: refundable.toString(),
        chargeBaseUnits: "0",
        netBaseUnits: refundable.toString(),
        nativeFeeQuote: fee.nativeFee.toString(),
        rateSnapshot: rate,
        feeSnapshot: {
          nativeFee: fee.nativeFee.toString(),
          gasLimit: fee.gasLimit.toString(),
          unitPrice: fee.unitPrice.toString(),
          observedAt: fee.observedAt,
          event_id: event.id,
        },
        status: "approved",
        approvedAt: sql`clock_timestamp()`,
        quoteExpiresAt: sql`clock_timestamp()+interval '5 minutes'`,
      })
      .returning();
  await postJournal(
    tx,
    "PAYOUT_HOLD",
    `refund-hold:${event.id}`,
    [
      { accountId: source.id, direction: "debit", amount: refundable },
      { accountId: held.id, direction: "credit", amount: refundable },
    ],
    { obligation_id: row.id, event_id: event.id },
  );
  await tx.insert(auditEvents).values({
    actorUserId: actorId,
    action: "crypto.refund_hold",
    targetType: "event",
    targetId: event.id,
    reason: input.reason,
    afterState: { obligation_id: row.id },
  });
  return { obligation_id: row.id, status: row.status };
}
