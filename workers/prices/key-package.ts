import crypto from 'node:crypto';
import {z} from 'zod';
const encoded=z.string().regex(/^[A-Za-z0-9_-]+$/);
const schema=z.object({version:z.literal(1),purpose:z.literal('price-feed'),environment:z.enum(['testnet','mainnet']),public_key:encoded.max(128),iv:encoded.max(32),tag:encoded.max(32),ciphertext:encoded.max(1024)}).strict();
function secret(raw:string){if(!/^[A-Za-z0-9_-]{43}$/.test(raw))throw new Error('INVALID_PROOF');const key=Buffer.from(raw,'base64url');if(key.length!==32||key.toString('base64url')!==raw)throw new Error('INVALID_PROOF');return key;}
const aad=(environment:string,publicKey:string)=>Buffer.from(JSON.stringify({version:1,purpose:'price-feed',environment,public_key:publicKey}));
export function createPriceKeyPackage(environment:'testnet'|'mainnet',decryptionSecret:string){
 if(!['testnet','mainnet'].includes(environment))throw new Error('INVALID_INPUT');
 const key=secret(decryptionSecret),pair=crypto.generateKeyPairSync('ed25519'),publicKey=pair.publicKey.export({format:'der',type:'spki'}).toString('base64url'),clear=pair.privateKey.export({format:'der',type:'pkcs8'}),iv=crypto.randomBytes(12);
 try{const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad(environment,publicKey));const ciphertext=Buffer.concat([cipher.update(clear),cipher.final()]);return {version:1 as const,purpose:'price-feed' as const,environment,public_key:publicKey,iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),ciphertext:ciphertext.toString('base64url')};}finally{clear.fill(0);key.fill(0)}
}
export function openPriceKey(raw:string,decryptionSecret:string,environment:'testnet'|'mainnet'){
 if(Buffer.byteLength(raw)>4096)throw new Error('INVALID_PROOF');let value:z.infer<typeof schema>;try{value=schema.parse(JSON.parse(raw));}catch{throw new Error('INVALID_PROOF')}
 if(value.environment!==environment)throw new Error('FINANCIAL_ENVIRONMENT_DENIED');const key=secret(decryptionSecret);let clear:Buffer|undefined;
 try{const iv=Buffer.from(value.iv,'base64url'),tag=Buffer.from(value.tag,'base64url'),ciphertext=Buffer.from(value.ciphertext,'base64url');if(iv.length!==12||tag.length!==16||ciphertext.length>512||[value.iv,value.tag,value.ciphertext,value.public_key].some(v=>Buffer.from(v,'base64url').toString('base64url')!==v))throw Error();const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAAD(aad(environment,value.public_key));decipher.setAuthTag(tag);clear=Buffer.concat([decipher.update(ciphertext),decipher.final()]);const privateKey=crypto.createPrivateKey({key:clear,format:'der',type:'pkcs8'}),publicKey=crypto.createPublicKey(privateKey).export({format:'der',type:'spki'}).toString('base64url');if(privateKey.asymmetricKeyType!=='ed25519'||publicKey!==value.public_key)throw Error();return {privateKey,publicKey};}catch{throw new Error('INVALID_PROOF')}finally{key.fill(0);clear?.fill(0)}
}
