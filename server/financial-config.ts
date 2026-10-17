import {scopedDatabaseBinding} from '../packages/db/src/binding-fingerprint';
import {
  runtimeAdapter,
  configurationSnapshot,
  financialPolicySnapshot,
} from "../packages/chains/src/runtime";
import { acceptedAlert } from "./financial-alerts";
import {assertFinancialEnvironment} from './financial-environment';
import {assertFinancialActivationPolicy,financialConfigurationApproved,nativePaymentExecutionSupported as financialImplementationComplete} from '@gifters/config';
export {nativePaymentExecutionSupported as financialImplementationComplete} from '@gifters/config';
export {assertFinancialEnvironment,financialEnvironmentIn} from './financial-environment';
import { z } from "zod";
import {
  chainEnvironmentSuffix,
  readRegistry,
  assertActive,
  type AssetRegistry,
} from "@gifters/chains";
import { sql } from "drizzle-orm";
import { readManifest, type DbExecutor } from "@gifters/db";
const addressRoles = [
  "RECEIVING",
  "DEV",
  "MARKETING",
  "BOOTSTRAP",
  "SWEEP",
] as const;
type Role = (typeof addressRoles)[number];
export function registryAsset(key: string) {
  const environment=assertFinancialEnvironment(),rows = readRegistry(),
    asset = rows.find((v) => v.key === key&&v.environment===environment);
  if (!asset) throw new Error("REGISTRY_NOT_PROVISIONED");
  assertActive(asset);
  return asset;
}
export const adapter = runtimeAdapter;
export async function platformAddress(asset: AssetRegistry, role: Role) {
  const value = process.env[`PLATFORM_${role}_ADDRESS_${chainEnvironmentSuffix(asset.chain,asset.environment)}`];
  if (!value) throw new Error("DESTINATION_NOT_CONFIGURED");
  return (await adapter(asset)).normalizeAddress(value);
}
export async function financialConfiguration(
  tx: DbExecutor,
  asset: AssetRegistry,
) {
  await tx.execute(
    sql`select pg_advisory_xact_lock_shared(hashtextextended('financial-policy',0))`,
  );
  return configurationSnapshot(
    asset,
    financialPolicySnapshot(await readManifest(tx),await scopedDatabaseBinding(tx)),
  );
}
export async function assertExternalActivation(
  tx: DbExecutor,
  configurationHash: string,
) {
  if (
    process.env.CHAIN_FIXTURE_MODE === "isolated" &&
    process.env.APP_ENV === "simulation" &&
    process.env.VERCEL !== "1"
  )
    return;
  const environment=assertFinancialEnvironment();
  if (
    !financialImplementationComplete ||
    !/^[a-f0-9]{64}$/.test(configurationHash) ||
    !financialConfigurationApproved(configurationHash) ||
    process.env.FINANCIAL_ACTIVATION !== `${environment}-reviewed` ||
    !process.env.ALERT_WEBHOOK_URL
  )
    throw new Error("FINANCIAL_SAFETY_PAUSE");
  assertFinancialActivationPolicy(await readManifest(tx),environment);
  if (!(await acceptedAlert(tx, configurationHash)))
    throw new Error("FINANCIAL_SAFETY_PAUSE");
  z.string()
    .url()
    .refine((v) => new URL(v).protocol === "https:")
    .parse(process.env.ALERT_WEBHOOK_URL);
}
export function assertRegistryBinding(
  asset: {
    registryBinding: unknown;
    decimals: number;
    chainId: string;
    environment: string;
  },
  registry: AssetRegistry,
) {
  const expected = {
    key: registry.key,
    chain: registry.chain,
    network: registry.network,
    kind: registry.kind,
    decimals: registry.decimals,
    contract: registry.contract
      ? ["eth", "bnb"].includes(registry.chain)
        ? registry.contract.toLowerCase()
        : registry.contract
      : null,
    mint: registry.mint ?? null,
  };
  const binding = asset.registryBinding as Record<string, unknown> | null;
  if (
    asset.environment !== registry.environment ||
    asset.decimals !== registry.decimals ||
    asset.chainId !== registry.network ||
    (!binding &&
      !(
        process.env.APP_ENV === "simulation" &&
        process.env.CHAIN_FIXTURE_MODE === "isolated" &&
        process.env.VERCEL !== "1"
      )) ||
    (binding &&
      Object.entries(expected).some(([key, value]) => binding[key] !== value))
  )
    throw new Error("REGISTRY_VERSION_CONFLICT");
}
