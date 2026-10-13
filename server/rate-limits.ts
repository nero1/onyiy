import { sql } from 'drizzle-orm';
import { rateLimits,readManifest,withContext } from '@gifters/db';
import { hash } from './auth-crypto';
type Family='auth'|'mfa'|'consent'|'invoice'|'payment_proof'|'wallet'|'withdrawal'|'business_settlement'|'notifications'|'reports'|'own_data'|'staff'|'import_reset'|'mutation'|'reads';
export function canonicalRateRoute(request:Request){return request.method.toUpperCase()+':'+new URL(request.url).pathname.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi,'');}
export async function enforceRate(request:Request,family:Family,subject:string){
 const ip=process.env.VERCEL==='1'?(request.headers.get('x-vercel-forwarded-for')??'unknown').split(',')[0].trim().slice(0,100):'isolated';
 const route=canonicalRateRoute(request);
 const limited=await withContext({access:'service'},async tx=>{
  const policy=(await readManifest(tx)).rate_policies[family];
  const scopes=policy.key==='factor_ip_route'?[['factor',subject],['ip',ip]]:[[route,policy.key.includes('ip')?ip:'',policy.key==='ip_route'?'':subject]];
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
