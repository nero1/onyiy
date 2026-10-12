import crypto from 'node:crypto';
import { z } from 'zod';
export const hash=(value:string)=>crypto.createHash('sha256').update(value).digest('hex');
export const randomToken=()=>crypto.randomBytes(32).toString('base64url');
export function environmentKey(name:string){const value=process.env[name]??'';if(!/^[A-Za-z0-9_-]{43}$/.test(value)||Buffer.from(value,'base64url').toString('base64url')!==value)throw new Error('PROVIDER_UNAVAILABLE');return Buffer.from(value,'base64url');}
const claimsSchema=z.object({sub:z.string().uuid(),sid:z.string().uuid(),sg:z.string().uuid(),sv:z.number().int().positive(),jti:z.string().uuid(),iat:z.number().int(),exp:z.number().int(),aud:z.string(),iss:z.literal('gw:simulation'),type:z.enum(['access','pre_auth'])}).strict();
export type AccessClaims=z.infer<typeof claimsSchema>;
export function signAccess(claims:AccessClaims){const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');const body=Buffer.from(JSON.stringify(claimsSchema.parse(claims))).toString('base64url');const key=environmentKey('AUTH_ACCESS_KEY');try{return header+'.'+body+'.'+crypto.createHmac('sha256',key).update(header+'.'+body).digest('base64url')}finally{key.fill(0)}}
export function verifyAccess(token:string,audience:string){
 try{if(token.length>4096)throw Error();const parts=token.split('.');if(parts.length!==3||!parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)))throw Error();
  const header=JSON.parse(Buffer.from(parts[0],'base64url').toString());if(header.alg!=='HS256'||header.typ!=='JWT'||Object.keys(header).length!==2)throw Error();
  const actual=Buffer.from(parts[2],'base64url');if(actual.length!==32)throw Error();let valid=false;
  for(const name of ['AUTH_ACCESS_KEY',...(process.env.AUTH_ACCESS_PREVIOUS_KEY?['AUTH_ACCESS_PREVIOUS_KEY']:[])]){const key=environmentKey(name);try{const expected=crypto.createHmac('sha256',key).update(parts[0]+'.'+parts[1]).digest();valid=crypto.timingSafeEqual(actual,expected)||valid;}finally{key.fill(0)}}
  if(!valid)throw Error();const claims=claimsSchema.parse(JSON.parse(Buffer.from(parts[1],'base64url').toString()));const now=Math.floor(Date.now()/1000);if(claims.aud!==audience||claims.exp<=now||claims.iat>now+30||claims.exp<=claims.iat)throw Error();return claims;
 }catch{throw new Error('UNAUTHENTICATED')}
}
export function seal(value:string,name:string,scope:string){const key=environmentKey(name);try{const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(scope));const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url')}finally{key.fill(0)}}
export function unseal(value:string,name:string,scope:string){const key=environmentKey(name);try{const bytes=Buffer.from(value,'base64url');const decipher=crypto.createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));decipher.setAAD(Buffer.from(scope));decipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8')}catch{throw new Error('PROVIDER_UNAVAILABLE')}finally{key.fill(0)}}
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes:Buffer){let bits=0,value=0,out='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5}}if(bits)out+=alphabet[(value<<(5-bits))&31];return out;}
export function totp(secret:string,step:bigint){if(!/^[A-Z2-7]{32}$/.test(secret))throw Error('PROVIDER_UNAVAILABLE');let bits=0,value=0;const bytes=[];for(const char of secret){value=(value<<5)|alphabet.indexOf(char);bits+=5;if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8}}const counter=Buffer.alloc(8);counter.writeBigUInt64BE(step);const digest=crypto.createHmac('sha1',Buffer.from(bytes)).update(counter).digest();const at=digest[digest.length-1]&15;return String((digest.readUInt32BE(at)&0x7fffffff)%1_000_000).padStart(6,'0');}
export function equalText(a:string,b:string){const left=Buffer.from(a);const right=Buffer.from(b);return left.length===right.length&&crypto.timingSafeEqual(left,right);}
