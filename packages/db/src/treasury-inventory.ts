import { and, asc, eq, gt, sql } from "drizzle-orm";
import { treasuryAddresses, type DbExecutor } from "./index";
import crypto from "node:crypto";

export function treasuryFingerprint(asset: {environment:string;chain:string;network:string}, address: string) {
  return crypto.createHash("sha256")
    .update([asset.environment, asset.chain, asset.network, address].join("|"))
    .digest("hex");
}

/** Immutable financial provenance, including expired invoices: expiry does not
 * prove that a previously published receiving address can no longer get funds.
 * Source triggers preserve one indexed row per asset/address before archival. No history is retired by
 * observing a zero balance or by changing the deployment's current address. */
export async function treasuryInventory(
  tx: DbExecutor,
  assetId: string,
  after?: string,
  limit = 100,
) {
  const sources = treasuryAddresses;
  return tx.select({ address: sources.address }).from(sources)
    .where(and(eq(sources.assetId,assetId),after === undefined ? undefined : gt(sources.address, after)))
    .orderBy(asc(sources.address)).limit(Math.min(Math.max(limit, 1), 101));
}

/** Claim the least recently attempted address in a short transaction. Failed
 * RPC observations still advance the attempt cursor, so one failure cannot
 * starve other addresses; the failed address returns on the next rotation. */
export async function monitoringTreasury(tx: DbExecutor, assetId: string, current: string) {
  const [row]=await tx.execute<{address:string|null;historical_count:string}>(sql`select address,historical_count::text from public.gw_next_treasury_monitor(${assetId}::uuid,${current})`);
  if(!row||row.historical_count!=='0'&&row.address===null)throw new Error("OBSERVATION_UNAVAILABLE");
  return row;
}

export async function assertKnownTreasury(tx: DbExecutor, assetId: string, address: string) {
  const [row]=await tx.select({address:treasuryAddresses.address}).from(treasuryAddresses)
    .where(and(eq(treasuryAddresses.assetId,assetId),eq(treasuryAddresses.address,address))).limit(1);
  if(!row)throw new Error("INVALID_PROOF");
}
