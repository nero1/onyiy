import {and,desc,eq,inArray,sql} from 'drizzle-orm';
import {cycles,planVersions,assets,readManifest,type DbExecutor} from '@gifters/db';
/** Advisory reads cover current rights, independently of display-history pages.
 * Writes still repeat all eligibility checks under their existing locks. */
export async function nativeGiftReadiness(tx:DbExecutor,userId:string,environment:'testnet'|'mainnet'){
 const policy=await readManifest(tx);
 const [clock]=await tx.execute<{now:Date}>(sql`select clock_timestamp() as now`);
 const open=await tx.select({plan_id:planVersions.planId,asset_id:planVersions.assetId}).from(cycles).innerJoin(planVersions,eq(planVersions.id,cycles.planVersionId)).where(and(eq(cycles.userId,userId),inArray(cycles.status,['active','exception']))).limit(801);
 const hours=policy.cycle_rejoin_cooldown_hours;
 const cooldowns=hours===0?[]:await tx.select({plan_id:planVersions.planId,asset_id:planVersions.assetId,until:sql<string>`(max(${cycles.completedAt})+${hours}*interval '1 hour')::text`}).from(cycles).innerJoin(planVersions,eq(planVersions.id,cycles.planVersionId)).innerJoin(assets,eq(assets.id,planVersions.assetId)).where(and(eq(cycles.userId,userId),eq(assets.environment,environment),eq(cycles.status,'completed'),sql`${cycles.completedAt}>${new Date(clock.now).toISOString()}::timestamptz-${hours}*interval '1 hour'`)).groupBy(planVersions.planId,planVersions.assetId).orderBy(desc(sql`max(${cycles.completedAt})`)).limit(801);
 return {complete:open.length<=800&&cooldowns.length<=800,profile_revision:policy.profile_revision,observed_at:new Date(clock.now).toISOString(),active:open,cooldowns:cooldowns.map(row=>({...row,until:new Date(row.until).toISOString()})),concurrent_limit_reached:policy.cycle_max_concurrent>0&&open.length>=policy.cycle_max_concurrent};
}
