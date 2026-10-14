import { sql } from 'drizzle-orm';
import { rateLimits,readManifest,withContext } from '@gifters/db';
import { hash } from './auth-crypto';
import { isIP } from 'node:net';
type Family='auth'|'mfa'|'consent'|'invoice'|'payment_proof'|'wallet'|'withdrawal'|'business_settlement'|'notifications'|'reports'|'own_data'|'staff'|'import_reset'|'mutation'|'reads';
export function canonicalRateRoute(request:Request){return request.method.toUpperCase()+':'+new URL(request.url).pathname.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi,'');}
export function rateClientIp(request:Request){
 // Vercel overwrites this header. Arbitrary forwarded headers are never trusted.
 if(process.env.VERCEL!=='1')return 'isolated';
 const value=(request.headers.get('x-vercel-forwarded-for')??'').trim();
 if(isIP(value)===4)return value;
 if(isIP(value)===6){try{return new URL(`http://[${value}]/`).hostname.slice(1,-1);}catch{return 'unknown';}}
 return 'unknown';
}
export async function enforceRate(request:Request,family:Family,subject:string,anonymous=false){
 const ip=rateClientIp(request);
 const route=canonicalRateRoute(request);
 const limited=await withContext({access:'service'},async tx=>{
  const policy=(await readManifest(tx)).rate_policies[family];
  const scopes=anonymous?[['public-miss',route,ip]]:policy.key==='factor_ip_route'?[['factor',subject],['ip',ip]]:[[route,policy.key.includes('ip')?ip:'',policy.key==='ip_route'?'':subject]];
  let exceeded=false;
  for(const scope of scopes){
  const key=hash([process.env.APP_ENV??'simulation',family,...scope].join('|'));
  const [row]=await tx.insert(rateLimits).values({keyHash:key,environment:process.env.APP_ENV??'simulation',windowStart:sql`clock_timestamp()`,windowSeconds:policy.window_seconds,used:1,expiresAt:sql`clock_timestamp()+${policy.window_seconds}*interval '1 second'`})
   .onConflictDoUpdate({target:rateLimits.keyHash,set:{used:sql`case when ${rateLimits.expiresAt}<=clock_timestamp() then 1 else least(${rateLimits.used}+1,${policy.allowance+1}) end`,windowStart:sql`case when ${rateLimits.expiresAt}<=clock_timestamp() then clock_timestamp() else ${rateLimits.windowStart} end`,windowSeconds:policy.window_seconds,expiresAt:sql`case when ${rateLimits.expiresAt}<=clock_timestamp() then clock_timestamp()+${policy.window_seconds}*interval '1 second' else ${rateLimits.expiresAt} end`}}).returning({used:rateLimits.used});
  exceeded=exceeded||row.used>policy.allowance;
  }
  return exceeded;
 });
 if(limited)throw new Error('RATE_LIMITED');
}
