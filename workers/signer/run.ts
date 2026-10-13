import crypto from "node:crypto";
import { SignerStore, decryptSigned } from "./store";
import { signPrepared } from "./sign";
import { assertIsolated } from "./keys";
import { runtimeAdapter } from "../../packages/chains/src/runtime";
import {
  readRegistry,
  registryFingerprint,
} from "../../packages/chains/src/registry";
import { feeWithinVariance } from "../../packages/domain/src/fees";
import type {
  AssetRegistry,
  SignedTransfer,
} from "../../packages/chains/src/types";
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
async function report(attemptId: string, eventIndex: number) {
  const origin = new URL(process.env.FINANCIAL_API_ORIGIN ?? "");
  if (
    origin.protocol !== "https:" &&
    !(
      process.env.CHAIN_FIXTURE_MODE === "isolated" &&
      origin.protocol === "http:" &&
      origin.hostname === "127.0.0.1"
    )
  )
    throw new Error("WORKLOAD_UNAVAILABLE");
  const raw = process.env.FINANCIAL_WORKER_AUTH_KEY ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) throw new Error("WORKLOAD_UNAVAILABLE");
  const key = Buffer.from(raw, "base64url"),
    url = new URL("/api/v1/internal/financial", origin),
    timestamp = String(Math.floor(Date.now() / 1000)),
    nonce = crypto.randomUUID(),
    body = JSON.stringify({
      action: "settle",
      attempt_id: attemptId,
      event_index: eventIndex,
    }),
    digest = crypto.createHash("sha256").update(body).digest("hex");
  try {
    const signature = crypto
        .createHmac("sha256", key)
        .update(
          [
            "v1",
            "testnet",
            "financial",
            "POST",
            url.pathname,
            timestamp,
            nonce,
            digest,
          ].join("\n"),
        )
        .digest("base64url"),
      response = await fetch(url, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          "x-worker-environment": "testnet",
          "x-worker-timestamp": timestamp,
          "x-worker-nonce": nonce,
          "x-worker-signature": signature,
        },
        body,
        signal: AbortSignal.timeout(20000),
      });
    if (!response.ok) throw new Error("WORKLOAD_UNAVAILABLE");
    const content = await response.text();
    if (Buffer.byteLength(content) > 16384)
      throw new Error("WORKLOAD_UNAVAILABLE");
    return JSON.parse(content).data as {
      status: string;
      attempt_state?: string;
    };
  } finally {
    key.fill(0);
  }
}
export async function runSignerOnce() {
  assertIsolated();
  const store = new SignerStore();
  let processed = 0,
    paused = 0;
  try {
    const rows = await store.pending();
    for (const row of rows) {
      if (stopping) break;
      try {
        const asset = row.registrySnapshot as AssetRegistry,
          chain = await runtimeAdapter(asset),
          attempts = await store.attempts(row.id);
        const config = await store.configuration(asset),
          implementationComplete = false,
          active =
            implementationComplete &&
            process.env.FINANCIAL_ACTIVATION === "testnet-reviewed" &&
            process.env.FINANCIAL_CONFIG_APPROVAL === config.hash &&
            process.env.ALERT_ACCEPTANCE_FINGERPRINT === config.hash &&
            (await store.activation(config.hash));
        if (attempts.length) {
          for (const attempt of attempts) {
            if (stopping) break;
            if (["confirmed", "failed"].includes(attempt.status)) continue;
            const signed: SignedTransfer = {
                bytes: decryptSigned(
                  attempt.signedCipher,
                  `signed-attempt:${row.id}:${attempt.id}`,
                ),
                hash: attempt.txHash,
                nonce:
                  attempt.nonce === null ? undefined : BigInt(attempt.nonce),
                validUntilHeight:
                  attempt.validUntilHeight === null
                    ? undefined
                    : BigInt(attempt.validUntilHeight),
              },
              proof = await chain.getTransactionStatus(asset, signed);
            if (
              ["confirmed", "failed"].includes(proof.state) &&
              !proof.contradiction &&
              proof.actualNativeFee !== undefined
            ) {
              const recorded = await report(
                attempt.id,
                Math.max(0, proof.index),
              );
              if (
                recorded.status === "settled" ||
                recorded.attempt_state === "failed"
              )
                await store.observed(
                  attempt.id,
                  proof.state as "confirmed" | "failed",
                  proof.actualNativeFee,
                );
            } else if (
              active &&
              !proof.contradiction &&
              (!signed.validUntilHeight ||
                (await chain.currentBlockHeight()) <= signed.validUntilHeight)
            ) {
              await chain.broadcastSigned(signed);
              await store.broadcast(attempt.id);
            }
          }
          processed++;
          continue;
        }
        if (
          !active ||
          config.hash !== row.configurationHash ||
          registryFingerprint(readRegistry()) !== row.registryHash ||
          row.quoteExpiresAt <= new Date()
        ) {
          paused++;
          continue;
        }
        const sender = config.addresses.RECEIVING;
        if (!sender) throw new Error("DESTINATION_NOT_CONFIGURED");
        const amount = BigInt(row.netBaseUnits),
          [assetAvailable, nativeAvailable] = await Promise.all([
            chain.getBalance(asset, sender, true),
            chain.getNativeBalance(sender, true),
          ]);
        if (assetAvailable < amount) throw new Error("SIGNER_CAP_EXCEEDED");
        const fee = await chain.estimateFee({
          asset,
          sender,
          destination: row.destination,
          amount,
        });
        if (
          !feeWithinVariance(
            BigInt(row.nativeFeeQuote),
            fee.nativeFee,
            config.policy.withdrawal_fee_policy.platform_variance_pct,
          )
        )
          throw new Error("FEE_REQUOTE_REQUIRED");
        const nonce =
            "pendingNonce" in chain
              ? await (
                  chain as typeof chain & {
                    pendingNonce(address: string): Promise<bigint>;
                  }
                ).pendingNonce(sender)
              : 0n,
          claim = await store.claim(
            row.id,
            config.hash,
            nonce,
            nativeAvailable,
            fee.nativeFee,
          );
        if (stopping) break;
        const prepared = await chain.buildTransfer({
            asset,
            sender,
            destination: row.destination,
            amount,
            nonce: claim.nonce,
            fee,
          }),
          signed = await signPrepared(prepared, fee.nativeFee),
          saved = await store.persist(claim, prepared, signed);
        // Only a successfully persisted attempt may cross the broadcast boundary.
        if (!stopping) {
          await chain.broadcastSigned(saved.signed);
          await store.broadcast(saved.id);
        }
        processed++;
      } catch {
        paused++; /* Rows, holds, leases and signed bytes remain for recovery. No sensitive exception is logged. */
      }
    }
    return { processed, paused, stopping };
  } finally {
    await store.close();
  }
}
if (process.argv.includes("--once"))
  runSignerOnce()
    .then((value) => console.log(JSON.stringify(value)))
    .catch(() => {
      console.error("SIGNER_RUN_FAILED");
      process.exitCode = 1;
    });
