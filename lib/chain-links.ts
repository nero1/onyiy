import {base58} from '@scure/base';
type ChainReference={environment:string;network:string;hash:string;registryExplorer?:string};
/** Closed destinations: a registry URL can narrow this list, never add a host. */
export function transactionExplorerUrl({environment,network,hash,registryExplorer}:ChainReference):string|null{
 let base:string|undefined,kind:'evm'|'sol'|'tron'='evm',suffix='';
 if(environment==='mainnet'){
  base=({'1':'https://etherscan.io/tx/','56':'https://bscscan.com/tx/','mainnet-beta':'https://explorer.solana.com/tx/','mainnet':'https://tronscan.org/#/transaction/'} as Record<string,string>)[network];
 }else if(environment==='testnet'){
  base=({'11155111':'https://sepolia.etherscan.io/tx/','97':'https://testnet.bscscan.com/tx/','devnet':'https://explorer.solana.com/tx/','nile':'https://nile.tronscan.org/#/transaction/','shasta':'https://shasta.tronscan.org/#/transaction/'} as Record<string,string>)[network];
 }
 if(!base)return null;
 if(['mainnet-beta','devnet'].includes(network))kind='sol';
 else if(['mainnet','nile','shasta'].includes(network))kind='tron';
 if(kind==='evm'&&!/^0x[0-9a-f]{64}$/i.test(hash)||kind==='tron'&&!/^[0-9a-f]{64}$/i.test(hash))return null;
 if(kind==='sol')try{if(base58.decode(hash).length!==64)return null;}catch{return null;}
 if(registryExplorer)try{const supplied=new URL(registryExplorer),allowed=new URL(base);if(supplied.protocol!=='https:'||supplied.origin!==allowed.origin||supplied.username||supplied.password||supplied.search)return null;}catch{return null;}
 if(network==='devnet')suffix='?cluster=devnet';
 return base+encodeURIComponent(hash)+suffix;
}
