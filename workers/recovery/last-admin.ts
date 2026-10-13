import { verifyDatabaseBinding } from "../../packages/db/src/verify-binding";
import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  migrationClient,
  closeDb,
  schema,
  users,
  authFactors,
  authTotpReplays,
  authRecoveryCodes,
  authSessions,
  auditEvents,
  operationKeys,
} from "../../packages/db/src/index";
/** Maintenance-only owner authority; never import into web or signer. A verified
 * identity case is reviewed externally before this narrowly scoped reset. */
export async function recoverLastAdministrator(input: {
  userId: string;
  requestKey: string;
  proofReference: string;
  reason: string;
  confirmation: string;
}) {
  if (
    process.env.VERCEL === "1" ||
    (process.env.SIGNER_PROVIDER ?? "disabled") !== "disabled" ||
    process.env.SCHEDULER_HMAC_KEY ||
    process.env.SCHEDULER_HMAC_PREVIOUS_KEY ||
    !process.env.DATABASE_MIGRATION_URL
  )
    throw new Error("MAINTENANCE_SCOPE_DENIED");
  if (
    !/^[0-9a-f-]{36}$/i.test(input.userId) ||
    !/^[0-9a-f-]{36}$/i.test(input.requestKey) ||
    !/^[A-Za-z0-9:_-]{5,200}$/.test(input.proofReference) ||
    input.reason.trim().length < 10 ||
    input.reason.length > 500 ||
    input.confirmation !== `recover-last-admin:${input.userId}`
  )
    throw new Error("RECOVERY_INPUT_INVALID");
  await verifyDatabaseBinding(false, true);
  const owner = migrationClient({ quiet: true }),
    database = drizzle(owner, { schema });
  try {
    return await database.transaction(async (tx) => {
      await tx.execute(sql`set local search_path=pg_catalog,public,pg_temp`);
      const [privilege] = await tx.execute<{ allowed: boolean }>(
        sql`select bool_and(pg_has_role(session_user,c.relowner,'USAGE')) as allowed from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('users','auth_factors','auth_sessions','audit_events')`,
      );
      if (!privilege?.allowed) throw new Error("MAINTENANCE_OWNER_REQUIRED");
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended('last-administrator-recovery',0))`,
      );
      const key = `last-admin-recovery:${input.userId}:${input.requestKey.toLowerCase()}`,
        hash = crypto
          .createHash("sha256")
          .update(
            JSON.stringify({
              userId: input.userId,
              proofReference: input.proofReference,
              reason: input.reason,
            }),
          )
          .digest("hex");
      const [old] = await tx
        .select()
        .from(operationKeys)
        .where(eq(operationKeys.businessKey, key))
        .limit(1);
      if (old) {
        if (old.requestHash !== hash) throw new Error("VERSION_CONFLICT");
        return old.result;
      }
      const admins = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.status, "active")))
        .orderBy(users.id)
        .limit(3)
        .for("update");
      if (
        admins.length > 1 ||
        (admins.length === 1 && admins[0].id !== input.userId)
      )
        throw new Error("LAST_ADMIN_REQUIRED");
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .for("update");
      if (!user || user.status === "deleted" || user.role !== "admin")
        throw new Error("ACCOUNT_RESTRICTED");
      await tx
        .delete(authTotpReplays)
        .where(
          sql`${authTotpReplays.factorId} in (select id from ${authFactors} where ${authFactors.userId}=${user.id})`,
        );
      await tx
        .delete(authRecoveryCodes)
        .where(
          sql`${authRecoveryCodes.factorId} in (select id from ${authFactors} where ${authFactors.userId}=${user.id})`,
        );
      await tx.delete(authFactors).where(eq(authFactors.userId, user.id));
      await tx
        .update(authSessions)
        .set({
          revokedAt: sql`coalesce(${authSessions.revokedAt},clock_timestamp())`,
        })
        .where(eq(authSessions.userId, user.id));
      await tx
        .update(users)
        .set({
          status: "active",
          suspensionUntil: null,
          suspensionPreviousStatus: null,
          sessionVersion: user.sessionVersion + 1,
          accountRevision: user.accountRevision + 1,
        })
        .where(eq(users.id, user.id));
      const result = {
        user_id: user.id,
        status: "factor_reset",
        reenrollment_required: true,
      };
      await tx
        .insert(auditEvents)
        .values({
          action: "maintenance.last_admin_factor_reset",
          targetType: "user",
          targetId: user.id,
          reason: input.reason,
          beforeState: { status: user.status, role: user.role },
          afterState: {
            status: "active",
            proof_reference: input.proofReference,
            owner_authority: true,
            reenrollment_required: true,
          },
        });
      await tx
        .insert(operationKeys)
        .values({ businessKey: key, requestHash: hash, result });
      return result;
    });
  } finally {
    await owner.end({ timeout: 3 });
    await closeDb();
  }
}
