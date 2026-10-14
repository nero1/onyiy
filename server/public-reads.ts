import { admitPublicMiss } from './public-admission';
import { statisticsSnapshot } from './public-statistics';
import {nativeCatalog} from './crypto-reads';
import { and,asc,eq,sql } from 'drizzle-orm';
import { MemoryCache } from '@gifters/cache';
import { loadManifest,publicManifest,validateRuntimeEnv,type Manifest } from '@gifters/config';
import { assets,plans,planVersions,helpArticles,slugRedirects,readManifest,withContext } from '@gifters/db';
import { formatBaseUnits } from '@gifters/domain';

type PublicResponse={data:unknown;ttlSeconds:number};
type Entry={data:unknown;capturedAt:number;publicSeconds:number;serverSeconds:number};
type Loaded=Entry&{budget:{maxEntries:number;maxBytes:number}};
const seed=loadManifest();
let budget={maxEntries:seed.cache_policy.max_memory_entries,maxBytes:seed.cache_policy.max_memory_mb*1024*1024};
let memory=new MemoryCache(budget);
let generation=0;
type PublicKey='manifest'|'catalog'|'native-catalog'|'statistics'|'help:en'|'help:fr'|'slugs:en'|'slugs:fr';
const pending=new Map<PublicKey,Promise<Entry>>();

function captured(data:unknown,manifest:Manifest,publicSeconds:number,fallback=false):Loaded {
 const policy=manifest.cache_policy;
 return {data,capturedAt:Date.now(),publicSeconds,
  serverSeconds:Math.min(policy.manifest_server_seconds,publicSeconds,fallback?5:1_000_000),
  budget:{maxEntries:policy.max_memory_entries,maxBytes:policy.max_memory_mb*1024*1024}};
}
async function manifestLoader():Promise<Loaded> {
 let manifest=seed;let fallback=false;
 try{manifest=await withContext({access:'service',snapshot:true},async tx=>{
  await tx.execute(sql`set local statement_timeout='5000ms'`);return readManifest(tx);
 });}catch{fallback=true;}
 // Projection happens before either L1 or a shared promise contains a result.
 return captured({...publicManifest(manifest),payment_environment:process.env.APP_ENV==='testnet'?'testnet':'simulation'},manifest,manifest.cache_policy.manifest_public_seconds,fallback);
}
async function catalogLoader():Promise<Loaded> {
 const manifest=await withContext({access:'service',snapshot:true},async tx=>{
  await tx.execute(sql`set local statement_timeout='5000ms'`);return readManifest(tx);
 });
 const rows=await withContext({access:'public',snapshot:true},async tx=>{
  await tx.execute(sql`set local statement_timeout='5000ms'`);
  return tx.select({id:plans.id,name:plans.name,slug:plans.slug,usd_reference:planVersions.usdReference,
   receipts_required:planVersions.receiptsRequired,receiver_bps:planVersions.receiverBps,status:plans.status,
   bootstrap_enabled:plans.bootstrapEnabled,bootstrap_count:plans.bootstrapCount,amount_base_units:planVersions.amountBaseUnits,
   plan_version_id:planVersions.id,symbol:assets.symbol}).from(plans).innerJoin(planVersions,eq(planVersions.planId,plans.id))
   .innerJoin(assets,eq(assets.id,planVersions.assetId)).where(and(eq(assets.environment,'simulation'),eq(planVersions.version,sql`(select max(latest.version) from public.plan_versions latest where latest.plan_id=${planVersions.planId} and latest.asset_id=${planVersions.assetId})`))).orderBy(asc(plans.usdReference)).limit(1001);
 });
 // Fail closed rather than silently truncating a future larger catalog.
 if(rows.length>1000)throw new Error('CONFIGURATION_INVALID');
 const data=rows.map(row=>({...row,amount_giv:formatBaseUnits(BigInt(row.amount_base_units)),
  expected_giv:formatBaseUnits((BigInt(row.amount_base_units)*BigInt(row.receiver_bps)/10000n)*BigInt(row.receipts_required))}));
 return captured(data,manifest,manifest.cache_policy.catalog_seconds);
}
async function read(key:PublicKey,loader:()=>Promise<Loaded>,request?:Request):Promise<PublicResponse> {
 // Warm public DTOs never bypass environment/provider configuration validation.
 validateRuntimeEnv();
 let entry=await memory.get<Entry>(key);
 if(!entry){
  let flight=pending.get(key);
  if(!flight){
   const started=generation;
   flight=(async()=>{
    if(request)await admitPublicMiss(request);
    const loaded=await loader();const {budget:requested,...value}=loaded;
    if(started===generation){
     if(requested.maxEntries!==budget.maxEntries||requested.maxBytes!==budget.maxBytes){budget=requested;memory=new MemoryCache(budget);}
     await memory.set(key,value,{ttlSeconds:value.serverSeconds});
    }
    return value;
   })();
   pending.set(key,flight);
   const current=flight;
   // An old completion must not remove a newer flight started after invalidation.
   void current.finally(()=>{if(pending.get(key)===current)pending.delete(key);}).catch(()=>{});
  }
  entry=await flight;
 }
 // Cache hits cannot restart the public freshness window at the CDN.
 const age=Math.max(0,Math.floor((Date.now()-entry.capturedAt)/1000));
 return {data:entry.data,ttlSeconds:Math.max(0,entry.publicSeconds-age)};
}
export function getPublicManifest(request?:Request){return read('manifest',manifestLoader,request);}
export function getPublicCatalog(request?:Request){return read('catalog',catalogLoader,request);}
export function invalidatePublicReads(){generation++;pending.clear();memory=new MemoryCache(budget);}

