import crypto from "node:crypto";
import { Wallet, getAddress, Interface } from "ethers";
import { Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { TronWeb, utils } from "tronweb";
import { base58 } from "@scure/base";
import { assertActive } from "../../packages/chains/src/registry";
import type {
  PreparedTransfer,
  SignedTransfer,
} from "../../packages/chains/src/types";
import { withSigningKey } from "./keys";
const erc20 = new Interface([
  "function transfer(address,uint256) returns (bool)",
]);
export async function signPrepared(
  prepared: PreparedTransfer,
  nativeCap: bigint,
): Promise<SignedTransfer> {
  assertActive(prepared.intent.asset);
  if (
    prepared.environment !== "testnet" ||
    prepared.network !== prepared.intent.asset.network ||
    prepared.family !== prepared.intent.asset.chain ||
    prepared.intent.amount <= 0n ||
    nativeCap < prepared.intent.fee.nativeFee
  )
    throw new Error("SIGNED_INTENT_INVALID");
  return withSigningKey(
    prepared.family,
    prepared.network,
    async (key, registered) => {
      const intent = prepared.intent;
      if (prepared.family === "eth" || prepared.family === "bnb") {
        if (!["11155111", "97"].includes(prepared.network))
          throw new Error("MAINNET_DENIED");
        const wallet = new Wallet("0x" + key.toString("hex"));
        if (
          getAddress(wallet.address) !== getAddress(registered) ||
          getAddress(wallet.address) !== getAddress(intent.sender)
        )
          throw new Error("SIGNER_ADDRESS_MISMATCH");
        const value = prepared.payload as Record<string, string | number>;
        const amount = BigInt(value.value),
          gasLimit = BigInt(value.gasLimit),
          gasPrice = BigInt(value.gasPrice),
          nonce = BigInt(value.nonce);
        const expectedData =
          intent.asset.kind === "native"
            ? "0x"
            : erc20.encodeFunctionData("transfer", [
                getAddress(intent.destination),
                intent.amount,
              ]);
        if (
          getAddress(String(value.to)) !==
            getAddress(
              intent.asset.kind === "native"
                ? intent.destination
                : intent.asset.contract!,
            ) ||
          String(value.data) !== expectedData ||
          amount !== (intent.asset.kind === "native" ? intent.amount : 0n) ||
          gasLimit * gasPrice > nativeCap ||
          BigInt(value.chainId) !== BigInt(prepared.network) ||
          nonce !== intent.nonce ||
          nonce > 9007199254740991n ||
          value.type !== 0
        )
          throw new Error("SIGNED_INTENT_INVALID");
        const bytes = await wallet.signTransaction({
          to: String(value.to),
          data: String(value.data),
          value: amount,
          gasLimit,
          gasPrice,
          nonce: parseInt(nonce.toString(), 10),
          chainId: BigInt(prepared.network),
          type: 0,
        });
        const { keccak256 } = await import("ethers");
        return { bytes, hash: keccak256(bytes), nonce };
      }
      if (prepared.family === "sol") {
        const pair = Keypair.fromSecretKey(key),
          tx = Transaction.from(
            Buffer.from(String(prepared.payload), "base64"),
          );
        if (
          pair.publicKey.toBase58() !== registered ||
          pair.publicKey.toBase58() !== intent.sender ||
          !tx.feePayer?.equals(pair.publicKey) ||
          tx.recentBlockhash !== intent.fee.validity?.blockhash
        )
          throw new Error("SIGNER_ADDRESS_MISMATCH");
        const transfers = tx.instructions.filter((i) =>
          i.programId.equals(
            intent.asset.kind === "native"
              ? SystemProgram.programId
              : TOKEN_PROGRAM_ID,
          ),
        );
        if (
          transfers.length !== 1 ||
          tx.instructions.some(
            (i) =>
              !i.programId.equals(SystemProgram.programId) &&
              !i.programId.equals(TOKEN_PROGRAM_ID) &&
              !i.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID),
          )
        )
          throw new Error("SIGNED_INTENT_INVALID");
        const transfer = transfers[0];
        if (intent.asset.kind === "native") {
          if (
            tx.instructions.length !== 1 ||
            transfer.data.readUInt32LE(0) !== 2 ||
            transfer.data.readBigUInt64LE(4) !== intent.amount ||
            transfer.keys[0].pubkey.toBase58() !== intent.sender ||
            transfer.keys[1].pubkey.toBase58() !== intent.destination
          )
            throw new Error("SIGNED_INTENT_INVALID");
        } else {
          const { PublicKey } = await import("@solana/web3.js"),
            mint = new PublicKey(intent.asset.mint!),
            from = getAssociatedTokenAddressSync(mint, pair.publicKey),
            to = getAssociatedTokenAddressSync(
              mint,
              new PublicKey(intent.destination),
            );
          if (
            transfer.data[0] !== 12 ||
            transfer.data.readBigUInt64LE(1) !== intent.amount ||
            transfer.data[9] !== intent.asset.decimals ||
            !transfer.keys[0].pubkey.equals(from) ||
            !transfer.keys[1].pubkey.equals(mint) ||
            !transfer.keys[2].pubkey.equals(to) ||
            !transfer.keys[3].pubkey.equals(pair.publicKey)
          )
            throw new Error("SIGNED_INTENT_INVALID");
          const creations = tx.instructions.filter((i) =>
            i.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID),
          );
          if (
            creations.length > 1 ||
            tx.instructions.length !== creations.length + 1 ||
            creations.some(
              (i) =>
                i.data[0] !== 1 ||
                !i.keys[0].pubkey.equals(pair.publicKey) ||
                !i.keys[1].pubkey.equals(to) ||
                i.keys[2].pubkey.toBase58() !== intent.destination ||
                !i.keys[3].pubkey.equals(mint),
            )
          )
            throw new Error("SIGNED_INTENT_INVALID");
        }
        tx.sign(pair);
        if (!tx.signature) throw new Error("SIGNED_INTENT_INVALID");
        return {
          bytes: tx.serialize().toString("base64"),
          hash: base58.encode(tx.signature),
          validUntilHeight: prepared.validUntilHeight,
        };
      }
      const privateHex = key.toString("hex"),
        address = TronWeb.address.fromPrivateKey(privateHex);
      if (!address || address !== registered || address !== intent.sender)
        throw new Error("SIGNER_ADDRESS_MISMATCH");
      const tx = prepared.payload as any,
        contract = tx.raw_data?.contract?.[0],
        hex = (a: string) => TronWeb.address.toHex(a).toLowerCase();
      const expected = erc20
        .encodeFunctionData("transfer", [
          "0x" + hex(intent.destination).slice(-40),
          intent.amount,
        ])
        .slice(2);
      if (
        !utils.transaction.txCheck(tx) ||
        tx.raw_data.contract.length !== 1 ||
        contract.type !== "TriggerSmartContract" ||
        contract.parameter.value.owner_address.toLowerCase() !==
          hex(intent.sender) ||
        contract.parameter.value.contract_address.toLowerCase() !==
          hex(intent.asset.contract!) ||
        contract.parameter.value.data.toLowerCase() !==
          expected.toLowerCase() ||
        BigInt(contract.parameter.value.call_value ?? 0) !== 0n ||
        BigInt(tx.raw_data.fee_limit) > nativeCap ||
        tx.txID !==
          crypto
            .createHash("sha256")
            .update(Buffer.from(tx.raw_data_hex, "hex"))
            .digest("hex")
      )
        throw new Error("SIGNED_INTENT_INVALID");
      const tron = new TronWeb({ fullHost: "http://127.0.0.1:1" });
      const signed = await tron.trx.sign(tx, privateHex);
      if (typeof signed === "string" || !signed.signature?.length)
        throw new Error("SIGNED_INTENT_INVALID");
      return {
        bytes: JSON.stringify(signed),
        hash: signed.txID,
        expiresAt: prepared.expiresAt,
      };
    },
  );
}
