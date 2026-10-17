import crypto from 'node:crypto';
import {z} from 'zod';
import {assertNetworkBinding} from '../../packages/chains/src/network';
import type {Chain,FinancialEnvironment} from '../../packages/chains/src/types';

export type KeyScope={chain:Chain;environment:FinancialEnvironment;network:string};
const encoded=z.string().min(1).max(1024).regex(/^[A-Za-z0-9_-]+$/);
const envelope=z.object({
  version:z.union([z.literal(1),z.literal(2)]),
  chain:z.enum(['eth','bnb','sol','tron']),
  environment:z.enum(['testnet','mainnet']),
  network:z.string().min(1).max(100),
  publicAddress:z.string().min(1).max(100),
  salt:encoded,iv:encoded,tag:encoded,cipher:encoded,
}).strict();
function decode(value:string,size:number){
  const bytes=Buffer.from(value,'base64url');
  if(bytes.length!==size||bytes.toString('base64url')!==value)throw new Error('SIGNER_KEY_UNAVAILABLE');
  return bytes;
}
function derive(secret:string,salt:Buffer){
  if(secret.length<32||secret.length>1024)throw new Error('SIGNER_KEY_UNAVAILABLE');
  return crypto.scryptSync(secret,salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
}
function aad(record:KeyScope&{version:1|2;publicAddress:string}){
  return Buffer.from(record.version===1
    ?`gw-signer-key-v1:${record.chain}:${record.network}:testnet:${record.publicAddress}`
    :JSON.stringify(['gw-signer-key-v2',record.chain,record.environment,record.network,record.publicAddress]));
}
/** Pure offline packaging. This does not activate custody or allow signing. */
export function sealKeyEnvelope(scope:KeyScope,publicAddress:string,privateBytes:Buffer,secret:string){
  assertNetworkBinding(scope);
  if(privateBytes.length!==(scope.chain==='sol'?64:32)||!publicAddress||publicAddress.length>100)throw new Error('SIGNER_KEY_UNAVAILABLE');
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),derived=derive(secret,salt);
  try{
    const record={version:2 as const,chain:scope.chain,environment:scope.environment,network:scope.network,publicAddress},cipher=crypto.createCipheriv('aes-256-gcm',derived,iv);
    cipher.setAAD(aad(record));
    const encrypted=Buffer.concat([cipher.update(privateBytes),cipher.final()]);
    return {...record,salt:salt.toString('base64url'),iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),cipher:encrypted.toString('base64url')};
  }finally{derived.fill(0)}
}
/** Every accepted byte is authenticated before releasing it to the caller.
 * Legacy v1 is testnet-only. The caller must clear the returned private buffer. */
export function openKeyEnvelope(value:unknown,scope:KeyScope,secret:string){
  let derived:Buffer|undefined,plain:Buffer|undefined;
  try{
    assertNetworkBinding(scope);
    const record=envelope.parse(value);
    if(record.chain!==scope.chain||record.environment!==scope.environment||record.network!==scope.network||record.version===1&&record.environment!=='testnet')throw new Error();
    const size=scope.chain==='sol'?64:32;
    derived=derive(secret,decode(record.salt,16));
    const decipher=crypto.createDecipheriv('aes-256-gcm',derived,decode(record.iv,12));
    decipher.setAAD(aad(record));decipher.setAuthTag(decode(record.tag,16));
    const partial=decipher.update(decode(record.cipher,size));
    try{plain=Buffer.concat([partial,decipher.final()])}finally{partial.fill(0)}
    if(plain.length!==size)throw new Error();
    return {bytes:plain,address:record.publicAddress};
  }catch{plain?.fill(0);throw new Error('SIGNER_KEY_UNAVAILABLE')}
  finally{derived?.fill(0)}
}
