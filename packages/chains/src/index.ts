export * from "./network";
export * from "./types";
export * from "./registry";
import { assertAdapterAsset } from "./registry";
import type { AssetRegistry, ChainAdapter, ChainObservationAdapter, ChainPreparationAdapter, RpcOptions } from "./types";
export async function chainAdapter(
  asset: AssetRegistry,
  options: RpcOptions,
): Promise<ChainAdapter> {
  assertAdapterAsset(asset,options.observationOnly||options.preparationOnly);
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

/** No raw RPC client, fee preparation or sending methods escape this facade. */
export async function chainObservationAdapter(asset:AssetRegistry,options:RpcOptions):Promise<ChainObservationAdapter>{
 const adapter=await chainAdapter(asset,{...options,observationOnly:true});
 return Object.freeze(readFacet(adapter));
}

function readFacet(adapter:ChainAdapter):ChainObservationAdapter{return {
  getFinalizedBalanceSnapshot:adapter.getFinalizedBalanceSnapshot?.bind(adapter),
  scanTransferPage:adapter.scanTransferPage.bind(adapter),getReconciledBalance:adapter.getReconciledBalance.bind(adapter),scanTransfers:adapter.scanTransfers.bind(adapter),
  validateAddress:adapter.validateAddress.bind(adapter),normalizeAddress:adapter.normalizeAddress.bind(adapter),verifyOwnershipProof:adapter.verifyOwnershipProof.bind(adapter),
  getNativeBalance:adapter.getNativeBalance.bind(adapter),getBalance:adapter.getBalance.bind(adapter),findTransferIndex:adapter.findTransferIndex.bind(adapter),verifyTransfer:adapter.verifyTransfer.bind(adapter),
  getTransactionStatus:adapter.getTransactionStatus.bind(adapter),proveExpiry:adapter.proveExpiry?.bind(adapter),assertReference:adapter.assertReference?.bind(adapter),
  getCanonicalBlock:adapter.getCanonicalBlock.bind(adapter),getFinality:adapter.getFinality.bind(adapter),currentBlockHeight:adapter.currentBlockHeight.bind(adapter),
 };
}

/** Builds unsigned review material only; no RPC client or broadcast escapes. */
export async function chainPreparationAdapter(asset:AssetRegistry,options:RpcOptions):Promise<ChainPreparationAdapter>{
 if(options.observationOnly)throw new Error('RPC_CONFIGURATION_INVALID');
 const adapter=await chainAdapter(asset,{...options,observationOnly:false,preparationOnly:true});
 return Object.freeze({...readFacet(adapter),estimateFee:adapter.estimateFee.bind(adapter),buildTransfer:adapter.buildTransfer.bind(adapter)});
}

export * from "./hash";

export {withRpcBudget,withRpcCancellation} from './rpc';
