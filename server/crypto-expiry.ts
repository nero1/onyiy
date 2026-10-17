import { eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import {
  signedAttemptStatus,
  cryptoObligations,
  operationKeys,
  type DbExecutor,
} from "@gifters/db";
import type { AssetRegistry } from "@gifters/chains";
import { adapter, financialEnvironmentIn } from "./financial-config";
import { lockUser } from "./core";
export async function verifySignedExpiry(tx: DbExecutor, attemptId: string) {
  await financialEnvironmentIn(tx);
  const [attempt] = await tx
    .select()
    .from(signedAttemptStatus)
    .where(eq(signedAttemptStatus.id, attemptId))
    .limit(1);
  if (!attempt) throw new Error("NOT_FOUND");
  const [lookup] = await tx
    .select()
    .from(cryptoObligations)
    .where(eq(cryptoObligations.id, attempt.obligationId))
    .limit(1);
  if (!lookup) throw new Error("NOT_FOUND");
  if (lookup.userId) await lockUser(tx, lookup.userId);
  const [row] = await tx
    .select()
    .from(cryptoObligations)
    .where(eq(cryptoObligations.id, lookup.id))
    .for("update");
  if (
    !["signing", "broadcast", "exception"].includes(row.status) ||
    row.completedAt
  )
    throw new Error("VERSION_CONFLICT");
  const chain = await adapter(row.registrySnapshot as AssetRegistry);
  if (
    !chain.proveExpiry ||
    !(await chain.proveExpiry(attempt.txHash, {
      lastValidHeight:
        attempt.validUntilHeight === null
          ? undefined
          : BigInt(attempt.validUntilHeight),
      expiresAt: attempt.expiresAt ?? undefined,
    }))
  )
    return { status: "pending" };
  const result = {
    status: "expiry_verified",
    attempt_id: attempt.id,
    obligation_id: row.id,
  };
  await tx
    .insert(operationKeys)
    .values({
      businessKey: `crypto-expiry:${attempt.id}`,
      requestHash: crypto
        .createHash("sha256")
        .update(JSON.stringify(result))
        .digest("hex"),
      result,
    })
    .onConflictDoNothing();
  const [recorded]=await tx.execute<{recorded:boolean}>(sql`select public.gw_record_verified_expiry(${attempt.id}::uuid) as recorded`);
  if(!recorded?.recorded)throw new Error('VERSION_CONFLICT');
  if (row.status !== "exception")
    await tx
      .update(cryptoObligations)
      .set({ status: "exception" })
      .where(eq(cryptoObligations.id, row.id));
  return { ...result, attempt_state: "expired" };
}
