import {assertNetworkBinding} from './network';
import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";
import type { AssetRegistry, AssetKey } from "./types";
const schema = z
  .object({
    key: z.enum([
      "eth",
      "bnb",
      "sol",
      "usdt_bnb",
      "usdt_sol",
      "usdt_tron",
      "jaga_bnb",
      "trx",
    ]),
    chain: z.enum(["eth", "bnb", "sol", "tron"]),
    environment: z.enum(["testnet","mainnet"]),
    network: z.string().min(1).max(100),
    kind: z.enum(["native", "token"]),
    decimals: z.number().int().min(0).max(78),
    contract: z.string().max(100).optional(),
    mint: z.string().max(100).optional(),
    enabled: z.boolean(),
    verified: z.boolean(),
    source: z
      .string()
      .url()
      .refine((v) =>
        (() => {
          const u = new URL(v);
          return (
            u.protocol === "https:" && !u.username && !u.password && !u.search
          );
        })(),
      ),
    verifiedAt: z.string().datetime(),
    explorer: z
      .string()
      .url()
      .refine((v) =>
        (() => {
          const u = new URL(v);
          return (
            u.protocol === "https:" && !u.username && !u.password && !u.search
          );
        })(),
      ),
    finality: z
      .object({
        mode: z.enum(["finalized", "depth", "solidified"]),
        depth: z.number().int().min(1).max(10000).optional(),
      })
      .strict(),
    dust: z.string().regex(/^(0|[1-9][0-9]{0,77})$/),
  })
  .strict();
const families: Record<
  AssetKey,
  ["eth" | "bnb" | "sol" | "tron", "native" | "token"]
> = {
  eth: ["eth", "native"],
  bnb: ["bnb", "native"],
  sol: ["sol", "native"],
  usdt_bnb: ["bnb", "token"],
  usdt_sol: ["sol", "token"],
  usdt_tron: ["tron", "token"],
  jaga_bnb: ["bnb", "token"],
  trx: ["tron", "native"],
};
export function validateRegistry(value: unknown): AssetRegistry[] {
  const rows = z.array(schema).max(8).parse(value);
  const seen = new Set<string>();
  for (const row of rows) {
    const family = families[row.key];
    if (seen.has(row.key) || row.chain !== family[0] || row.kind !== family[1])
      throw new Error("REGISTRY_INVALID");
    seen.add(row.key);
    assertNetworkBinding(row);
    if (
      row.kind === "native" &&
      row.decimals !== (row.chain === "sol" ? 9 : row.chain === "tron" ? 6 : 18)
    )
      throw new Error("REGISTRY_INVALID");
    if (
      row.kind === "token" &&
      !(row.chain === "sol" ? row.mint : row.contract)
    )
      throw new Error("REGISTRY_INVALID");
    if (
      (row.kind === "native" && (row.contract || row.mint)) ||
      (row.chain === "sol" && row.contract) ||
      (row.chain !== "sol" && row.mint)
    )
      throw new Error("REGISTRY_INVALID");
    if (row.enabled && !row.verified) throw new Error("REGISTRY_UNVERIFIED");
    if (row.finality.mode === "depth" && !row.finality.depth)
      throw new Error("REGISTRY_INVALID");
    if (
      (row.chain === "tron" && row.finality.mode !== "solidified") ||
      (row.chain === "sol" && row.finality.mode !== "finalized") ||
      (["eth", "bnb"].includes(row.chain) && !["depth", "finalized"].includes(row.finality.mode))
    )
      throw new Error("REGISTRY_INVALID");
  }
  return rows;
}
export function readRegistry(env: NodeJS.ProcessEnv = process.env) {
  const file = env.ASSET_REGISTRY_FILE;
  const json = env.ASSET_REGISTRY_JSON;
  if (file && json) throw new Error('REGISTRY_SOURCE_CONFLICT');
  if (json !== undefined) {
    if (!json.trim() || Buffer.byteLength(json, 'utf8') > 65536) throw new Error('REGISTRY_INVALID');
    try { return validateRegistry(JSON.parse(json)); }
    catch { throw new Error('REGISTRY_INVALID'); }
  }
  if (!file) return [];
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 65536) throw new Error("REGISTRY_INVALID");
  return validateRegistry(JSON.parse(fs.readFileSync(file, "utf8")));
}
export function registryFingerprint(rows: AssetRegistry[]) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify([...rows].sort((a, b) => a.key.localeCompare(b.key))),
    )
    .digest("hex");
}
export function assetReadiness(key: AssetKey) {
  const row = readRegistry().find((r) => r.key === key);
  return row?.enabled && row.verified
    ? { enabled: true, reason: null, asset: row }
    : {
        enabled: false,
        reason: row ? "ASSET_DISABLED" : "REGISTRY_NOT_PROVISIONED",
        asset: row ?? null,
      };
}
export function assertActive(asset: AssetRegistry) {
  validateRegistry([asset]);
  if (!asset.enabled || !asset.verified) throw new Error("REGISTRY_UNVERIFIED");
  // Mainnet records may be validated/staged before the full execution release.
  if(asset.environment!=="testnet")throw new Error("MAINNET_NOT_IMPLEMENTED");
  if (process.env.MAINNET_ENABLED === "true") throw new Error("MAINNET_DENIED");
}
/** Non-sending adapters validate staged network/asset metadata. Their RPC
 * capability separately limits observation or unsigned preparation. */
export function assertAdapterAsset(asset:AssetRegistry,nonSendingOnly=false){
  if(!nonSendingOnly)return assertActive(asset);
  validateRegistry([asset]);
  if(!asset.enabled||!asset.verified)throw new Error('REGISTRY_UNVERIFIED');
  if(process.env.MAINNET_ENABLED==='true')throw new Error('MAINNET_DENIED');
}
