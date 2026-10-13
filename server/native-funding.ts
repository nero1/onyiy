import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  assets,
  cryptoEvents,
  nativeReserveInflows,
  operationKeys,
  auditEvents,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import { canonicalTransactionHash } from "@gifters/chains";
import {
  registryAsset,
  adapter,
  platformAddress,
  assertRegistryBinding,
  assertFinancialEnvironment,
} from "./financial-config";
import { lockUser, account, postJournal } from "./core";
export const nativeFundingInput = z
  .object({
    asset_key: z.string().max(30),
    tx_hash: z.string().min(20).max(128),
    event_index: z.number().int().min(0).max(1000),
    sender: z.string().max(100),
    signature: z.string().min(20).max(1000),
    reason: z.string().min(5).max(500),
  })
  .strict();
export async function nativeFundingStatement(
  tx: DbExecutor,
  actorId: string,
  input: Omit<z.infer<typeof nativeFundingInput>, "signature" | "reason">,
  requestKey: string,
) {
  assertFinancialEnvironment();
  const actor = await lockUser(tx, actorId);
  if (actor.role !== "admin" || actor.status !== "active")
    throw new Error("FORBIDDEN");
  const registry = registryAsset(input.asset_key);
  if (registry.kind !== "native") throw new Error("INVALID_INPUT");
  const chain = await adapter(registry),
    sender = await chain.normalizeAddress(input.sender),
    destination = await platformAddress(registry, "RECEIVING"),
    hash = canonicalTransactionHash(registry.chain, input.tx_hash),
    message = [
      "Gifters World operating reserve funding",
      "Environment: testnet",
      "Network: " + registry.network,
      "Asset: " + registry.key,
      "Source: " + sender,
      "Destination: " + destination,
      "Transfer: " + hash,
      "Event: " + input.event_index,
      "Actor: " + actorId,
      "Reference: " + requestKey,
      "I contributed this transfer to platform reserve. It grants no member balance.",
    ].join("\n");
  return { message, hash, sender, destination, registry, chain };
}
export async function bookNativeFunding(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof nativeFundingInput>,
  requestKey: string,
) {
  const statement = await nativeFundingStatement(
      tx,
      actorId,
      input,
      requestKey,
    ),
    { registry, chain, sender, destination, hash } = statement,
    policy = await readManifest(tx);
  if (!policy.feature_admin) throw new Error("FEATURE_DISABLED");
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
  const [existing] = await tx
    .select()
    .from(nativeReserveInflows)
    .where(
      and(
        eq(nativeReserveInflows.assetId, asset.id),
        eq(nativeReserveInflows.txHash, hash),
        eq(nativeReserveInflows.eventIndex, input.event_index),
      ),
    )
    .limit(1);
  if (existing) {
    if (existing.sender !== sender || existing.destination !== destination)
      throw new Error("VERSION_CONFLICT");
    return {
      id: existing.id,
      amount_base_units: existing.amountBaseUnits,
      status: "recorded",
    };
  }
  if (
    !(await chain.verifyOwnershipProof(
      sender,
      statement.message,
      input.signature,
    ))
  )
    throw new Error("INVALID_PROOF");
  const proof = await chain.verifyTransfer({
    asset: registry,
    hash,
    index: input.event_index,
    sender,
    destination,
  });
  if (proof.state !== "confirmed" || proof.contradiction)
    return { status: "pending", hash };
  if (
    proof.amount === undefined ||
    proof.amount <= 0n ||
    !proof.blockHash ||
    proof.height === undefined
  )
    throw new Error("INVALID_PROOF");
  const [invoiceEvent] = await tx
    .select({ id: cryptoEvents.id })
    .from(cryptoEvents)
    .where(
      and(
        eq(cryptoEvents.environment, "testnet"),
        eq(cryptoEvents.chain, registry.chain),
        eq(cryptoEvents.txHash, hash),
        eq(cryptoEvents.eventIndex, input.event_index),
        eq(cryptoEvents.assetId, asset.id),
      ),
    )
    .limit(1);
  if (invoiceEvent) throw new Error("TRANSFER_ALREADY_ALLOCATED");
  const key = `chain-event:testnet:${registry.chain}:${registry.network}:${hash}:${input.event_index}:${asset.id}`,
    digest = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({ purpose: "native_reserve", sender, destination }),
      )
      .digest("hex"),
    claimed = await tx
      .insert(operationKeys)
      .values({
        businessKey: key,
        requestHash: digest,
        result: { purpose: "native_reserve" },
      })
      .onConflictDoNothing()
      .returning();
  if (!claimed.length) throw new Error("TRANSFER_ALREADY_ALLOCATED");
  const cash = await account(
      tx,
      asset.id,
      "system",
      null,
      "treasury_asset",
      "debit",
    ),
    equity = await account(
      tx,
      asset.id,
      "platform",
      null,
      "paid_in_native_reserve",
      "credit",
    ),
    journal = await postJournal(
      tx,
      "NATIVE_TOPUP",
      `native-topup:${registry.chain}:${registry.network}:${hash}:${input.event_index}:${asset.id}`,
      [
        { accountId: cash.id, direction: "debit", amount: proof.amount },
        { accountId: equity.id, direction: "credit", amount: proof.amount },
      ],
      {
        chain: registry.chain,
        network: registry.network,
        hash,
        actor_id: actorId,
      },
    );
  if (!journal) throw new Error("VERSION_CONFLICT");
  const [row] = await tx
    .insert(nativeReserveInflows)
    .values({
      assetId: asset.id,
      actorUserId: actorId,
      environment: "testnet",
      chain: registry.chain,
      network: registry.network,
      txHash: hash,
      eventIndex: input.event_index,
      sender,
      destination,
      amountBaseUnits: proof.amount.toString(),
      blockHash: proof.blockHash,
      blockHeight: proof.height.toString(),
      statementHash: crypto
        .createHash("sha256")
        .update(statement.message)
        .digest("hex"),
      requestHash: digest,
      journalId: journal,
    })
    .returning();
  await tx
    .insert(auditEvents)
    .values({
      actorUserId: actorId,
      action: "crypto.native_topup",
      targetType: "inflow",
      targetId: row.id,
      reason: input.reason,
      afterState: {
        asset_id: asset.id,
        amount_base_units: row.amountBaseUnits,
      },
    });
  return {
    id: row.id,
    amount_base_units: row.amountBaseUnits,
    status: "recorded",
  };
}
