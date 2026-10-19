import crypto from 'node:crypto';
import {and,eq,gt,sql} from 'drizzle-orm';
import {z} from 'zod';
import {coinMarketCapIds,runtimeProviders} from '@gifters/config';
import {rateLimits,type DbExecutor} from '@gifters/db';
import {readRegistry} from '@gifters/chains';
import {databaseNow} from './auth';
import {financialEnvironmentIn} from './financial-environment';
import {signedPriceInput,ingestSignedPrice} from './crypto-prices';
export const priceFeedInput=z.discriminatedUnion('action',[
 z.object({action:z.literal('status')}).strict(),
 z.object({action:z.literal('publish'),...signedPriceInput.shape}).strict(),
 z.object({action:z.literal('failure'),retry_after_seconds:z.number().int().min(1).max(86400),code:z.enum(['PROVIDER_UNAVAILABLE','PRICE_INVALID','PRICE_STALE'])}).strict(),
]);
const cooldownKey=(environment:string)=>crypto.createHash('sha256').update('price-feed:coinmarketcap:backoff:'+environment).digest('hex');
export async function priceFeedOperation(tx:DbExecutor,input:z.infer<typeof priceFeedInput>){
 const environment=await financialEnvironmentIn(tx),provider=runtimeProviders().PRICE_PROVIDER;
 if(!['coinmarketcap','manual_signed'].includes(provider))throw new Error('PROVIDER_UNAVAILABLE');
 if(input.action==='publish')return ingestSignedPrice(tx,{document:input.document,signature:input.signature});
 const now=await databaseNow(tx),key=cooldownKey(environment);
 if(input.action==='failure'){
  if(provider!=='coinmarketcap')throw new Error('FEATURE_DISABLED');
  const until=new Date(now.getTime()+input.retry_after_seconds*1000);
  // Durable provider throttling uses the existing bounded rate-window store.
  await tx.insert(rateLimits).values({keyHash:key,environment,windowStart:now,windowSeconds:input.retry_after_seconds,used:1,expiresAt:until}).onConflictDoUpdate({target:rateLimits.keyHash,set:{windowStart:now,windowSeconds:input.retry_after_seconds,used:1,expiresAt:sql`greatest(${rateLimits.expiresAt},${until.toISOString()}::timestamptz)`}});
  return {paused:true};
 }
 const [cooldown]=await tx.select({until:rateLimits.expiresAt}).from(rateLimits).where(and(eq(rateLimits.keyHash,key),eq(rateLimits.environment,environment),gt(rateLimits.expiresAt,now))).limit(1);
 const assets=readRegistry().filter(row=>row.environment===environment&&row.enabled&&row.verified).map(row=>({key:row.key,chain:row.chain,network:row.network,kind:row.kind}));
 return {environment,provider,assets,ids:provider==='coinmarketcap'?coinMarketCapIds():null,public_key:(process.env.PRICE_FEED_PUBLIC_KEY??'').trim(),retry_at:cooldown?.until.toISOString()??null};
}
