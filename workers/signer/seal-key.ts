import fs from "node:fs";
import { z } from "zod";
import { Wallet } from "ethers";
import { Keypair } from "@solana/web3.js";
import { TronWeb } from "tronweb";
import { assertIsolated } from "./keys";
import {sealKeyEnvelope} from "./key-envelope";

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
  const inputFd=fs.openSync(input,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  let bytes:Buffer;
  try{
    const stat=fs.fstatSync(inputFd);
    if(!stat.isFile()||(stat.mode&0o077)!==0||stat.size!==(chain==='sol'?64:32))throw new Error('SIGNER_KEY_UNAVAILABLE');
    bytes=fs.readFileSync(inputFd);
    if(bytes.length!==stat.size){bytes.fill(0);throw new Error('SIGNER_KEY_UNAVAILABLE');}
  }finally{fs.closeSync(inputFd)}
  try {
    const publicAddress =
      chain === "sol"
        ? Keypair.fromSecretKey(bytes).publicKey.toBase58()
        : chain === "tron"
          ? TronWeb.address.fromPrivateKey(bytes.toString("hex"))
          : new Wallet("0x" + bytes.toString("hex")).address;
    if (!publicAddress) throw new Error("SIGNER_KEY_UNAVAILABLE");
    const record=sealKeyEnvelope({chain,network,environment:'testnet'},publicAddress,bytes,secret);
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
  }
}
main();
