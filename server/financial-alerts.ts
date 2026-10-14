import { pinnedPost } from '../packages/config/src/outbound-http';
import crypto from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  operationalAlerts,operationKeys,readManifest,
  alertDeliveries,
  withContext,
  type DbExecutor,
} from "@gifters/db";
import { environmentKey } from "./auth-crypto";
const detailsSchema = z
  .object({
    configuration_hash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    asset_key: z.string().max(30).optional(),
    obligation_id: z.string().uuid().optional(),
    reason: z
      .string()
      .regex(/^[A-Z0-9_]{1,80}$/)
      .optional(),
  })
  .strict();
export async function enqueueAlertDelivery(tx: DbExecutor, alert: typeof operationalAlerts.$inferSelect, ordinal: number) {
  const businessKey=`alert:${alert.id}:${ordinal}`;
  const payloadText=JSON.stringify({version:1,environment:alert.environment,delivery_key:businessKey,severity:alert.severity,category:alert.category,details:detailsSchema.parse(alert.safeDetails)});
  await tx.insert(alertDeliveries).values({alertId:alert.id,businessKey,occurrence:alert.occurrence,payloadText,payloadHash:crypto.createHash('sha256').update(payloadText).digest('hex')}).onConflictDoNothing();
}
export async function openFinancialAlert(
  tx: DbExecutor,
  conditionKey: string,
  category: string,
  severity: "critical" | "warning",
  details: z.infer<typeof detailsSchema>,
  environment: 'simulation'|'testnet'='testnet',
) {
  if (
    !/^[a-z0-9:_-]{1,180}$/.test(conditionKey) ||
    ![
      "activation_probe",
      "gas_low",
      "hot_wallet_cap",
      "rpc_unavailable",
      "signer_unavailable",
      "balance_shortfall",
      "chain_exception",
      "fee_requote",
      "job_backlog","job_dlq","lock_wait","quota_budget",
    ].includes(category)
  )
    throw new Error("INVALID_INPUT");
  const safe = detailsSchema.parse(details);
  const [existing] = await tx
    .select()
    .from(operationalAlerts)
    .where(eq(operationalAlerts.conditionKey, conditionKey))
    .for("update");
  if (existing) {
    const changed=existing.severity!==(severity==='critical'?'P1':'P2')||existing.category!==category||JSON.stringify(detailsSchema.parse(existing.safeDetails))!==JSON.stringify(safe);
    if (existing.status !== "resolved" && !(existing.status==='open'&&changed)) return existing;
    // Resume the same condition without recycling permanent delivery ordinals.
    // The dispatcher applies the daily HTTP budget to reopened alerts too.
    const ordinal=existing.reminders+1,policy=(await readManifest(tx)).alert_policy;
    await tx.update(alertDeliveries).set({status:'cancelled',leaseToken:null,leaseUntil:null}).where(and(eq(alertDeliveries.alertId,existing.id),sql`${alertDeliveries.status} in ('pending','failed','sending')`));
    const [reopened] = await tx.update(operationalAlerts).set({
      status: "open", safeDetails: safe, category, severity: severity === "critical" ? "P1" : "P2",
      occurrence: existing.occurrence+1,occurrenceStartedAt:sql`clock_timestamp()`,escalationStep:0,
      acknowledgedAt: null, resolvedAt: null, reminders:ordinal,nextReminderAt: sql`clock_timestamp()+${policy.remind_minutes[0]}*interval '1 minute'`,
    }).where(eq(operationalAlerts.id, existing.id)).returning();
    await enqueueAlertDelivery(tx,reopened,ordinal);
    return reopened;
  }
  const [alert] = await tx
    .insert(operationalAlerts)
    .values({
      conditionKey,
      environment,
      category,
      severity: severity === "critical" ? "P1" : "P2",
      safeDetails: safe,
    })
    .onConflictDoNothing()
    .returning();
  if (!alert)
    return (
      await tx
        .select()
        .from(operationalAlerts)
        .where(eq(operationalAlerts.conditionKey, conditionKey))
        .limit(1)
    )[0];
  await enqueueAlertDelivery(tx,alert,0);
  return alert;
}
export async function acceptedAlert(tx: DbExecutor, configurationHash: string) {
  const [row] = await tx
    .select({ id: alertDeliveries.id })
    .from(alertDeliveries)
    .innerJoin(
      operationalAlerts,
      eq(operationalAlerts.id, alertDeliveries.alertId),
    )
    .where(
      and(
        eq(operationalAlerts.environment, "testnet"),
        eq(operationalAlerts.category, "activation_probe"),
        eq(alertDeliveries.status, "delivered"),
        sql`${alertDeliveries.payloadText}::jsonb->'details'->>'configuration_hash'=${configurationHash}`,
        sql`${alertDeliveries.deliveredAt}>clock_timestamp()-interval '24 hours'`,
      ),
    )
    .limit(1);
  return !!row;
}
/** Receiver must dedupe the permanent delivery key and echo a signed acknowledgement. */
export async function deliverFinancialAlert() {
  const claim = await withContext({ access: "service" }, async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('financial-alert-http-budget',0))`);
    const policy=(await readManifest(tx)).alert_policy;
    const [day]=await tx.execute<{day:string}>(sql`select (clock_timestamp() at time zone 'UTC')::date::text as day`);
    const prefix=`alert-http:testnet:${day.day}:`;
    const [spent]=await tx.select({n:sql<string>`count(*)::text`}).from(operationKeys).where(sql`${operationKeys.businessKey}>=${prefix} and ${operationKeys.businessKey}<${prefix+'~'}`);
    if(BigInt(spent.n)>=BigInt(policy.daily_limit))return null;

    const [clock] = await tx.execute<{
        now: Date;
      }>(sql`select clock_timestamp() as now`),
      now = new Date(clock.now);
    const [selected] = await tx
      .select({delivery:alertDeliveries,alert:operationalAlerts})
      .from(alertDeliveries)
      .innerJoin(operationalAlerts,eq(operationalAlerts.id,alertDeliveries.alertId))
      .where(
        and(
          sql`${alertDeliveries.status} in ('pending','failed','sending')`,
          sql`(${alertDeliveries.leaseUntil} is null or ${alertDeliveries.leaseUntil}<=clock_timestamp())`,
          sql`${alertDeliveries.attempts}<8`,
          eq(operationalAlerts.status,'open'),
          eq(alertDeliveries.occurrence,operationalAlerts.occurrence),
          sql`${alertDeliveries.payloadText} is not null`,
        ),
      )
      .orderBy(sql`case when ${operationalAlerts.severity}='P1' then 0 else 1 end`,sql`case when ${alertDeliveries.attempts}=0 then 0 else 1 end`,asc(alertDeliveries.createdAt),asc(alertDeliveries.id))
      .limit(1)
      .for("update", { of: operationalAlerts, skipLocked: true });
    if (!selected) return null;
    const {alert}=selected;
    const [delivery]=await tx.select().from(alertDeliveries).where(eq(alertDeliveries.id,selected.delivery.id)).limit(1).for('update',{skipLocked:true});
    if(!delivery)return null;
    const token = crypto.randomUUID(),
      generation = delivery.leaseGeneration + 1;
    await tx.insert(operationKeys).values({businessKey:prefix+spent.n,requestHash:crypto.createHash('sha256').update(`${delivery.id}:${generation}`).digest('hex'),result:{delivery_id:delivery.id,generation}});

    await tx
      .update(alertDeliveries)
      .set({
        status: "sending",
        attempts: delivery.attempts + 1,
        leaseToken: token,
        leaseGeneration: generation,
        leaseUntil: new Date(now.getTime() + 30000),
      })
      .where(eq(alertDeliveries.id, delivery.id));
    return { delivery, alert, token, generation };
  });
  if (!claim) return { processed: 0 };
  let delivered = false;
  try {
    const target = new URL(process.env.ALERT_WEBHOOK_URL ?? "");
    const fixture =
      process.env.APP_ENV === "simulation" &&
      process.env.CHAIN_FIXTURE_MODE === "isolated" &&
      process.env.VERCEL !== "1";
    if (
      target.username ||
      target.password ||
      (target.protocol !== "https:" &&
        !(
          fixture &&
          target.protocol === "http:" &&
          target.hostname === "127.0.0.1"
        ))
    )
      throw new Error("ALERT_UNAVAILABLE");
    const key = environmentKey("ALERT_WEBHOOK_KEY");
    try {
      const body = claim.delivery.payloadText!,
        digest = crypto.createHash("sha256").update(body).digest("hex"),
        signature = crypto
          .createHmac("sha256", key)
          .update(body)
          .digest("base64url");
      const response = await pinnedPost(target, {
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": claim.delivery.businessKey,
          "X-GW-Signature": signature,
        },
        body,
        signal: AbortSignal.timeout(5000), maxBytes: 2048, fixture,
      });
      const rawLength = response.headers.get("content-length");
      if (rawLength && parseInt(rawLength, 10) > 2048)
        throw new Error("ALERT_UNAVAILABLE");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("ALERT_UNAVAILABLE");
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 2048) {
          await reader.cancel();
          throw new Error("ALERT_UNAVAILABLE");
        }
        chunks.push(part.value);
      }
      const ack = z
          .object({
            delivery_key: z.literal(claim.delivery.businessKey),
            body_sha256: z.literal(digest),
            signature: z.string(),
          })
          .strict()
          .parse(JSON.parse(Buffer.concat(chunks).toString("utf8"))),
        expected = crypto
          .createHmac("sha256", key)
          .update(`ack\n${claim.delivery.businessKey}\n${digest}`)
          .digest();
      const observed = Buffer.from(ack.signature, "base64url");
      delivered =
        response.ok &&
        observed.length === expected.length &&
        crypto.timingSafeEqual(expected, observed);
    } finally {
      key.fill(0);
    }
  } catch {
    /* Persist failure without endpoint, credentials, body or response details. */
  }
  const committed = await withContext({ access: "service" }, async (tx) => {
    const [row] = await tx
      .update(alertDeliveries)
      .set({
        status: delivered ? "delivered" : "failed",
        deliveredAt: delivered ? sql`clock_timestamp()` : null,
        leaseToken: null,
        leaseUntil: delivered
          ? null
          : sql`clock_timestamp()+interval '30 seconds' * ${Math.min(120, 2 ** claim.delivery.attempts)}`,
      })
      .where(
        and(
          eq(alertDeliveries.id, claim.delivery.id),
          eq(alertDeliveries.leaseToken, claim.token),
          eq(alertDeliveries.leaseGeneration, claim.generation),
          eq(alertDeliveries.status,'sending'),
          sql`${alertDeliveries.leaseUntil}>clock_timestamp()`,
        ),
      )
      .returning({ id: alertDeliveries.id });
    return !!row;
  });
  return { processed: 1, delivered: committed && delivered };
}
