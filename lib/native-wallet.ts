"use client";
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
  environment: "testnet";
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
  return asset.key.includes("sol")
    ? "sol"
    : asset.key.includes("tron") || asset.key === "trx"
      ? "tron"
      : "evm";
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
    const expected =
      asset.network === "97"
        ? "0x61"
        : asset.network === "11155111"
          ? "0xaa36a7"
          : "";
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
    if (asset.network !== "devnet" || !window.solana)
      throw new Error("WALLET_UNAVAILABLE");
    return (await window.solana.connect()).publicKey.toBase58();
  }
  if (
    !["nile", "shasta"].includes(asset.network) ||
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
    prepared.asset_key !== currency.key ||
    prepared.network !== currency.network ||
    prepared.kind !== currency.kind ||
    prepared.contract !== currency.contract ||
    prepared.mint !== currency.mint
  )
    throw new Error("VERSION_CONFLICT");
  if (
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
      BigInt(p.gasLimit) * BigInt(p.gasPrice) >
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
    if (currency.network !== "devnet" || !window.solana)
      throw new Error("WRONG_NETWORK");
    const { Transaction, SystemProgram, PublicKey } = await import(
        "@solana/web3.js"
      ),
      {
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
        getAssociatedTokenAddressSync,
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
    if (currency.kind === "native") {
      if (
        tx.instructions.length !== 1 ||
        !tx.instructions[0].programId.equals(SystemProgram.programId) ||
        tx.instructions[0].data.length !== 12 ||
        tx.instructions[0].keys.length !== 2 ||
        tx.instructions[0].keys[0].pubkey.toBase58() !== prepared.sender ||
        !tx.instructions[0].keys[0].isSigner ||
        !tx.instructions[0].keys[0].isWritable ||
        !tx.instructions[0].keys[1].isWritable ||
        tx.instructions[0].keys[1].isSigner ||
        tx.instructions[0].data.readUInt32LE(0) !== 2 ||
        tx.instructions[0].data.readBigUInt64LE(4) !== amount ||
        tx.instructions[0].keys[1].pubkey.toBase58() !== prepared.destination
      )
        throw new Error("SIGNED_INTENT_INVALID");
    } else {
      const mint = new PublicKey(currency.mint!),
        to = getAssociatedTokenAddressSync(
          mint,
          new PublicKey(prepared.destination),
        ),
        from = getAssociatedTokenAddressSync(
          mint,
          new PublicKey(prepared.sender),
        ),
        transfers = tx.instructions.filter((i) =>
          i.programId.equals(TOKEN_PROGRAM_ID),
        );
      if (
        transfers.length !== 1 ||
        tx.instructions.length > 2 ||
        tx.instructions.some(
          (i) =>
            !i.programId.equals(TOKEN_PROGRAM_ID) &&
            !i.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID),
        )
      )
        throw new Error("SIGNED_INTENT_INVALID");
      const transfer = transfers[0];
      if (
        transfer.data.length !== 10 ||
        transfer.keys.length !== 4 ||
        !transfer.keys[0].isWritable ||
        transfer.keys[0].isSigner ||
        transfer.keys[1].isWritable ||
        transfer.keys[1].isSigner ||
        !transfer.keys[2].isWritable ||
        transfer.keys[2].isSigner ||
        !transfer.keys[3].isSigner ||
        transfer.data[0] !== 12 ||
        transfer.data.readBigUInt64LE(1) !== amount ||
        transfer.data[9] !== currency.decimals ||
        !transfer.keys[0].pubkey.equals(from) ||
        !transfer.keys[1].pubkey.equals(mint) ||
        !transfer.keys[2].pubkey.equals(to) ||
        transfer.keys[3].pubkey.toBase58() !== prepared.sender
      )
        throw new Error("SIGNED_INTENT_INVALID");
      for (const creation of tx.instructions.filter((i) =>
        i.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID),
      ))
        if (
          creation.data.length !== 1 ||
          creation.keys.length !== 6 ||
          !creation.keys[0].isSigner ||
          !creation.keys[0].isWritable ||
          !creation.keys[1].isWritable ||
          creation.keys[1].isSigner ||
          !creation.keys[4].pubkey.equals(SystemProgram.programId) ||
          !creation.keys[5].pubkey.equals(TOKEN_PROGRAM_ID) ||
          creation.keys.slice(2).some((k) => k.isSigner || k.isWritable) ||
          creation.data[0] !== 1 ||
          creation.keys[0].pubkey.toBase58() !== prepared.sender ||
          !creation.keys[1].pubkey.equals(to) ||
          creation.keys[2].pubkey.toBase58() !== prepared.destination ||
          !creation.keys[3].pubkey.equals(mint)
        )
          throw new Error("SIGNED_INTENT_INVALID");
    }
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
      (currency.network === "nile"
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
    !utils.transaction.txCheck(p) ||
    p.raw_data.contract.length !== 1 ||
    c.type !== "TriggerSmartContract" ||
    values.owner_address.toLowerCase() !== asHex(prepared.sender) ||
    values.contract_address.toLowerCase() !== asHex(currency.contract!) ||
    values.data.toLowerCase() !== data ||
    BigInt(values.call_value ?? 0) !== 0n ||
    BigInt(p.raw_data.fee_limit) > BigInt(prepared.total_fee_native)
  )
    throw new Error("SIGNED_INTENT_INVALID");
  assertCurrent();
  const signed = await wallet.trx.sign(p);
  assertCurrent();
  if (
    !utils.transaction.txCheck(signed) ||
    signed.raw_data_hex !== p.raw_data_hex ||
    signed.txID !== p.txID
  )
    throw new Error("SIGNED_INTENT_INVALID");
  const result = await wallet.trx.sendRawTransaction(signed);
  if (!result.result) throw new Error("BROADCAST_AMBIGUOUS");
  return p.txID as string;
}
