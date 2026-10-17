import fs from "node:fs";
import {openKeyEnvelope} from './key-envelope';
import type { Chain,FinancialEnvironment } from "../../packages/chains/src/types";
export function assertIsolated():FinancialEnvironment {
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
  return 'testnet';
}
export async function withSigningKey<T>(
  chain: Chain,
  network: string,
  fn: (key: Buffer, address: string) => Promise<T>,
) {
  const environment=assertIsolated();
  const filename = process.env.SIGNER_KEY_FILE,
    secret = process.env.SIGNER_DECRYPTION_SECRET;
  if (!filename || !secret || secret.length < 32 || secret.length > 1024)
    throw new Error("SIGNER_KEY_UNAVAILABLE");
  let plain: Buffer | undefined, fd: number | undefined;
  try {
    // Inspect and read the same open file; reject symlinks and public modes.
    fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
    const stat=fs.fstatSync(fd);
    if(!stat.isFile()||stat.size>4096||(stat.mode&0o077)!==0)throw new Error();
    const opened=openKeyEnvelope(JSON.parse(fs.readFileSync(fd,'utf8')),{chain,network,environment},secret);
    plain=opened.bytes;
    return await fn(plain,opened.address);
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
    plain?.fill(0);
    if(fd!==undefined)fs.closeSync(fd);
  }
}
