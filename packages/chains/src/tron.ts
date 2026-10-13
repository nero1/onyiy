import { canonicalTransactionHash } from "./hash";
import { selectEventIndex } from "./event-index";
import { reconcileEvidence } from "./evidence";
import crypto from "node:crypto";
import { TronWeb, Trx, utils } from "tronweb";
import { Interface, id } from "ethers";
import { DualRpc, integer } from "./rpc";
import { assertActive } from "./registry";
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
  "function transfer(address,uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);
const transferTopic = id("Transfer(address,address,uint256)")
  .slice(2)
  .toLowerCase();
const chainIds: Record<string, bigint> = {
  nile: 3448148188n,
  shasta: 2494104990n,
};
const addressHex = (address: string) =>
  TronWeb.address.toHex(address).toLowerCase();
const normalized = (address: string) =>
  TronWeb.address.fromHex(addressHex(address));
const jsonInteger = (value: bigint) => {
  if (value < 0n || value > 9007199254740991n)
    throw new Error("RPC_INTEGER_LIMIT");
  return parseInt(value.toString(), 10);
};
export class TronAdapter implements ChainAdapter {
  readonly rpc: DualRpc;
  constructor(
    readonly asset: AssetRegistry,
    options: RpcOptions,
  ) {
    assertActive(asset);
    if (asset.chain !== "tron" || !chainIds[asset.network])
      throw new Error("WRONG_NETWORK");
    this.rpc = new DualRpc(options);
  }
  async scanTransfers(address:string,after:bigint,through:bigint):Promise<TransferScan> {
    if(after<0n||through<=after||through-after>5n)throw new Error("SCAN_RANGE_INVALID");jsonInteger(through);const account=normalized(address);
    const results=await Promise.all(([0,1] as const).map(async side=>{
      const identity=await this.rpc.post(side,"jsonrpc",{jsonrpc:"2.0",id:1,method:"eth_chainId",params:[]},true);if(BigInt(identity)!==chainIds[this.asset.network])throw new Error("WRONG_NETWORK");const solid=await this.rpc.post(side,"walletsolidity/getnowblock",{});if(integer(solid.block_header.raw_data.number)<through)throw new Error("FINALITY_UNAVAILABLE");const transfers:ScannedTransfer[]=[],blocks:{height:string;hash:string}[]=[];
      for(let height=after+1n;height<=through;height++){const block=await this.rpc.post(side,"walletsolidity/getblockbynum",{num:jsonInteger(height)});if(integer(block.block_header.raw_data.number)!==height||!/^[0-9a-f]{64}$/i.test(block.blockID)||!Array.isArray(block.transactions??[])||(block.transactions??[]).length>1000)throw new Error("SCAN_CAPACITY_EXCEEDED");
        blocks.push({height:height.toString(),hash:block.blockID.toLowerCase()});for(const tx of block.transactions??[]){const hash=canonicalTransactionHash("tron",tx.txID),contract=tx.raw_data?.contract?.[0];if(tx.raw_data?.contract?.length!==1)continue;
          if(this.asset.kind==="native"){if(contract.type!=="TransferContract")continue;const value=contract.parameter.value,sender=normalized(TronWeb.address.fromHex(value.owner_address)),destination=normalized(TronWeb.address.fromHex(value.to_address)),amount=integer(value.amount);if(amount<=0n||sender===destination||sender!==account&&destination!==account)continue;transfers.push({hash,index:0,height,blockHash:block.blockID.toLowerCase(),sender,destination,amount,direction:destination===account?"incoming":"outgoing"})}
          else{const info=await this.rpc.post(side,"walletsolidity/gettransactioninfobyid",{value:hash});if(info.id!==hash||integer(info.blockNumber)!==height)throw new Error("SCAN_INCOMPLETE");for(const [index,log] of (info.log??[]).entries()){if(addressHex(TronWeb.address.fromHex("41"+log.address)).slice(2)!==addressHex(this.asset.contract!).slice(2)||log.topics?.length!==3||log.topics[0].toLowerCase()!==transferTopic)continue;const sender=normalized(TronWeb.address.fromHex("41"+log.topics[1].slice(-40))),destination=normalized(TronWeb.address.fromHex("41"+log.topics[2].slice(-40))),amount=BigInt("0x"+log.data);if(amount<=0n||sender===destination||sender!==account&&destination!==account)continue;transfers.push({hash,index,height,blockHash:block.blockID.toLowerCase(),sender,destination,amount,direction:destination===account?"incoming":"outgoing"})}}
        }
      }
      if(transfers.length>100)throw new Error("SCAN_CAPACITY_EXCEEDED");return {blocks,transfers:transfers.sort((a,b)=>(a.hash+":"+a.index+":"+a.direction).localeCompare(b.hash+":"+b.index+":"+b.direction))};
    }));const digest=(v:unknown)=>JSON.stringify(v,(_,x)=>typeof x==="bigint"?x.toString():x);if(digest(results[0])!==digest(results[1]))throw new Error("RPC_SCAN_CONTRADICTION");return {through,transfers:results[0].transfers};
  }
  async validateAddress(address: string) {
    return TronWeb.isAddress(address);
  }
  async normalizeAddress(address: string) {
    if (!TronWeb.isAddress(address)) throw new Error("INVALID_ADDRESS");
    return normalized(address);
  }
  async verifyOwnershipProof(
    address: string,
    message: string,
    signature: string,
  ) {
    try {
      return (
        normalized(Trx.verifyMessageV2(message, signature)) ===
        normalized(address)
      );
    } catch {
      return false;
    }
  }
  private async network() {
    const observations = await Promise.allSettled([
      this.rpc.post(
        0,
        "jsonrpc",
        { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
        true,
      ),
      this.rpc.post(
        1,
        "jsonrpc",
        { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
        true,
      ),
    ]);
    const valid = observations
      .filter((v) => v.status === "fulfilled")
      .map((v) => (v as PromiseFulfilledResult<string>).value);
    if (
      !valid.length ||
      valid.some((v) => BigInt(v) !== chainIds[this.asset.network])
    )
      throw new Error("WRONG_NETWORK");
  }
  private async pair(path: string, body: unknown) {
    const values = await Promise.allSettled([
      this.rpc.post(0, path, body),
      this.rpc.post(1, path, body),
    ]);
    const valid = values
      .filter((v) => v.status === "fulfilled")
      .map((v) => (v as PromiseFulfilledResult<any>).value);
    if (!valid.length) throw new Error("RPC_UNAVAILABLE");
    return valid;
  }
  async currentBlockHeight() {
    await this.network();
    return BigInt(
      await this.rpc.cached("trx-height", 5, async () => {
        const values = (await this.pair("wallet/getnowblock", {})).map((v) =>
          integer(v.block_header.raw_data.number),
        );
        return values.reduce((a, b) => (a < b ? a : b)).toString();
      }),
    );
  }
  async getCanonicalBlock(height: bigint) {
    const number = jsonInteger(height);
    if (height < 0n) throw new Error("INVALID_INPUT");
    const values = await Promise.all(
      ([0, 1] as const).map(async (side) => {
        const identity = await this.rpc.post(
          side,
          "jsonrpc",
          { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
          true,
        );
        if (BigInt(identity) !== chainIds[this.asset.network])
          throw new Error("WRONG_NETWORK");
        const [block, solid] = await Promise.all([
          this.rpc.post(side, "walletsolidity/getblockbynum", { num: number }),
          this.rpc.post(side, "walletsolidity/getnowblock", {}),
        ]);
        if (
          integer(block.block_header.raw_data.number) !== height ||
          !/^[0-9a-f]{64}$/i.test(block.blockID) ||
          integer(solid.block_header.raw_data.number) < height
        )
          throw new Error("FINALITY_UNAVAILABLE");
        return {
          height,
          hash: String(block.blockID).toLowerCase(),
          finalized: true,
        };
      }),
    );
    if (values[0].hash !== values[1].hash)
      throw new Error("RPC_EVIDENCE_INVALID");
    return values[0];
  }
  async getFinality() {
    await this.network();
    const values = (await this.pair("walletsolidity/getnowblock", {})).map(
      (v) => integer(v.block_header.raw_data.number),
    );
    return values.reduce((a, b) => (a < b ? a : b));
  }
  async getNativeBalance(address: string, fresh = false) {
    await this.network();
    return BigInt(
      await this.rpc.cached(
        "trx-native:" + normalized(address),
        30,
        async () => {
          const values = (
            await this.pair("wallet/getaccount", {
              address: addressHex(address),
              visible: false,
            })
          ).map((v) => integer(v.balance ?? 0));
          return values.reduce((a, b) => (a < b ? a : b)).toString();
        },
        fresh,
      ),
    );
  }
  private async constant(
    asset: AssetRegistry,
    selector: string,
    parameter = "",
  ) {
    const values = await this.pair("wallet/triggerconstantcontract", {
      owner_address: addressHex(asset.contract!),
      contract_address: addressHex(asset.contract!),
      function_selector: selector,
      parameter,
      visible: false,
    });
    if (values.some((v) => !v.result?.result || !v.constant_result?.[0]))
      throw new Error("TOKEN_REGISTRY_MISMATCH");
    return values.map((v) => BigInt("0x" + v.constant_result[0]));
  }
  private async token(asset: AssetRegistry) {
    if (asset.kind !== "token") return;
    const values = await this.constant(asset, "decimals()");
    if (values.some((v) => v !== BigInt(asset.decimals)))
      throw new Error("TOKEN_REGISTRY_MISMATCH");
  }
  async getReconciledBalance(asset:AssetRegistry,address:string,height:bigint){
    assertActive(asset);if(asset.key!==this.asset.key||height<0n)throw new Error("INVALID_INPUT");const account=normalized(address);
    const values=await Promise.all(([0,1] as const).map(async side=>{const identity=await this.rpc.post(side,"jsonrpc",{jsonrpc:"2.0",id:1,method:"eth_chainId",params:[]},true);if(BigInt(identity)!==chainIds[asset.network])throw new Error("WRONG_NETWORK");const before=await this.rpc.post(side,"walletsolidity/getnowblock",{}),tip=integer(before.block_header.raw_data.number);if(tip<height||!/^[0-9a-f]{64}$/i.test(before.blockID))throw new Error("FINALITY_UNAVAILABLE");let amount:bigint;
    if(asset.kind==="native"){const result=await this.rpc.post(side,"walletsolidity/getaccount",{address:addressHex(account),visible:false});amount=integer(result.balance??0)}else{const result=await this.rpc.post(side,"walletsolidity/triggerconstantcontract",{owner_address:addressHex(account),contract_address:addressHex(asset.contract!),function_selector:"balanceOf(address)",parameter:addressHex(account).slice(-40).padStart(64,"0"),visible:false});if(!result.result?.result||!Array.isArray(result.constant_result)||result.constant_result.length!==1||! /^[0-9a-f]{64}$/i.test(result.constant_result[0]))throw new Error("RPC_EVIDENCE_INVALID");amount=BigInt("0x"+result.constant_result[0])}
    const after=await this.rpc.post(side,"walletsolidity/getnowblock",{});if(after.blockID!==before.blockID||integer(after.block_header.raw_data.number)!==tip)throw new Error("FINALITY_UNAVAILABLE");return {tip,hash:before.blockID,amount}}));if(values[0].tip!==values[1].tip||values[0].hash!==values[1].hash||values[0].amount!==values[1].amount)throw new Error("RPC_BALANCE_CONTRADICTION");return values[0].amount;
  }
  async getBalance(asset: AssetRegistry, address: string, fresh = false) {
    assertActive(asset);
    if (asset.chain !== "tron" || asset.network !== this.asset.network)
      throw new Error("WRONG_NETWORK");
    if (asset.kind === "native") return this.getNativeBalance(address, fresh);
    await this.network();
    await this.token(asset);
    return BigInt(
      await this.rpc.cached(
        "trc20:" + asset.contract + ":" + normalized(address),
        30,
        async () => {
          const parameter = addressHex(address).slice(-40).padStart(64, "0");
          const values = await this.constant(
            asset,
            "balanceOf(address)",
            parameter,
          );
          return values.reduce((a, b) => (a < b ? a : b)).toString();
        },
        fresh,
      ),
    );
  }
  private parameter(intent: Omit<TransferIntent, "fee">) {
    if (intent.amount <= 0n) throw new Error("INVALID_INPUT");
    const encoded = erc20.encodeFunctionData("transfer", [
      "0x" + addressHex(intent.destination).slice(-40),
      intent.amount,
    ]);
    return encoded.slice(10);
  }
  async estimateFee(intent: Omit<TransferIntent, "fee">): Promise<FeeQuote> {
    await this.network();
    await this.token(intent.asset);
    if (intent.asset.kind === "native") {
      if (intent.asset.key !== "trx" || intent.amount <= 0n)
        throw new Error("INVALID_INPUT");
      const [parameters, accounts] = await Promise.all([
        this.pair("wallet/getchainparameters", {}),
        this.pair("wallet/getaccount", {
          address: addressHex(intent.destination),
          visible: false,
        }),
      ]);
      const parameter = (value: any, key: string) =>
        integer(value.chainParameter?.find((p: any) => p.key === key)?.value);
      const bytePrice = parameters
          .map((v) => parameter(v, "getTransactionFee"))
          .reduce((a, b) => (a > b ? a : b)),
        setup = accounts.some((v) => !v.address)
          ? parameters
              .map((v) =>
                parameter(v, "getCreateNewAccountFeeInSystemContract"),
              )
              .reduce((a, b) => (a > b ? a : b))
          : 0n;
      // Bound serialized bandwidth, including one signature. No energy is used
      // by the sole TransferContract; activation is a separate approved cost.
      const network = 1024n * bytePrice;
      return {
        nativeFee: network + setup,
        networkFee: network,
        accountSetupCost: setup,
        gasLimit: 1024n,
        unitPrice: bytePrice,
        observedAt: new Date().toISOString(),
      };
    }
    const estimates = await this.pair("wallet/estimateenergy", {
      owner_address: addressHex(intent.sender),
      contract_address: addressHex(intent.asset.contract!),
      function_selector: "transfer(address,uint256)",
      parameter: this.parameter(intent),
      visible: false,
    });
    if (estimates.some((v) => !v.result?.result))
      throw new Error("FEE_UNAVAILABLE");
    const gas = estimates.map((v) => integer(v.energy_required));
    const parameters = await this.pair("wallet/getchainparameters", {});
    const prices = parameters.map((v) =>
      integer(
        v.chainParameter?.find((p: any) => p.key === "getEnergyFee")?.value,
      ),
    );
    const bandwidth = parameters.map((v) =>
      integer(
        v.chainParameter?.find((p: any) => p.key === "getTransactionFee")
          ?.value,
      ),
    );
    const gasLimit = gas.reduce((a, b) => (a > b ? a : b)),
      unitPrice = prices.reduce((a, b) => (a > b ? a : b)),
      bytePrice = bandwidth.reduce((a, b) => (a > b ? a : b));
    return {
      nativeFee: gasLimit * unitPrice + 1024n * bytePrice,
      gasLimit,
      unitPrice,
      observedAt: new Date().toISOString(),
    };
  }
  async assertReference(payload: unknown) {
    const tx = payload as any,
      bytes = tx.raw_data?.ref_block_bytes,
      hash = tx.raw_data?.ref_block_hash;
    if (
      !/^[0-9a-f]{4}$/i.test(bytes) ||
      !/^[0-9a-f]{16}$/i.test(hash) ||
      tx.raw_data.data ||
      tx.raw_data.scripts ||
      tx.raw_data.auths?.length ||
      Buffer.byteLength(tx.raw_data_hex ?? "", "hex") + 193 > 1024
    )
      throw new Error("SIGNED_INTENT_INVALID");
    const values = await Promise.all(
      ([0, 1] as const).map(async (side) => {
        const identity = await this.rpc.post(
          side,
          "jsonrpc",
          { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
          true,
        );
        if (BigInt(identity) !== chainIds[this.asset.network])
          throw new Error("WRONG_NETWORK");
        const current = await this.rpc.post(side, "wallet/getnowblock", {}),
          tip = integer(current.block_header.raw_data.number);
        let height = (tip / 65536n) * 65536n + BigInt("0x" + bytes);
        if (height > tip) height -= 65536n;
        if (height < 0n || tip - height > 512n)
          throw new Error("SIGNED_INTENT_INVALID");
        const block = await this.rpc.post(side, "wallet/getblockbynum", {
          num: jsonInteger(height),
        });
        if (
          integer(block.block_header.raw_data.number) !== height ||
          !/^[0-9a-f]{64}$/i.test(block.blockID) ||
          String(block.blockID).slice(16, 32).toLowerCase() !==
            hash.toLowerCase()
        )
          throw new Error("SIGNED_INTENT_INVALID");
        return String(block.blockID).toLowerCase();
      }),
    );
    if (values[0] !== values[1]) throw new Error("SIGNED_INTENT_INVALID");
  }
  async buildTransfer(intent: TransferIntent): Promise<PreparedTransfer> {
    await this.network();
    if (
      intent.asset.chain !== "tron" ||
      intent.asset.network !== this.asset.network
    )
      throw new Error("WRONG_NETWORK");
    if (intent.asset.kind === "native") {
      if (
        intent.asset.key !== "trx" ||
        intent.amount <= 0n ||
        intent.fee.nativeFee < 0n
      )
        throw new Error("INVALID_INPUT");
      const tx = await this.rpc.post(0, "wallet/createtransaction", {
          owner_address: addressHex(intent.sender),
          to_address: addressHex(intent.destination),
          amount: jsonInteger(intent.amount),
          visible: false,
        }),
        contract = tx.raw_data?.contract?.[0];
      if (
        !tx.raw_data_hex ||
        !utils.transaction.txCheck(tx) ||
        tx.raw_data.contract.length !== 1 ||
        contract.type !== "TransferContract" ||
        integer(contract.Permission_id ?? 0) !== 0n ||
        contract.parameter.value.owner_address.toLowerCase() !==
          addressHex(intent.sender) ||
        contract.parameter.value.to_address.toLowerCase() !==
          addressHex(intent.destination) ||
        integer(contract.parameter.value.amount) !== intent.amount ||
        integer(tx.raw_data.expiration) <= BigInt(Date.now()) ||
        integer(tx.raw_data.expiration) > BigInt(Date.now() + 600000) ||
        tx.txID !==
          crypto
            .createHash("sha256")
            .update(Buffer.from(tx.raw_data_hex, "hex"))
            .digest("hex")
      )
        throw new Error("SIGNED_INTENT_INVALID");
      await this.assertReference(tx);
      return {
        family: "tron",
        environment: "testnet",
        network: intent.asset.network,
        intent,
        payload: tx,
        expiresAt: new Date(
          parseInt(integer(tx.raw_data.expiration).toString(), 10),
        ),
      };
    }
    const response = await this.rpc.post(0, "wallet/triggersmartcontract", {
      owner_address: addressHex(intent.sender),
      contract_address: addressHex(intent.asset.contract!),
      function_selector: "transfer(address,uint256)",
      parameter: this.parameter(intent),
      fee_limit: jsonInteger(intent.fee.nativeFee),
      call_value: 0,
      visible: false,
    });
    const tx = response.transaction;
    if (
      !response.result?.result ||
      !tx?.raw_data_hex ||
      !utils.transaction.txCheck(tx) ||
      tx.txID !==
        crypto
          .createHash("sha256")
          .update(Buffer.from(tx.raw_data_hex, "hex"))
          .digest("hex")
    )
      throw new Error("RPC_EVIDENCE_INVALID");
    const contract = tx.raw_data?.contract?.[0];
    if (
      !utils.transaction.txCheck(tx) ||
      tx.raw_data.contract.length !== 1 ||
      contract.type !== "TriggerSmartContract" ||
      contract.parameter.value.owner_address.toLowerCase() !==
        addressHex(intent.sender) ||
      contract.parameter.value.contract_address.toLowerCase() !==
        addressHex(intent.asset.contract!) ||
      contract.parameter.value.data.toLowerCase() !==
        "a9059cbb" + this.parameter(intent).toLowerCase() ||
      integer(contract.parameter.value.call_value ?? 0) !== 0n ||
      integer(tx.raw_data.fee_limit) > intent.fee.nativeFee
    )
      throw new Error("SIGNED_INTENT_INVALID");
    await this.assertReference(tx);
    return {
      family: "tron",
      environment: "testnet",
      network: intent.asset.network,
      intent,
      payload: tx,
      expiresAt: new Date(
        parseInt(integer(tx.raw_data.expiration).toString(), 10),
      ),
    };
  }
  async broadcastSigned(signed: SignedTransfer) {
    let tx: any;
    try {
      tx = JSON.parse(signed.bytes);
    } catch {
      throw new Error("SIGNED_INTENT_INVALID");
    }
    if (
      !tx.signature?.length ||
      !tx.raw_data_hex ||
      !utils.transaction.txCheck(tx) ||
      tx.txID !== signed.hash ||
      crypto
        .createHash("sha256")
        .update(Buffer.from(tx.raw_data_hex, "hex"))
        .digest("hex") !== signed.hash
    )
      throw new Error("SIGNED_INTENT_INVALID");
    await this.network();
    for (const side of [0, 1] as const) {
      try {
        const result = await this.rpc.post(
          side,
          "wallet/broadcasttransaction",
          tx,
        );
        if (result.result && (!result.txid || result.txid === signed.hash))
          return signed.hash;
        if (result.code === "DUP_TRANSACTION_ERROR") return signed.hash;
      } catch {
        /* Persisted identical bytes are retried at the independent endpoint. */
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
    if (!/^[0-9a-f]{64}$/i.test(hash) || !Number.isInteger(index) || index < -1)
      throw new Error("INVALID_INPUT");
    const base = { hash, index, observedAt: new Date().toISOString() };
    const [tx, info, solid] = await Promise.all([
      this.rpc.post(side, "wallet/gettransactionbyid", { value: hash }),
      this.rpc.post(side, "walletsolidity/gettransactioninfobyid", {
        value: hash,
      }),
      this.rpc.post(side, "walletsolidity/getnowblock", {}),
    ]);
    if (!tx.txID) return { ...base, state: "missing" };
    if (!info.id) return { ...base, state: "pending" };
    if (tx.txID !== hash || info.id !== hash)
      throw new Error("RPC_EVIDENCE_INVALID");
    const height = integer(info.blockNumber),
      final = integer(solid.block_header.raw_data.number) >= height;
    const block = await this.rpc.post(side, "walletsolidity/getblockbynum", {
      num: jsonInteger(height),
    });
    if (!block.transactions?.some((value: any) => value.txID === hash))
      return { ...base, state: "pending", contradiction: true };
    const actualNativeFee = integer(info.fee ?? 0);
    if (info.receipt?.result && info.receipt.result !== "SUCCESS")
      return {
        ...base,
        state: final ? "failed" : "pending",
        height,
        blockHash: block.blockID,
        actualNativeFee,
      };
    if (asset.kind === "native") {
      const contract = tx.raw_data?.contract?.[0],
        value = contract?.parameter?.value;
      if (
        index !== 0 ||
        tx.raw_data?.contract?.length !== 1 ||
        contract.type !== "TransferContract" ||
        !value
      )
        throw new Error("TRANSFER_NOT_FOUND");
      return {
        ...base,
        state: final ? "confirmed" : "pending",
        height,
        blockHash: block.blockID,
        sender: normalized(TronWeb.address.fromHex(value.owner_address)),
        destination: normalized(TronWeb.address.fromHex(value.to_address)),
        amount: integer(value.amount),
        actualNativeFee,
        actualNetworkFee: integer(info.receipt?.net_fee ?? 0),
        accountSetupCost: actualNativeFee - integer(info.receipt?.net_fee ?? 0),
      };
    }
    let eventIndex = index;
    if (index === -1) {
      if (!utils.transaction.txCheck(tx))
        throw new Error("RPC_EVIDENCE_INVALID");
      const intent = tx.raw_data.contract?.[0]?.parameter?.value;
      if (
        !intent ||
        intent.contract_address.toLowerCase() !== addressHex(asset.contract!) ||
        !String(intent.data).startsWith("a9059cbb")
      )
        throw new Error("WRONG_TOKEN");
      const decoded = erc20.decodeFunctionData("transfer", "0x" + intent.data);
      const matches = (info.log ?? [])
        .map((log: any, i: number) => ({ log, i }))
        .filter(
          ({ log }: any) =>
            log.address?.toLowerCase() ===
              addressHex(asset.contract!).slice(-40) &&
            log.topics?.length === 3 &&
            log.topics[0].toLowerCase() === transferTopic &&
            log.topics[1].slice(-40).toLowerCase() ===
              intent.owner_address.slice(-40).toLowerCase() &&
            log.topics[2].slice(-40).toLowerCase() ===
              decoded[0].slice(2).toLowerCase() &&
            BigInt("0x" + log.data) === decoded[1],
        );
      if (matches.length !== 1) throw new Error("TRANSFER_MISMATCH");
      eventIndex = matches[0].i;
      base.index = eventIndex;
    }
    const log = info.log?.[eventIndex];
    if (
      !log ||
      log.address.toLowerCase() !== addressHex(asset.contract!).slice(-40) ||
      log.topics?.length !== 3 ||
      log.topics[0].toLowerCase() !== transferTopic
    )
      throw new Error("WRONG_TOKEN");
    const sender = TronWeb.address.fromHex("41" + log.topics[1].slice(-40)),
      destination = TronWeb.address.fromHex("41" + log.topics[2].slice(-40)),
      amount = BigInt("0x" + log.data);
    return {
      ...base,
      state: final ? "confirmed" : "pending",
      height,
      blockHash: block.blockID,
      sender,
      destination,
      amount,
      actualNativeFee,
    };
  }
  async findTransferIndex(hash: string, sender: string, destination: string) {
    if (this.asset.kind === "native") return 0;
    await this.network();
    const values = await Promise.allSettled([
      this.rpc.post(0, "wallet/gettransactioninfobyid", { value: hash }),
      this.rpc.post(1, "wallet/gettransactioninfobyid", { value: hash }),
    ]);
    return selectEventIndex(
      values.map((value) =>
        value.status === "fulfilled" && value.value.id
          ? (value.value.log ?? [])
              .map((log: any, index: number) => ({ log, index }))
              .filter(
                ({ log }: any) =>
                  log.address?.toLowerCase() ===
                    addressHex(this.asset.contract!).slice(-40) &&
                  log.topics?.length === 3 &&
                  String(log.topics[0]).toLowerCase() === transferTopic &&
                  log.topics[1].slice(-40).toLowerCase() ===
                    addressHex(sender).slice(-40) &&
                  log.topics[2].slice(-40).toLowerCase() ===
                    addressHex(destination).slice(-40),
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
    hash = canonicalTransactionHash("tron", hash);
    if (!validity.expiresAt || !Number.isFinite(validity.expiresAt.getTime()))
      return false;
    const identities = await Promise.all(
      ([0, 1] as const).map((side) =>
        this.rpc.post(
          side,
          "jsonrpc",
          { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] },
          true,
        ),
      ),
    );
    if (identities.some((v) => BigInt(v) !== chainIds[this.asset.network]))
      throw new Error("WRONG_NETWORK");
    const observations = await Promise.all(
      ([0, 1] as const).map(async (side) => {
        const [transaction, current, solid, block] = await Promise.all([
          this.rpc.post(side, "wallet/gettransactionbyid", { value: hash }),
          this.rpc.post(side, "wallet/gettransactioninfobyid", { value: hash }),
          this.rpc.post(side, "walletsolidity/gettransactioninfobyid", {
            value: hash,
          }),
          this.rpc.post(side, "walletsolidity/getnowblock", {}),
        ]);
        return (
          !!transaction &&
          !!current &&
          !!solid &&
          !transaction.txID &&
          !current.id &&
          !solid.id &&
          integer(block.block_header.raw_data.timestamp) >
            BigInt(validity.expiresAt!.getTime())
        );
      }),
    );
    return observations.every(Boolean);
  }
  async getTransactionStatus(asset: AssetRegistry, signed: SignedTransfer) {
    const tx = JSON.parse(signed.bytes);
    if (
      !utils.transaction.txCheck(tx) ||
      tx.txID !== signed.hash ||
      !tx.signature?.length ||
      asset.key !== this.asset.key
    )
      throw new Error("SIGNED_INTENT_INVALID");
    await this.network();
    return reconcileEvidence(
      await Promise.allSettled([
        this.observe(asset, signed.hash, -1, 0),
        this.observe(asset, signed.hash, -1, 1),
      ]),
      signed.hash,
      -1,
    );
  }
}
