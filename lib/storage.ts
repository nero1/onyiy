const SCHEMA_VERSION='v2';
const ACTIVE_USER_KEY=`gw:${SCHEMA_VERSION}:active-user`;
type Envelope<T>={owner:string;session:string;schema:string;createdAt:number;expiresAt:number;value:T};

function storage(){try{return typeof window==='undefined'?undefined:window.localStorage}catch{return undefined}}
function read(key:string){try{return storage()?.getItem(key)??null}catch{return null}}
function remove(key:string){try{storage()?.removeItem(key)}catch{/* Cache is optional. */}}
function write(key:string,value:string){try{storage()?.setItem(key,value)}catch{/* Quota/privacy failure cannot fail a financial action. */}}
function keys(){try{return Object.keys(storage()??{})}catch{return []}}
function publicKey(key:string){return `gw:${SCHEMA_VERSION}:public:${key}`}
function userPrefix(owner:string,session='simulation'){return `gw:${SCHEMA_VERSION}:user:${owner}:${session}:`}
function userKey(owner:string,key:string,session='simulation'){return `${userPrefix(owner,session)}${key}`}
function parse<T>(raw:string|null):T|null{try{return raw?JSON.parse(raw) as T:null}catch{return null}}
function load<T>(key:string,owner:string,session:string,maxAgeMs?:number):T|null{
 const item=parse<Envelope<T>>(read(key));const now=Date.now();
 if(!item || item.owner!==owner || item.session!==session || item.schema!==SCHEMA_VERSION || !Number.isFinite(item.createdAt) || !Number.isFinite(item.expiresAt) || item.createdAt>now || item.expiresAt<=now || (maxAgeMs!==undefined && (maxAgeMs<=0 || now-item.createdAt>=maxAgeMs))){remove(key);return null}
 return item.value;
}
function save<T>(key:string,owner:string,session:string,value:T,ttlMs:number){
 if(!Number.isFinite(ttlMs) || ttlMs<=0)return;
 const now=Date.now();
 try{write(key,JSON.stringify({owner,session,schema:SCHEMA_VERSION,createdAt:now,expiresAt:now+ttlMs,value} satisfies Envelope<T>))}catch{/* Nonserializable display data is simply not cached. */}
}
export function savePublicSnapshot<T>(key:string,value:T,ttlMs:number){save(publicKey(key),'public','public',value,ttlMs)}
export function loadPublicSnapshot<T>(key:string,maxAgeMs?:number){return load<T>(publicKey(key),'public','public',maxAgeMs)}
export function saveUserSnapshot<T>(owner:string,key:string,value:T,ttlMs:number,session='simulation'){
 if(read(ACTIVE_USER_KEY)!==owner)return;
 save(userKey(owner,key,session),owner,session,value,ttlMs);
}
export function loadUserSnapshot<T>(owner:string,key:string,session='simulation',maxAgeMs?:number){return load<T>(userKey(owner,key,session),owner,session,maxAgeMs)}
export function clearUserScope(owner:string,session='simulation'){
 const prefix=userPrefix(owner,session);for(const key of keys())if(key.startsWith(prefix))remove(key);
}
export function activateUserScope(owner:string,session='simulation'){
 // Invalidate old overlong envelopes when upgrading the cache contract.
 for(const key of keys())if(key.startsWith('gw:v1:'))remove(key);
 const previous=read(ACTIVE_USER_KEY);if(previous && previous!==owner)clearUserScope(previous,session);
 write(ACTIVE_USER_KEY,owner);
}
export function clearActiveUserScope(expectedOwner?:string){
 const active=read(ACTIVE_USER_KEY);
 const owner=expectedOwner??active;
 if(owner)clearUserScope(owner);
 if(!expectedOwner || active===expectedOwner)remove(ACTIVE_USER_KEY);
}
