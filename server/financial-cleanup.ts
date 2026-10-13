import { and, asc, eq, sql } from "drizzle-orm";
import {
  recoveryViewCaps,
  botChallenges,
  botTokenUses,
  abuseSignals,
  walletChallenges,
  workerRequests,
  type DbExecutor,
} from "@gifters/db";
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
  const uses = await tx
    .select({ id: botTokenUses.tokenHash })
    .from(botTokenUses)
    .where(sql`${botTokenUses.expiresAt}<=clock_timestamp()`)
    .orderBy(asc(botTokenUses.expiresAt))
    .limit(50)
    .for("update", { skipLocked: true });
  for (const row of uses)
    deleted += (
      await tx
        .delete(botTokenUses)
        .where(eq(botTokenUses.tokenHash, row.id))
        .returning()
    ).length;
  const challenges = await tx
    .select({ id: botChallenges.id })
    .from(botChallenges)
    .where(
      sql`${botChallenges.expiresAt}<=clock_timestamp() and not exists(select 1 from ${botTokenUses} where ${botTokenUses.challengeId}=${botChallenges.id})`,
    )
    .orderBy(asc(botChallenges.expiresAt))
    .limit(50)
    .for("update", { skipLocked: true });
  for (const row of challenges)
    deleted += (
      await tx
        .delete(botChallenges)
        .where(eq(botChallenges.id, row.id))
        .returning()
    ).length;
  const signals = await tx
    .select({ id: abuseSignals.id })
    .from(abuseSignals)
    .where(sql`${abuseSignals.createdAt}<=clock_timestamp()-interval '7 days'`)
    .orderBy(asc(abuseSignals.createdAt))
    .limit(50)
    .for("update", { skipLocked: true });
  for (const row of signals)
    deleted += (
      await tx
        .delete(abuseSignals)
        .where(eq(abuseSignals.id, row.id))
        .returning()
    ).length;
  const caps = await tx
    .select({ id: recoveryViewCaps.id })
    .from(recoveryViewCaps)
    .where(sql`${recoveryViewCaps.expiresAt}<=clock_timestamp()`)
    .orderBy(asc(recoveryViewCaps.expiresAt))
    .limit(50)
    .for("update", { skipLocked: true });
  for (const row of caps)
    deleted += (
      await tx
        .delete(recoveryViewCaps)
        .where(eq(recoveryViewCaps.id, row.id))
        .returning()
    ).length;
  return { deleted, held: false };
}
