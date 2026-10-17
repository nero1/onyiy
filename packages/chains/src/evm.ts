import {scanTransferPage as boundedScanPage} from './scan-page';
import type {TransferScanCursor} from './types';
import { selectEventIndex } from "./event-index";
import { reconcileEvidence } from "./evidence";
import { getAddress, Interface, id, verifyMessage, Transaction } from "ethers";
import { DualRpc, quantity } from "./rpc";
import { assertActive,assertAdapterAsset } from "./registry";
import type {
  AssetRegistry,
  ScannedTransfer,
  TransferScan,
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
    assertAdapterAsset(asset,options.observationOnly);
    if (!["eth", "bnb"].includes(asset.chain))
      throw new Error("REGISTRY_INVALID");
    this.rpc = new DualRpc(options);
  }
  scanTransferPage(address:string,after:bigint,through:bigint,cursor?:TransferScanCursor){return boundedScanPage(this.asset,this.rpc,address,after,through,cursor)}
  async scanTransfers(address:string,after:bigint,through:bigint):Promise<TransferScan> {
    if(after<0n||through<=after||through-after>5n)throw new Error("SCAN_RANGE_INVALID");const account=await this.normalizeAddress(address),topic="0x"+account.slice(2).toLowerCase().padStart(64,"0");
    const results=await Promise.all(([0,1] as const).map(async side=>{
      if(quantity(await this.rpc.request(side,"eth_chainId",[]))!==BigInt(this.asset.network))throw new Error("WRONG_NETWORK");const transfers:ScannedTransfer[]=[];
      if(this.asset.kind==="token"){
        const options={fromBlock:hex(after+1n),toBlock:hex(through),address:this.asset.contract};
        const lists=await Promise.all([this.rpc.request(side,"eth_getLogs",[{...options,topics:[transferTopic,null,topic]}]),this.rpc.request(side,"eth_getLogs",[{...options,topics:[transferTopic,topic]}])]);
        for(const [i,logs] of lists.entries()){if(!Array.isArray(logs)||logs.length>100)throw new Error("SCAN_CAPACITY_EXCEEDED");for(const log of logs){const index=quantity(log.logIndex),height=quantity(log.blockNumber);if(log.removed!==false||index>1000n||height<=after||height>through||getAddress(log.address)!==getAddress(this.asset.contract!)||log.topics?.length!==3||String(log.topics[0]).toLowerCase()!==transferTopic||!hashPattern.test(log.transactionHash)||!hashPattern.test(log.blockHash))throw new Error("RPC_EVIDENCE_INVALID");const sender=getAddress("0x"+log.topics[1].slice(-40)),destination=getAddress("0x"+log.topics[2].slice(-40));if((i===0?destination:sender)!==account)throw new Error("RPC_EVIDENCE_INVALID");if(sender===destination||quantity(log.data)===0n)continue;transfers.push({hash:log.transactionHash.toLowerCase(),index:parseInt(index.toString(),10),height,blockHash:log.blockHash.toLowerCase(),sender,destination,amount:quantity(log.data),direction:i===0?"incoming":"outgoing"});}}
      }else{
        for(let height=after+1n;height<=through;height++){const block=await this.rpc.request(side,"eth_getBlockByNumber",[hex(height),true]);if(!block||quantity(block.number)!==height||!hashPattern.test(block.hash)||!Array.isArray(block.transactions)||block.transactions.length>1000)throw new Error("SCAN_CAPACITY_EXCEEDED");for(const tx of block.transactions){if(!tx.to||!hashPattern.test(tx.hash))continue;const sender=getAddress(tx.from),destination=getAddress(tx.to),amount=quantity(tx.value);if(amount===0n||sender===destination||sender!==account&&destination!==account)continue;transfers.push({hash:tx.hash.toLowerCase(),index:0,height,blockHash:block.hash.toLowerCase(),sender,destination,amount,direction:destination===account?"incoming":"outgoing"});}}
      }
      if(transfers.length>100)throw new Error("SCAN_CAPACITY_EXCEEDED");return transfers.sort((a,b)=>(a.hash+":"+a.index+":"+a.direction).localeCompare(b.hash+":"+b.index+":"+b.direction));
    }));const digest=(v:ScannedTransfer[])=>JSON.stringify(v,(_,x)=>typeof x==="bigint"?x.toString():x);if(digest(results[0])!==digest(results[1]))throw new Error("RPC_SCAN_CONTRADICTION");await this.getCanonicalBlock(through);return {through,transfers:results[0]};
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
  async getCanonicalBlock(height: bigint) {
    if (height < 0n) throw new Error("INVALID_INPUT");
    const values = await Promise.all(
      ([0, 1] as const).map(async (side) => {
        if (
          quantity(await this.rpc.request(side, "eth_chainId", [])) !==
          BigInt(this.asset.network)
        )
          throw new Error("WRONG_NETWORK");
        const block = await this.rpc.request(side, "eth_getBlockByNumber", [
          hex(height),
          false,
        ]);
        if (
          !block ||
          quantity(block.number) !== height ||
          !hashPattern.test(block.hash)
        )
          throw new Error("RPC_EVIDENCE_INVALID");
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
        return {
          height,
          hash: String(block.hash).toLowerCase(),
          finalized: final,
        };
      }),
    );
    if (values[0].hash !== values[1].hash || !values.every((v) => v.finalized))
      throw new Error("FINALITY_UNAVAILABLE");
    return values[0];
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
  async getReconciledBalance(asset:AssetRegistry,address:string,height:bigint){
    assertAdapterAsset(asset,this.rpc.observationOnly);if(asset.key!==this.asset.key||asset.network!==this.asset.network)throw new Error("WRONG_NETWORK");await this.getCanonicalBlock(height);const account=await this.normalizeAddress(address);
    const values=await Promise.all(([0,1] as const).map(side=>asset.kind==="native"?this.rpc.request(side,"eth_getBalance",[account,hex(height)]):this.rpc.request(side,"eth_call",[{to:asset.contract,data:erc20.encodeFunctionData("balanceOf",[account])},hex(height)])));
    const amounts=values.map(quantity);if(amounts[0]!==amounts[1])throw new Error("RPC_BALANCE_CONTRADICTION");return amounts[0];
  }
  async getBalance(asset: AssetRegistry, address: string, fresh = false) {
    assertAdapterAsset(asset,this.rpc.observationOnly);
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
    if (getAddress(intent.sender) === getAddress(intent.destination)) throw new Error("SELF_TRANSFER_NOT_ALLOWED");
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
    if(this.rpc.observationOnly)throw new Error("OBSERVATION_ONLY");
    assertActive(this.asset);
    if (getAddress(intent.sender) === getAddress(intent.destination)) throw new Error("SELF_TRANSFER_NOT_ALLOWED");
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
      environment: intent.asset.environment,
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
    if(this.rpc.observationOnly)throw new Error("OBSERVATION_ONLY");
    assertActive(this.asset);
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
      gasUsed = quantity(receipt.gasUsed),
      unitPrice = quantity(receipt.effectiveGasPrice ?? tx.gasPrice),
      status = quantity(receipt.status),
      transactionIndex = quantity(receipt.transactionIndex),
      block = await this.rpc.request(side, "eth_getBlockByNumber", [
        receipt.blockNumber,
        false,
      ]);
    if (!block || block.hash !== receipt.blockHash)
      return { ...base, state: "pending", contradiction: true };
    // Hash equality alone does not prove a receipt belongs to the requested
    // canonical block. Check its height, exact transaction slot and gas bounds.
    if (
      !hashPattern.test(receipt.blockHash) ||
      quantity(block.number) !== height ||
      quantity(tx.blockNumber) !== height ||
      quantity(tx.transactionIndex) !== transactionIndex ||
      !Array.isArray(block.transactions) ||
      transactionIndex >= BigInt(block.transactions.length) ||
      String(
        block.transactions[parseInt(transactionIndex.toString(), 10)],
      ).toLowerCase() !== hash.toLowerCase() ||
      gasUsed <= 0n ||
      gasUsed > quantity(tx.gas) ||
      unitPrice > quantity(tx.maxFeePerGas ?? tx.gasPrice) ||
      ![0n, 1n].includes(status)
    )
      throw new Error("RPC_EVIDENCE_INVALID");
    const actualNativeFee = gasUsed * unitPrice;
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
        log.removed !== false ||
        String(log.transactionHash).toLowerCase() !== hash.toLowerCase() ||
        log.blockHash !== receipt.blockHash ||
        quantity(log.blockNumber) !== height ||
        quantity(log.transactionIndex) !== transactionIndex ||
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
  async findTransferIndex(hash: string, sender: string, destination: string) {
    if (this.asset.kind === "native") return 0;
    await this.network();
    const values = await this.rpc.pair("eth_getTransactionReceipt", [hash]);
    return selectEventIndex(
      values.map((receipt) =>
        receipt
          ? (receipt.logs ?? [])
              .filter(
                (log: any) =>
                  getAddress(log.address) ===
                    getAddress(this.asset.contract!) &&
                  log.topics?.length === 3 &&
                  String(log.topics[0]).toLowerCase() === transferTopic &&
                  getAddress("0x" + log.topics[1].slice(-40)) ===
                    getAddress(sender) &&
                  getAddress("0x" + log.topics[2].slice(-40)) ===
                    getAddress(destination),
              )
              .map((log: any) => {
                const index = quantity(log.logIndex);
                if (index > 1000n) throw new Error("INVALID_INPUT");
                return parseInt(index.toString(), 10);
              })
          : null,
      ),
    );
  }
  async verifyTransfer(expected: Transfer) {
    if (getAddress(expected.sender) === getAddress(expected.destination)) throw new Error("SELF_TRANSFER_NOT_ALLOWED");
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
    assertAdapterAsset(expected.asset,this.rpc.observationOnly);
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
