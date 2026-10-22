import {walletSendPending} from './native-wallet-attempts';
import { enqueueObservation } from "./crypto-observer";
import { canonicalTransactionHash } from "@gifters/chains";
import type { AssetRegistry } from "@gifters/chains";
import crypto from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  assets,
  plans,
  planVersions,
  cryptoInvoices,
  cryptoEvents,
  operationKeys,
  walletLinks,
  users,
  cycles,
  cryptoSubmissions,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import {
  registryAsset,
  adapter,
  platformAddress,
  financialConfiguration,
  financialEnvironmentIn,
  assertExternalActivation,
  assertRegistryBinding,
} from "./financial-config";
import {
  lockUser,
  account,
  postJournal,
  sendGift,
  lockGiftParticipants,
} from "./core";
import { assertUnfrozen } from "./financial-review";
export const cryptoInvoiceInput = z
  .object({ plan_id: z.string().uuid(), asset_key: z.string().max(30) })
  .strict();
export const cryptoSubmission = z
  .object({
    invoice_id: z.string().uuid(),
    tx_hash: z.string().min(20).max(128),
    event_index: z.number().int().min(-1).max(1000).default(-1),
  })
  .strict();
export async function quoteCryptoInvoice(
  tx: DbExecutor,
  userId: string,
  generation: string,
  input: z.infer<typeof cryptoInvoiceInput>,
  key: string,
) {
  const environment=await financialEnvironmentIn(tx);
  const registry = registryAsset(input.asset_key);
  await assertExternalActivation(
    tx,
    (await financialConfiguration(tx, registry)).hash,
  );
  const user = await lockUser(tx, userId),
    manifest = await readManifest(tx);
  const [clock] = await tx.execute<{now:Date}>(sql`select clock_timestamp() as now`);
  const now = new Date(clock.now);
  const aliasKey=`native-invoice-quote:${userId}:${key}`,digest=crypto.createHash("sha256").update(JSON.stringify({plan_id:input.plan_id,asset_key:input.asset_key})).digest("hex");
  const [alias]=await tx.select().from(operationKeys).where(eq(operationKeys.businessKey,aliasKey)).limit(1);
  if(alias){
    if(alias.requestHash!==digest)throw new Error("VERSION_CONFLICT");
    const [quoted]=await tx.select().from(cryptoInvoices).where(and(eq(cryptoInvoices.id,String((alias.result as {invoice_id:string}).invoice_id)),eq(cryptoInvoices.userId,userId))).limit(1);
    if(!quoted)throw new Error("FINANCIAL_SAFETY_PAUSE");return quoted;
  }
  if (
    !manifest.feature_gifts ||
    !manifest.entitlements_member.send_enabled_gifts
  )
    throw new Error("FEATURE_DISABLED");
  if (user.status !== "active" || !user.consentedAt)
    throw new Error("ACCOUNT_RESTRICTED");
  if (
    user.consentVersion !== manifest.terms_content.version ||
    !user.ageConfirmedAt ||
    user.ageMinimumAccepted! < manifest.eligibility_min_age
  )
    throw new Error("CONSENT_REQUIRED");
  const [old] = await tx
    .select()
    .from(cryptoInvoices)
    .where(
      and(
        eq(cryptoInvoices.userId, userId),
        eq(cryptoInvoices.requestKey, key),
      ),
    )
    .limit(1);
  if (old) {
    if (old.sender === old.treasury) throw new Error("SELF_TRANSFER_NOT_ALLOWED");
    const [version] = await tx
      .select()
      .from(planVersions)
      .where(eq(planVersions.id, old.planVersionId))
      .limit(1);
    const [oldAsset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.id, old.assetId))
      .limit(1);
    if (
      version.planId !== input.plan_id ||
      old.chain !== registry.chain ||
      oldAsset.symbol.toLowerCase() !== registry.key
    )
      throw new Error("VERSION_CONFLICT");
    return old;
  }
  const [asset] = await tx
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.symbol, registry.key.toUpperCase()),
        eq(assets.environment, environment),
        eq(assets.chainId, registry.network),
        eq(assets.enabled, true),
      ),
    )
    .limit(1);
  if (!asset) throw new Error("PLAN_UNAVAILABLE");
  assertRegistryBinding(asset, registry);
  await assertUnfrozen(tx, userId, asset.id);
  const sameAssetPlan = and(
    eq(planVersions.planId, input.plan_id),
    eq(planVersions.assetId, asset.id),
  );
  const [open] = await tx
    .select({ id: cycles.id })
    .from(cycles)
    .innerJoin(planVersions, eq(planVersions.id, cycles.planVersionId))
    .where(
      and(
        eq(cycles.userId, userId),
        sameAssetPlan,
        inArray(cycles.status, ["active", "exception"]),
      ),
    )
    .limit(1);
  if (open) throw new Error("ACTIVE_CYCLE_EXISTS");
  if (manifest.cycle_max_concurrent > 0) {
    const [count] = await tx
      .select({ count: sql<string>`count(*)::text` })
      .from(cycles)
      .where(
        and(
          eq(cycles.userId, userId),
          inArray(cycles.status, ["active", "exception"]),
        ),
      );
    if (BigInt(count.count) >= BigInt(manifest.cycle_max_concurrent))
      throw new Error("CYCLE_LIMIT_REACHED");
  }
  const [recent] = await tx
    .select({ at: cycles.completedAt })
    .from(cycles)
    .innerJoin(planVersions, eq(planVersions.id, cycles.planVersionId))
    .where(
      and(
        eq(cycles.userId, userId),
        sameAssetPlan,
        eq(cycles.status, "completed"),
      ),
    )
    .orderBy(desc(cycles.completedAt))
    .limit(1);
  if (
    recent?.at &&
    now.getTime() - recent.at.getTime() <
      manifest.cycle_rejoin_cooldown_hours * 3600000
  )
    throw new Error("COOLDOWN_ACTIVE");
  await tx
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.id, input.plan_id))
    .for("share");
  const [version] = await tx
    .select({ version: planVersions, status: plans.status })
    .from(planVersions)
    .innerJoin(plans, eq(plans.id, planVersions.planId))
    .where(
      and(
        eq(planVersions.planId, input.plan_id),
        eq(planVersions.assetId, asset.id),
        eq(planVersions.active, true),
        eq(plans.status, "active"),
      ),
    )
    .limit(1);
  if (!version) throw new Error("PLAN_UNAVAILABLE");
  const [wallet] = await tx
    .select()
    .from(walletLinks)
    .where(
      and(
        eq(walletLinks.userId, userId),
        eq(walletLinks.environment, environment),
        eq(walletLinks.chainId, registry.network),
      ),
    )
    .limit(1);
  if (!wallet || (wallet.coolingUntil && wallet.coolingUntil > now))
    throw new Error("INVALID_ADDRESS");
  const treasury = await platformAddress(registry, "RECEIVING");
  if ((await (await adapter(registry)).normalizeAddress(wallet.address)) === treasury) throw new Error("SELF_TRANSFER_NOT_ALLOWED");
  const config = await financialConfiguration(tx, registry);
  // Expiration closes checkout eligibility, never the ability to account for a
  // later transfer. Submitted invoices remain under observation.
  await tx.update(cryptoInvoices).set({status:"expired"}).where(and(
    eq(cryptoInvoices.userId,userId),eq(cryptoInvoices.status,"quoted"),
    sql`${cryptoInvoices.expiresAt}<=${now.toISOString()}::timestamptz`,
    sql`not (${walletSendPending(cryptoInvoices.id)})`,
    sql`not exists(select 1 from ${cryptoSubmissions} s where s.invoice_id=${cryptoInvoices.id})`,
  ));
  const [openInvoice] = await tx.select().from(cryptoInvoices).where(and(
    eq(cryptoInvoices.userId,userId),eq(cryptoInvoices.planVersionId,version.version.id),
    inArray(cryptoInvoices.status,["quoted","submitted"]),
  )).limit(1);
  if(openInvoice){
    if((await tx.execute<{pending:boolean}>(sql`select ${walletSendPending(openInvoice.id)} as pending`))[0].pending)throw new Error("BROADCAST_AMBIGUOUS");
    if(openInvoice.status==="submitted")throw new Error("ACTIVE_INVOICE_EXISTS");
    if(openInvoice.sessionGeneration===generation&&openInvoice.walletId===wallet.id&&openInvoice.walletRevision===wallet.revision){
      await tx.insert(operationKeys).values({businessKey:aliasKey,requestHash:digest,result:{invoice_id:openInvoice.id}});return openInvoice;
    }
    await tx.update(cryptoInvoices).set({status:"cancelled"}).where(eq(cryptoInvoices.id,openInvoice.id));
  }
  const created=(
    await tx
      .insert(cryptoInvoices)
      .values({
        profileRevision:manifest.profile_revision,
        userId,
        planVersionId: version.version.id,
        assetId: asset.id,
        requestKey: key,
        sessionGeneration: generation,
        walletId: wallet.id,
        walletRevision: wallet.revision,
        environment,
        chain: registry.chain,
        registryHash: config.registryHash,
        registrySnapshot: registry,
        treasury,
        sender: wallet.address,
        expectedBaseUnits: version.version.amountBaseUnits,
        usdReference: version.version.usdReference,
        expiresAt: new Date(now.getTime() + manifest.quote_ttl_minutes * 60000),
      })
      .returning()
  )[0];
  await tx.insert(operationKeys).values({businessKey:aliasKey,requestHash:digest,result:{invoice_id:created.id}});
  return created;
}
export async function verifyCryptoDeposit(
  tx: DbExecutor,
  userId: string,
  input: z.infer<typeof cryptoSubmission>,
) {
  const environment=await financialEnvironmentIn(tx);
  const [lookup] = await tx
    .select()
    .from(cryptoInvoices)
    .where(
      and(
        eq(cryptoInvoices.id, input.invoice_id),
        eq(cryptoInvoices.userId, userId),
      ),
    )
    .limit(1);
  if (!lookup) throw new Error("NOT_FOUND");
  const { user } = await lockGiftParticipants(
    tx,
    userId,
    await readManifest(tx),
  );
  const [invoice] = await tx
    .select()
    .from(cryptoInvoices)
    .where(eq(cryptoInvoices.id, lookup.id))
    .for("update");
  const [asset] = await tx
    .select()
    .from(assets)
    .where(eq(assets.id, invoice.assetId))
    .limit(1);
  input = {
    ...input,
    tx_hash: canonicalTransactionHash(
      invoice.chain as AssetRegistry["chain"],
      input.tx_hash,
    ),
  };
  const registry = invoice.registrySnapshot as AssetRegistry;
  const [prior] = await tx
    .select()
    .from(cryptoEvents)
    .where(
      and(
        eq(cryptoEvents.environment, environment),
        eq(cryptoEvents.chain, registry.chain),
        eq(cryptoEvents.txHash, input.tx_hash),
        input.event_index >= 0
          ? eq(cryptoEvents.eventIndex, input.event_index)
          : undefined,
        eq(cryptoEvents.assetId, asset.id),
      ),
    )
    .limit(1);
  if (prior) {
    if (prior.invoiceId !== invoice.id) throw new Error("VERSION_CONFLICT");
    return prior;
  }
  const chain = await adapter(registry);
  if (input.event_index === -1) {
    const index = await chain.findTransferIndex(
      input.tx_hash,
      invoice.sender,
      invoice.treasury,
    );
    if (index === undefined) return { status: "pending", hash: input.tx_hash };
    input = { ...input, event_index: index };
  }
  const proof = await chain.verifyTransfer({
    asset: registry,
    hash: input.tx_hash,
    index: input.event_index,
    sender: invoice.sender,
    destination: invoice.treasury,
  });
  if (proof.state !== "confirmed" || proof.contradiction)
    return { status: "pending", hash: input.tx_hash };
  if (
    proof.amount === undefined ||
    proof.amount <= 0n ||
    !proof.blockHash ||
    proof.height === undefined
  )
    throw new Error("INVALID_PROOF");
  const claimKey = `chain-event:${environment}:${registry.chain}:${registry.network}:${input.tx_hash}:${input.event_index}:${asset.id}`,
    claimHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ purpose: "invoice", invoice_id: invoice.id }))
      .digest("hex");
  const claimed = await tx
    .insert(operationKeys)
    .values({
      businessKey: claimKey,
      requestHash: claimHash,
      result: { purpose: "invoice", invoice_id: invoice.id },
    })
    .onConflictDoNothing()
    .returning();
  if (!claimed.length) throw new Error("TRANSFER_ALREADY_ALLOCATED");
  const config = await financialConfiguration(tx, registry);
  const registryMatches = config.registryHash === invoice.registryHash;
  const [clock] = await tx.execute<{
    now: Date;
  }>(sql`select clock_timestamp() as now`);
  const now = new Date(clock.now),
    expected = BigInt(invoice.expectedBaseUnits);
  const [submission] = await tx
    .select()
    .from(cryptoSubmissions)
    .where(
      and(
        eq(cryptoSubmissions.invoiceId, invoice.id),
        eq(cryptoSubmissions.txHash, input.tx_hash),
        sql`${cryptoSubmissions.eventIndex} in (-1,${input.event_index})`,
      ),
    )
    .limit(1);
  const late = !submission || submission.firstSeenAt > invoice.expiresAt;
  let eligible =
    ["quoted", "submitted"].includes(invoice.status) &&
    registryMatches &&
    user.status === "active" &&
    proof.amount >= expected &&
    !late;
  const eventId = crypto.randomUUID();
  await tx.insert(cryptoEvents).values({
    id: eventId,
    invoiceId: invoice.id,
    assetId: asset.id,
    environment,
    chain: registry.chain,
    txHash: input.tx_hash,
    eventIndex: input.event_index,
    amountBaseUnits: proof.amount.toString(),
    sender: proof.sender!,
    destination: proof.destination!,
    blockHash: proof.blockHash,
    blockHeight: proof.height.toString(),
    status: eligible ? "confirmed" : "exception",
  });
  const cash = await account(
      tx,
      asset.id,
      "system",
      null,
      "treasury_asset",
      "debit",
    ),
    source = await account(
      tx,
      asset.id,
      "user",
      userId,
      eligible ? "available_payable" : "refund_payable",
      "credit",
    );
  await postJournal(
    tx,
    "CHAIN_IN",
    `in:${environment}:${registry.chain}:${input.tx_hash}:${input.event_index}:${asset.id}`,
    [
      { accountId: cash.id, direction: "debit", amount: proof.amount },
      { accountId: source.id, direction: "credit", amount: proof.amount },
    ],
    { invoice_id: invoice.id, event_id: eventId, environment },
  );
  if (eligible) {
    await tx.execute(sql.raw("SAVEPOINT crypto_admission"));
    try {
      if (proof.amount > expected) {
        const refund = await account(
          tx,
          asset.id,
          "user",
          userId,
          "refund_payable",
          "credit",
        );
        await postJournal(
          tx,
          "SURPLUS_HOLD",
          `overpayment:${eventId}`,
          [
            {
              accountId: source.id,
              direction: "debit",
              amount: proof.amount - expected,
            },
            {
              accountId: refund.id,
              direction: "credit",
              amount: proof.amount - expected,
            },
          ],
          { event_id: eventId },
        );
      }
      const [version] = await tx
        .select()
        .from(planVersions)
        .where(eq(planVersions.id, invoice.planVersionId))
        .limit(1);
      await sendGift(tx,user,version.planId,eventId,version.id,asset,invoice.status==='submitted'&&invoice.profileRevision<(await readManifest(tx)).profile_revision);
      await tx
        .update(cryptoEvents)
        .set({ status: "credited" })
        .where(eq(cryptoEvents.id, eventId));
      await tx.execute(sql.raw("SET CONSTRAINTS ALL IMMEDIATE"));
      await tx.execute(sql.raw("SET CONSTRAINTS ALL DEFERRED"));
      await tx.execute(sql.raw("RELEASE SAVEPOINT crypto_admission"));
    } catch {
      await tx.execute(sql.raw("ROLLBACK TO SAVEPOINT crypto_admission"));
      await tx.execute(sql.raw("RELEASE SAVEPOINT crypto_admission"));
      eligible = false;
      const refund = await account(
        tx,
        asset.id,
        "user",
        userId,
        "refund_payable",
        "credit",
      );
      await postJournal(
        tx,
        "REFUND_HOLD",
        `admission-refund:${eventId}`,
        [
          { accountId: source.id, direction: "debit", amount: proof.amount },
          { accountId: refund.id, direction: "credit", amount: proof.amount },
        ],
        { event_id: eventId, reason: "ADMISSION_UNAVAILABLE" },
      );
      await tx
        .update(cryptoEvents)
        .set({ status: "exception" })
        .where(eq(cryptoEvents.id, eventId));
    }
  }
  await tx
    .update(cryptoInvoices)
    .set({ status: eligible ? "credited" : "exception" })
    .where(eq(cryptoInvoices.id, invoice.id));
  return {
    event_id: eventId,
    status: eligible ? "credited" : "exception",
    amount_base_units: proof.amount.toString(),
  };
}
export async function submitCryptoDeposit(
  tx: DbExecutor,
  userId: string,
  input: z.infer<typeof cryptoSubmission>,
) {
  await financialEnvironmentIn(tx);
  await lockUser(tx, userId);
  const [invoice] = await tx
    .select()
    .from(cryptoInvoices)
    .where(
      and(
        eq(cryptoInvoices.id, input.invoice_id),
        eq(cryptoInvoices.userId, userId),
      ),
    )
    .for("update");
  if (!invoice) throw new Error("NOT_FOUND");
  input = {
    ...input,
    tx_hash: canonicalTransactionHash(
      invoice.chain as AssetRegistry["chain"],
      input.tx_hash,
    ),
  };
  const [old] = await tx
    .select()
    .from(cryptoSubmissions)
    .where(
      and(
        eq(cryptoSubmissions.invoiceId, invoice.id),
        eq(cryptoSubmissions.txHash, input.tx_hash),
        eq(cryptoSubmissions.eventIndex, input.event_index),
      ),
    )
    .limit(1);
  if (old) return { id: old.id, status: "submitted" };
  if (!["quoted", "submitted", "expired", "cancelled"].includes(invoice.status))throw new Error("VERSION_CONFLICT");
  const [counts] = await tx
    .select({ count: sql<string>`count(*)::text` })
    .from(cryptoSubmissions)
    .where(eq(cryptoSubmissions.invoiceId, invoice.id));
  if (BigInt(counts.count) >= 5n) throw new Error("RATE_LIMITED");
  const [row] = await tx
    .insert(cryptoSubmissions)
    .values({
      invoiceId: invoice.id,
      txHash: input.tx_hash,
      eventIndex: input.event_index,
    })
    .returning();
  if(["quoted","submitted"].includes(invoice.status))await tx
    .update(cryptoInvoices)
    .set({ status: "submitted" })
    .where(eq(cryptoInvoices.id, invoice.id));
  await enqueueObservation(tx, { user_id: userId, ...input, round: 0 });
  return {
    id: row.id,
    status: "submitted",
    first_seen_at: row.firstSeenAt.toISOString(),
  };
}
/** Cancelling an unsubmitted quote grants no authority over late chain funds. */
export async function cancelNativeInvoice(tx:DbExecutor,userId:string,id:string){
 await financialEnvironmentIn(tx);await lockUser(tx,userId);
 const [invoice]=await tx.select().from(cryptoInvoices).where(and(eq(cryptoInvoices.id,id),eq(cryptoInvoices.userId,userId))).for("update");
 if(!invoice)throw new Error("NOT_FOUND");
 if(["cancelled","expired"].includes(invoice.status))return {id,status:invoice.status};
 const [submitted]=await tx.select({id:cryptoSubmissions.id}).from(cryptoSubmissions).where(eq(cryptoSubmissions.invoiceId,id)).limit(1);
 if((await tx.execute<{pending:boolean}>(sql`select ${walletSendPending(id)} as pending`))[0].pending)throw new Error("BROADCAST_AMBIGUOUS");
 if(invoice.status!=="quoted"||submitted)throw new Error("FINANCIAL_SAFETY_PAUSE");
 await tx.update(cryptoInvoices).set({status:"cancelled"}).where(eq(cryptoInvoices.id,id));
 return {id,status:"cancelled"};
}
