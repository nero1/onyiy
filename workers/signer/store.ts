import type { DbExecutor } from "../../packages/db/src/index";
import crypto from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  schema,
  cryptoObligations,
  signerStates,
  signerReservations,
  signedAttempts,
  assets,
  ledgerAccounts,
  ledgerPostings,
  xManifest,
  operationalAlerts,
  alertDeliveries,
} from "../../packages/db/src/schema";
import { databaseConnectionOptions } from "../../packages/db/src/connection-options";
import {
  principalUsdMicros,
  type RateSnapshot,
} from "../../packages/domain/src/fees";
import { assertIsolated } from "./keys";
import {
  configurationSnapshot,
  financialPolicySnapshot,
} from "../../packages/chains/src/runtime";
import {
  parseManifest,
  validateSecurityCeilings,
} from "../../packages/config/src/index";
import type {
  AssetRegistry,
  PreparedTransfer,
  SignedTransfer,
} from "../../packages/chains/src/types";
const key = (name: string) => {
  const raw = process.env[name] ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(raw))
    throw new Error("SIGNER_CONFIGURATION_INVALID");
  const value = Buffer.from(raw, "base64url");
  if (value.length !== 32 || value.toString("base64url") !== raw)
    throw new Error("SIGNER_CONFIGURATION_INVALID");
  return value;
};
export const canonical = (value: unknown): string =>
  typeof value === "bigint"
    ? JSON.stringify(value.toString())
    : value === null || typeof value !== "object"
      ? JSON.stringify(value)
      : Array.isArray(value)
        ? "[" + value.map(canonical).join(",") + "]"
        : "{" +
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
            .join(",") +
          "}";
