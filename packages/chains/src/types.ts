export type Chain = "eth" | "bnb" | "sol" | "tron";
export type AssetKey =
  | "eth"
  | "bnb"
  | "sol"
  | "usdt_bnb"
  | "usdt_sol"
  | "usdt_tron"
  | "jaga_bnb";
export type AssetRegistry = {
  key: AssetKey;
  chain: Chain;
  environment: "testnet";
  network: string;
  kind: "native" | "token";
  decimals: number;
  contract?: string;
  mint?: string;
  enabled: boolean;
  verified: boolean;
  source: string;
  verifiedAt: string;
  explorer: string;
  finality: {
    mode: "finalized" | "depth" | "solidified";
    depth?: number;
  };
  dust: string;
};
export type Transfer = {
  asset: AssetRegistry;
  hash: string;
  index: number;
  sender: string;
  destination: string;
  amount?: bigint;
};
export type TransferEvidence = {
  state: "missing" | "pending" | "confirmed" | "failed";
  hash: string;
  blockHash?: string;
  height?: bigint;
  sender?: string;
  destination?: string;
  amount?: bigint;
  actualNativeFee?: bigint;
  index: number;
  observedAt: string;
  contradiction?: boolean;
};
export type FeeQuote = {
  nativeFee: bigint;
  gasLimit: bigint;
  unitPrice: bigint;
  priorityPrice?: bigint;
  observedAt: string;
  validity?: {
    blockhash: string;
    lastValidBlockHeight: bigint;
  };
};
export type TransferIntent = {
  asset: AssetRegistry;
  sender: string;
  destination: string;
  amount: bigint;
  nonce?: bigint;
  fee: FeeQuote;
};
export type PreparedTransfer = {
  family: Chain;
  environment: "testnet";
  network: string;
  intent: TransferIntent;
  payload: unknown;
  validUntilHeight?: bigint;
};
export type SignedTransfer = {
  hash: string;
  bytes: string;
  nonce?: bigint;
  validUntilHeight?: bigint;
};
export interface ChainAdapter {
  validateAddress(address: string): Promise<boolean>;
  normalizeAddress(address: string): Promise<string>;
  verifyOwnershipProof(
    address: string,
    message: string,
    signature: string,
  ): Promise<boolean>;
  getNativeBalance(address: string, fresh?: boolean): Promise<bigint>;
  getBalance(
    asset: AssetRegistry,
    address: string,
    fresh?: boolean,
  ): Promise<bigint>;
  verifyTransfer(expected: Transfer): Promise<TransferEvidence>;
  estimateFee(intent: Omit<TransferIntent, "fee">): Promise<FeeQuote>;
  buildTransfer(intent: TransferIntent): Promise<PreparedTransfer>;
  broadcastSigned(signed: SignedTransfer): Promise<string>;
  getTransactionStatus(
    asset: AssetRegistry,
    signed: SignedTransfer,
  ): Promise<TransferEvidence>;
  getFinality(): Promise<bigint>;
  currentBlockHeight(): Promise<bigint>;
}
export type RpcOptions = {
  primary: string;
  secondary: string;
  timeoutMs: number;
  requestsPerSecond: number;
  fixture?: boolean;
};
