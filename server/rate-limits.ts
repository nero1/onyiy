import { sql } from 'drizzle-orm';
import { rateLimits,readManifest,withContext } from '@gifters/db';
import { hash } from './auth-crypto';
type Family='auth'|'mfa'|'consent'|'invoice'|'payment_proof'|'wallet'|'withdrawal'|'business_settlement'|'notifications'|'reports'|'own_data'|'staff'|'import_reset'|'mutation'|'reads';
export async function enforceRate(request:Request,family:Family,subject:string){
 const ip=process.env.VERCEL==='1'?(request.headers.get('x-vercel-forwarded-for')??'unknown').split(',')[0].trim().slice(0,100):'isolated';
 const route=new URL(request.url).pathname;
 const limited=await withContext({access:'service'},async tx=>{
  const policy=(await readManifest(tx)).rate_policies[family];
  const key=hash(['simulation',family,route,policy.key.includes('ip')?ip:'',policy.key==='ip_route'?'':subject].join('|'));
  const [row]=await tx.insert(rateLimits).values({keyHash:key,environment:'simulation',windowStart:sql`clock_timestamp()`,windowSeconds:policy.window_seconds,used:1,expiresAt:sql`clock_timestamp()+${policy.window_seconds}*interval '1 second'`})
   .onConflictDoUpdate({target:rateLimits.keyHash,set:{used:sql`case when ${rateLimits.expiresAt}<=clock_timestamp() then 1 else ${rateLimits.used}+1 end`,windowStart:sql`case when ${rateLimits.expiresAt}<=clock_timestamp() then clock_timestamp() else ${rateLimits.windowStart} end`,windowSeconds:policy.window_seconds,expiresAt:sql`case when ${rateLimits.expiresAt}<=clock_timestamp() then clock_timestamp()+${policy.window_seconds}*interval '1 second' else ${rateLimits.expiresAt} end`}}).returning({used:rateLimits.used});
  return row.used>policy.allowance;
 });
 if(limited)throw new Error('RATE_LIMITED');
}
