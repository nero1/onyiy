import crypto from "node:crypto";
import fs from "node:fs";
import { z } from "zod";
import { Wallet } from "ethers";
import { Keypair } from "@solana/web3.js";
import { TronWeb } from "tronweb";
import { assertIsolated } from "./keys";

/** Offline operator utility. The original private input is left untouched. */
function main() {
  assertIsolated();
  const args = z
      .tuple([
        z.enum(["eth", "bnb", "sol", "tron"]),
        z.string(),
        z.string(),
        z.string(),
      ])
      .parse(process.argv.slice(2)),
    [chain, network, input, output] = args;
  if (
    !(
      {
        eth: ["11155111"],
        bnb: ["97"],
        sol: ["devnet"],
        tron: ["nile", "shasta"],
      } as const
    )[chain].some((v) => v === network)
  )
    throw new Error("MAINNET_DENIED");
  const secret = process.env.SIGNER_DECRYPTION_SECRET ?? "";
  if (secret.length < 32 || secret.length > 1024)
    throw new Error("SIGNER_KEY_UNAVAILABLE");
  const stat = fs.statSync(input);
  if (
    !stat.isFile() ||
    (stat.mode & 0o077) !== 0 ||
    stat.size !== (chain === "sol" ? 64 : 32)
  )
    throw new Error("SIGNER_KEY_UNAVAILABLE");
  const bytes = fs.readFileSync(input),
    salt = crypto.randomBytes(16),
    iv = crypto.randomBytes(12);
  let derived: Buffer | undefined;
  try {
    const publicAddress =
      chain === "sol"
        ? Keypair.fromSecretKey(bytes).publicKey.toBase58()
        : chain === "tron"
          ? TronWeb.address.fromPrivateKey(bytes.toString("hex"))
          : new Wallet("0x" + bytes.toString("hex")).address;
    if (!publicAddress) throw new Error("SIGNER_KEY_UNAVAILABLE");
    derived = crypto.scryptSync(secret, salt, 32, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
    const cipher = crypto.createCipheriv("aes-256-gcm", derived, iv);
    cipher.setAAD(
      Buffer.from(
        `gw-signer-key-v1:${chain}:${network}:testnet:${publicAddress}`,
      ),
    );
    const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]),
      record = {
        version: 1,
        chain,
        environment: "testnet",
        network,
        publicAddress,
        salt: salt.toString("base64url"),
        iv: iv.toString("base64url"),
        tag: cipher.getAuthTag().toString("base64url"),
        cipher: encrypted.toString("base64url"),
      };
    const fd = fs.openSync(output, "wx", 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(record) + "\n");
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    console.log(
      "Encrypted testnet signer key written; private input retained.",
    );
  } finally {
    bytes.fill(0);
    derived?.fill(0);
  }
}
main();
