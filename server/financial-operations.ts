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
import {enqueueAlertDelivery} from './financial-alerts';
/** At most 100 due reminders per invocation; each ordinal is permanent. */
export async function enqueueFinancialReminders(tx: DbExecutor) {
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
        eq(operationalAlerts.environment, "testnet"),
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
/** One asset/role per call avoids a long serverless RPC batch. The UTC daily
 * key and source lock are the same as manual settlement. */
export async function scheduleDailyBusiness() {
  const registry = readRegistry().filter(
    (v) => v.enabled && v.verified && v.key !== "trx",
  );
  return withContext({ access: "service" }, async (tx) => {
    if (!(await readManifest(tx)).business_settlement_policy.daily_enabled)
      return { status: "disabled" };
    const { assets, operationKeys } = await import("@gifters/db");
    const [clock] = await tx.execute<{ day: string }>(
      sql`select (clock_timestamp() at time zone 'UTC')::date::text as day`,
    );
    for (const item of registry) {
      const [asset] = await tx
        .select({ id: assets.id })
        .from(assets)
        .where(
          and(
            eq(assets.environment, "testnet"),
            eq(assets.symbol, item.key.toUpperCase()),
            eq(assets.chainId, item.network),
            eq(assets.enabled, true),
          ),
        )
        .limit(1);
      if (!asset) continue;
      for (const role of businessSettlementRoles) {
        const [previous] = await tx
          .select({ key: operationKeys.businessKey })
          .from(operationKeys)
          .where(
            eq(
              operationKeys.businessKey,
              `business-daily:testnet:${asset.id}:${role}:${clock.day}`,
            ),
          )
          .limit(1);
        if (previous) continue;
        return holdBusinessSettlement(
          tx,
          null,
          { asset_key: item.key, role, reason: "UTC daily settlement" },
          clock.day,
          true,
        );
      }
    }
    return { status: "done" };
  });
}
