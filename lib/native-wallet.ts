"use client";
import type {ProfilePresentation,PublicQueueDisclosure,PlanFinancialPresentation} from '@/server/presentation';
export type NativeCurrency = {
  id: string;
  key: string;
  symbol: string;
  network: string;
  decimals: number;
  kind: "native" | "token";
  contract?: string;
  mint?: string;
  enabled: boolean;
  execution_enabled?:boolean;
  environment: "testnet"|"mainnet";
};
type Ethereum = {
  request(input: { method: string; params?: unknown[] }): Promise<any>;
};
type Solana = {
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage(
    message: Uint8Array,
    encoding: string,
  ): Promise<{ signature: Uint8Array }>;
};
type Tron = {
  defaultAddress: { base58: string };
  trx: { signMessageV2(message: string): Promise<string> };
};
declare global {
  interface Window {
    ethereum?: Ethereum;
    solana?: Solana;
    tronLink?: { request(input: { method: string }): Promise<any> };
    tronWeb?: Tron;
  }
}
function family(asset: NativeCurrency) {
  const value=({eth:'evm',bnb:'evm',sol:'sol',trx:'tron',usdt_bnb:'evm',jaga_bnb:'evm',usdt_sol:'sol',usdt_tron:'tron'} as Record<string,'evm'|'sol'|'tron'>)[asset.key];
  if(!value||!['testnet','mainnet'].includes(asset.environment))throw new Error('WRONG_NETWORK');
  const allowed=value==='evm'?(asset.key==='eth'?(asset.environment==='mainnet'?['1']:['11155111']):(asset.environment==='mainnet'?['56']:['97'])):value==='sol'?(asset.environment==='mainnet'?['mainnet-beta']:['devnet']):(asset.environment==='mainnet'?['mainnet']:['nile','shasta']);
  if(!allowed.includes(asset.network))throw new Error('WRONG_NETWORK');
  return value;
}
function hex(bytes: Uint8Array) {
  return (
    "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}
export async function connectNativeWallet(asset: NativeCurrency) {
  if (!navigator.onLine) throw new Error("OFFLINE");
  const chain = family(asset);
  if (chain === "evm") {
    const provider = window.ethereum;
    if (!provider) throw new Error("WALLET_UNAVAILABLE");
    const expected = ({testnet:{'97':'0x61','11155111':'0xaa36a7'},mainnet:{'1':'0x1','56':'0x38'}} as Record<string,Record<string,string>>)[asset.environment]?.[asset.network];
    if (!expected) throw new Error("WRONG_NETWORK");
    const network = String(
      await provider.request({ method: "eth_chainId" }),
    ).toLowerCase();
    if (network !== expected) {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expected }],
      });
      if (
        String(
          await provider.request({ method: "eth_chainId" }),
        ).toLowerCase() !== expected
      )
        throw new Error("WRONG_NETWORK");
    }
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(accounts) || typeof accounts[0] !== "string")
      throw new Error("WALLET_UNAVAILABLE");
    return accounts[0] as string;
  }
  if (chain === "sol") {
    if (asset.network !== (asset.environment==="mainnet"?"mainnet-beta":"devnet") || !window.solana)
      throw new Error("WALLET_UNAVAILABLE");
    return (await window.solana.connect()).publicKey.toBase58();
  }
  if (
    !(asset.environment==="mainnet"?["mainnet"]:["nile","shasta"]).includes(asset.network) ||
    !window.tronLink ||
    !window.tronWeb
  )
    throw new Error("WALLET_UNAVAILABLE");
  await window.tronLink.request({ method: "tron_requestAccounts" });
  const address = window.tronWeb.defaultAddress.base58;
  if (!address) throw new Error("WALLET_UNAVAILABLE");
  return address;
}
export async function signNativeOwnership(
  asset: NativeCurrency,
  address: string,
  message: string,
) {
  const chain = family(asset);
  if (chain === "evm") {
    if (!window.ethereum) throw new Error("WALLET_UNAVAILABLE");
    return String(
      await window.ethereum.request({
        method: "personal_sign",
        params: [hex(new TextEncoder().encode(message)), address],
      }),
    );
  }
  if (chain === "sol") {
    if (!window.solana) throw new Error("WALLET_UNAVAILABLE");
    const result = await window.solana.signMessage(
        new TextEncoder().encode(message),
        "utf8",
      ),
      { base58 } = await import("@scure/base");
    return base58.encode(result.signature);
  }
  if (!window.tronWeb) throw new Error("WALLET_UNAVAILABLE");
  return window.tronWeb.trx.signMessageV2(message);
}

