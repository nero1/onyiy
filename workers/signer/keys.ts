import fs from "node:fs";
import {openKeyEnvelope} from './key-envelope';
import type { Chain,FinancialEnvironment } from "../../packages/chains/src/types";
import {nativePaymentEnvironment} from '../../packages/config/src/index';
import {z} from 'zod';
export function signerKeyFile(chain:Chain){
 const mapping=process.env.SIGNER_KEY_FILES_JSON,single=process.env.SIGNER_KEY_FILE;
 if(mapping!==undefined){
  if(single||Buffer.byteLength(mapping)>4096)throw new Error('SIGNER_KEY_UNAVAILABLE');
  try{const filename=z.object({eth:z.string().min(1).max(1024).optional(),bnb:z.string().min(1).max(1024).optional(),sol:z.string().min(1).max(1024).optional(),tron:z.string().min(1).max(1024).optional()}).strict().parse(JSON.parse(mapping))[chain];if(!filename)throw Error();return filename}catch{throw new Error('SIGNER_KEY_UNAVAILABLE')}
 }
 if(!single)throw new Error('SIGNER_KEY_UNAVAILABLE');
 return single;
}
export function assertIsolated():FinancialEnvironment {
  if (
    !['testnet','mainnet'].includes(process.env.APP_ENV??'') ||
    process.env.SIGNER_PROVIDER !== "encrypted_worker" ||
    process.env.VERCEL === "1"
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
  try{return nativePaymentEnvironment()}catch{throw new Error('SIGNER_SCOPE_DENIED')}
}
export async function withSigningKey<T>(
  chain: Chain,
  network: string,
  fn: (key: Buffer, address: string) => Promise<T>,
) {
  const environment=assertIsolated();
  const filename = signerKeyFile(chain),
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
