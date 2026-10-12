const SCHEMA_VERSION='v3';
const ACTIVE_USER_KEY=`gw:${SCHEMA_VERSION}:active-user`;
const ACTIVE_SESSION_KEY=`gw:${SCHEMA_VERSION}:active-session`;
type Envelope<T>={owner:string;session:string;schema:string;createdAt:number;expiresAt:number;accessedAt:number;value:T};
type Budget={maxEntries:number;maxBytes:number};
// Conservative bootstrap ceilings until a validated public manifest arrives.
let budget:Budget={maxEntries:100,maxBytes:5*1024*1024};
function storage(){try{return typeof window==='undefined'?undefined:window.localStorage}catch{return undefined}}
function read(key:string){try{return storage()?.getItem(key)??null}catch{return null}}
function remove(key:string){try{storage()?.removeItem(key)}catch{/* Cache is optional. */}}
function write(key:string,value:string){try{storage()?.setItem(key,value)}catch{/* Quota/privacy failure cannot fail a financial action. */}}
function keys(){try{return Object.keys(storage()??{})}catch{return []}}
function publicKey(key:string){return `gw:${SCHEMA_VERSION}:public:${key}`}
function userPrefix(owner:string,session='simulation'){return `gw:${SCHEMA_VERSION}:user:${owner}:${session}:`}
function userKey(owner:string,key:string,session='simulation'){return `${userPrefix(owner,session)}${key}`}
function parse<T>(raw:string|null):T|null{try{return raw?JSON.parse(raw) as T:null}catch{return null}}
// UTF-16 key/value storage estimate is conservative for compact browser snapshots.
function bytes(key:string,raw:string){return (key.length+raw.length)*2}
function valid(item:Envelope<unknown>|null,now:number){return !!item && item.schema===SCHEMA_VERSION && typeof item.owner==='string' && typeof item.session==='string' && Number.isFinite(item.createdAt) && Number.isFinite(item.expiresAt) && Number.isFinite(item.accessedAt) && item.createdAt<=now && item.accessedAt<=now && item.expiresAt>now && item.expiresAt>item.createdAt}
function trim(reserveKey?:string,reserveBytes=0){
 const now=Date.now();const rows:{key:string;size:number;accessedAt:number}[]=[];
 for(const key of keys()){
  if(/^gw:v[12]:/.test(key)){remove(key);continue}
  if(!key.startsWith(`gw:${SCHEMA_VERSION}:public:`) && !key.startsWith(`gw:${SCHEMA_VERSION}:user:`))continue;
  if(key===reserveKey){remove(key);continue}
  const raw=read(key);const item=parse<Envelope<unknown>>(raw);
  if(!raw || !valid(item,now)){remove(key);continue}
  rows.push({key,size:bytes(key,raw),accessedAt:item!.accessedAt});
 }
 rows.sort((a,b)=>a.accessedAt-b.accessedAt || a.key.localeCompare(b.key));
 let size=rows.reduce((sum,row)=>sum+row.size,0)+reserveBytes;let count=rows.length+(reserveKey?1:0);
 for(const row of rows){if(count<=budget.maxEntries && size<=budget.maxBytes)break;remove(row.key);size-=row.size;count--}
}
export function configureSnapshotBudget(policy:unknown){
 const value=policy as {max_memory_entries?:number;max_memory_mb?:number}|null;
 if(!value || !Number.isSafeInteger(value.max_memory_entries) || value.max_memory_entries!<=0 || value.max_memory_entries!>1_000_000 || !Number.isSafeInteger(value.max_memory_mb) || value.max_memory_mb!<=0 || value.max_memory_mb!>100)return;
 budget={maxEntries:value.max_memory_entries!,maxBytes:value.max_memory_mb!*1024*1024};trim();
}
function load<T>(key:string,owner:string,session:string,maxAgeMs?:number):T|null{
 trim();const item=parse<Envelope<T>>(read(key));const now=Date.now();
 if(!valid(item,now) || item!.owner!==owner || item!.session!==session || (maxAgeMs!==undefined && (!Number.isFinite(maxAgeMs) || maxAgeMs<=0 || now-item!.createdAt>=maxAgeMs))){remove(key);return null}
 item!.accessedAt=now;write(key,JSON.stringify(item));return item!.value;
}
function save<T>(key:string,owner:string,session:string,value:T,ttlMs:number){
 if(!Number.isFinite(ttlMs) || ttlMs<=0)return;
 const now=Date.now();
 try{
  const raw=JSON.stringify({owner,session,schema:SCHEMA_VERSION,createdAt:now,expiresAt:now+ttlMs,accessedAt:now,value} satisfies Envelope<T>);
  const size=bytes(key,raw);if(size>budget.maxBytes){remove(key);return}
  trim(key,size);write(key,raw);
 }catch{/* Nonserializable display data is simply not cached. */}
}
export function savePublicSnapshot<T>(key:string,value:T,ttlMs:number){save(publicKey(key),'public','public',value,ttlMs)}
export function loadPublicSnapshot<T>(key:string,maxAgeMs?:number){return load<T>(publicKey(key),'public','public',maxAgeMs)}
export function saveUserSnapshot<T>(owner:string,key:string,value:T,ttlMs:number,session='simulation'){
 if(read(ACTIVE_USER_KEY)!==owner || read(ACTIVE_SESSION_KEY)!==session)return;
 save(userKey(owner,key,session),owner,session,value,ttlMs);
}
export function loadUserSnapshot<T>(owner:string,key:string,session='simulation',maxAgeMs?:number){return load<T>(userKey(owner,key,session),owner,session,maxAgeMs)}
export function clearUserScope(owner:string,session?:string){
 const prefix=session===undefined?`gw:${SCHEMA_VERSION}:user:${owner}:`:userPrefix(owner,session);
 for(const key of keys())if(key.startsWith(prefix))remove(key);
}
export function activateUserScope(owner:string,session='simulation'){
 trim();const previous=read(ACTIVE_USER_KEY);if(previous && previous!==owner)clearUserScope(previous);
 // Session changes must not leave private snapshots from another generation.
 for(const key of keys())if(key.startsWith(`gw:${SCHEMA_VERSION}:user:${owner}:`) && !key.startsWith(userPrefix(owner,session)))remove(key);
 write(ACTIVE_USER_KEY,owner);write(ACTIVE_SESSION_KEY,session);
}
export function clearActiveUserScope(expectedOwner?:string){
 const active=read(ACTIVE_USER_KEY);const owner=expectedOwner??active;
 if(owner)clearUserScope(owner);
 if(!expectedOwner || active===expectedOwner){remove(ACTIVE_USER_KEY);remove(ACTIVE_SESSION_KEY)}
}

export function activeSessionGeneration(owner:string){return read(ACTIVE_USER_KEY)===owner?read(ACTIVE_SESSION_KEY):null;}