export type PreparedPayment = {
  profile_revision?:number;presentation?:ProfilePresentation;queue_disclosure?:PublicQueueDisclosure|null;plan?:PlanFinancialPresentation;
  environment: "testnet"|"mainnet";
  energy_fee_native?:string;
  invoice_id: string;
  asset_key: string;
  asset: string;
  network: string;
  kind: "native" | "token";
  contract?: string;
  mint?: string;
  decimals: number;
  sender: string;
  destination: string;
  amount_base_units: string;
  family: "eth" | "bnb" | "sol" | "tron";
  payload: any;
  network_fee_native: string;
  account_setup_native: string;
  total_fee_native: string;
  native_decimals: number;
  native_symbol: string;
  expires_at: string;
  valid_until_height?: string;
};
export async function sendNativePayment(
  currency: NativeCurrency,
  prepared: PreparedPayment,
  isCurrent: () => boolean = () => true,
) {
  try{currency=structuredClone(currency);prepared=structuredClone(prepared)}catch{throw new Error("SIGNED_INTENT_INVALID")}
  const assertCurrent = () => {
    if (!isCurrent()) throw new Error("SESSION_CHANGED");
  };
  assertCurrent();
  if (
    !navigator.onLine ||
    !Number.isFinite(Date.parse(prepared.expires_at)) ||
    Date.now() >= Date.parse(prepared.expires_at)
  )
    throw new Error("QUOTE_EXPIRED");
  if (
    prepared.environment !== currency.environment ||
    prepared.asset_key !== currency.key ||
    prepared.network !== currency.network ||
    prepared.kind !== currency.kind ||
    prepared.contract !== currency.contract ||
    prepared.mint !== currency.mint
  )
    throw new Error("VERSION_CONFLICT");
  if (
    prepared.sender===prepared.destination ||
    BigInt(prepared.network_fee_native) < 0n ||
    BigInt(prepared.account_setup_native) < 0n ||
    BigInt(prepared.total_fee_native) !==
      BigInt(prepared.network_fee_native) +
        BigInt(prepared.account_setup_native)
  )
    throw new Error("SIGNED_INTENT_INVALID");
  const amount = BigInt(prepared.amount_base_units);
  if (amount <= 0n) throw new Error("INVALID_INPUT");
  const chain = family(currency);
  if (
    prepared.family !==
    (chain === "evm" ? (currency.key === "eth" ? "eth" : "bnb") : chain)
  )
    throw new Error("WRONG_NETWORK");
  if (chain === "evm") {
    const address = await connectNativeWallet(currency),
      provider = window.ethereum!;
    if (address.toLowerCase() !== prepared.sender.toLowerCase())
      throw new Error("DESTINATION_CHANGED");
    const p = prepared.payload,
      expectedTo =
        currency.kind === "native" ? prepared.destination : currency.contract!,
      expectedData =
        currency.kind === "native"
          ? "0x"
          : "0xa9059cbb" +
            prepared.destination.slice(2).toLowerCase().padStart(64, "0") +
            amount.toString(16).padStart(64, "0");
    if (
      String(p.to).toLowerCase() !== expectedTo.toLowerCase() ||
      String(p.data).toLowerCase() !== expectedData ||
      BigInt(p.chainId) !== BigInt(currency.network) ||
      BigInt(p.value) !== (currency.kind === "native" ? amount : 0n) ||
      BigInt(p.gasLimit)<21000n || BigInt(p.gasPrice)<=0n ||
      BigInt(prepared.account_setup_native)!==0n ||
      BigInt(p.gasLimit) * BigInt(p.gasPrice) !==
        BigInt(prepared.total_fee_native)
    )
      throw new Error("SIGNED_INTENT_INVALID");
    const currentNetwork = await provider.request({method:"eth_chainId"});
    if (BigInt(currentNetwork) !== BigInt(currency.network)) throw new Error("WRONG_NETWORK");
    assertCurrent();
    const quantity = (v: string) => "0x" + BigInt(v).toString(16),
      hash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: prepared.sender,
            chainId: quantity(currency.network),
            to: p.to,
            data: p.data,
            value: quantity(p.value),
            gas: quantity(p.gasLimit),
            gasPrice: quantity(p.gasPrice),
          },
        ],
      });
    if (typeof hash !== "string" || !/^0x[0-9a-f]{64}$/i.test(hash))
      throw new Error("BROADCAST_AMBIGUOUS");
    return hash.toLowerCase();
  }
  if (chain === "sol") {
    if (currency.network !== (currency.environment==="mainnet"?"mainnet-beta":"devnet") || !window.solana)
      throw new Error("WRONG_NETWORK");
    const { Transaction, SystemProgram, PublicKey } = await import(
        "@solana/web3.js"
      ),
      {
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        getAssociatedTokenAddressSync,createAssociatedTokenAccountIdempotentInstruction,createTransferCheckedInstruction,
      } = await import("@solana/spl-token"),
      { base64 } = await import("@scure/base"),
      tx = Transaction.from(base64.decode(String(prepared.payload)));
    assertCurrent();
    const address = await connectNativeWallet(currency);
    assertCurrent();
    if (
      address !== prepared.sender ||
      tx.signatures.some((v) => v.signature !== null)
    )
      throw new Error("SIGNED_INTENT_INVALID");
    if (tx.feePayer?.toBase58() !== prepared.sender)
      throw new Error("SIGNED_INTENT_INVALID");
    const sender=new PublicKey(prepared.sender),destination=new PublicKey(prepared.destination),expected=new Transaction({feePayer:sender,recentBlockhash:tx.recentBlockhash});
    if(sender.equals(destination)||!tx.recentBlockhash)throw new Error("SIGNED_INTENT_INVALID");
    if(currency.kind==='native')expected.add(SystemProgram.transfer({fromPubkey:sender,toPubkey:destination,lamports:amount}));
    else{
      const mint=new PublicKey(currency.mint!),from=getAssociatedTokenAddressSync(mint,sender),to=getAssociatedTokenAddressSync(mint,destination),creations=tx.instructions.filter(i=>i.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID));
      if(creations.length>1)throw new Error("SIGNED_INTENT_INVALID");
      if(creations.length){if(BigInt(prepared.account_setup_native)<=0n)throw new Error("SIGNED_INTENT_INVALID");expected.add(createAssociatedTokenAccountIdempotentInstruction(sender,to,destination,mint));}
      expected.add(createTransferCheckedInstruction(from,mint,to,sender,amount,currency.decimals));
    }
    if(!expected.serializeMessage().equals(tx.serializeMessage()))throw new Error("SIGNED_INTENT_INVALID");
    assertCurrent();
    const result = await (
      window.solana as Solana & {
        signAndSendTransaction(tx: unknown): Promise<{ signature: string }>;
      }
    ).signAndSendTransaction(tx);
    const { base58 } = await import("@scure/base");
    if (base58.decode(result.signature).length !== 64)
      throw new Error("BROADCAST_AMBIGUOUS");
    return result.signature;
  }
  const wallet = window.tronWeb as Tron & {
    fullNode: { host: string };
    trx: {
      sign(transaction: any): Promise<any>;
      sendRawTransaction(transaction: any): Promise<any>;
    };
  };
  if (!wallet) throw new Error("WALLET_UNAVAILABLE");
  const address = await connectNativeWallet(currency);
  assertCurrent();
  if (address !== prepared.sender) throw new Error("DESTINATION_CHANGED");
  const host = new URL(wallet.fullNode.host);
  if (
    host.protocol !== "https:" ||
    host.hostname !==
      (currency.environment==="mainnet"?"api.trongrid.io":currency.network === "nile"
        ? "nile.trongrid.io"
        : "api.shasta.trongrid.io")
  )
    throw new Error("WRONG_NETWORK");
  const { TronWeb, utils } = await import("tronweb"),
    { Interface } = await import("ethers"),
    p = prepared.payload,
    c = p.raw_data?.contract?.[0],
    values = c?.parameter?.value,
    asHex = (address: string) => TronWeb.address.toHex(address).toLowerCase(),
    data = new Interface(["function transfer(address,uint256)"])
      .encodeFunctionData("transfer", [
        "0x" + asHex(prepared.destination).slice(-40),
        amount,
      ])
      .slice(2);
  if (
    p.signature?.length || Number(c?.Permission_id??0)!==0 ||
    !Number.isSafeInteger(p.raw_data?.expiration)||p.raw_data.expiration<=Date.now()||p.raw_data.expiration>Date.now()+600000 ||
    !utils.transaction.txCheck(p) ||
    p.raw_data.contract.length !== 1 ||
    c.type !== "TriggerSmartContract" ||
    values.owner_address.toLowerCase() !== asHex(prepared.sender) ||
    values.contract_address.toLowerCase() !== asHex(currency.contract!) ||
    values.data.toLowerCase() !== data ||
    BigInt(values.call_value ?? 0) !== 0n ||
    BigInt(values.call_token_value??0)!==0n || BigInt(values.token_id??0)!==0n ||
    prepared.energy_fee_native===undefined || BigInt(prepared.energy_fee_native)<0n ||
    BigInt(p.raw_data.fee_limit)!==BigInt(prepared.energy_fee_native) ||
    BigInt(p.raw_data.fee_limit) > BigInt(prepared.total_fee_native)
  )
    throw new Error("SIGNED_INTENT_INVALID");
  assertCurrent();
  const expectedRaw=p.raw_data_hex,expectedHash=p.txID;
  const signed = await wallet.trx.sign(p);
  assertCurrent();
  if (
    !utils.transaction.txCheck(signed) ||
    signed.signature?.length!==1 ||
    signed.raw_data_hex !== expectedRaw ||
    signed.txID !== expectedHash
  )
    throw new Error("SIGNED_INTENT_INVALID");
  const result = await wallet.trx.sendRawTransaction(signed);
  if (!result.result) throw new Error("BROADCAST_AMBIGUOUS");
  return expectedHash as string;
}
