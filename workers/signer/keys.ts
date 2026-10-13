import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";
import type { Chain } from "../../packages/chains/src/types";
const keyFile = z
  .object({
    version: z.literal(1),
    chain: z.enum(["eth", "bnb", "sol", "tron"]),
    environment: z.literal("testnet"),
    network: z.string().min(1).max(100),
    publicAddress: z.string().min(1).max(100),
    salt: z.string(),
    iv: z.string(),
    tag: z.string(),
    cipher: z.string(),
  })
  .strict();
export function assertIsolated() {
  if (
    process.env.APP_ENV !== "testnet" ||
    process.env.SIGNER_PROVIDER !== "encrypted_worker" ||
    process.env.VERCEL === "1" ||
    process.env.MAINNET_ENABLED === "true"
  )
    throw new Error("SIGNER_SCOPE_DENIED");
  for (const name of [
    "AUTH_ACCESS_KEY",
    "AUTH_ACCESS_PREVIOUS_KEY",
    "MFA_ENCRYPTION_KEY",
    "DATA_EXPORT_KEY",
    "EXPORT_ENCRYPTION_KEY",
    "GOOGLE_CLIENT_SECRET",
    "CAPTCHA_SECRET_KEY",
    "DATABASE_MIGRATION_URL",
    "SIMULATION_TOOL_AUTH_KEY",
  ])
    if (process.env[name]) throw new Error("SIGNER_SECRET_SCOPE_MIXED");
}
export async function withSigningKey<T>(
  chain: Chain,
  network: string,
  fn: (key: Buffer, address: string) => Promise<T>,
) {
  assertIsolated();
  const filename = process.env.SIGNER_KEY_FILE,
    secret = process.env.SIGNER_DECRYPTION_SECRET;
  if (!filename || !secret || secret.length < 32 || secret.length > 1024)
    throw new Error("SIGNER_KEY_UNAVAILABLE");
  const stat = fs.statSync(filename);
  if (!stat.isFile() || stat.size > 4096 || (stat.mode & 0o077) !== 0)
    throw new Error("SIGNER_KEY_UNAVAILABLE");
  let derived: Buffer | undefined, plain: Buffer | undefined;
  try {
    const record = keyFile.parse(JSON.parse(fs.readFileSync(filename, "utf8")));
    if (record.chain !== chain || record.network !== network) throw Error();
    const salt = Buffer.from(record.salt, "base64url"),
      iv = Buffer.from(record.iv, "base64url"),
      tag = Buffer.from(record.tag, "base64url");
    if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16)
      throw Error();
    derived = crypto.scryptSync(secret, salt, 32, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
    const decipher = crypto.createDecipheriv("aes-256-gcm", derived, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(
      Buffer.from(
        `gw-signer-key-v1:${chain}:${network}:testnet:${record.publicAddress}`,
      ),
    );
    plain = Buffer.concat([
      decipher.update(Buffer.from(record.cipher, "base64url")),
      decipher.final(),
    ]);
    if (plain.length !== (chain === "sol" ? 64 : 32)) throw Error();
    return await fn(plain, record.publicAddress);
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "SIGNED_INTENT_INVALID",
        "SIGNER_ADDRESS_MISMATCH",
        "MAINNET_DENIED",
      ].includes(error.message)
    )
      throw error;
    throw new Error("SIGNER_KEY_UNAVAILABLE");
  } finally {
    derived?.fill(0);
    plain?.fill(0);
  }
}
