import { reconcileEvidence } from "./evidence";
import { getAddress, Interface, id, verifyMessage, Transaction } from "ethers";
import { DualRpc, quantity } from "./rpc";
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
const erc20 = new Interface([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address,uint256) returns (bool)",
]);
const transferTopic = id("Transfer(address,address,uint256)").toLowerCase();
const hex = (n: bigint) => "0x" + n.toString(16);
const hashPattern = /^0x[0-9a-f]{64}$/i;
export class EvmAdapter implements ChainAdapter {
  readonly rpc: DualRpc;
  constructor(
    readonly asset: AssetRegistry,
    options: RpcOptions,
  ) {
    assertActive(asset);
    if (!["eth", "bnb"].includes(asset.chain))
      throw new Error("REGISTRY_INVALID");
    this.rpc = new DualRpc(options);
  }
  async validateAddress(address: string) {
    try {
      getAddress(address);
      return true;
    } catch {
      return false;
    }
  }
  async normalizeAddress(address: string) {
    try {
      return getAddress(address);
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
      return (
        getAddress(verifyMessage(message, signature)) === getAddress(address)
      );
    } catch {
      return false;
    }
  }
  private async network() {
    const values = await this.rpc.pair("eth_chainId", []);
    const valid = values.filter((v) => v !== null).map(quantity);
    if (!valid.length || valid.some((v) => v !== BigInt(this.asset.network)))
      throw new Error("WRONG_NETWORK");
  }
  async currentBlockHeight() {
    await this.network();
    return BigInt(
      await this.rpc.cached("height", 5, async () => {
        const v = (await this.rpc.pair("eth_blockNumber", []))
          .filter((v) => v !== null)
          .map(quantity);
        return v.reduce((a, b) => (a < b ? a : b)).toString();
      }),
    );
  }
  async getFinality() {
    await this.network();
    const blocks = await this.rpc.pair("eth_getBlockByNumber", [
      "finalized",
      false,
    ]);
    const valid = blocks.filter(Boolean).map((b) => quantity(b.number));
    if (!valid.length) throw new Error("FINALITY_UNAVAILABLE");
    return valid.reduce((a, b) => (a < b ? a : b));
  }
  async getNativeBalance(address: string, fresh = false) {
    await this.network();
    const normalized = await this.normalizeAddress(address);
    return BigInt(
      await this.rpc.cached(
        "native:" + normalized,
        30,
        async () => {
          const v = (
            await this.rpc.pair("eth_getBalance", [normalized, "latest"])
          )
            .filter((v) => v !== null)
            .map(quantity);
          return v.reduce((a, b) => (a < b ? a : b)).toString();
        },
        fresh,
      ),
    );
  }
  private async token(asset: AssetRegistry) {
    if (asset.kind !== "token") return;
    const contract = await this.normalizeAddress(asset.contract!);
    const [code, decimals] = await Promise.all([
      this.rpc.pair("eth_getCode", [contract, "latest"]),
      this.rpc.pair("eth_call", [
        { to: contract, data: erc20.encodeFunctionData("decimals") },
        "latest",
      ]),
    ]);
    const codes = code.filter((v) => v !== null),
      values = decimals.filter((v) => v !== null).map(quantity);
    if (
      !codes.length ||
      codes.some((v) => v === "0x" || v === "0x0") ||
      !values.length ||
      values.some((v) => v !== BigInt(asset.decimals))
    )
      throw new Error("TOKEN_REGISTRY_MISMATCH");
  }
  async getBalance(asset: AssetRegistry, address: string, fresh = false) {
    assertActive(asset);
    if (
      asset.chain !== this.asset.chain ||
      asset.network !== this.asset.network
    )
      throw new Error("WRONG_NETWORK");
    if (asset.kind === "native") return this.getNativeBalance(address, fresh);
    await this.network();
    await this.token(asset);
    const normalized = await this.normalizeAddress(address);
    return BigInt(
      await this.rpc.cached(
        "token:" + asset.contract + ":" + normalized,
        30,
        async () => {
          const v = (
            await this.rpc.pair("eth_call", [
              {
                to: asset.contract,
                data: erc20.encodeFunctionData("balanceOf", [normalized]),
              },
              "latest",
            ])
          )
            .filter((v) => v !== null)
            .map(quantity);
          return v.reduce((a, b) => (a < b ? a : b)).toString();
        },
        fresh,
      ),
    );
  }
  private tx(intent: Omit<TransferIntent, "fee">) {
    if (intent.amount <= 0n) throw new Error("INVALID_INPUT");
    return {
      from: getAddress(intent.sender),
      to: getAddress(
        intent.asset.kind === "token"
          ? intent.asset.contract!
          : intent.destination,
      ),
      value: intent.asset.kind === "native" ? hex(intent.amount) : "0x0",
      ...(intent.asset.kind === "token"
        ? {
            data: erc20.encodeFunctionData("transfer", [
              getAddress(intent.destination),
              intent.amount,
            ]),
          }
        : {}),
    };
  }
  async estimateFee(intent: Omit<TransferIntent, "fee">): Promise<FeeQuote> {
    await this.network();
    await this.token(intent.asset);
    const [units, prices] = await Promise.all([
      this.rpc.pair("eth_estimateGas", [this.tx(intent)]),
      this.rpc.pair("eth_gasPrice", []),
    ]);
    const gas = units.filter((v) => v !== null).map(quantity),
      fees = prices.filter((v) => v !== null).map(quantity);
    if (!gas.length || !fees.length) throw new Error("FEE_UNAVAILABLE");
    const gasLimit = gas.reduce((a, b) => (a > b ? a : b)),
      unitPrice = fees.reduce((a, b) => (a > b ? a : b));
    return {
      nativeFee: gasLimit * unitPrice,
      gasLimit,
      unitPrice,
      observedAt: new Date().toISOString(),
    };
  }
  async buildTransfer(intent: TransferIntent): Promise<PreparedTransfer> {
    await this.network();
    if (
      intent.asset.network !== this.asset.network ||
      intent.nonce === undefined ||
      intent.nonce < 0n ||
      intent.fee.gasLimit <= 0n ||
      intent.fee.unitPrice <= 0n
    )
      throw new Error("INVALID_INPUT");
    await this.token(intent.asset);
    const tx = this.tx(intent);
    return {
      family: this.asset.chain,
      environment: "testnet",
      network: this.asset.network,
      intent,
      payload: {
        to: tx.to,
        data: tx.data ?? "0x",
        value: intent.asset.kind === "native" ? intent.amount.toString() : "0",
        nonce: intent.nonce.toString(),
        gasLimit: intent.fee.gasLimit.toString(),
        gasPrice: intent.fee.unitPrice.toString(),
        chainId: this.asset.network,
        type: 0,
      },
    };
  }
  async broadcastSigned(signed: SignedTransfer) {
    const parsed = Transaction.from(signed.bytes);
    if (
      !parsed.signature ||
      parsed.chainId !== BigInt(this.asset.network) ||
      parsed.hash?.toLowerCase() !== signed.hash.toLowerCase()
    )
      throw new Error("SIGNED_INTENT_INVALID");
    await this.network();
    try {
      const returned = await this.rpc.request(0, "eth_sendRawTransaction", [
        signed.bytes,
      ]);
      if (String(returned).toLowerCase() !== signed.hash.toLowerCase())
        throw new Error("BROADCAST_HASH_MISMATCH");
      return signed.hash;
    } catch (error) {
      if (error instanceof Error && error.message === "BROADCAST_HASH_MISMATCH")
        throw error;
      try {
        const returned = await this.rpc.request(1, "eth_sendRawTransaction", [
          signed.bytes,
        ]);
        if (String(returned).toLowerCase() !== signed.hash.toLowerCase())
          throw new Error("BROADCAST_HASH_MISMATCH");
        return signed.hash;
      } catch {
        throw new Error("BROADCAST_AMBIGUOUS");
      }
    }
  }
  private async observe(
    asset: AssetRegistry,
    hash: string,
    index: number,
    side: 0 | 1,
  ): Promise<TransferEvidence> {
    if (!hashPattern.test(hash) || !Number.isInteger(index) || index < -1)
      throw new Error("INVALID_INPUT");
    const [tx, receipt] = await Promise.all([
      this.rpc.request(side, "eth_getTransactionByHash", [hash]),
      this.rpc.request(side, "eth_getTransactionReceipt", [hash]),
    ]);
    const base = { hash, index, observedAt: new Date().toISOString() };
    if (!tx) return { ...base, state: "missing" };
    if (!receipt) return { ...base, state: "pending" };
    if (
      String(tx.hash).toLowerCase() !== hash.toLowerCase() ||
      String(receipt.transactionHash).toLowerCase() !== hash.toLowerCase() ||
      tx.blockHash !== receipt.blockHash
    )
      throw new Error("RPC_EVIDENCE_INVALID");
    const height = quantity(receipt.blockNumber),
      actualNativeFee =
        quantity(receipt.gasUsed) *
        quantity(receipt.effectiveGasPrice ?? tx.gasPrice),
      block = await this.rpc.request(side, "eth_getBlockByNumber", [
        receipt.blockNumber,
        false,
      ]);
    if (!block || block.hash !== receipt.blockHash)
      return { ...base, state: "pending", contradiction: true };
    const final =
      this.asset.finality.mode === "depth"
        ? quantity(await this.rpc.request(side, "eth_blockNumber", [])) >=
          height + BigInt(this.asset.finality.depth!) - 1n
        : quantity(
            (
              await this.rpc.request(side, "eth_getBlockByNumber", [
                "finalized",
                false,
              ])
            ).number,
          ) >= height;
    let sender = getAddress(tx.from),
      destination = getAddress(tx.to),
      amount = quantity(tx.value);
    if (quantity(receipt.status) === 0n)
      return {
        ...base,
        state: final ? "failed" : "pending",
        blockHash: receipt.blockHash,
        height,
        actualNativeFee,
      };
    if (asset.kind === "token") {
      let selectedIndex = index;
      if (index === -1) {
        if (getAddress(tx.to) !== getAddress(asset.contract!))
          throw new Error("WRONG_TOKEN");
        const decoded = erc20.decodeFunctionData(
          "transfer",
          tx.input ?? tx.data,
        );
        const matching = (receipt.logs ?? []).filter(
          (v: any) =>
            getAddress(v.address) === getAddress(asset.contract!) &&
            v.topics?.length === 3 &&
            String(v.topics[0]).toLowerCase() === transferTopic &&
            getAddress("0x" + v.topics[1].slice(-40)) === sender &&
            getAddress("0x" + v.topics[2].slice(-40)) ===
              getAddress(decoded[0]) &&
            quantity(v.data) === decoded[1],
        );
        if (matching.length !== 1) throw new Error("TRANSFER_MISMATCH");
        const logIndex = quantity(matching[0].logIndex);
        if (logIndex > 1000n) throw new Error("RPC_EVIDENCE_INVALID");
        selectedIndex = parseInt(logIndex.toString(), 10);
        base.index = selectedIndex;
      }
      const log = (receipt.logs ?? []).find(
        (v: any) => quantity(v.logIndex) === BigInt(selectedIndex),
      );
      if (
        !log ||
        getAddress(log.address) !== getAddress(asset.contract!) ||
        log.topics?.length !== 3 ||
        String(log.topics[0]).toLowerCase() !== transferTopic
      )
        throw new Error("WRONG_TOKEN");
      sender = getAddress("0x" + log.topics[1].slice(-40));
      destination = getAddress("0x" + log.topics[2].slice(-40));
      amount = quantity(log.data);
    } else if (index !== 0) throw new Error("INVALID_INPUT");
    return {
      ...base,
      state: final
        ? quantity(receipt.status) === 0n
          ? "failed"
          : "confirmed"
        : "pending",
      blockHash: receipt.blockHash,
      height,
      sender,
      destination,
      amount,
      actualNativeFee,
    };
  }
  async verifyTransfer(expected: Transfer) {
    if (!Number.isInteger(expected.index) || expected.index < 0)
      throw new Error("INVALID_INPUT");
    return this.verify(expected);
  }
  private async verify(expected: Transfer) {
    if (
      expected.asset.key !== this.asset.key ||
      expected.asset.chain !== this.asset.chain ||
      expected.asset.network !== this.asset.network ||
      expected.asset.contract !== this.asset.contract ||
      expected.asset.mint !== this.asset.mint
    )
      throw new Error("WRONG_NETWORK");
    assertActive(expected.asset);
    await this.network();
    const result = reconcileEvidence(
      await Promise.allSettled([
        this.observe(expected.asset, expected.hash, expected.index, 0),
        this.observe(expected.asset, expected.hash, expected.index, 1),
      ]),
      expected.hash,
      expected.index,
    );
    if (
      result.state === "confirmed" &&
      (result.sender !== getAddress(expected.sender) ||
        result.destination !== getAddress(expected.destination) ||
        (expected.amount !== undefined && result.amount !== expected.amount))
    )
      throw new Error("TRANSFER_MISMATCH");
    return result;
  }
  async getTransactionStatus(asset: AssetRegistry, signed: SignedTransfer) {
    const parsed = Transaction.from(signed.bytes);
    if (
      !parsed.signature ||
      parsed.chainId !== BigInt(asset.network) ||
      parsed.hash?.toLowerCase() !== signed.hash.toLowerCase() ||
      !parsed.from ||
      !parsed.to
    )
      throw new Error("SIGNED_INTENT_INVALID");
    let destination = parsed.to,
      amount = parsed.value;
    if (asset.kind === "token") {
      if (getAddress(parsed.to) !== getAddress(asset.contract!))
        throw new Error("WRONG_TOKEN");
      const decoded = erc20.decodeFunctionData("transfer", parsed.data);
      destination = getAddress(decoded[0]);
      amount = decoded[1];
    }
    return this.verify({
      asset,
      hash: signed.hash,
      index: asset.kind === "token" ? -1 : 0,
      sender: parsed.from,
      destination,
      amount,
    });
  }
  async pendingNonce(address: string) {
    await this.network();
    const values = (
      await this.rpc.pair("eth_getTransactionCount", [
        getAddress(address),
        "pending",
      ])
    )
      .filter((v) => v !== null)
      .map(quantity);
    return values.reduce((a, b) => (a > b ? a : b));
  }
}
