export * from "./types";
export * from "./registry";
import { assertActive } from "./registry";
import type { AssetRegistry, ChainAdapter, RpcOptions } from "./types";
export async function chainAdapter(
  asset: AssetRegistry,
  options: RpcOptions,
): Promise<ChainAdapter> {
  assertActive(asset);
  if (asset.chain === "eth" || asset.chain === "bnb") {
    const { EvmAdapter } = await import("./evm");
    return new EvmAdapter(asset, options);
  }
  if (asset.chain === "sol") {
    const { SolanaAdapter } = await import("./solana");
    return new SolanaAdapter(asset, options);
  }
  const { TronAdapter } = await import("./tron");
  return new TronAdapter(asset, options);
}

export * from "./hash";

export {withRpcBudget,withRpcCancellation} from './rpc';
