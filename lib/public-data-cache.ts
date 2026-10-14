// Only approved display DTOs enter this store. Never accept an API URL, user
// namespace, raw response, mutation body or authentication/session material.
export type PublicCatalogPlan={id:string;name:string;slug:string;usd_reference:string;receipts_required:number;status:string;amount_base_units:string;amount_giv:string;expected_giv:string};
export type PublicHelpArticle={locale:'en'|'fr';slug:string;title:string;body:string};
type Document={key:string;schema:'gw-public-v1';createdAt:number;expiresAt:number;accessedAt:number;json:string};
const DATABASE='gw-public-v1';const STORE='documents';const MAX_TTL_MS=1_000_000_000;
let budget={maxEntries:100,maxBytes:10*1024*1024};
let opening:Promise<IDBDatabase|null>|undefined;
const encoder=new TextEncoder();
const size=(row:Document)=>Math.max(encoder.encode(row.key).byteLength+encoder.encode(row.json).byteLength,(row.key.length+row.json.length)*2)+256;
const keyValid=(key:unknown)=>typeof key==='string'&&(key==='catalog:simulation'||/^help:(en|fr):[a-z0-9][a-z0-9-]{0,79}$/.test(key));
const ttlValid=(ttl:number)=>Number.isSafeInteger(ttl)&&ttl>0&&ttl<=MAX_TTL_MS;
function catalog(value:unknown):PublicCatalogPlan[]|null {
 if(!Array.isArray(value)||value.length>1000)return null;
 const rows:PublicCatalogPlan[]=[];
 for(const item of value){
  if(!item||typeof item!=='object')return null;
  const row=item as PublicCatalogPlan;
  if(typeof row.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)||!Number.isSafeInteger(row.receipts_required)||row.receipts_required<=0
   ||!['disabled','scheduled','active','paused','retired'].includes(row.status)
   ||!['name','slug','usd_reference','amount_base_units','amount_giv','expected_giv'].every(key=>typeof row[key as keyof PublicCatalogPlan]==='string'&&String(row[key as keyof PublicCatalogPlan]).length<=100))return null;
  // Deliberate field-by-field projection excludes any accidental private fields.
  rows.push({id:row.id,name:row.name,slug:row.slug,usd_reference:row.usd_reference,receipts_required:row.receipts_required,status:row.status,amount_base_units:row.amount_base_units,amount_giv:row.amount_giv,expected_giv:row.expected_giv});
 }
 return rows;
}
function help(value:unknown):PublicHelpArticle|null {
 if(!value||typeof value!=='object')return null;
 const row=value as PublicHelpArticle;
 if(!['en','fr'].includes(row.locale)||typeof row.slug!=='string'||!keyValid(`help:${row.locale}:${row.slug}`)||typeof row.title!=='string'||row.title.length>200||typeof row.body!=='string'||row.body.length>10*1024*1024)return null;
 if(/-----BEGIN .*PRIVATE KEY-----|\b(?:sk_live_|sk-proj-)[A-Za-z0-9_-]{20,}|\bAKIA[0-9A-Z]{16}\b/.test(row.title+row.body))return null;
 return {locale:row.locale,slug:row.slug,title:row.title,body:row.body};
}
function payload(key:string,json:string){
 try{const parsed=JSON.parse(json);const projected=key==='catalog:simulation'?catalog(parsed):help(parsed);
  if(!projected||JSON.stringify(projected)!==json)return null;
  if(key!=='catalog:simulation'&&key!==`help:${(projected as PublicHelpArticle).locale}:${(projected as PublicHelpArticle).slug}`)return null;
  return projected;
 }catch{return null}
}
function valid(row:Document,now:number){return row&&keyValid(row.key)&&row.schema===DATABASE&&typeof row.json==='string'&&size(row)<=budget.maxBytes
 &&Number.isSafeInteger(row.createdAt)&&Number.isSafeInteger(row.expiresAt)&&Number.isSafeInteger(row.accessedAt)
 &&row.createdAt<=now&&row.accessedAt<=now&&row.accessedAt>=row.createdAt&&row.expiresAt>now&&ttlValid(row.expiresAt-row.createdAt)&&payload(row.key,row.json)!==null;}
