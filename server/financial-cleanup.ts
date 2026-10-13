import { and, asc, eq, sql } from "drizzle-orm";
import { walletChallenges, workerRequests, type DbExecutor } from "@gifters/db";
import { operationalRetentionHeld } from "./maintenance";
export async function cleanupFinancialEphemeral(tx: DbExecutor) {
  if (operationalRetentionHeld()) return { deleted: 0, held: true };
  let deleted = 0;
  for (const table of [walletChallenges, workerRequests]) {
    const ids = await tx
      .select({
        id:
          table === walletChallenges
            ? walletChallenges.id
            : workerRequests.nonce,
      })
      .from(table)
      .where(sql`${table.expiresAt}<=clock_timestamp()`)
      .orderBy(asc(table.expiresAt))
      .limit(50)
      .for("update", { skipLocked: true });
    for (const row of ids) {
      const removed = await tx
        .delete(table)
        .where(
          and(
            table === walletChallenges
              ? eq(walletChallenges.id, row.id)
              : eq(workerRequests.nonce, row.id),
            sql`${table.expiresAt}<=clock_timestamp()`,
          ),
        )
        .returning();
      deleted += removed.length;
    }
  }
  return { deleted, held: false };
}
