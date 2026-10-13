import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import {
  cryptoObligations,
  signedAttemptStatus,
  operationKeys,
  auditEvents,
  readManifest,
  type DbExecutor,
} from "@gifters/db";
import type { AssetRegistry } from "@gifters/chains";
import { adapter, assertFinancialEnvironment } from "./financial-config";
import { lockUser, account, postJournal } from "./core";
import { settleCryptoAttempt } from "./crypto-settlement";
import { verifySignedExpiry } from "./crypto-expiry";
/** Business and original-sender refunds preserve their full principal. Platform
 * gas is independently booked once; ambiguous signed lineage never releases. */
export async function recoverOperationalObligation(
  tx: DbExecutor,
  actorId: string,
  id: string,
  reason: string,
) {
  assertFinancialEnvironment();
  const [lookup] = await tx
    .select()
    .from(cryptoObligations)
    .where(eq(cryptoObligations.id, id))
    .limit(1);
  if (!lookup || !["business", "refund", "unallocated_refund"].includes(lookup.kind))
    throw new Error("NOT_FOUND");
  for (const userId of [
    ...new Set([actorId, ...(lookup.userId ? [lookup.userId] : [])]),
  ].sort())
    await lockUser(tx, userId);
  const actor = await lockUser(tx, actorId);
  if (
    actor.role !== "admin" ||
    actor.status !== "active" ||
    !(await readManifest(tx)).feature_admin
  )
    throw new Error("FORBIDDEN");
  const [row] = await tx
      .select()
      .from(cryptoObligations)
      .where(eq(cryptoObligations.id, id))
      .for("update"),
    key = `crypto-operational-recovery:${id}`,
    hash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ actorId, id, reason }))
      .digest("hex"),
    [old] = await tx
      .select()
      .from(operationKeys)
      .where(eq(operationKeys.businessKey, key))
      .limit(1);
  if (old) {
    if (old.requestHash !== hash) throw new Error("VERSION_CONFLICT");
    return old.result;
  }
  if (
    row.completedAt ||
    row.status === "settled" ||
    row.chargeBaseUnits !== "0"
  )
    throw new Error("FINANCIAL_SAFETY_PAUSE");
  const attempts = await tx
      .select()
      .from(signedAttemptStatus)
      .where(eq(signedAttemptStatus.obligationId, id))
      .limit(20),
    chain = await adapter(row.registrySnapshot as AssetRegistry),
    proofs: { id: string; state: string; hash: string }[] = [];
  for (const attempt of attempts) {
    if (attempt.status === "superseded") {
      proofs.push({
        id: attempt.id,
        state: "superseded",
        hash: crypto.createHash("sha256").update(attempt.txHash).digest("hex"),
      });
      continue;
    }
    const evidence = await chain.verifyTransfer({
      asset: row.registrySnapshot as AssetRegistry,
      hash: attempt.txHash,
      index: 0,
      sender: row.treasurySender!,
      destination: row.destination,
      amount: BigInt(row.netBaseUnits),
    });
    if (evidence.state === "failed" && !evidence.contradiction) {
      await settleCryptoAttempt(tx, attempt.id, 0);
      proofs.push({
        id: attempt.id,
        state: "failed",
        hash: crypto
          .createHash("sha256")
          .update(
            JSON.stringify(evidence, (_, v) =>
              typeof v === "bigint" ? v.toString() : v,
            ),
          )
          .digest("hex"),
      });
      continue;
    }
    if ((await verifySignedExpiry(tx, attempt.id)).status !== "expiry_verified")
      throw new Error("FINANCIAL_SAFETY_PAUSE");
    proofs.push({
      id: attempt.id,
      state: "expired",
      hash: crypto.createHash("sha256").update(attempt.txHash).digest("hex"),
    });
  }
  if (
    ![
      "held",
      "approved",
      "signing",
      "broadcast",
      "awaiting_requote",
      "exception",
    ].includes(row.status)
  )
    throw new Error("VERSION_CONFLICT");
  const held = await account(
      tx,
      row.assetId,
      row.userId ? "user" : "platform",
      row.userId,
      "held_payable",
      "credit",
    ),
    source = await account(
      tx,
      row.assetId,
      row.kind === "unallocated_refund" ? "system" : row.userId ? "user" : "platform",
      row.userId,
      row.sourcePurpose,
      "credit",
    ),
    amount = BigInt(row.grossBaseUnits);
  await postJournal(
    tx,
    "OPERATIONAL_HOLD_RELEASE",
    `crypto-operational-release:${id}`,
    [
      { accountId: held.id, direction: "debit", amount },
      { accountId: source.id, direction: "credit", amount },
    ],
    { obligation_id: id, kind: row.kind },
  );
  const result = {
    obligation_id: id,
    status: attempts.length ? "failed_closed" : "cancelled",
    attempts: proofs,
  };
  await tx
    .insert(operationKeys)
    .values({ businessKey: key, requestHash: hash, result });
  await tx
    .update(cryptoObligations)
    .set({
      status: attempts.length ? "exception" : "cancelled",
      completedAt: sql`clock_timestamp()`,
    })
    .where(eq(cryptoObligations.id, id));
  await tx
    .insert(auditEvents)
    .values({
      actorUserId: actorId,
      action: "native.operational.recover",
      targetType: "crypto_obligation",
      targetId: id,
      reason,
      afterState: { status: result.status, full_principal_returned: true },
    });
  return result;
}
