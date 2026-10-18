import type {AssetRegistry,Chain,FinancialEnvironment} from './types';
const networks:Record<FinancialEnvironment,Record<Chain,readonly string[]>>={
 testnet:{eth:['11155111'],bnb:['97'],sol:['devnet'],tron:['nile','shasta']},
 mainnet:{eth:['1'],bnb:['56'],sol:['mainnet-beta'],tron:['mainnet']},
};
export function assertNetworkBinding(asset:Pick<AssetRegistry,'environment'|'chain'|'network'>){
 if(!networks[asset.environment]?.[asset.chain]?.includes(asset.network))throw new Error('REGISTRY_NETWORK_MISMATCH');
}
export function chainEnvironmentSuffix(chain:Chain,environment:FinancialEnvironment){
 if(!networks[environment]?.[chain])throw new Error('REGISTRY_NETWORK_MISMATCH');
 return ({eth:'ETH',bnb:'BNB',sol:'SOL',tron:'TRON'} as const)[chain]+'_'+environment.toUpperCase();
}

// RPC readers must opt in to v1, including blocks containing legacy payments.
// https://solana.com/docs/core/transactions/versioned-transactions
export const solanaMaxSupportedTransactionVersion = 1;
export function solanaGenesis(environment:FinancialEnvironment){
 return environment==='mainnet'?'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d':'EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
}
export function tronChainId(network:string){
 const value=({nile:3448148188n,shasta:2494104990n,mainnet:728126428n} as Record<string,bigint>)[network];
 if(value===undefined)throw new Error('WRONG_NETWORK');return value;
}