export function encryptSigned(bytes: string, scope: string) {
  const secret = key("SIGNED_PAYLOAD_ENCRYPTION_KEY");
  try {
    const iv = crypto.randomBytes(12),
      cipher = crypto.createCipheriv("aes-256-gcm", secret, iv);
    cipher.setAAD(Buffer.from(scope));
    const encrypted = Buffer.concat([
      cipher.update(bytes, "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      "base64url",
    );
  } finally {
    secret.fill(0);
  }
}
export function decryptSigned(cipher: string, scope: string) {
  const secret = key("SIGNED_PAYLOAD_ENCRYPTION_KEY");
  try {
    const data = Buffer.from(cipher, "base64url"),
      decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        secret,
        data.subarray(0, 12),
      );
    decipher.setAAD(Buffer.from(scope));
    decipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([
      decipher.update(data.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
  } finally {
    secret.fill(0);
  }
}
export class SignerStore {
  private client;
  private database;
  constructor() {
    assertIsolated();
    const url = process.env.SIGNER_DATABASE_URL;
    if (!url) throw new Error("SIGNER_CONFIGURATION_INVALID");
    this.client = postgres(url, {
      ...databaseConnectionOptions(url),
      max: 1,
      prepare: false,
    });
    this.database = drizzle(this.client, { schema });
  }
  async close() {
    await this.client.end({ timeout: 3 });
  }
  private async context<T>(fn: (tx: DbExecutor) => Promise<T>) {
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`select set_config('gw.environment','testnet',true)`);
      const [role] = await tx.execute<{
        safe: boolean;
        isolated: boolean;
      }>(
        sql`select not (rolsuper or rolbypassrls or rolinherit or rolcreatedb or rolcreaterole) and not exists(select 1 from pg_roles where rolname='gw_signer' and (rolcanlogin or rolinherit or rolsuper or rolbypassrls or rolcreatedb or rolcreaterole)) and not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles o on o.oid=c.relowner where n.nspname='public' and o.rolname in (session_user,'gw_signer')) and not exists(select 1 from pg_namespace n join pg_roles o on o.oid=n.nspowner where n.nspname='public' and o.rolname in (session_user,'gw_signer')) and not exists(select 1 from pg_database d join pg_roles o on o.oid=d.datdba where d.datname=current_database() and o.rolname in (session_user,'gw_signer')) as safe,pg_has_role(session_user,'gw_signer','MEMBER') and not pg_has_role(session_user,'gw_service','MEMBER') and not pg_has_role(session_user,'gw_read','MEMBER') as isolated from pg_roles where rolname=session_user`,
      );
      if (!role?.safe || !role.isolated)
        throw new Error("SIGNER_DATABASE_SCOPE_DENIED");
      await tx.execute(sql.raw("set local role gw_signer"));
      await tx.execute(sql`set local statement_timeout='5000ms'`);
      return fn(tx);
    });
  }
  async configuration(asset: AssetRegistry) {
    return this.context(async (tx) => {
      const rows = await tx
        .select({ key: xManifest.key, value: xManifest.value })
        .from(xManifest);
      const values: Record<string, unknown> = {};
      for (const row of rows) values[row.key] = row.value;
      const policy = parseManifest(values);
      validateSecurityCeilings(policy);
      return {
        policy,
        ...(await configurationSnapshot(
          asset,
          financialPolicySnapshot(policy),
        )),
      };
    });
  }
  async activation(hash: string) {
    return this.context(async (tx) => {
      const [row] = await tx
        .select({ id: alertDeliveries.id })
        .from(alertDeliveries)
        .innerJoin(
          operationalAlerts,
          eq(operationalAlerts.id, alertDeliveries.alertId),
        )
        .where(
          and(
            eq(operationalAlerts.category, "activation_probe"),
            eq(alertDeliveries.status, "delivered"),
            sql`${operationalAlerts.safeDetails}->>'configuration_hash'=${hash}`,
            sql`${alertDeliveries.deliveredAt}>clock_timestamp()-interval '24 hours'`,
          ),
        )
        .limit(1);
      return !!row;
    });
  }
  async pending() {
    return this.context((tx) =>
      tx
        .select()
        .from(cryptoObligations)
        .where(
          sql`(${cryptoObligations.status} in ('approved','signing','broadcast') or (${cryptoObligations.status} in ('settled','exception') and exists(select 1 from ${signedAttempts} where ${signedAttempts.obligationId}=${cryptoObligations.id} and ${signedAttempts.status} in ('signed','broadcast'))))`,
        )
        .orderBy(asc(cryptoObligations.createdAt), asc(cryptoObligations.id))
        .limit(20),
    );
  }
  async attempts(id: string) {
    return this.context((tx) =>
      tx
        .select()
        .from(signedAttempts)
        .where(eq(signedAttempts.obligationId, id))
        .orderBy(asc(signedAttempts.attempt))
        .limit(20),
    );
  }
  async claim(
    id: string,
    fingerprint: string,
    networkNonce: bigint,
    nativeAvailable: bigint,
    nativeQuote: bigint,
  ) {
    return this.context(async (tx) => {
      const [row] = await tx
        .select()
        .from(cryptoObligations)
        .where(eq(cryptoObligations.id, id))
        .for("update");
      if (
        !row ||
        !["approved", "signing"].includes(row.status) ||
        row.configurationHash !== fingerprint
      )
        throw new Error("SIGNER_INTENT_DENIED");
      await tx
        .insert(signerStates)
        .values({
          treasuryFingerprint: row.treasuryFingerprint,
          environment: "testnet",
          chain: row.chain,
        })
        .onConflictDoNothing();
      const [state] = await tx
        .select()
        .from(signerStates)
        .where(eq(signerStates.treasuryFingerprint, row.treasuryFingerprint))
        .for("update");
      const [now] = await tx.execute<{
        now: Date;
        day: string;
      }>(
        sql`select clock_timestamp() as now,(clock_timestamp() at time zone 'UTC')::date::text as day`,
      );
      if (state.leaseUntil && state.leaseUntil > new Date(now.now))
        throw new Error("LEASE_LOST");
      const previous = await tx
        .select()
        .from(signedAttempts)
        .where(eq(signedAttempts.obligationId, id))
        .limit(1);
      if (previous.length) throw new Error("SIGNED_ATTEMPT_RECOVERY_REQUIRED");
      const usd = principalUsdMicros(
          BigInt(row.netBaseUnits),
          row.rateSnapshot as RateSnapshot,
        ),
        perTx = BigInt(process.env.SIGNER_HARD_PER_TX_USD ?? "5000") * 1000000n,
        daily =
          BigInt(process.env.SIGNER_HARD_DAILY_PER_ASSET_USD ?? "10000") *
          1000000n;
      if (usd > perTx) throw new Error("SIGNER_CAP_EXCEEDED");
      const [spent] = await tx
        .select({
          total: sql<string>`coalesce(sum(${signerReservations.principalUsdMicros}),0)::text`,
        })
        .from(signerReservations)
        .where(
          and(
            eq(signerReservations.treasuryFingerprint, row.treasuryFingerprint),
            eq(signerReservations.assetId, row.assetId),
            eq(signerReservations.signingDay, now.day),
          ),
        );
      const [gas] = await tx
        .select({
          total: sql<string>`coalesce(sum(${signerReservations.nativeFeeReserved}),0)::text`,
        })
        .from(signerReservations)
        .innerJoin(
          cryptoObligations,
          eq(cryptoObligations.id, signerReservations.obligationId),
        )
        .where(
          and(
            eq(signerReservations.treasuryFingerprint, row.treasuryFingerprint),
            inArray(cryptoObligations.status, [
              "approved",
              "signing",
              "broadcast",
              "exception",
              "awaiting_requote",
            ]),
          ),
        );
      const nativeSymbol = (
        { eth: "ETH", bnb: "BNB", sol: "SOL", tron: "TRX" } as Record<
          string,
          string
        >
      )[row.chain];
      const [native] = await tx
        .select()
        .from(assets)
        .where(
          and(
            eq(assets.environment, "testnet"),
            eq(assets.symbol, nativeSymbol),
            eq(assets.chainId, (row.registrySnapshot as AssetRegistry).network),
          ),
        )
        .limit(1);
      if (!native) throw new Error("SIGNER_INTENT_DENIED");
      const [liability] = await tx
        .select({
          amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
        })
        .from(ledgerAccounts)
        .leftJoin(
          ledgerPostings,
          eq(ledgerPostings.accountId, ledgerAccounts.id),
        )
        .where(
          and(
            eq(ledgerAccounts.assetId, native.id),
            inArray(ledgerAccounts.purpose, [
              "available_payable",
              "held_payable",
              "refund_payable",
              "marketing_payable",
              "developer_payable",
              "bootstrap_developer_payable",
              "bootstrap_marketing_payable",
            ]),
          ),
        );
      nativeAvailable -=
        BigInt(liability.amount) > 0n ? BigInt(liability.amount) : 0n;
      const [existing] = await tx
        .select()
        .from(signerReservations)
        .where(
          and(
            eq(signerReservations.obligationId, id),
            eq(signerReservations.signingDay, now.day),
          ),
        )
        .limit(1);
      if (
        !existing &&
        (BigInt(spent.total) + usd > daily ||
          BigInt(gas.total) + nativeQuote > nativeAvailable)
      )
        throw new Error("SIGNER_CAP_EXCEEDED");
      if (existing && BigInt(gas.total) > nativeAvailable)
        throw new Error("SIGNER_CAP_EXCEEDED");
      if (existing && BigInt(existing.nativeFeeReserved) < nativeQuote)
        throw new Error("FEE_REQUOTE_REQUIRED");
      if (!existing)
        await tx.insert(signerReservations).values({
          obligationId: id,
          treasuryFingerprint: row.treasuryFingerprint,
          assetId: row.assetId,
          signingDay: now.day,
          principalUsdMicros: usd.toString(),
          nativeFeeReserved: nativeQuote.toString(),
        });
      const nonce =
          BigInt(state.nextNonce) > networkNonce
            ? BigInt(state.nextNonce)
            : networkNonce,
        token = crypto.randomUUID(),
        generation = state.leaseGeneration + 1;
      await tx
        .update(signerStates)
        .set({
          nextNonce: nonce.toString(),
          leaseToken: token,
          leaseGeneration: generation,
          leaseUntil: new Date(new Date(now.now).getTime() + 120000),
          heartbeatAt: new Date(now.now),
          configurationHash: fingerprint,
        })
        .where(eq(signerStates.treasuryFingerprint, state.treasuryFingerprint));
      await tx
        .update(cryptoObligations)
        .set({ status: "signing" })
        .where(eq(cryptoObligations.id, id));
      return { row, nonce, token, generation };
    });
  }
  async persist(
    claim: {
      row: typeof cryptoObligations.$inferSelect;
      nonce: bigint;
      token: string;
      generation: number;
    },
    prepared: PreparedTransfer,
    signed: SignedTransfer,
  ) {
    return this.context(async (tx) => {
      const [obligation] = await tx
        .select()
        .from(cryptoObligations)
        .where(eq(cryptoObligations.id, claim.row.id))
        .for("update");
      if (
        !obligation ||
        obligation.status !== "signing" ||
        obligation.configurationHash !== claim.row.configurationHash ||
        prepared.intent.destination !== obligation.destination ||
        prepared.intent.amount !== BigInt(obligation.netBaseUnits) ||
        prepared.intent.asset.chain !== obligation.chain ||
        prepared.environment !== "testnet" ||
        prepared.intent.fee.nativeFee >
          (BigInt(obligation.nativeFeeQuote) * 125n) / 100n ||
        (["eth", "bnb"].includes(obligation.chain) &&
          (prepared.intent.nonce !== claim.nonce ||
            signed.nonce !== claim.nonce))
      )
        throw new Error("SIGNER_INTENT_DENIED");
      const [state] = await tx
        .select()
        .from(signerStates)
        .where(
          and(
            eq(signerStates.treasuryFingerprint, claim.row.treasuryFingerprint),
            eq(signerStates.leaseToken, claim.token),
            eq(signerStates.leaseGeneration, claim.generation),
            eq(signerStates.nextNonce, claim.nonce.toString()),
            sql`${signerStates.leaseUntil}>clock_timestamp()`,
          ),
        )
        .for("update");
      if (!state) throw new Error("LEASE_LOST");
      const id = crypto.randomUUID(),
        scope = `signed-attempt:${claim.row.id}:${id}`;
      await tx.insert(signedAttempts).values({
        id,
        obligationId: claim.row.id,
        attempt: 1,
        environment: "testnet",
        chain: claim.row.chain,
        txHash: signed.hash,
        nonce: signed.nonce?.toString(),
        validUntilHeight: signed.validUntilHeight?.toString(),
        signedCipher: encryptSigned(signed.bytes, scope),
        nativeFeeCap: prepared.intent.fee.nativeFee.toString(),
        intentHash: crypto
          .createHash("sha256")
          .update(canonical(prepared.intent))
          .digest("hex"),
        configurationHash: claim.row.configurationHash,
      });
      await tx
        .update(signerStates)
        .set({
          nextNonce: (claim.nonce + 1n).toString(),
          leaseToken: null,
          leaseUntil: null,
          heartbeatAt: new Date(),
        })
        .where(eq(signerStates.treasuryFingerprint, state.treasuryFingerprint));
      return { id, scope, signed };
    });
  }
  async observed(
    id: string,
    state: "confirmed" | "failed",
    actualNativeFee: bigint,
  ) {
    return this.context((tx) =>
      tx
        .update(signedAttempts)
        .set({
          status: state,
          actualNativeFee: actualNativeFee.toString(),
          confirmedAt: new Date(),
        })
        .where(
          and(
            eq(signedAttempts.id, id),
            inArray(signedAttempts.status, ["signed", "broadcast"]),
          ),
        ),
    );
  }
  async broadcast(id: string) {
    return this.context((tx) =>
      tx
        .update(signedAttempts)
        .set({ status: "broadcast", broadcastAt: new Date() })
        .where(
          and(eq(signedAttempts.id, id), eq(signedAttempts.status, "signed")),
        ),
    );
  }
}
