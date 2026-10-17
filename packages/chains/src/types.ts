export type FinancialEnvironment = "testnet" | "mainnet";
export type Chain = "eth" | "bnb" | "sol" | "tron";
export type AssetKey =
  | "eth"
  | "bnb"
  | "sol"
  | "usdt_bnb"
  | "usdt_sol"
  | "usdt_tron"
  | "jaga_bnb"
  | "trx";
export type AssetRegistry = {
  key: AssetKey;
  chain: Chain;
  environment: FinancialEnvironment;
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
  actualNetworkFee?: bigint;
  accountSetupCost?: bigint;
  index: number;
  observedAt: string;
  contradiction?: boolean;
};
export type FeeQuote = {
  nativeFee: bigint;
  networkFee?: bigint;
  accountSetupCost?: bigint;
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
  environment: FinancialEnvironment;
  network: string;
  intent: TransferIntent;
  payload: unknown;
  validUntilHeight?: bigint;
  expiresAt?: Date;
};
export type SignedTransfer = {
  hash: string;
  bytes: string;
  nonce?: bigint;
  validUntilHeight?: bigint;
  expiresAt?: Date;
};
export type ScannedTransfer={hash:string;index:number;sender:string;destination:string;amount:bigint;height:bigint;blockHash:string;direction:"incoming"|"outgoing"};
export type TransferScan={through:bigint;transfers:ScannedTransfer[]};
export type TransferScanCursor={height:string;transaction:number;event:number;blockHash?:string};
export type TransferScanPage={cursor:TransferScanCursor;through:bigint;transfers:ScannedTransfer[];producedSlots?:string[]};
export type FinalizedBalanceSnapshot={height:bigint;blockHash:string;amount:bigint};
export interface ChainAdapter {
  getFinalizedBalanceSnapshot?(asset:AssetRegistry,address:string,minimumHeight:bigint):Promise<FinalizedBalanceSnapshot>;
  scanTransferPage(address:string,after:bigint,through:bigint,cursor?:TransferScanCursor):Promise<TransferScanPage>;
  getReconciledBalance(asset:AssetRegistry,address:string,exactHeight:bigint):Promise<bigint>;
  scanTransfers(address:string,after:bigint,through:bigint):Promise<TransferScan>;
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
  findTransferIndex(
    hash: string,
    sender: string,
    destination: string,
  ): Promise<number | undefined>;
  verifyTransfer(expected: Transfer): Promise<TransferEvidence>;
  estimateFee(intent: Omit<TransferIntent, "fee">): Promise<FeeQuote>;
  buildTransfer(intent: TransferIntent): Promise<PreparedTransfer>;
  broadcastSigned(signed: SignedTransfer): Promise<string>;
  getTransactionStatus(
    asset: AssetRegistry,
    signed: SignedTransfer,
  ): Promise<TransferEvidence>;
  proveExpiry?(
    hash: string,
    validity: { lastValidHeight?: bigint; expiresAt?: Date },
  ): Promise<boolean>;
  assertReference?(payload: unknown): Promise<void>;
  getCanonicalBlock(
    height: bigint,
  ): Promise<{ height: bigint; hash: string; finalized: boolean }>;
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