export function getPublicHelp(locale:'en'|'fr',request?:Request){return read(`help:${locale}`,async()=>{
 const manifest=await withContext({access:'service',snapshot:true},async tx=>{await tx.execute(sql`set local statement_timeout='5000ms'`);return readManifest(tx)});if(!manifest.feature_help)throw new Error('FEATURE_DISABLED');
 const rows=await withContext({access:'public',snapshot:true},async tx=>{await tx.execute(sql`set local statement_timeout='5000ms'`);return tx.select({locale:helpArticles.locale,slug:helpArticles.slug,title:helpArticles.title,body:helpArticles.body,version:helpArticles.version}).from(helpArticles).where(and(eq(helpArticles.locale,locale),eq(helpArticles.published,true))).orderBy(asc(helpArticles.slug)).limit(101)});if(rows.length>100||Buffer.byteLength(JSON.stringify(rows))>3*1024*1024)throw new Error('CONFIGURATION_INVALID');return captured(rows,manifest,manifest.cache_policy.catalog_seconds);
 },request);}
export async function publicHelpSlug(locale:'en'|'fr',slug:string,request?:Request){
 const published=await getPublicHelp(locale,request);
 if((published.data as {slug:string}[]).some(article=>article.slug===slug))return slug;
 const inventory=await read(`slugs:${locale}`,async()=>{
 const policy=await withContext({access:'service',snapshot:true},tx=>readManifest(tx));
 return withContext({access:'public',snapshot:true},async tx=>{
  await tx.execute(sql`set local statement_timeout='5000ms'`);
  const rows=await tx.select({old_slug:slugRedirects.oldSlug,slug:helpArticles.slug}).from(slugRedirects).innerJoin(helpArticles,eq(helpArticles.id,slugRedirects.articleId)).where(and(eq(slugRedirects.locale,locale),eq(helpArticles.published,true))).orderBy(asc(slugRedirects.oldSlug)).limit(1001);
  if(rows.length>1000)throw new Error('CONFIGURATION_INVALID');
  return captured(rows,policy,policy.cache_policy.catalog_seconds);
 });},request);
 const redirected=(inventory.data as {old_slug:string;slug:string}[]).find(row=>row.old_slug===slug);
 if(!redirected)throw new Error('NOT_FOUND');return redirected.slug;
}

export function getPublicNativeCatalog(request?:Request){return read('native-catalog',async()=>withContext({access:'service',snapshot:true},async tx=>{await tx.execute(sql`set local statement_timeout='5000ms'`);const policy=await readManifest(tx),data=await nativeCatalog(tx);if(Buffer.byteLength(JSON.stringify(data))>1024*1024)throw new Error('CONFIGURATION_INVALID');return captured(data,policy,policy.cache_policy.catalog_seconds)}),request);}

export function getPublicStatistics(request?:Request){return read('statistics',async()=>withContext({access:'service'},async tx=>{
 const policy=await readManifest(tx);return captured(await statisticsSnapshot(tx),policy,60);
}),request);}
