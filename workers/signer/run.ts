import { prepareEvmReplacement } from "./evm-replacement";
import crypto from "node:crypto";
import { SignerStore, decryptSigned } from "./store";
import { signPrepared } from "./sign";
import { assertIsolated,withSigningKey } from "./keys";
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
async function report(
  attemptId: string,
  eventIndex: number,
  action: "settle" | "expiry" = "settle",
) {
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
      action,
      attempt_id: attemptId,
      ...(action === "settle" ? { event_index: eventIndex } : {}),
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
    const heartbeats=new Set<string>();
    for(const asset of readRegistry().filter(v=>v.enabled&&v.verified)){
      if(stopping)break;
      try{const config=await store.configuration(asset);if(heartbeats.has(config.treasuryFingerprint)||!config.addresses.RECEIVING)continue;const chain=await runtimeAdapter(asset);await withSigningKey(asset.chain,asset.network,async(_key,address)=>{if(await chain.normalizeAddress(address)!==config.addresses.RECEIVING)throw new Error("SIGNER_ADDRESS_MISMATCH")});await Promise.all([chain.currentBlockHeight(),chain.getNativeBalance(config.addresses.RECEIVING,true)]);await store.heartbeat(asset);heartbeats.add(config.treasuryFingerprint);}catch{paused++;}
    }
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
          const observations = [];
          for (const attempt of attempts) {
            if (stopping) break;
            if (
              ["confirmed", "failed", "expired", "superseded"].includes(
                attempt.status,
              )
            )
              continue;
            const signed: SignedTransfer = {
              bytes: decryptSigned(
                attempt.signedCipher,
                `signed-attempt:${row.id}:${attempt.id}`,
              ),
              hash: attempt.txHash,
              nonce: attempt.nonce === null ? undefined : BigInt(attempt.nonce),
              validUntilHeight:
                attempt.validUntilHeight === null
                  ? undefined
                  : BigInt(attempt.validUntilHeight),
            };
            if (asset.chain === "tron" && !attempt.expiresAt) {
              const expiration = BigInt(
                JSON.parse(signed.bytes).raw_data.expiration,
              );
              if (expiration > 8640000000000000n || expiration <= 0n)
                throw new Error("SIGNED_INTENT_INVALID");
              await store.bindTronExpiry(
                attempt.id,
                new Date(parseInt(expiration.toString(), 10)),
              );
            }
            const proof = await chain.getTransactionStatus(asset, signed);
            observations.push({ attempt, signed, proof });
          }
          // Check all known hashes before any rebroadcast or new signature.
          const winners = observations.filter(
            (v) =>
              ["confirmed", "failed"].includes(v.proof.state) &&
              !v.proof.contradiction &&
              v.proof.actualNativeFee !== undefined,
          );
          if (winners.length > 1)
            throw new Error("CONTRADICTORY_ATTEMPT_OUTCOMES");
          if (winners.length) {
            const { attempt, proof } = winners[0],
              recorded = await report(attempt.id, Math.max(0, proof.index));
            if (
              recorded.status === "settled" ||
              recorded.attempt_state === "failed"
            )
              await store.observed(
                attempt.id,
                proof.state as "confirmed" | "failed",
                proof.actualNativeFee!,
              );
          } else if (observations.length && chain.proveExpiry) {
            for (const value of observations) {
              const validity = {
                lastValidHeight: value.signed.validUntilHeight,
                expiresAt:
                  asset.chain === "tron"
                    ? new Date(
                        parseInt(
                          BigInt(
                            JSON.parse(value.signed.bytes).raw_data.expiration,
                          ).toString(),
                          10,
                        ),
                      )
                    : undefined,
              };
              if (
                !value.proof.contradiction &&
                (await chain.proveExpiry(value.attempt.txHash, validity))
              ) {
                const recorded = await report(value.attempt.id, 0, "expiry");
                if (recorded.attempt_state === "expired")
                  await store.observed(value.attempt.id, "expired", 0n);
              } else if (active && !stopping && !value.proof.contradiction) {
                const unexpired =
                  asset.chain === "tron"
                    ? BigInt(
                        JSON.parse(value.signed.bytes).raw_data.expiration,
                      ) > BigInt(Date.now())
                    : value.signed.validUntilHeight !== undefined &&
                      (await chain.currentBlockHeight()) <=
                        value.signed.validUntilHeight;
                if (unexpired) {
                  await chain.broadcastSigned(value.signed);
                  await store.broadcast(value.attempt.id);
                }
              }
            }
          } else if (active && !stopping && observations.length) {
            const latest = observations.at(-1)!;
            if (!latest.proof.contradiction) {
              let saved: { id: string; signed: SignedTransfer } | undefined;
              if (
                ["eth", "bnb"].includes(asset.chain) &&
                latest.attempt.signedAtHeight !== null &&
                latest.attempt.attempt <=
                  config.policy.crypto_monitor_policy.replacement_attempts
              ) {
                const sender = row.treasurySender;
                if (!sender) throw new Error("HISTORICAL_SENDER_REQUIRED");
                const prepared = await prepareEvmReplacement(
                  chain,
                  asset,
                  latest.signed,
                  {
                    sender,
                    destination: row.destination,
                    amount: BigInt(row.netBaseUnits),
                    approvedNetworkFee: BigInt(
                      (row.feeSnapshot as { networkFee?: string }).networkFee ??
                        row.nativeFeeQuote,
                    ),
                    variancePercent:
                      config.policy.withdrawal_fee_policy.platform_variance_pct,
                    signedAtHeight: BigInt(latest.attempt.signedAtHeight),
                    stuckBlocks:
                      config.policy.crypto_monitor_policy.stuck_blocks,
                  },
                );
                if (prepared) {
                  const signed = await signPrepared(
                      prepared,
                      prepared.intent.fee.nativeFee,
                    ),
                    [nativeAvailable, assetAvailable] = await Promise.all([
                      chain.getNativeBalance(sender, true),
                      chain.getBalance(asset, sender, true),
                    ]);
                  saved = await store.persistEvmReplacement(
                    latest.attempt.id,
                    prepared,
                    signed,
                    await chain.currentBlockHeight(),
                    nativeAvailable,
                    assetAvailable,
                  );
                }
              }
              const send = saved ?? {
                  id: latest.attempt.id,
                  signed: latest.signed,
                },
                unexpired =
                  asset.chain === "tron"
                    ? BigInt(
                        JSON.parse(send.signed.bytes).raw_data.expiration,
                      ) > BigInt(Date.now())
                    : !send.signed.validUntilHeight ||
                      (await chain.currentBlockHeight()) <=
                        send.signed.validUntilHeight;
              if (unexpired && !stopping) {
                await chain.broadcastSigned(send.signed);
                await store.broadcast(send.id);
              }
            }
          }
          processed++;
          continue;
        }
        if (row.quoteExpiresAt <= new Date()) {
          await store.pauseUnsigned(row.id);
          paused++;
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
            BigInt(
              (row.feeSnapshot as { networkFee?: string }).networkFee ??
                row.nativeFeeQuote,
            ),
            fee.networkFee ?? fee.nativeFee,
            config.policy.withdrawal_fee_policy.platform_variance_pct,
          ) ||
          (fee.accountSetupCost ?? 0n) >
            BigInt(
              (row.feeSnapshot as { accountSetupCost?: string })
                .accountSetupCost ?? "0",
            )
        ) {
          await store.pauseUnsigned(row.id);
          paused++;
          continue;
        }
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
            assetAvailable,
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
          saved = await store.persist(
            claim,
            prepared,
            signed,
            await chain.currentBlockHeight(),
          );
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
