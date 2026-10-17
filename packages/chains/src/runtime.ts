import {chainEnvironmentSuffix} from './network';
import crypto from "node:crypto";
import { chainAdapter } from "./index";
import { readRegistry, registryFingerprint } from "./registry";
import type { AssetRegistry } from "./types";
export const addressRoles = [
  "RECEIVING",
  "DEV",
  "MARKETING",
  "BOOTSTRAP",
  "SWEEP",
] as const;
export const chainSuffix = chainEnvironmentSuffix;
export function runtimeAdapter(asset: AssetRegistry) {
  const label = chainSuffix(asset.chain,asset.environment),
    primary = process.env[`RPC_PRIMARY_${label}`],
    secondary = process.env[`RPC_SECONDARY_${label}`];
  if (!primary || !secondary) throw new Error("RPC_UNAVAILABLE");
  return chainAdapter(asset, {
    primary,
    secondary,
    timeoutMs: 5000,
    requestsPerSecond: 3,
    fixture:
      process.env.CHAIN_FIXTURE_MODE === "isolated" &&
      process.env.VERCEL !== "1",
  });
}
export async function configurationSnapshot(
  asset: AssetRegistry,
  effective: unknown,
) {
  const chain = await runtimeAdapter(asset),
    addresses: Record<string, string> = {};
  for (const role of addressRoles) {
    const value =
      process.env[`PLATFORM_${role}_ADDRESS_${chainSuffix(asset.chain,asset.environment)}`];
    if (value) addresses[role] = await chain.normalizeAddress(value);
  }
  const hard = (key: string, fallback: number) => {
    const raw = process.env[key] ?? String(fallback);
    if (!/^[1-9][0-9]{0,8}$/.test(raw))
      throw new Error("CONFIGURATION_INVALID");
    return raw;
  };
  const alertBinding = crypto
      .createHash("sha256")
      .update(
        (process.env.ALERT_WEBHOOK_URL ?? "") +
          "|" +
          (process.env.ALERT_WEBHOOK_KEY ?? ""),
      )
      .digest("hex"),
    registry = registryFingerprint(readRegistry());
  const values = {
    alertBinding,
    environment: asset.environment,
    chain: asset.chain,
    network: asset.network,
    registry,
    addresses,
    limits: {
      perTx: hard("SIGNER_HARD_PER_TX_USD", 5000),
      daily: hard("SIGNER_HARD_DAILY_PER_ASSET_USD", 10000),
      auto: hard("SIGNER_HARD_AUTO_APPROVE_USD", 100),
    },
    effective,
  };
  return {
    hash: crypto
      .createHash("sha256")
      .update(JSON.stringify(values))
      .digest("hex"),
    registryHash: registry,
    treasuryFingerprint: crypto
      .createHash("sha256")
      .update(
        [asset.environment, asset.chain, asset.network, addresses.RECEIVING ?? ""].join(
          "|",
        ),
      )
      .digest("hex"),
    addresses,
  };
}

export function financialPolicySnapshot(policy: Record<string, unknown>,databaseBinding:string) {
  if(!/^[a-f0-9]{64}$/.test(databaseBinding))throw new Error('DATABASE_BINDING_UNAVAILABLE');
  return {database_binding:databaseBinding,...Object.fromEntries(
    [
      "payout_limits",
      "withdrawal_fee_policy",
      "price_max_age_minutes",
      "wallet_change_cooloff_hours",
      "business_settlement_policy",
      "empty_queue_policy",
      "bootstrap_destination_role",
      "feature_wallets",
      "feature_gifts",
      "mainnet_enabled","deployment_profile","feature_transparency","feature_simulation","activity_presentation","financial_readiness_record",
    ].map((key) => [key, policy[key]]),
  )};
}
