import crypto from 'node:crypto';
import {z} from 'zod';
import {nativePriceKey} from '../../packages/config/src/price-feed';
import {signedPrice,type SignedPriceDocument} from '../../packages/config/src/signed-price';
import {pinnedPost} from '../../packages/config/src/outbound-http';
import {priceFeedSignature} from '../../packages/config/src/worker-signature.mjs';
import {CoinMarketCapProvider,PriceProviderFailure,type PriceProvider,type MarketQuote} from './coinmarketcap';
import {openPriceKey} from './key-package';
const keys=z.enum(['eth','bnb','sol','trx','usdt_bnb','usdt_sol','usdt_tron','jaga_bnb']);
const statusSchema=z.object({environment:z.enum(['testnet','mainnet']),provider:z.enum(['coinmarketcap','manual_signed']),assets:z.array(z.object({key:keys,chain:z.enum(['eth','bnb','sol','tron']),network:z.string().min(1).max(100),kind:z.enum(['native','token'])}).strict()).max(8),ids:z.record(keys,z.number().int().positive().max(2147483647)).nullable(),public_key:z.string().min(1).max(128),retry_at:z.string().datetime().nullable()}).strict();
export type PriceFeedStatus=z.infer<typeof statusSchema>;
type Transport=typeof pinnedPost;
export function priceFeedClient(env:NodeJS.ProcessEnv=process.env,transport:Transport=pinnedPost){
 const environment=env.APP_ENV,raw=env.PRICE_FEED_AUTH_KEY??'';let origin:URL;
 try{origin=new URL(env.PRICE_FEED_API_ORIGIN??'')}catch{throw new Error('CONFIGURATION_INVALID')}
 if(!['testnet','mainnet'].includes(environment??'')||origin.protocol!=='https:'||origin.origin!==env.PRICE_FEED_API_ORIGIN||origin.username||origin.password||!/^[A-Za-z0-9_-]{43}$/.test(raw)||Buffer.from(raw,'base64url').toString('base64url')!==raw)throw new Error('CONFIGURATION_INVALID');
 return async(input:unknown)=>{
  const body=JSON.stringify(input);if(Buffer.byteLength(body)>16384)throw new Error('INVALID_INPUT');const key=Buffer.from(raw,'base64url'),timestamp=String(Math.floor(Date.now()/1000)),nonce=crypto.randomUUID(),path='/api/v1/internal/prices';let signature:string;
  try{signature=priceFeedSignature({environment:environment as 'testnet'|'mainnet',purpose:'prices',method:'POST',path,timestamp,nonce,bodyHash:crypto.createHash('sha256').update(body).digest('hex')},key)}finally{key.fill(0)}
  let response:Response;try{response=await transport(new URL(path,origin),{headers:{'Content-Type':'application/json','x-worker-environment':environment!,'x-worker-timestamp':timestamp,'x-worker-nonce':nonce,'x-worker-signature':signature},body,signal:AbortSignal.timeout(15000),maxBytes:65536})}catch{throw new Error('PROVIDER_UNAVAILABLE')}
  const result:unknown=await response.json().catch(()=>null);if(!response.ok||!result||typeof result!=='object'||!('data'in result))throw new Error('PROVIDER_UNAVAILABLE');return result.data;
 };
}
function assetIds(status:PriceFeedStatus){
 if(status.provider!=='coinmarketcap'||!status.ids)throw new Error('FEATURE_DISABLED');
 const ids=new Set<number>();for(const asset of status.assets){const own=status.ids[asset.key],native=status.ids[nativePriceKey(asset.chain)];if(!own||!native||asset.kind==='native'&&asset.key!==nativePriceKey(asset.chain))throw new Error('CONFIGURATION_INVALID');ids.add(own);ids.add(native);}return [...ids].sort((a,b)=>a-b);
}
export function marketDocuments(status:PriceFeedStatus,quotes:ReadonlyMap<number,MarketQuote>):SignedPriceDocument[]{
 assetIds(status);if(new Set(status.assets.map(a=>a.key)).size!==status.assets.length)throw new Error('CONFIGURATION_INVALID');
 return status.assets.map(asset=>{const own=quotes.get(status.ids![asset.key]!),native=quotes.get(status.ids![nativePriceKey(asset.chain)]!);if(!own||!native)throw new Error('PRICE_INVALID');const observed=new Date(Math.min(Date.parse(own.observedAt),Date.parse(native.observedAt)));return signedPrice.parse({version:1,environment:status.environment,asset_key:asset.key,network:asset.network,asset_usd:own.usd,native_usd:native.usd,observed_at:observed.toISOString(),expires_at:new Date(observed.getTime()+300000).toISOString(),source:own.source});});
}
export async function runPriceFeed(operation:'refresh'|'manual',env:NodeJS.ProcessEnv=process.env,dependencies:{request?:ReturnType<typeof priceFeedClient>;provider?:PriceProvider}={}){
 const request=dependencies.request??priceFeedClient(env),status=statusSchema.parse(await request({action:'status'}));
 if(status.environment!==env.APP_ENV)throw new Error('FINANCIAL_ENVIRONMENT_DENIED');
 if(operation==='refresh'&&status.provider!=='coinmarketcap')throw new Error('FEATURE_DISABLED');
 if(operation==='refresh'&&status.retry_at&&Date.parse(status.retry_at)>Date.now())return {skipped:'provider_cooldown',published:0};
 if(!status.assets.length)return {skipped:'no_enabled_assets',published:0};
 let documents:SignedPriceDocument[];
 try{
  if(operation==='refresh'){const ids=assetIds(status),provider=dependencies.provider??new CoinMarketCapProvider(env.COINMARKETCAP_API_KEY);documents=marketDocuments(status,await provider.quotes(ids));}
  else{const asset=status.assets.find(a=>a.key===env.PRICE_MANUAL_ASSET);if(!asset)throw new Error('REGISTRY_NOT_PROVISIONED');const observed=env.PRICE_MANUAL_OBSERVED_AT??'',time=Date.parse(observed);if(!Number.isFinite(time))throw new Error('PRICE_INVALID');documents=[signedPrice.parse({version:1,environment:status.environment,asset_key:asset.key,network:asset.network,asset_usd:env.PRICE_MANUAL_ASSET_USD,native_usd:env.PRICE_MANUAL_NATIVE_USD,observed_at:observed,expires_at:new Date(time+300000).toISOString(),source:env.PRICE_MANUAL_SOURCE})];}
  for(const document of documents){const time=Date.now();if(Date.parse(document.observed_at)>time||time-Date.parse(document.observed_at)>=300000||Date.parse(document.expires_at)<=time)throw new Error('PRICE_STALE');}
 }catch(error){if(operation==='refresh'){const code=error instanceof Error&&['PRICE_INVALID','PRICE_STALE'].includes(error.message)?error.message:'PROVIDER_UNAVAILABLE';try{await request({action:'failure',code,retry_after_seconds:error instanceof PriceProviderFailure?error.retryAfterSeconds:60})}catch{/* The original failure remains visible. */}}throw error;}
 const key=openPriceKey(env.PRICE_FEED_KEY_PACKAGE_JSON??'',env.PRICE_FEED_DECRYPTION_SECRET??'',status.environment);if(key.publicKey!==status.public_key)throw new Error('INVALID_PROOF');
 let published=0;for(const document of documents){const signature=crypto.sign(null,Buffer.from(JSON.stringify(document)),key.privateKey).toString('base64url');await request({action:'publish',document,signature});published++;}return {published};
}
