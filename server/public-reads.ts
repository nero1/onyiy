import { asc,eq,sql } from 'drizzle-orm';
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
const pending=new Map<'manifest'|'catalog'|'help:en'|'help:fr',Promise<Entry>>();

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
 return captured(publicManifest(manifest),manifest,manifest.cache_policy.manifest_public_seconds,fallback);
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
   .innerJoin(assets,eq(assets.id,planVersions.assetId)).where(eq(assets.environment,'simulation')).orderBy(asc(plans.usdReference)).limit(1001);
 });
 // Fail closed rather than silently truncating a future larger catalog.
 if(rows.length>1000)throw new Error('CONFIGURATION_INVALID');
 const data=rows.map(row=>({...row,amount_giv:formatBaseUnits(BigInt(row.amount_base_units)),
  expected_giv:formatBaseUnits((BigInt(row.amount_base_units)*BigInt(row.receiver_bps)/10000n)*BigInt(row.receipts_required))}));
 return captured(data,manifest,manifest.cache_policy.catalog_seconds);
}
async function read(key:'manifest'|'catalog'|'help:en'|'help:fr',loader:()=>Promise<Loaded>):Promise<PublicResponse> {
 // Warm public DTOs never bypass environment/provider configuration validation.
 validateRuntimeEnv();
 let entry=await memory.get<Entry>(key);
 if(!entry){
  let flight=pending.get(key);
  if(!flight){
   const started=generation;
   flight=(async()=>{
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
export function getPublicManifest(){return read('manifest',manifestLoader);}
export function getPublicCatalog(){return read('catalog',catalogLoader);}
export function invalidatePublicReads(){generation++;pending.clear();memory=new MemoryCache(budget);}

export function getPublicHelp(locale:'en'|'fr'){return read(`help:${locale}`,async()=>{
 const manifest=await withContext({access:'service',snapshot:true},async tx=>{await tx.execute(sql`set local statement_timeout='5000ms'`);return readManifest(tx)});if(!manifest.feature_help)throw new Error('FEATURE_DISABLED');
 const rows=await withContext({access:'public',snapshot:true},async tx=>{await tx.execute(sql`set local statement_timeout='5000ms'`);return tx.select({locale:helpArticles.locale,slug:helpArticles.slug,title:helpArticles.title,body:helpArticles.body}).from(helpArticles).where(eq(helpArticles.locale,locale)).orderBy(asc(helpArticles.slug)).limit(101)});if(rows.length>100||Buffer.byteLength(JSON.stringify(rows))>3*1024*1024)throw new Error('CONFIGURATION_INVALID');return captured(rows,manifest,manifest.cache_policy.catalog_seconds);
 });}
export async function publicHelpSlug(locale:'en'|'fr',slug:string){return withContext({access:'public'},async tx=>{const [direct]=await tx.select({slug:helpArticles.slug}).from(helpArticles).where(sql`${helpArticles.locale}=${locale} and ${helpArticles.slug}=${slug} and ${helpArticles.published}`).limit(1);if(direct)return direct.slug;const [redirect]=await tx.select({slug:helpArticles.slug}).from(slugRedirects).innerJoin(helpArticles,eq(helpArticles.id,slugRedirects.articleId)).where(sql`${slugRedirects.locale}=${locale} and ${slugRedirects.oldSlug}=${slug} and ${helpArticles.published}`).limit(1);if(!redirect)throw new Error('NOT_FOUND');return redirect.slug;});}
