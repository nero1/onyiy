export type FinancialWorkerScope={environment:'testnet'|'mainnet';purpose:'financial';method:'POST';path:'/api/v1/internal/financial';timestamp:string;nonce:string;bodyHash:string};
export function financialWorkerSignature(scope:FinancialWorkerScope,key:Uint8Array):string;
