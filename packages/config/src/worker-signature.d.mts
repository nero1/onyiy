export type FinancialWorkerScope={environment:'testnet'|'mainnet';purpose:'financial';method:'POST';path:'/api/v1/internal/financial';timestamp:string;nonce:string;bodyHash:string};
export function financialWorkerSignature(scope:FinancialWorkerScope,key:Uint8Array):string;

export type PriceFeedScope={environment:'testnet'|'mainnet';purpose:'prices';method:'POST';path:'/api/v1/internal/prices';timestamp:string;nonce:string;bodyHash:string};
export function priceFeedSignature(scope:PriceFeedScope,key:Uint8Array):string;