function database(){
 if(opening)return opening;
 opening=new Promise<IDBDatabase|null>(resolve=>{
  if(typeof window==='undefined'){resolve(null);return}
  let request:IDBOpenDBRequest;let finished=false;
  const done=(value:IDBDatabase|null)=>{if(finished){value?.close();return}finished=true;clearTimeout(timer);resolve(value);};
  const timer=setTimeout(()=>done(null),1500);
  try{request=window.indexedDB.open(DATABASE,1)}catch{done(null);return}
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'key'});};
  request.onerror=()=>done(null);request.onblocked=()=>done(null);
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=undefined;};done(db);};
 });
 return opening;
}
async function transaction<T>(fallback:T,action:(store:IDBObjectStore,rows:Document[])=>T):Promise<T>{
 const db=await database();if(!db)return fallback;
 return new Promise(resolve=>{
  let tx:IDBTransaction;let result=fallback;let settled=false;
  const done=(value:T)=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
  const timer=setTimeout(()=>{try{tx?.abort()}catch{/* Optional cache. */}done(fallback);},1500);
  try{
   tx=db.transaction(STORE,'readwrite');const store=tx.objectStore(STORE);const request=store.getAll();
   request.onsuccess=()=>{try{result=action(store,request.result)}catch{tx.abort();}};
   tx.oncomplete=()=>done(result);tx.onerror=()=>done(fallback);tx.onabort=()=>done(fallback);
  }catch{done(fallback)}
 });
}
function prune(store:IDBObjectStore,all:Document[],reserve?:Document){
 const now=Date.now();const rows:Document[]=[];
 for(const row of all){if(row?.key===reserve?.key||!valid(row,now))store.delete(row.key);else rows.push(row);}
 rows.sort((a,b)=>a.accessedAt-b.accessedAt||a.key.localeCompare(b.key));
 let bytes=rows.reduce((sum,row)=>sum+size(row),reserve?size(reserve):0);let count=rows.length+(reserve?1:0);
 while(rows.length&&(count>budget.maxEntries||bytes>budget.maxBytes)){const row=rows.shift()!;store.delete(row.key);count--;bytes-=size(row);}
 return rows;
}
export async function configurePublicDataBudget(policy:unknown){
 const value=policy as {max_memory_entries?:number;max_public_help_mb?:number}|null;
 if(!value||!Number.isSafeInteger(value.max_memory_entries)||value.max_memory_entries!<=0||value.max_memory_entries!>1_000_000||!Number.isSafeInteger(value.max_public_help_mb)||value.max_public_help_mb!<=0||value.max_public_help_mb!>100)return;
 // Tighten large requested entry counts to keep one browser transaction bounded.
 budget={maxEntries:Math.min(value.max_memory_entries!,1000),maxBytes:value.max_public_help_mb!*1024*1024};
 await transaction(undefined,(store,rows)=>{prune(store,rows);});
}
async function save(key:string,value:PublicCatalogPlan[]|PublicHelpArticle,ttlMs:number){
 if(!ttlValid(ttlMs)||!keyValid(key))return;
 const now=Date.now();const row:Document={key,schema:DATABASE,createdAt:now,expiresAt:now+ttlMs,accessedAt:now,json:JSON.stringify(value)};
 await transaction(undefined,(store,rows)=>{if(size(row)>budget.maxBytes){store.delete(key);prune(store,rows.filter(item=>item.key!==key));return}prune(store,rows,row);store.put(row);});
}
async function load(key:string,maxAgeMs:number){
 if(!keyValid(key)||!ttlValid(maxAgeMs))return null;
 return transaction<PublicCatalogPlan[]|PublicHelpArticle|null>(null,(store,all)=>{
  const rows=prune(store,all);const row=rows.find(item=>item.key===key);if(!row)return null;
  const now=Date.now();if(now-row.createdAt>=maxAgeMs){store.delete(key);return null}
  row.accessedAt=now;store.put(row);return payload(key,row.json);
 });
}
export async function savePublicCatalog(value:unknown,ttlMs:number){const projected=catalog(value);if(projected)await save('catalog:simulation',projected,ttlMs);}
export async function loadPublicCatalog(maxAgeMs:number){return await load('catalog:simulation',maxAgeMs) as PublicCatalogPlan[]|null;}
export async function savePublicHelp(value:unknown,ttlMs:number){const projected=help(value);if(projected)await save(`help:${projected.locale}:${projected.slug}`,projected,ttlMs);}
export async function loadPublicHelp(locale:'en'|'fr',slug:string,maxAgeMs:number){return await load(`help:${locale}:${slug}`,maxAgeMs) as PublicHelpArticle|null;}
export async function clearPublicData(){await transaction(undefined,store=>{store.clear();});}

export async function loadAllPublicHelp(locale:'en'|'fr',maxAgeMs:number){if(!ttlValid(maxAgeMs))return [];return transaction<PublicHelpArticle[]>([],(store,all)=>{const rows=prune(store,all);return rows.filter(row=>row.key.startsWith(`help:${locale}:`)&&Date.now()-row.createdAt<maxAgeMs).map(row=>payload(row.key,row.json) as PublicHelpArticle).sort((a,b)=>a.slug.localeCompare(b.slug));});}

// A complete successful locale inventory is one transaction: deletion of
// withdrawn/renamed entries and replacement of current display DTOs are atomic.
export async function reconcilePublicHelp(locale:'en'|'fr',value:unknown,ttlMs:number){
 if(!ttlValid(ttlMs)||!Array.isArray(value)||value.length>1000)return false;
 const projected=value.map(help);
 if(projected.some(row=>!row||row.locale!==locale))return false;
 const articles=projected as PublicHelpArticle[];
 const keys=new Set(articles.map(row=>`help:${locale}:${row.slug}`));
 if(keys.size!==articles.length)return false;
 return transaction(false,(store,all)=>{
  const retained=all.filter(row=>{if(row.key.startsWith(`help:${locale}:`)){store.delete(row.key);return false}return true});
  const now=Date.now();
  const incoming=articles.map(row=>({key:`help:${locale}:${row.slug}`,schema:DATABASE as 'gw-public-v1',createdAt:now,expiresAt:now+ttlMs,accessedAt:now,json:JSON.stringify(row)})).filter(row=>size(row)<=budget.maxBytes);
  const keep=[...retained,...incoming];
  const survivors=prune(store,keep);
  for(const row of survivors)if(keys.has(row.key))store.put(row);
  return true;
 });
}
export async function savedHelpObservation(locale:'en'|'fr',maxAgeMs:number){
 if(!ttlValid(maxAgeMs))return null;
 return transaction<number|null>(null,(store,all)=>{
  const rows=prune(store,all).filter(row=>row.key.startsWith(`help:${locale}:`)&&Date.now()-row.createdAt<maxAgeMs);
  return rows.length?Math.min(...rows.map(row=>row.createdAt)):null;
 });
}
