import {transparentStatisticsSnapshot} from './activity';
import { eq, sql } from "drizzle-orm";
import {
  publicStatistics,
  users,
  userIdentities,
  withdrawals,
  assets,
  cryptoObligations,
  readManifest,
  withContext,
  type DbExecutor,
} from "@gifters/db";
const environment = () =>
  process.env.APP_ENV === "testnet" ? "testnet" : "simulation";
const projection = (row: typeof publicStatistics.$inferSelect) => ({
  environment: row.environment,profile_revision:row.profileRevision,verified_only:row.verifiedOnly,
  consented_members: row.members.toString(),
  pending_registrations: row.pendingRegistrations.toString(),
  settled_member_usd: row.settledMemberUsd,
  observed_at: row.observedAt.toISOString(),
});
export async function statisticsSnapshot(tx: DbExecutor) {
  const policy = await readManifest(tx),
    scope = environment();
  if (!policy.public_stats_policy.enabled)
    return { enabled: false, environment: scope };
  if(policy.deployment_profile==='transparent')return transparentStatisticsSnapshot(tx,policy);
  await tx.execute(sql`set local statement_timeout='5000ms'`);
  const [cached] = await tx
    .select()
    .from(publicStatistics)
    .where(eq(publicStatistics.environment, scope))
    .limit(1);
  const [clock] = await tx.execute<{ now: Date }>(
    sql`select clock_timestamp() as now`,
  );
  if (cached && !cached.verifiedOnly && cached.profileRevision===policy.profile_revision && cached.expiresAt > new Date(clock.now))
    return { enabled: true, stale: false, ...projection(cached) };
  const [refresh] = await tx.execute<{ acquired: boolean }>(
    sql`select pg_try_advisory_xact_lock(hashtextextended(${`public-statistics:${scope}`},0)) as acquired`,
  );
  if (!refresh.acquired) return cached
    ? { enabled: true, stale: true, ...projection(cached) }
    : { enabled: true, environment: scope, pending: true };
  const [again] = await tx
    .select()
    .from(publicStatistics)
    .where(eq(publicStatistics.environment, scope))
    .limit(1);
  if (again && !again.verifiedOnly && again.profileRevision===policy.profile_revision && again.expiresAt > new Date(clock.now))
    return { enabled: true, stale: false, ...projection(again) };
  const belongs =
    scope === "simulation"
      ? sql`true`
      : sql`exists(select 1 from ${userIdentities} i where i.user_id=${users.id} and i.provider='google')`;
  const [counts] = await tx
    .select({
      members: sql<string>`count(*) filter(where ${users.consentedAt} is not null and ${users.status}<>'deleted')::text`,
      pending: sql<string>`count(*) filter(where ${users.consentedAt} is null and ${users.status}='pending_consent')::text`,
    })
    .from(users)
    .where(belongs);
  const [paid] =
    scope === "simulation"
      ? await tx
          .select({
            usd: sql<string>`coalesce(sum(${withdrawals.netBaseUnits}/power(10::numeric,${assets.decimals})),0)::text`,
          })
          .from(withdrawals)
          .innerJoin(assets, eq(assets.id, withdrawals.assetId))
          .where(
            sql`${withdrawals.status}='settled' and ${assets.environment}='simulation' and ${assets.symbol}='GIV'`,
          )
      : await tx
          .select({
            usd: sql<string>`coalesce(sum(${cryptoObligations.netBaseUnits}/power(10::numeric,${assets.decimals})*(${cryptoObligations.rateSnapshot}->>'assetUsd')::numeric),0)::text`,
          })
          .from(cryptoObligations)
          .innerJoin(assets, eq(assets.id, cryptoObligations.assetId))
          .where(
            sql`${cryptoObligations.environment}='testnet' and ${cryptoObligations.status}='settled' and ${cryptoObligations.userId} is not null and ${cryptoObligations.kind} in ('withdrawal','recovery')`,
          );
  const value = {
    environment: scope,profileRevision:policy.profile_revision,verifiedOnly:false,
    members: BigInt(counts.members),
    pendingRegistrations: BigInt(counts.pending),
    settledMemberUsd: paid.usd,
    observedAt: new Date(clock.now),
    expiresAt: new Date(
      new Date(clock.now).getTime() +
        policy.public_stats_policy.refresh_hours * 3600000,
    ),
  };
  const [row] = await tx
    .insert(publicStatistics)
    .values(value)
    .onConflictDoUpdate({ target: publicStatistics.environment, set: value })
    .returning();
  return { enabled: true, stale: false, ...projection(row) };
}
export const publicStatisticsRead = () =>
  withContext({ access: "service" }, statisticsSnapshot);
