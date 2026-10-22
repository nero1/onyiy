import {solanaGenesis,solanaMaxSupportedTransactionVersion as maxSupportedTransactionVersion} from './network';
import {scanTransferPage as boundedScanPage} from './scan-page';
import type {TransferScanCursor} from './types';
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

const normalized = (address: string) => new PublicKey(address).toBase58();
function transactionCosts(tx: any, payer: string) {
  const keys=tx.transaction.message.accountKeys.map((key:any)=>key.pubkey);
  const outer=tx.transaction.message.instructions;
  const inner=(tx.meta.innerInstructions??[]).flatMap((group:any)=>group.instructions??[]);
  if(!Array.isArray(outer)||outer.length+inner.length>1000)throw new Error('FEE_ATTRIBUTION_REVIEW_REQUIRED');
  const system=SystemProgram.programId.toBase58(),token=TOKEN_PROGRAM_ID.toBase58();
  const allowed=new Set([system,token,ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(),'ComputeBudget111111111111111111111111111111']);
  if(outer.some((instruction:any)=>!allowed.has(instruction.programId)))throw new Error('FEE_ATTRIBUTION_REVIEW_REQUIRED');
  const instructions=[...outer,...inner];
  const targets=new Set(instructions.filter((instruction:any)=>instruction.programId===token&&['transfer','transferChecked'].includes(instruction.parsed?.type)).map((instruction:any)=>instruction.parsed.info.destination));
  const rentTopups=new Set<any>();
  for(const group of tx.meta.innerInstructions??[]){
    if(outer[group.index]?.programId!==ASSOCIATED_TOKEN_PROGRAM_ID.toBase58())continue;
    for(const instruction of group.instructions??[]){
      if(instruction.programId!==system||instruction.parsed?.type!=='transfer')continue;
      const info=instruction.parsed.info,index=keys.indexOf(info.destination);
      const balance=tx.meta.postTokenBalances?.find((row:any)=>row.accountIndex===index);
      if(info.source!==payer||index<0||!targets.has(info.destination)||!balance?.owner||!balance?.mint||
        getAssociatedTokenAddressSync(new PublicKey(balance.mint),new PublicKey(balance.owner)).toBase58()!==info.destination||
        integer(tx.meta.postBalances[index])-integer(tx.meta.preBalances[index])!==integer(info.lamports))throw new Error('FEE_ATTRIBUTION_REVIEW_REQUIRED');
      rentTopups.add(instruction);
    }
  }
  let principal=0n,setup=0n;
  for(const instruction of instructions){
    if(instruction.programId!==system)continue;
    const type=instruction.parsed?.type,info=instruction.parsed?.info;
    if(!info)throw new Error('FEE_ATTRIBUTION_REVIEW_REQUIRED');
    if(type==='transfer'||type==='transferWithSeed'){
      const value=integer(info.lamports);
      if(rentTopups.has(instruction)){setup+=value;continue;}
      if(info.source===payer)principal+=value;
      if(info.destination===payer)principal-=value;
    }else if(type==='createAccount'||type==='createAccountWithSeed'){
      if(info.source!==payer)continue;
      const index=keys.indexOf(info.newAccount),rent=integer(info.lamports);
      if(index<0||!targets.has(info.newAccount)||integer(tx.meta.preBalances[index])!==0n||integer(tx.meta.postBalances[index])!==rent)throw new Error('FEE_ATTRIBUTION_REVIEW_REQUIRED');
      setup+=rent;
    }else if(!['allocate','allocateWithSeed','assign','assignWithSeed'].includes(type))throw new Error('FEE_ATTRIBUTION_REVIEW_REQUIRED');
  }
  const network=integer(tx.meta.fee),debit=integer(tx.meta.preBalances[0])-integer(tx.meta.postBalances[0]);
  if(debit-principal!==network+setup)throw new Error('FEE_ATTRIBUTION_REVIEW_REQUIRED');
  return {network,setup,total:network+setup};
}
export class SolanaAdapter implements ChainAdapter {
  readonly rpc: DualRpc;
  constructor(
    readonly asset: AssetRegistry,
    options: RpcOptions,
  ) {
    assertAdapterAsset(asset,options.observationOnly||options.preparationOnly);
    if (asset.chain !== "sol")
      throw new Error("WRONG_NETWORK");
    this.rpc = new DualRpc(options);
  }
  scanTransferPage(address:string,after:bigint,through:bigint,cursor?:TransferScanCursor){return boundedScanPage(this.asset,this.rpc,address,after,through,cursor)}
  async scanTransfers(address:string,after:bigint,through:bigint):Promise<TransferScan> {
    if(after<0n||through<=after||through-after>5n||through>9007199254740991n)throw new Error("SCAN_RANGE_INVALID");const account=normalized(address);
    const results=await Promise.all(([0,1] as const).map(async side=>{
      if(await this.rpc.request(side,"getGenesisHash",[])!==solanaGenesis(this.asset.environment))throw new Error("WRONG_NETWORK");if(integer(await this.rpc.request(side,"getSlot",[{commitment:"finalized"}]))<through)throw new Error("FINALITY_UNAVAILABLE");
      const slots=await this.rpc.request(side,"getBlocks",[parseInt((after+1n).toString(),10),parseInt(through.toString(),10),{commitment:"finalized"}]);if(!Array.isArray(slots)||slots.length>5)throw new Error("RPC_EVIDENCE_INVALID");const transfers:ScannedTransfer[]=[],blocks:{height:string;hash:string}[]=[];
      for(const slot of slots){const height=integer(slot);if(height<=after||height>through)throw new Error("RPC_EVIDENCE_INVALID");const block=await this.rpc.request(side,"getBlock",[slot,{commitment:"finalized",encoding:"jsonParsed",transactionDetails:"full",rewards:false,maxSupportedTransactionVersion}]);if(!block||base58.decode(block.blockhash).length!==32||!Array.isArray(block.transactions)||block.transactions.length>1000)throw new Error("SCAN_CAPACITY_EXCEEDED");
        blocks.push({height:height.toString(),hash:block.blockhash});for(const record of block.transactions){if(record.meta?.err)continue;const tx=record.transaction,hash=canonicalTransactionHash("sol",tx.signatures?.[0]);const instructions=tx.message.instructions;if(!Array.isArray(instructions)||instructions.length>1000)throw new Error("SCAN_CAPACITY_EXCEEDED");
          for(const [index,instruction] of instructions.entries()){const info=instruction.parsed?.info;let sender:string,destination:string,amount:bigint;
            if(this.asset.kind==="native"){if(instruction.programId!==SystemProgram.programId.toBase58()||instruction.parsed?.type!=="transfer")continue;sender=normalized(info.source);destination=normalized(info.destination);amount=integer(info.lamports)}
            else{if(instruction.programId!==TOKEN_PROGRAM_ID.toBase58()||instruction.parsed?.type!=="transferChecked"||info.mint!==this.asset.mint)continue;if(info.tokenAmount?.decimals!==this.asset.decimals)throw new Error("TOKEN_REGISTRY_MISMATCH");const source=record.meta.preTokenBalances?.find((v:any)=>tx.message.accountKeys[v.accountIndex]?.pubkey===info.source&&v.mint===this.asset.mint),target=record.meta.postTokenBalances?.find((v:any)=>tx.message.accountKeys[v.accountIndex]?.pubkey===info.destination&&v.mint===this.asset.mint);if(!source?.owner||!target?.owner)throw new Error("SCAN_INCOMPLETE");sender=normalized(source.owner);destination=normalized(target.owner);amount=integer(info.tokenAmount.amount)}
            if(amount<=0n||sender===destination||sender!==account&&destination!==account)continue;transfers.push({hash,index,height,blockHash:block.blockhash,sender,destination,amount,direction:destination===account?"incoming":"outgoing"});
          }
        }
      }
      if(transfers.length>100)throw new Error("SCAN_CAPACITY_EXCEEDED");return {blocks,slots:slots.map(v=>integer(v).toString()),transfers:transfers.sort((a,b)=>(a.hash+":"+a.index).localeCompare(b.hash+":"+b.index))};
    }));const digest=(value:unknown)=>JSON.stringify(value,(_,v)=>typeof v==="bigint"?v.toString():v);if(digest(results[0])!==digest(results[1]))throw new Error("RPC_SCAN_CONTRADICTION");return {through,transfers:results[0].transfers};
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
    if (!values.length || values.some((v) => v !== solanaGenesis(this.asset.environment)))
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
        if ((await this.rpc.request(side, "getGenesisHash", [])) !== solanaGenesis(this.asset.environment))
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
              maxSupportedTransactionVersion,
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
  private async finalizedBalancePair(asset:AssetRegistry,address:string,height:bigint){
    assertAdapterAsset(asset,this.rpc.nonSendingOnly);
    if(asset.key!==this.asset.key||height<0n||height>9007199254740991n)throw new Error("INVALID_INPUT");
    const account=normalized(address),target=asset.kind==="native"?account:getAssociatedTokenAddressSync(new PublicKey(asset.mint!),new PublicKey(account)).toBase58();
    return Promise.all(([0,1] as const).map(async side=>{
      if(await this.rpc.request(side,"getGenesisHash",[])!==solanaGenesis(this.asset.environment))throw new Error("WRONG_NETWORK");
      const result=await this.rpc.request(side,asset.kind==="native"?"getBalance":"getTokenAccountBalance",[target,{commitment:"finalized",minContextSlot:parseInt(height.toString(),10)}]);
      const slot=integer(result.context?.slot);
      if(slot<height)throw new Error("FINALITY_UNAVAILABLE");
      if(asset.kind==="token"&&result.value?.decimals!==asset.decimals)throw new Error("TOKEN_REGISTRY_MISMATCH");
      return {slot,amount:integer(asset.kind==="native"?result.value:result.value.amount)};
    }));
  }
  async getFinalizedBalanceSnapshot(asset:AssetRegistry,address:string,minimumHeight:bigint){
    let floor=minimumHeight;
    // Different finalized slots describe different states. Retry a bounded
    // common observation; equal amounts at different slots are never proof.
    for(let round=0;round<3;round++){
      const values=await this.finalizedBalancePair(asset,address,floor);
      if(values[0].slot===values[1].slot){
        if(values[0].amount!==values[1].amount)throw new Error("RPC_BALANCE_CONTRADICTION");
        const block=await this.getCanonicalBlock(values[0].slot);
        if(!block.finalized)throw new Error("FINALITY_UNAVAILABLE");
        return {height:values[0].slot,amount:values[0].amount,blockHash:block.hash};
      }
      floor=values[0].slot>values[1].slot?values[0].slot:values[1].slot;
    }
    throw new Error("FINALITY_UNAVAILABLE");
  }
  async getReconciledBalance(asset:AssetRegistry,address:string,height:bigint){
    const values=await this.finalizedBalancePair(asset,address,height);
    // Legacy runs have no pre-scan witness. A lower-bound response cannot
    // impersonate their historical accounting cutoff, even if amounts agree.
    if(values.some(value=>value.slot!==height))throw new Error("FINALITY_UNAVAILABLE");
    if(values[0].amount!==values[1].amount)throw new Error("RPC_BALANCE_CONTRADICTION");
    return values[0].amount;
  }
  async getBalance(asset: AssetRegistry, address: string, fresh = false) {
    assertAdapterAsset(asset,this.rpc.nonSendingOnly);
    if (asset.chain !== "sol" || asset.network !== this.asset.network)
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
    if (normalized(intent.sender) === normalized(intent.destination)) throw new Error("SELF_TRANSFER_NOT_ALLOWED");
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
    if(this.rpc.assertPreparation())assertAdapterAsset(this.asset,true);else assertActive(this.asset);
    if (normalized(intent.sender) === normalized(intent.destination)) throw new Error("SELF_TRANSFER_NOT_ALLOWED");
    await this.network();
    if (
      !intent.fee.validity ||
      intent.asset.chain !== "sol" ||
      intent.asset.network !== this.asset.network || intent.asset.environment!==this.asset.environment
    )
      throw new Error("INVALID_INPUT");
    const { tx,rent } = await this.unsigned(intent, intent.fee.validity.blockhash);
    if(rent>(intent.fee.accountSetupCost??0n))throw new Error('FEE_REQUOTE_REQUIRED');
    return {
      family: "sol",
      environment: intent.asset.environment,
      network: this.asset.network,
      intent,
      payload: tx
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64"),
      validUntilHeight: intent.fee.validity.lastValidBlockHeight,
    };
  }
  async broadcastSigned(signed: SignedTransfer) {
    this.rpc.assertBroadcast();
    assertActive(this.asset);
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
          maxSupportedTransactionVersion,
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
          maxSupportedTransactionVersion,
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
    const costs=transactionCosts(tx,sender);
    const actualNetworkFee=costs.network,actualNativeFee=costs.total;
    const final = status.value?.[0]?.confirmationStatus === "finalized";
    const block = await this.rpc.request(side, "getBlock", [
      tx.slot,
      {
        commitment: final ? "finalized" : "confirmed",
        transactionDetails: "signatures",
        rewards: false,
        maxSupportedTransactionVersion,
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
      accountSetupCost: costs.setup,
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
          maxSupportedTransactionVersion,
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
    if (normalized(expected.sender) === normalized(expected.destination)) throw new Error("SELF_TRANSFER_NOT_ALLOWED");
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
  async proveExpiry(hash: string, _validity: { lastValidHeight?: bigint; expiresAt?: Date }) {
    canonicalTransactionHash("sol", hash);
    // These RPCs do not attest complete historical coverage. An expired
    // validity window plus a missing transaction cannot exclude earlier inclusion.
    // Keep the signed packet and holds until positive canonical resolution.
    return false;
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
