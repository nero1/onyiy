import crypto from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  cryptoEvents,
  cryptoInvoices,
  cryptoReorgReviews,
  cryptoReorgResolutions,
  users,
  readManifest,
  operationKeys,
  receiptAllocations,
  pointEvents,
  auditEvents,
  type DbExecutor,
} from "@gifters/db";
import type { AssetRegistry, TransferEvidence } from "@gifters/chains";
import { adapter, assertFinancialEnvironment } from "./financial-config";
import { account, postJournal } from "./core";
import { enqueueNotification } from "./jobs";
const digest = (value: unknown) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify(value, (_, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    )
    .digest("hex");
export const nativeReviewInput = z
  .object({
    event_id: z.string().uuid(),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
export const nativeResolutionInput = z
  .object({
    review_id: z.string().uuid(),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
async function staff(tx: DbExecutor, actorId: string) {
  assertFinancialEnvironment();
  const [actor] = await tx
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);
  if (
    actor?.role !== "admin" ||
    actor.status !== "active" ||
    !(await readManifest(tx)).feature_admin
  )
    throw new Error("FORBIDDEN");
}
async function prior(tx: DbExecutor, key: string, input: unknown) {
  const hash = digest(input),
    [old] = await tx
      .select()
      .from(operationKeys)
      .where(eq(operationKeys.businessKey, key))
      .limit(1);
  if (old && old.requestHash !== hash) throw new Error("VERSION_CONFLICT");
  return { hash, result: old?.result };
}
async function source(tx: DbExecutor, eventId: string) {
  const [row] = await tx
    .select({ event: cryptoEvents, invoice: cryptoInvoices })
    .from(cryptoEvents)
    .innerJoin(cryptoInvoices, eq(cryptoInvoices.id, cryptoEvents.invoiceId))
    .where(eq(cryptoEvents.id, eventId))
    .limit(1);
  if (!row) throw new Error("NOT_FOUND");
  const registry = row.invoice.registrySnapshot as AssetRegistry,
    chain = await adapter(registry),
    expected = {
      asset: registry,
      hash: row.event.txHash,
      index: row.event.eventIndex,
      sender: row.event.sender,
      destination: row.event.destination,
      amount: BigInt(row.event.amountBaseUnits),
    };
  const [latest] = await tx
    .select({
      hash: cryptoReorgResolutions.blockHash,
      height: cryptoReorgResolutions.blockHeight,
    })
    .from(cryptoReorgReviews)
    .innerJoin(
      cryptoReorgResolutions,
      eq(cryptoReorgResolutions.reviewId, cryptoReorgReviews.id),
    )
    .where(eq(cryptoReorgReviews.eventId, eventId))
    .orderBy(desc(cryptoReorgReviews.revision))
    .limit(1);
  if (latest && !latest.height) throw new Error("FINANCIAL_SAFETY_PAUSE");
  return {
    ...row,
    chain,
    expected,
    anchorHash: latest?.hash ?? row.event.blockHash,
    anchorHeight: BigInt(latest?.height ?? row.event.blockHeight),
  };
}
function confirmed(proof: TransferEvidence) {
  return (
    proof.state === "confirmed" &&
    !proof.contradiction &&
    !!proof.blockHash &&
    proof.height !== undefined
  );
}
async function reversePoints(
  tx: DbExecutor,
  event: any,
  userId: string,
  reviewId: string,
  action: "invalidate" | "reconfirm",
) {
  if (action === "reconfirm") {
    const rows = await tx
      .select()
      .from(pointEvents)
      .where(eq(pointEvents.sourceKey, `native-reorg:${reviewId}:invalidate`));
    for (const row of rows)
      await tx
        .insert(pointEvents)
        .values({
          userId: row.userId,
          sourceKey: `native-reorg:${reviewId}:reconfirm`,
          awardType: "gift_reorg_reconfirm",
          points: -row.points,
        });
    return;
  }
  const [allocation] = await tx
    .select({ cycleId: receiptAllocations.sourceCycleId })
    .from(receiptAllocations)
    .where(
      eq(receiptAllocations.sourceOperationKey, `gift:${userId}:${event.id}`),
    )
    .limit(1);
  if (!allocation?.cycleId) return;
  const rows = await tx
    .select()
    .from(pointEvents)
    .where(eq(pointEvents.sourceKey, `gift:${allocation.cycleId}`));
  for (const row of rows)
    await tx
      .insert(pointEvents)
      .values({
        userId: row.userId,
        sourceKey: `native-reorg:${reviewId}:invalidate`,
        awardType: `gift_reorg_${row.awardType}`,
        points: -row.points,
      });
}
export async function recordNativeReorg(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof nativeReviewInput>,
  requestKey: string,
) {
  await staff(tx, actorId);
  const key = `native-reorg:${actorId}:${requestKey}`,
    payload = { action: "invalidate", ...input },
    old = await prior(tx, key, payload);
  if (old.result) return old.result;
  const row = await source(tx, input.event_id),
    proof = await row.chain.verifyTransfer(row.expected);
  if (confirmed(proof)) return { status: "still_confirmed" };
  // Positive finalized replacement of the original block is required. Missing
  // transaction or timeout alone cannot debit cash or freeze an asset.
  const block = await row.chain.getCanonicalBlock(row.anchorHeight);
  if (block.hash === row.anchorHash) throw new Error("INVALID_PROOF");
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('financial-policy',0))`,
  );
  const replay = await prior(tx, key, payload);
  if (replay.result) return replay.result;
  const [open] = await tx
    .select({ review: cryptoReorgReviews })
    .from(cryptoReorgReviews)
    .leftJoin(
      cryptoReorgResolutions,
      eq(cryptoReorgResolutions.reviewId, cryptoReorgReviews.id),
    )
    .where(
      and(
        eq(cryptoReorgReviews.eventId, row.event.id),
        isNull(cryptoReorgResolutions.reviewId),
      ),
    )
    .limit(1);
  let result: { review_id: string; status: string };
  if (open) result = { review_id: open.review.id, status: "review" };
  else {
    const [last] = await tx
        .select({ revision: cryptoReorgReviews.revision })
        .from(cryptoReorgReviews)
        .where(eq(cryptoReorgReviews.eventId, row.event.id))
        .orderBy(desc(cryptoReorgReviews.revision))
        .limit(1),
      id = crypto.randomUUID(),
      amount = BigInt(row.event.amountBaseUnits),
      cash = await account(
        tx,
        row.event.assetId,
        "system",
        null,
        "treasury_asset",
        "debit",
      ),
      loss = await account(
        tx,
        row.event.assetId,
        "system",
        null,
        "chain_loss_expense",
        "debit",
      );
    const journal = await postJournal(
      tx,
      "REORG_LOSS",
      `native-reorg:${id}:invalidate`,
      [
        { accountId: loss.id, direction: "debit", amount },
        { accountId: cash.id, direction: "credit", amount },
      ],
      {
        event_id: row.event.id,
        review_id: id,
        original_block_hash: row.event.blockHash,
      },
    );
    if (!journal) throw new Error("FINANCIAL_SAFETY_PAUSE");
    await tx
      .insert(cryptoReorgReviews)
      .values({
        id,
        eventId: row.event.id,
        assetId: row.event.assetId,
        revision: (last?.revision ?? 0) + 1,
        amountBaseUnits: amount.toString(),
        originalBlockHash: row.anchorHash,
        anchorHeight: row.anchorHeight.toString(),
        evidenceHash: digest({ block, proof }),
        lossJournalId: journal,
        reason: input.reason,
      });
    await reversePoints(tx, row.event, row.invoice.userId, id, "invalidate");
    await enqueueNotification(tx, `native-reorg:${id}:${row.invoice.userId}`, {
      user_id: row.invoice.userId,
      title_key: "financial_review",
      body: "A testnet incoming event is under chain review. Existing balances, holds and payout history are retained; new activity in this currency is paused.",
    });
    result = { review_id: id, status: "review" };
    await tx
      .insert(auditEvents)
      .values({
        actorUserId: actorId,
        action: "native.reorg.invalidate",
        targetType: "native_reorg_review",
        targetId: id,
        reason: input.reason,
        afterState: result,
      });
  }
  await tx
    .insert(operationKeys)
    .values({ businessKey: key, requestHash: old.hash, result });
  return result;
}
export async function reconfirmNativeReorg(
  tx: DbExecutor,
  actorId: string,
  input: z.infer<typeof nativeResolutionInput>,
  requestKey: string,
) {
  await staff(tx, actorId);
  const key = `native-reorg-resolution:${actorId}:${requestKey}`,
    payload = { action: "reconfirm", ...input },
    old = await prior(tx, key, payload);
  if (old.result) return old.result;
  const [review] = await tx
    .select()
    .from(cryptoReorgReviews)
    .where(eq(cryptoReorgReviews.id, input.review_id))
    .limit(1);
  if (!review) throw new Error("NOT_FOUND");
  const row = await source(tx, review.eventId),
    proof = await row.chain.verifyTransfer(row.expected);
  if (!confirmed(proof)) throw new Error("INVALID_PROOF");
  const block = await row.chain.getCanonicalBlock(proof.height!);
  if (block.hash !== proof.blockHash) throw new Error("INVALID_PROOF");
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('financial-policy',0))`,
  );
  const replay = await prior(tx, key, payload);
  if (replay.result) return replay.result;
  const [existing] = await tx
      .select()
      .from(cryptoReorgResolutions)
      .where(eq(cryptoReorgResolutions.reviewId, review.id))
      .limit(1),
    result = { review_id: review.id, status: "reconfirmed" };
  if (!existing) {
    const amount = BigInt(review.amountBaseUnits),
      cash = await account(
        tx,
        review.assetId,
        "system",
        null,
        "treasury_asset",
        "debit",
      ),
      loss = await account(
        tx,
        review.assetId,
        "system",
        null,
        "chain_loss_expense",
        "debit",
      ),
      journal = await postJournal(
        tx,
        "REORG_RECONFIRM",
        `native-reorg:${review.id}:reconfirm`,
        [
          { accountId: cash.id, direction: "debit", amount },
          { accountId: loss.id, direction: "credit", amount },
        ],
        { review_id: review.id, event_id: review.eventId },
      );
    if (!journal) throw new Error("FINANCIAL_SAFETY_PAUSE");
    await tx
      .insert(cryptoReorgResolutions)
      .values({
        reviewId: review.id,
        journalId: journal,
        blockHash: proof.blockHash!,
        blockHeight: proof.height!.toString(),
        evidenceHash: digest({ proof, block }),
        reason: input.reason,
      });
    await reversePoints(
      tx,
      row.event,
      row.invoice.userId,
      review.id,
      "reconfirm",
    );
    await tx
      .insert(auditEvents)
      .values({
        actorUserId: actorId,
        action: "native.reorg.reconfirm",
        targetType: "native_reorg_review",
        targetId: review.id,
        reason: input.reason,
        afterState: result,
      });
  }
  await tx
    .insert(operationKeys)
    .values({ businessKey: key, requestHash: old.hash, result });
  return result;
}
export async function nativeReorgHistory(tx: DbExecutor) {
  return tx
    .select({
      review_id: cryptoReorgReviews.id,
      event_id: cryptoReorgReviews.eventId,
      asset_id: cryptoReorgReviews.assetId,
      revision: cryptoReorgReviews.revision,
      amount_base_units: cryptoReorgReviews.amountBaseUnits,
      created_at: cryptoReorgReviews.createdAt,
      resolved_at: cryptoReorgResolutions.createdAt,
    })
    .from(cryptoReorgReviews)
    .leftJoin(
      cryptoReorgResolutions,
      eq(cryptoReorgResolutions.reviewId, cryptoReorgReviews.id),
    )
    .orderBy(desc(cryptoReorgReviews.createdAt), desc(cryptoReorgReviews.id))
    .limit(100);
}
