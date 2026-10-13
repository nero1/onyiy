import crypto from "node:crypto";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  operationalAlerts,
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
export async function openFinancialAlert(
  tx: DbExecutor,
  conditionKey: string,
  category: string,
  severity: "critical" | "warning",
  details: z.infer<typeof detailsSchema>,
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
    ].includes(category)
  )
    throw new Error("INVALID_INPUT");
  const safe = detailsSchema.parse(details);
  const [existing] = await tx
    .select()
    .from(operationalAlerts)
    .where(eq(operationalAlerts.conditionKey, conditionKey))
    .for("update");
  if (existing) return existing;
  const [alert] = await tx
    .insert(operationalAlerts)
    .values({
      conditionKey,
      environment: "testnet",
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
  await tx
    .insert(alertDeliveries)
    .values({ alertId: alert.id, businessKey: `alert:${alert.id}:0` });
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
        sql`${operationalAlerts.safeDetails}->>'configuration_hash'=${configurationHash}`,
        sql`${alertDeliveries.deliveredAt}>clock_timestamp()-interval '24 hours'`,
      ),
    )
    .limit(1);
  return !!row;
}
/** Receiver must dedupe the permanent delivery key and echo a signed acknowledgement. */
export async function deliverFinancialAlert() {
  const claim = await withContext({ access: "service" }, async (tx) => {
    const [clock] = await tx.execute<{
        now: Date;
      }>(sql`select clock_timestamp() as now`),
      now = new Date(clock.now);
    const [delivery] = await tx
      .select()
      .from(alertDeliveries)
      .where(
        and(
          sql`${alertDeliveries.status} in ('pending','failed','sending')`,
          sql`(${alertDeliveries.leaseUntil} is null or ${alertDeliveries.leaseUntil}<=clock_timestamp())`,
          sql`${alertDeliveries.attempts}<8`,
        ),
      )
      .orderBy(asc(alertDeliveries.createdAt), asc(alertDeliveries.id))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!delivery) return null;
    const [alert] = await tx
      .select()
      .from(operationalAlerts)
      .where(eq(operationalAlerts.id, delivery.alertId))
      .limit(1);
    const token = crypto.randomUUID(),
      generation = delivery.leaseGeneration + 1;
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
      const body = JSON.stringify({
          version: 1,
          environment: "testnet",
          delivery_key: claim.delivery.businessKey,
          severity: claim.alert.severity,
          category: claim.alert.category,
          details: detailsSchema.parse(claim.alert.safeDetails),
        }),
        digest = crypto.createHash("sha256").update(body).digest("hex"),
        signature = crypto
          .createHmac("sha256", key)
          .update(body)
          .digest("base64url");
      const response = await fetch(target, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": claim.delivery.businessKey,
          "X-GW-Signature": signature,
        },
        body,
        signal: AbortSignal.timeout(5000),
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
          sql`${alertDeliveries.leaseUntil}>clock_timestamp()`,
        ),
      )
      .returning({ id: alertDeliveries.id });
    return !!row;
  });
  return { processed: 1, delivered: committed && delivered };
}
