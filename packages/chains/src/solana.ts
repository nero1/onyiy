import { canonicalTransactionHash } from "./hash";
import { selectEventIndex } from "./event-index";
import { reconcileEvidence } from "./evidence";
import crypto from "node:crypto";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import { base58 } from "@scure/base";
import { DualRpc, integer } from "./rpc";
import { assertActive } from "./registry";
import type {
  AssetRegistry,
  ChainAdapter,
  RpcOptions,
  Transfer,
  TransferEvidence,
  TransferIntent,
  FeeQuote,
  PreparedTransfer,
  SignedTransfer,
} from "./types";
const genesis = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
const normalized = (address: string) => new PublicKey(address).toBase58();
export class SolanaAdapter implements ChainAdapter {
  readonly rpc: DualRpc;
  constructor(
    readonly asset: AssetRegistry,
    options: RpcOptions,
  ) {
    assertActive(asset);
    if (asset.chain !== "sol" || asset.network !== "devnet")
      throw new Error("WRONG_NETWORK");
    this.rpc = new DualRpc(options);
  }
  async validateAddress(address: string) {
    try {
      return normalized(address) === address;
    } catch {
      return false;
    }
  }
  async normalizeAddress(address: string) {
    try {
      return normalized(address);
    } catch {
      throw new Error("INVALID_ADDRESS");
    }
  }
  async verifyOwnershipProof(
    address: string,
    message: string,
    signature: string,
  ) {
    try {
      const publicKey = new PublicKey(address).toBytes(),
        key = crypto.createPublicKey({
          key: Buffer.concat([
            Buffer.from("302a300506032b6570032100", "hex"),
            Buffer.from(publicKey),
          ]),
          format: "der",
          type: "spki",
        });
      return crypto.verify(
        null,
        Buffer.from(message),
        key,
        Buffer.from(base58.decode(signature)),
      );
    } catch {
      return false;
    }
  }
  private async network() {
    const values = (await this.rpc.pair("getGenesisHash", [])).filter(
      (v) => v !== null,
    );
    if (!values.length || values.some((v) => v !== genesis))
      throw new Error("WRONG_NETWORK");
  }
  async currentBlockHeight() {
    await this.network();
    return BigInt(
      await this.rpc.cached("sol-height", 5, async () => {
        const values = (
          await this.rpc.pair("getBlockHeight", [{ commitment: "confirmed" }])
        )
          .filter((v) => v !== null)
          .map(integer);
        return values.reduce((a, b) => (a < b ? a : b)).toString();
      }),
    );
  }
  async getCanonicalBlock(height: bigint) {
    if (height < 0n || height > 9007199254740991n)
      throw new Error("INVALID_INPUT");
    const values = await Promise.all(
      ([0, 1] as const).map(async (side) => {
        if ((await this.rpc.request(side, "getGenesisHash", [])) !== genesis)
          throw new Error("WRONG_NETWORK");
        const slot = integer(
            await this.rpc.request(side, "getSlot", [
              { commitment: "finalized" },
            ]),
          ),
          block = await this.rpc.request(side, "getBlock", [
            parseInt(height.toString(), 10),
            {
              commitment: "finalized",
              transactionDetails: "none",
              rewards: false,
              maxSupportedTransactionVersion: 0,
            },
          ]);
        if (
          !block ||
          base58.decode(block.blockhash).length !== 32 ||
          slot < height
        )
          throw new Error("FINALITY_UNAVAILABLE");
        return { height, hash: String(block.blockhash), finalized: true };
      }),
    );
    if (values[0].hash !== values[1].hash)
      throw new Error("RPC_EVIDENCE_INVALID");
    return values[0];
  }
  async getFinality() {
    await this.network();
    const values = (
      await this.rpc.pair("getSlot", [{ commitment: "finalized" }])
    )
      .filter((v) => v !== null)
      .map(integer);
    return values.reduce((a, b) => (a < b ? a : b));
  }
  async getNativeBalance(address: string, fresh = false) {
    await this.network();
    return BigInt(
      await this.rpc.cached(
        "sol-native:" + normalized(address),
        30,
        async () => {
          const values = (
            await this.rpc.pair("getBalance", [
              normalized(address),
              { commitment: "confirmed" },
            ])
          )
            .filter((v) => v !== null)
            .map((v) => integer(v.value));
          return values.reduce((a, b) => (a < b ? a : b)).toString();
        },
        fresh,
      ),
    );
  }
  private async mint(asset: AssetRegistry) {
    if (asset.kind !== "token") return;
    const values = (
      await this.rpc.pair("getAccountInfo", [
        normalized(asset.mint!),
        { encoding: "jsonParsed", commitment: "finalized" },
      ])
    ).filter((v) => v !== null);
    if (
      !values.length ||
      values.some(
        (v) =>
          v.value?.owner !== TOKEN_PROGRAM_ID.toBase58() ||
          v.value?.data?.parsed?.type !== "mint" ||
          v.value?.data?.parsed?.info?.decimals !== asset.decimals,
      )
    )
      throw new Error("TOKEN_REGISTRY_MISMATCH");
  }
  async getBalance(asset: AssetRegistry, address: string, fresh = false) {
    assertActive(asset);
    if (asset.chain !== "sol" || asset.network !== "devnet")
      throw new Error("WRONG_NETWORK");
    if (asset.kind === "native") return this.getNativeBalance(address, fresh);
    await this.network();
    await this.mint(asset);
    const ata = getAssociatedTokenAddressSync(
      new PublicKey(asset.mint!),
      new PublicKey(address),
    );
    return BigInt(
      await this.rpc.cached(
        "spl:" + asset.mint + ":" + normalized(address),
        30,
        async () => {
          const values = (
            await this.rpc.pair("getTokenAccountBalance", [
              ata.toBase58(),
              { commitment: "confirmed" },
            ])
          ).filter((v) => v !== null);
          if (!values.length) throw new Error("RPC_UNAVAILABLE");
          const amounts = values.map((v) => integer(v.value.amount));
          return amounts.reduce((a, b) => (a < b ? a : b)).toString();
        },
        fresh,
      ),
    );
  }
  private async unsigned(
    intent: Omit<TransferIntent, "fee">,
    blockhash: string,
  ) {
    if (intent.amount <= 0n || intent.amount > 18446744073709551615n)
      throw new Error("INVALID_INPUT");
    const sender = new PublicKey(intent.sender),
      destination = new PublicKey(intent.destination),
      tx = new Transaction({ feePayer: sender, recentBlockhash: blockhash });
    let rent = 0n;
    if (intent.asset.kind === "native")
      tx.add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: destination,
          lamports: intent.amount,
        }),
      );
    else {
      await this.mint(intent.asset);
      const mint = new PublicKey(intent.asset.mint!),
        from = getAssociatedTokenAddressSync(mint, sender),
        to = getAssociatedTokenAddressSync(mint, destination);
      const values = (
        await this.rpc.pair("getAccountInfo", [
          to.toBase58(),
          { encoding: "jsonParsed", commitment: "confirmed" },
        ])
      ).filter((v) => v !== null);
      if (!values.length) throw new Error("RPC_UNAVAILABLE");
      if (
        values.some(
          (v) =>
            v.value &&
            (v.value.owner !== TOKEN_PROGRAM_ID.toBase58() ||
              v.value.data?.parsed?.info?.mint !== intent.asset.mint ||
              v.value.data?.parsed?.info?.owner !== destination.toBase58()),
        )
      )
        throw new Error("TOKEN_ACCOUNT_MISMATCH");
      if (values.some((v) => !v.value)) {
        const rents = (
          await this.rpc.pair("getMinimumBalanceForRentExemption", [
            165,
            { commitment: "confirmed" },
          ])
        )
          .filter((v) => v !== null)
          .map(integer);
        rent = rents.reduce((a, b) => (a > b ? a : b));
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            sender,
            to,
            destination,
            mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        );
      }
      tx.add(
        createTransferCheckedInstruction(
          from,
          mint,
          to,
          sender,
          intent.amount,
          intent.asset.decimals,
        ),
      );
    }
    return { tx, rent };
  }
  async estimateFee(intent: Omit<TransferIntent, "fee">): Promise<FeeQuote> {
    await this.network();
    const values = (
      await this.rpc.pair("getLatestBlockhash", [{ commitment: "finalized" }])
    ).filter((v) => v !== null);
    if (!values.length) throw new Error("RPC_UNAVAILABLE");
    const chosen = values.reduce((a, b) =>
      integer(a.value.lastValidBlockHeight) <
      integer(b.value.lastValidBlockHeight)
        ? a
        : b,
    ).value;
    const { tx, rent } = await this.unsigned(intent, chosen.blockhash);
    const costs = (
      await this.rpc.pair("getFeeForMessage", [
        Buffer.from(tx.compileMessage().serialize()).toString("base64"),
        { commitment: "confirmed" },
      ])
    )
      .filter((v) => v?.value !== null && v !== null)
      .map((v) => integer(v.value));
    if (!costs.length) throw new Error("FEE_UNAVAILABLE");
    const networkFee = costs.reduce((a, b) => (a > b ? a : b)),
      nativeFee = networkFee + rent;
    return {
      nativeFee,
      networkFee,
      accountSetupCost: rent,
      gasLimit: 1n,
      unitPrice: nativeFee,
      observedAt: new Date().toISOString(),
      validity: {
        blockhash: chosen.blockhash,
        lastValidBlockHeight: integer(chosen.lastValidBlockHeight),
      },
    };
  }
  async buildTransfer(intent: TransferIntent): Promise<PreparedTransfer> {
    await this.network();
    if (
      !intent.fee.validity ||
      intent.asset.chain !== "sol" ||
      intent.asset.network !== "devnet"
    )
      throw new Error("INVALID_INPUT");
    const { tx } = await this.unsigned(intent, intent.fee.validity.blockhash);
    return {
      family: "sol",
      environment: "testnet",
      network: "devnet",
      intent,
      payload: tx
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64"),
      validUntilHeight: intent.fee.validity.lastValidBlockHeight,
    };
  }
  async broadcastSigned(signed: SignedTransfer) {
    const tx = Transaction.from(Buffer.from(signed.bytes, "base64"));
    if (
      !tx.verifySignatures() ||
      !tx.signature ||
      base58.encode(tx.signature) !== signed.hash
    )
      throw new Error("SIGNED_INTENT_INVALID");
    await this.network();
    for (const side of [0, 1] as const) {
      try {
        const result = await this.rpc.request(side, "sendTransaction", [
          signed.bytes,
          {
            encoding: "base64",
            skipPreflight: false,
            preflightCommitment: "confirmed",
            maxRetries: 0,
          },
        ]);
        if (result !== signed.hash) throw new Error("BROADCAST_HASH_MISMATCH");
        return signed.hash;
      } catch (e) {
        if (e instanceof Error && e.message === "BROADCAST_HASH_MISMATCH")
          throw e;
      }
    }
    throw new Error("BROADCAST_AMBIGUOUS");
  }
  private async observe(
    asset: AssetRegistry,
    hash: string,
    index: number,
    side: 0 | 1,
  ): Promise<TransferEvidence> {
    const base = { hash, index, observedAt: new Date().toISOString() };
    const [tx, status] = await Promise.all([
      this.rpc.request(side, "getTransaction", [
        hash,
        {
          encoding: "jsonParsed",
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        },
      ]),
      this.rpc.request(side, "getSignatureStatuses", [
        [hash],
        { searchTransactionHistory: true },
      ]),
    ]);
    if (!tx)
      return { ...base, state: status.value?.[0] ? "pending" : "missing" };
    if (tx.transaction?.signatures?.[0] !== hash || !tx.meta)
      throw new Error("RPC_EVIDENCE_INVALID");
    if (tx.meta.err) {
      const finalized = status.value?.[0]?.confirmationStatus === "finalized";
      const block = await this.rpc.request(side, "getBlock", [
        tx.slot,
        {
          commitment: finalized ? "finalized" : "confirmed",
          transactionDetails: "signatures",
          rewards: false,
        },
      ]);
      if (!block.signatures?.includes(hash))
        return { ...base, state: "pending", contradiction: true };
      return {
        ...base,
        state: finalized ? "failed" : "pending",
        height: integer(tx.slot),
        blockHash: block.blockhash,
        actualNativeFee: integer(tx.meta.fee),
        actualNetworkFee: integer(tx.meta.fee),
        accountSetupCost: 0n,
      };
    }
    const instruction = tx.transaction.message.instructions?.[index];
    if (!instruction?.parsed) throw new Error("TRANSFER_NOT_FOUND");
    const info = instruction.parsed.info;
    let sender: string, destination: string, amount: bigint;
    if (asset.kind === "native") {
      if (
        instruction.programId !== SystemProgram.programId.toBase58() ||
        instruction.parsed.type !== "transfer"
      )
        throw new Error("WRONG_TOKEN");
      sender = normalized(info.source);
      destination = normalized(info.destination);
      amount = integer(info.lamports);
    } else {
      if (
        instruction.programId !== TOKEN_PROGRAM_ID.toBase58() ||
        instruction.parsed.type !== "transferChecked" ||
        info.mint !== asset.mint ||
        info.tokenAmount?.decimals !== asset.decimals
      )
        throw new Error("WRONG_TOKEN");
      const source = tx.meta.preTokenBalances?.find(
          (v: any) =>
            tx.transaction.message.accountKeys[v.accountIndex]?.pubkey ===
              info.source && v.mint === asset.mint,
        ),
        target = tx.meta.postTokenBalances?.find(
          (v: any) =>
            tx.transaction.message.accountKeys[v.accountIndex]?.pubkey ===
              info.destination && v.mint === asset.mint,
        );
      if (!source?.owner || !target?.owner)
        throw new Error("TOKEN_ACCOUNT_MISMATCH");
      sender = normalized(source.owner);
      destination = normalized(target.owner);
      amount = integer(info.tokenAmount.amount);
    }
    const signatures = tx.transaction.message.accountKeys
      .filter((v: any) => v.signer)
      .map((v: any) => v.pubkey);
    if (!signatures.includes(sender)) throw new Error("SENDER_PROOF_MISMATCH");
    const feePayer = tx.transaction.message.accountKeys[0]?.pubkey;
    if (feePayer !== sender) throw new Error("FEE_PAYER_MISMATCH");
    const debit =
      integer(tx.meta.preBalances[0]) - integer(tx.meta.postBalances[0]);
    const actualNetworkFee = integer(tx.meta.fee),
      actualNativeFee = debit - (asset.kind === "native" ? amount : 0n);
    if (actualNativeFee < integer(tx.meta.fee))
      throw new Error("RPC_EVIDENCE_INVALID");
    const final = status.value?.[0]?.confirmationStatus === "finalized";
    const block = await this.rpc.request(side, "getBlock", [
      tx.slot,
      {
        commitment: final ? "finalized" : "confirmed",
        transactionDetails: "signatures",
        rewards: false,
      },
    ]);
    if (!block.signatures?.includes(hash))
      return { ...base, state: "pending", contradiction: true };
    return {
      ...base,
      state: tx.meta.err ? "failed" : final ? "confirmed" : "pending",
      height: integer(tx.slot),
      blockHash: block.blockhash,
      sender,
      destination,
      amount,
      actualNativeFee,
      actualNetworkFee,
      accountSetupCost: actualNativeFee - actualNetworkFee,
    };
  }
  async findTransferIndex(hash: string, sender: string, destination: string) {
    await this.network();
    const from =
        this.asset.kind === "token"
          ? getAssociatedTokenAddressSync(
              new PublicKey(this.asset.mint!),
              new PublicKey(sender),
            ).toBase58()
          : sender,
      to =
        this.asset.kind === "token"
          ? getAssociatedTokenAddressSync(
              new PublicKey(this.asset.mint!),
              new PublicKey(destination),
            ).toBase58()
          : destination,
      values = await this.rpc.pair("getTransaction", [
        hash,
        {
          encoding: "jsonParsed",
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        },
      ]);
    return selectEventIndex(
      values.map((tx) =>
        tx
          ? (tx.transaction?.message?.instructions ?? [])
              .map((instruction: any, index: number) => ({
                instruction,
                index,
              }))
              .filter(
                ({ instruction }: any) =>
                  instruction.programId ===
                    (this.asset.kind === "native"
                      ? SystemProgram.programId
                      : TOKEN_PROGRAM_ID
                    ).toBase58() &&
                  instruction.parsed?.info?.source === from &&
                  instruction.parsed?.info?.destination === to &&
                  (this.asset.kind === "native" ||
                    instruction.parsed.info.mint === this.asset.mint),
              )
              .map(({ index }: any) => index)
          : null,
      ),
    );
  }
  async verifyTransfer(expected: Transfer) {
    if (
      expected.asset.key !== this.asset.key ||
      expected.asset.chain !== this.asset.chain ||
      expected.asset.network !== this.asset.network ||
      expected.asset.contract !== this.asset.contract ||
      expected.asset.mint !== this.asset.mint
    )
      throw new Error("WRONG_NETWORK");
    await this.network();
    const values = await Promise.allSettled([
      this.observe(expected.asset, expected.hash, expected.index, 0),
      this.observe(expected.asset, expected.hash, expected.index, 1),
    ]);
    const result = reconcileEvidence(values, expected.hash, expected.index);
    if (
      result.state === "confirmed" &&
      (result.sender !== normalized(expected.sender) ||
        result.destination !== normalized(expected.destination) ||
        (expected.amount !== undefined && result.amount !== expected.amount))
    )
      throw new Error("TRANSFER_MISMATCH");
    return result;
  }
  async proveExpiry(
    hash: string,
    validity: { lastValidHeight?: bigint; expiresAt?: Date },
  ) {
    hash = canonicalTransactionHash("sol", hash);
    if (validity.lastValidHeight === undefined || validity.lastValidHeight < 0n)
      return false;
    // Absence is stronger than ordinary availability failover: both independent
    // providers must positively respond from the pinned finalized network.
    const observations = await Promise.all(
      ([0, 1] as const).map(async (side) => {
        const [identity, status, transaction, height] = await Promise.all([
          this.rpc.request(side, "getGenesisHash", []),
          this.rpc.request(side, "getSignatureStatuses", [
            [hash],
            { searchTransactionHistory: true },
          ]),
          this.rpc.request(side, "getTransaction", [
            hash,
            {
              encoding: "jsonParsed",
              commitment: "finalized",
              maxSupportedTransactionVersion: 0,
            },
          ]),
          this.rpc.request(side, "getBlockHeight", [
            { commitment: "finalized" },
          ]),
        ]);
        return (
          identity === genesis &&
          Array.isArray(status?.value) &&
          status.value.length === 1 &&
          status.value[0] === null &&
          transaction === null &&
          integer(height) > validity.lastValidHeight!
        );
      }),
    );
    return observations.every(Boolean);
  }
  async getTransactionStatus(asset: AssetRegistry, signed: SignedTransfer) {
    const tx = Transaction.from(Buffer.from(signed.bytes, "base64"));
    if (
      !tx.verifySignatures() ||
      !tx.signature ||
      base58.encode(tx.signature) !== signed.hash
    )
      throw new Error("SIGNED_INTENT_INVALID");
    const index = tx.instructions.findIndex((i) =>
      i.programId.equals(
        asset.kind === "native" ? SystemProgram.programId : TOKEN_PROGRAM_ID,
      ),
    );
    if (index < 0) throw new Error("SIGNED_INTENT_INVALID");
    const values = await Promise.allSettled([
      this.observe(asset, signed.hash, index, 0),
      this.observe(asset, signed.hash, index, 1),
    ]);
    return reconcileEvidence(values, signed.hash, index);
  }
}
