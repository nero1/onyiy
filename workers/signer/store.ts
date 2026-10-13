import {databaseScopeFingerprint} from '../../packages/db/src/binding-fingerprint';
import { Transaction } from "ethers";
import type { DbExecutor } from "../../packages/db/src/index";
import crypto from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  schema,
  cryptoObligations,
  signerStates,
  signerHeartbeats,
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
      await tx.execute(sql`select set_config('gw.environment','testnet',true),set_config('gw.database_binding',${databaseScopeFingerprint(process.env.SIGNER_DATABASE_URL??'')},true)`);
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
  private async configurationIn(tx: DbExecutor, asset: AssetRegistry) {
    await tx.execute(
      sql`select pg_advisory_xact_lock_shared(hashtextextended('financial-policy',0))`,
    );
    const rows = await tx
      .select({ key: xManifest.key, value: xManifest.value })
      .from(xManifest)
      .limit(1001);
    if (rows.length > 1000) throw new Error("CONFIGURATION_INVALID");
    const values: Record<string, unknown> = {};
    for (const row of rows) values[row.key] = row.value;
    const policy = parseManifest(values);
    validateSecurityCeilings(policy);
    return {
      policy,
      ...(await configurationSnapshot(asset, financialPolicySnapshot(policy))),
    };
  }
  async configuration(asset: AssetRegistry) {
    return this.context((tx) => this.configurationIn(tx, asset));
  }
  async heartbeat(asset:AssetRegistry) {
    return this.context(async tx=>{const config=await this.configurationIn(tx,asset);if(!config.addresses.RECEIVING)throw new Error("SIGNER_ADDRESS_MISMATCH");await tx.insert(signerHeartbeats).values({treasuryFingerprint:config.treasuryFingerprint,environment:"testnet",chain:asset.chain,configurationHash:config.hash}).onConflictDoUpdate({target:signerHeartbeats.treasuryFingerprint,set:{configurationHash:config.hash,heartbeatAt:sql`clock_timestamp()`}});return config.treasuryFingerprint;});
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
    assetAvailable?: bigint,
  ) {
    return this.context(async (tx) => {
      const [fence] = await tx.execute<{ allowed: boolean }>(
        sql`select public.gw_signer_owner_fence(${id}::uuid) as allowed`,
      );
      if (!fence?.allowed) throw new Error("SIGNER_INTENT_DENIED");
      const [row] = await tx
        .select()
        .from(cryptoObligations)
        .where(eq(cryptoObligations.id, id))
        .for("update");
      if (!row || !["approved", "signing"].includes(row.status))throw new Error("SIGNER_INTENT_DENIED");
      if(row.quoteExpiresAt<=new Date())throw new Error("SIGNER_QUOTE_EXPIRED");
      if(row.configurationHash!==fingerprint)throw new Error("SIGNER_CONFIGURATION_CHANGED");
      const [activeAsset] = await tx
        .select({ enabled: assets.enabled })
        .from(assets)
        .where(eq(assets.id, row.assetId))
        .limit(1);
      if (!activeAsset?.enabled && !(row.kind==="sweep"&&(row.registrySnapshot as AssetRegistry).kind==="native")) throw new Error("SIGNER_INTENT_DENIED");
      const live = await this.configurationIn(
        tx,
        row.registrySnapshot as AssetRegistry,
      );
      if(live.hash!==fingerprint)throw new Error("SIGNER_CONFIGURATION_CHANGED");
      if(!live.policy.feature_wallets)throw new Error("SIGNER_FEATURE_PAUSED");
      const approvedNetwork = BigInt(
          (row.feeSnapshot as { networkFee?: string }).networkFee ??
            row.nativeFeeQuote,
        ),
        approvedSetup = BigInt(
          (row.feeSnapshot as { accountSetupCost?: string }).accountSetupCost ??
            "0",
        ),
        nativeBudget =
          (approvedNetwork *
            BigInt(
              100 + live.policy.withdrawal_fee_policy.platform_variance_pct,
            )) /
            100n +
          approvedSetup;
      const nativeFloor=BigInt((row.feeSnapshot as {nativeFloor?:string}).nativeFloor??"0");if(nativeFloor<0n)throw new Error("SIGNER_INTENT_DENIED");
      if (nativeQuote > nativeBudget || nativeQuote < 0n)
        throw new Error("FEE_REQUOTE_REQUIRED");
      if (assetAvailable === undefined || assetAvailable < 0n)
        throw new Error("SIGNER_OBSERVATION_REQUIRED");
      const [assetLiability] = await tx
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
            eq(ledgerAccounts.assetId, row.assetId),
            inArray(ledgerAccounts.purpose, [
              "available_payable",
              "held_payable",
              "refund_payable",
              "incoming_payable",
              "unallocated_payable",
              "marketing_payable",
              "developer_payable",
              "bootstrap_developer_payable",
              "bootstrap_marketing_payable",
            ]),
          ),
        );
      if (assetAvailable < BigInt(assetLiability.amount))
        throw new Error("SIGNER_CAP_EXCEEDED");

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
            sql`${cryptoObligations.completedAt} is null`,
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
              "incoming_payable",
              "unallocated_payable",
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
          BigInt(gas.total) + nativeBudget + nativeFloor > nativeAvailable)
      )
        throw new Error("SIGNER_CAP_EXCEEDED");
      if (existing && BigInt(gas.total) + nativeFloor > nativeAvailable)
        throw new Error("SIGNER_CAP_EXCEEDED");
      if (existing && BigInt(existing.nativeFeeReserved) < nativeBudget)
        throw new Error("FEE_REQUOTE_REQUIRED");
      if (!existing)
        await tx.insert(signerReservations).values({
          obligationId: id,
          treasuryFingerprint: row.treasuryFingerprint,
          assetId: row.assetId,
          signingDay: now.day,
          principalUsdMicros: usd.toString(),
          nativeFeeReserved: nativeBudget.toString(),
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
    signedAtHeight?: bigint,
  ) {
    return this.context(async (tx) => {
      const [fence] = await tx.execute<{ allowed: boolean }>(
        sql`select public.gw_signer_owner_fence(${claim.row.id}::uuid) as allowed`,
      );
      if (!fence?.allowed) throw new Error("SIGNER_INTENT_DENIED");
      const [obligation] = await tx
        .select()
        .from(cryptoObligations)
        .where(eq(cryptoObligations.id, claim.row.id))
        .for("update");
      if (
        !obligation ||
        obligation.status !== "signing" ||
        obligation.quoteExpiresAt <= new Date() ||
        obligation.configurationHash !== claim.row.configurationHash ||
        prepared.intent.destination !== obligation.destination ||
        prepared.intent.sender !== obligation.treasurySender ||
        prepared.network !==
          (obligation.registrySnapshot as AssetRegistry).network ||
        prepared.family !== obligation.chain ||
        prepared.intent.amount !== BigInt(obligation.netBaseUnits) ||
        prepared.intent.asset.chain !== obligation.chain ||
        prepared.environment !== "testnet" ||
        (prepared.intent.fee.networkFee ?? prepared.intent.fee.nativeFee) *
          100n >
          BigInt(
            (obligation.feeSnapshot as { networkFee?: string }).networkFee ??
              obligation.nativeFeeQuote,
          ) *
            125n ||
        (prepared.intent.fee.accountSetupCost ?? 0n) >
          BigInt(
            (obligation.feeSnapshot as { accountSetupCost?: string })
              .accountSetupCost ?? "0",
          ) ||
        (["eth", "bnb"].includes(obligation.chain) &&
          (prepared.intent.nonce !== claim.nonce ||
            signed.nonce !== claim.nonce))
      )
        throw new Error("SIGNER_INTENT_DENIED");
      const [activeAsset] = await tx
        .select({ enabled: assets.enabled })
        .from(assets)
        .where(eq(assets.id, obligation.assetId))
        .limit(1);
      if (!activeAsset?.enabled && !(obligation.kind==="sweep"&&(obligation.registrySnapshot as AssetRegistry).kind==="native")) throw new Error("SIGNER_INTENT_DENIED");
      const live = await this.configurationIn(tx, prepared.intent.asset);
      if (
        live.hash !== obligation.configurationHash ||
        !live.policy.feature_wallets
      )
        throw new Error("SIGNER_INTENT_DENIED");
      if (
        (prepared.intent.fee.networkFee ?? prepared.intent.fee.nativeFee) *
          100n >
        BigInt(
          (obligation.feeSnapshot as { networkFee?: string }).networkFee ??
            obligation.nativeFeeQuote,
        ) *
          BigInt(100 + live.policy.withdrawal_fee_policy.platform_variance_pct)
      )
        throw new Error("FEE_REQUOTE_REQUIRED");

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
        signedAtHeight: signedAtHeight?.toString(),
        expiresAt: signed.expiresAt ?? prepared.expiresAt,
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
  async persistEvmReplacement(
    previousId: string,
    prepared: PreparedTransfer,
    signed: SignedTransfer,
    height: bigint,
    nativeAvailable: bigint,
    assetAvailable: bigint,
  ) {
    return this.context(async (tx) => {
      const [lookup] = await tx
        .select()
        .from(signedAttempts)
        .where(eq(signedAttempts.id, previousId))
        .limit(1);
      if (!lookup) throw new Error("NOT_FOUND");
      const [fence] = await tx.execute<{ allowed: boolean }>(
        sql`select public.gw_signer_owner_fence(${lookup.obligationId}::uuid) as allowed`,
      );
      if (!fence?.allowed) throw new Error("SIGNER_INTENT_DENIED");
      const [row] = await tx
        .select()
        .from(cryptoObligations)
        .where(eq(cryptoObligations.id, lookup.obligationId))
        .for("update");
      if (
        !row ||
        !["signing", "broadcast"].includes(row.status) ||
        !["eth", "bnb"].includes(row.chain)
      )
        throw new Error("SIGNER_INTENT_DENIED");
      const live = await this.configurationIn(
        tx,
        row.registrySnapshot as AssetRegistry,
      );
      if (live.hash !== row.configurationHash || !live.policy.feature_wallets)
        throw new Error("SIGNER_INTENT_DENIED");
      const [enabled] = await tx
        .select({ enabled: assets.enabled })
        .from(assets)
        .where(eq(assets.id, row.assetId))
        .limit(1);
      if (!enabled?.enabled) throw new Error("SIGNER_INTENT_DENIED");
      const [previous] = await tx
        .select()
        .from(signedAttempts)
        .where(eq(signedAttempts.obligationId, row.id))
        .orderBy(sql`${signedAttempts.attempt} desc`)
        .limit(1);
      if (
        previous.id !== previousId ||
        !["signed", "broadcast"].includes(previous.status) ||
        previous.attempt >
          live.policy.crypto_monitor_policy.replacement_attempts ||
        previous.signedAtHeight === null ||
        height <
          BigInt(previous.signedAtHeight) +
            BigInt(live.policy.crypto_monitor_policy.stuck_blocks)
      )
        throw new Error("REPLACEMENT_DENIED");
      const old = Transaction.from(
          decryptSigned(
            previous.signedCipher,
            `signed-attempt:${row.id}:${previous.id}`,
          ),
        ),
        next = Transaction.from(signed.bytes),
        budget =
          (BigInt(
            (row.feeSnapshot as { networkFee?: string }).networkFee ??
              row.nativeFeeQuote,
          ) *
            BigInt(
              100 + live.policy.withdrawal_fee_policy.platform_variance_pct,
            )) /
          100n;
      if (
        !old.signature ||
        !next.signature ||
        old.hash !== previous.txHash ||
        next.hash !== signed.hash ||
        next.from !== old.from ||
        next.to !== old.to ||
        next.value !== old.value ||
        next.data !== old.data ||
        next.chainId !== old.chainId ||
        next.nonce !== old.nonce ||
        BigInt(next.nonce) !== BigInt(previous.nonce!) ||
        next.type !== 0 ||
        next.gasPrice === null ||
        old.gasPrice === null ||
        next.gasLimit !== old.gasLimit ||
        next.gasPrice * 100n < old.gasPrice * 110n ||
        next.gasPrice * next.gasLimit > budget ||
        prepared.intent.destination !== row.destination ||
        prepared.intent.amount !== BigInt(row.netBaseUnits) ||
        prepared.intent.nonce !== BigInt(previous.nonce!)
      )
        throw new Error("SIGNED_INTENT_INVALID");
      const [state] = await tx
        .select()
        .from(signerStates)
        .where(eq(signerStates.treasuryFingerprint, row.treasuryFingerprint))
        .for("update");
      if (
        !state ||
        (state.leaseUntil && state.leaseUntil > new Date()) ||
        BigInt(state.nextNonce) <= BigInt(previous.nonce!)
      )
        throw new Error("LEASE_LOST");
      const [reserved] = await tx
        .select({
          fee: sql<string>`coalesce(sum(${signerReservations.nativeFeeReserved}),0)::text`,
        })
        .from(signerReservations)
        .innerJoin(
          cryptoObligations,
          eq(cryptoObligations.id, signerReservations.obligationId),
        )
        .where(
          and(
            eq(signerReservations.treasuryFingerprint, row.treasuryFingerprint),
            sql`${cryptoObligations.completedAt} is null`,
            inArray(cryptoObligations.status, [
              "approved",
              "signing",
              "broadcast",
              "exception",
              "awaiting_requote",
            ]),
          ),
        );
      const [reservation] = await tx
        .select()
        .from(signerReservations)
        .where(eq(signerReservations.obligationId, row.id))
        .orderBy(sql`${signerReservations.signingDay} desc`)
        .limit(1);
      if (
        !reservation ||
        BigInt(reservation.nativeFeeReserved) < next.gasPrice * next.gasLimit
      )
        throw new Error("SIGNER_CAP_EXCEEDED");
      const [native] = await tx
        .select({ id: assets.id })
        .from(assets)
        .where(
          and(
            eq(assets.environment, "testnet"),
            eq(assets.chainId, (row.registrySnapshot as AssetRegistry).network),
            eq(assets.symbol, row.chain === "eth" ? "ETH" : "BNB"),
          ),
        )
        .limit(1);
      if (!native) throw new Error("SIGNER_INTENT_DENIED");
      const liabilities = await tx
        .select({
          asset: ledgerAccounts.assetId,
          amount: sql<string>`coalesce(sum(case when ${ledgerPostings.direction}='credit' then ${ledgerPostings.amountBaseUnits} else -${ledgerPostings.amountBaseUnits} end),0)::text`,
        })
        .from(ledgerAccounts)
        .leftJoin(
          ledgerPostings,
          eq(ledgerPostings.accountId, ledgerAccounts.id),
        )
        .where(
          and(
            inArray(ledgerAccounts.assetId, [native.id, row.assetId]),
            inArray(ledgerAccounts.purpose, [
              "available_payable",
              "held_payable",
              "refund_payable",
              "incoming_payable",
              "unallocated_payable",
              "marketing_payable",
              "developer_payable",
              "bootstrap_developer_payable",
              "bootstrap_marketing_payable",
            ]),
          ),
        )
        .groupBy(ledgerAccounts.assetId);
      const liability = (id: string) =>
        BigInt(liabilities.find((v) => v.asset === id)?.amount ?? "0");
      if (
        nativeAvailable < liability(native.id) + BigInt(reserved.fee) + BigInt((row.feeSnapshot as {nativeFloor?:string}).nativeFloor??"0") ||
        assetAvailable < liability(row.assetId)
      )
        throw new Error("SIGNER_CAP_EXCEEDED");
      const id = crypto.randomUUID(),
        scope = `signed-attempt:${row.id}:${id}`;
      await tx
        .insert(signedAttempts)
        .values({
          id,
          previousAttemptId: previous.id,
          signedAtHeight: height.toString(),
          obligationId: row.id,
          attempt: previous.attempt + 1,
          environment: "testnet",
          chain: row.chain,
          txHash: signed.hash,
          nonce: previous.nonce,
          signedCipher: encryptSigned(signed.bytes, scope),
          nativeFeeCap: (next.gasLimit * next.gasPrice).toString(),
          intentHash: crypto
            .createHash("sha256")
            .update(canonical(prepared.intent))
            .digest("hex"),
          configurationHash: row.configurationHash,
        });
      await tx
        .update(signerStates)
        .set({ heartbeatAt: sql`clock_timestamp()` })
        .where(eq(signerStates.treasuryFingerprint, state.treasuryFingerprint));
      return { id, scope, signed };
    });
  }
  async pauseUnsigned(id: string) {
    return this.context(async (tx) => {
      const [row] = await tx
        .select()
        .from(cryptoObligations)
        .where(eq(cryptoObligations.id, id))
        .for("update");
      if (!row || !["approved", "signing"].includes(row.status)) return false;
      const [attempt] = await tx
        .select({ id: signedAttempts.id })
        .from(signedAttempts)
        .where(eq(signedAttempts.obligationId, id))
        .limit(1);
      if (attempt) return false;
      await tx
        .update(cryptoObligations)
        .set({ status: "awaiting_requote" })
        .where(eq(cryptoObligations.id, id));
      return true;
    });
  }
  async bindTronExpiry(id: string, expiresAt: Date) {
    return this.context((tx) =>
      tx
        .update(signedAttempts)
        .set({ expiresAt })
        .where(
          and(
            eq(signedAttempts.id, id),
            eq(signedAttempts.chain, "tron"),
            sql`${signedAttempts.expiresAt} is null`,
          ),
        ),
    );
  }
  async observed(
    id: string,
    state: "confirmed" | "failed" | "expired",
    actualNativeFee: bigint,
  ) {
    return this.context(async (tx) => {
      await tx
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
        );
      const [winner] = await tx
        .select()
        .from(signedAttempts)
        .where(eq(signedAttempts.id, id))
        .limit(1);
      if (
        winner &&
        ["eth", "bnb"].includes(winner.chain) &&
        ["confirmed", "failed"].includes(winner.status)
      )
        await tx
          .update(signedAttempts)
          .set({
            status: "superseded",
            actualNativeFee: "0",
            confirmedAt: sql`clock_timestamp()`,
          })
          .where(
            and(
              eq(signedAttempts.obligationId, winner.obligationId),
              eq(signedAttempts.nonce, winner.nonce!),
              sql`${signedAttempts.id}<>${winner.id}`,
              inArray(signedAttempts.status, ["signed", "broadcast"]),
            ),
          );
    });
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
