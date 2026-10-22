import crypto from 'node:crypto';
import {financialEnvironmentIn,operationalEnvironmentIn} from './financial-environment';
import { and, asc, eq, sql } from "drizzle-orm";
import {
  operationalAlerts,
  alertDeliveries,
  auditEvents,
  readManifest,
  withContext,
  type DbExecutor,
} from "@gifters/db";
import { readRegistry } from "@gifters/chains";
import {businessSettlementRoles} from '@gifters/domain';
import { holdBusinessSettlement } from "./crypto-business";
import { lockUser } from "./core";
import {applicationError} from './errors';
import {enqueueAlertDelivery,openFinancialAlert} from './financial-alerts';
/** At most 100 due reminders per invocation; each ordinal is permanent. */
export async function enqueueFinancialReminders(tx: DbExecutor) {
  const environment=await operationalEnvironmentIn(tx);
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('financial-reminder-budget',0))`,
  );
  const policy = (await readManifest(tx)).alert_policy;
  const [clock] = await tx.execute<{ now: Date; day: string }>(
    sql`select clock_timestamp() as now,(clock_timestamp() at time zone 'UTC')::date::text as day`,
  );
  const [total] = await tx
    .select({ n: sql<string>`count(*)::text` })
    .from(alertDeliveries)
    .where(
      sql`${alertDeliveries.createdAt}>=(clock_timestamp() at time zone 'UTC')::date at time zone 'UTC'`,
    );
  let remaining = Math.max(
      0,
      Math.min(100, policy.daily_limit - Number(total.n)),
    ),
    created = 0;
  if (!remaining) return { created };
  const rows = await tx
    .select()
    .from(operationalAlerts)
    .where(
      and(
        eq(operationalAlerts.environment, environment),
        eq(operationalAlerts.status, "open"),
        sql`${operationalAlerts.nextReminderAt}<=clock_timestamp()`,
      ),
    )
    .orderBy(asc(operationalAlerts.nextReminderAt), asc(operationalAlerts.id))
    .limit(100)
    .for("update", { skipLocked: true });
  for (const row of rows) {
    if (!remaining) break;
    // Initial delivery is ordinal zero; next reminder starts at the first interval.
    const interval =
      policy.remind_minutes[
        Math.min(row.escalationStep, policy.remind_minutes.length - 1)
      ];
    if (
      row.escalationStep === 0 &&
      new Date(clock.now).getTime() - row.occurrenceStartedAt.getTime() < interval * 60000
    )
      continue;
    const ordinal = row.reminders + 1;
    await enqueueAlertDelivery(tx,row,ordinal);
    await tx
      .update(operationalAlerts)
      .set({
        reminders: ordinal,
        escalationStep:row.escalationStep+1,
        nextReminderAt: new Date(
          new Date(clock.now).getTime() +
            policy.remind_minutes[
              Math.min(row.escalationStep+1, policy.remind_minutes.length - 1)
            ] *
              60000,
        ),
      })
      .where(eq(operationalAlerts.id, row.id));
    remaining--;
    created++;
  }
  return { created };
}
export async function controlFinancialAlert(
  tx: DbExecutor,
  actorId: string,
  id: string,
  action: "acknowledge" | "resolve",
  reason: string,
) {
  await operationalEnvironmentIn(tx);
  const actor = await lockUser(tx, actorId),
    policy = await readManifest(tx);
  if (
    actor.status !== "active" ||
    actor.role !== "admin" ||
    !policy.feature_admin
  )
    throw new Error("FORBIDDEN");
  const [row] = await tx
    .select()
    .from(operationalAlerts)
    .where(eq(operationalAlerts.id, id))
    .for("update");
  if (!row) throw new Error("NOT_FOUND");
  const status = action === "acknowledge" ? "acknowledged" : "resolved";
  if (row.status === status) return { id, status };
  if (row.status === "resolved") throw new Error("VERSION_CONFLICT");
  await tx
    .update(operationalAlerts)
    .set({
      status,
      ...(action === "acknowledge"
        ? { acknowledgedAt: sql`clock_timestamp()` }
        : { resolvedAt: sql`clock_timestamp()` }),
    })
    .where(eq(operationalAlerts.id, id));
  await tx.update(alertDeliveries).set({status:'cancelled',leaseToken:null,leaseUntil:null}).where(and(eq(alertDeliveries.alertId,id),sql`${alertDeliveries.status} in ('pending','failed','sending')`));
  await tx
    .insert(auditEvents)
    .values({
      actorUserId: actorId,
      action: `financial.alert.${action}`,
      targetType: "operational_alert",
      targetId: id,
      reason,
      beforeState: { status: row.status },
      afterState: { status },
    });
  return { id, status };
}
export async function financialAlertList(tx: DbExecutor) {
  await operationalEnvironmentIn(tx);
  return tx
    .select({
      id: operationalAlerts.id,
      severity: operationalAlerts.severity,
      category: operationalAlerts.category,
      status: operationalAlerts.status,
      safe_details: operationalAlerts.safeDetails,
      reminders: operationalAlerts.reminders,
      created_at: operationalAlerts.createdAt,
    })
    .from(operationalAlerts)
    .orderBy(
      sql`${operationalAlerts.createdAt} desc`,
      sql`${operationalAlerts.id} desc`,
    )
    .limit(100);
}
/** A committed daily attempt advances admission even if its RPC transaction
 * fails or the process exits. Failed work remains payable and can be retried
 * manually; daily dispatch gives every other account its own turn. */
export async function scheduleDailyBusiness(){
 const registry=readRegistry().filter(row=>row.enabled&&row.verified&&row.key!=='trx');
 const candidate=await withContext({access:'service'},async tx=>{
  const environment=await financialEnvironmentIn(tx);if(!(await readManifest(tx)).business_settlement_policy.daily_enabled)return null;
  const {assets,operationKeys}=await import('@gifters/db');
  const [clock]=await tx.execute<{day:string}>(sql`select (clock_timestamp() at time zone 'UTC')::date::text as day`);
  for(const item of registry.filter(row=>row.environment===environment)){
   const [asset]=await tx.select({id:assets.id}).from(assets).where(and(eq(assets.environment,environment),eq(assets.symbol,item.key.toUpperCase()),eq(assets.chainId,item.network),eq(assets.enabled,true))).limit(1);if(!asset)continue;
   for(const role of businessSettlementRoles){
    const daily=`business-daily:${environment}:${asset.id}:${role}:${clock.day}`,attempt=`business-daily-attempt:${environment}:${asset.id}:${role}:${clock.day}`;
    const previous=await tx.select({key:operationKeys.businessKey}).from(operationKeys).where(sql`${operationKeys.businessKey} in (${daily},${attempt})`).limit(1);if(previous.length)continue;
    const [claimed]=await tx.insert(operationKeys).values({businessKey:attempt,requestHash:crypto.createHash('sha256').update(attempt).digest('hex'),result:{status:'attempted',asset_key:item.key,role,day:clock.day}}).onConflictDoNothing({target:operationKeys.businessKey}).returning({key:operationKeys.businessKey});
    if(claimed)return {environment,assetId:asset.id,assetKey:item.key,role,day:clock.day};
   }
  }
  return null;
 });
 if(!candidate)return {status:'done'};
 try{return await withContext({access:'service'},tx=>holdBusinessSettlement(tx,null,{asset_key:candidate.assetKey,role:candidate.role,reason:'UTC daily settlement'},candidate.day,true));}
 catch(error){
  const code=applicationError(error).code;
  await withContext({access:'service'},tx=>openFinancialAlert(tx,`business-settlement:${candidate.environment}:${candidate.assetId}:${candidate.role}`,'chain_exception','warning',{asset_key:candidate.assetKey,reason:code},candidate.environment));
  if(['DB_CAPACITY_EXCEEDED','DB_DEADLINE_EXCEEDED','INTERNAL_ERROR'].includes(code))throw error;
  return {status:'deferred',asset_key:candidate.assetKey,role:candidate.role,reason:code};
 }
}
