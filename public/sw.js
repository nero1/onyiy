/* Public shell only. Never cache API responses, cookies, private HTML or writes. */
const CACHE='gw-public-shell-v22';
const ASSETS=['/offline.html','/pwa-shell.js','/pwa-shell.css','/icon-192.png','/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const policy=await fetch('/api/v1/manifest',{cache:'no-store',credentials:'omit'});if(!policy.ok||(await policy.json()).data?.feature_pwa!==true)throw Error('PWA_DISABLED');const cache=await caches.open(CACHE);for(const path of ASSETS){const response=await fetch(path,{cache:'reload',credentials:'omit'});if(!response.ok||response.headers.has('Set-Cookie')||(await response.clone().arrayBuffer()).byteLength>1048576)throw Error('PUBLIC_ASSET_INVALID');await cache.put(path,response)}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('gw-public-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
const protocols=new Map();
const version=value=>Number.isInteger(value)&&value>=0&&value<=1000;
self.addEventListener('message',event=>{
 if(event.data?.type==='GW_APPLY_UPDATE')void self.skipWaiting();
 if(event.data?.type==='GW_CLIENT_PROTOCOL'&&event.source?.id&&version(event.data.version)&&version(event.data.minimum)&&event.data.minimum<=event.data.version){
  if(protocols.size>=256&&!protocols.has(event.source.id))protocols.delete(protocols.keys().next().value);
  protocols.set(event.source.id,{version:event.data.version,minimum:event.data.minimum});
 }
});
async function checkProtocol(response,clientId){
 const own=protocols.get(clientId);if(!own)return;
 const a=response.headers.get('x-gw-api-protocol'),b=response.headers.get('x-gw-min-client-protocol');
 const parse=value=>value!==null&&/^(0|[1-9][0-9]{0,3})$/.test(value)&&Number(value)<=1000?Number(value):null;
 const peer=a===null&&b===null?0:parse(a),minimum=a===null&&b===null?0:parse(b);
 if(peer===null||minimum===null||peer<minimum||own.version<minimum||peer<own.minimum){const client=await self.clients.get(clientId);client?.postMessage({type:'GW_CLIENT_INCOMPATIBLE',version:peer,minimum});}
}
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // Observe only the public manifest's version headers. Never cache or inspect
 // private API bodies, intercept writes, or change OAuth navigation behavior.
 if(url.pathname==='/api/v1/manifest'&&request.mode!=='navigate'){
  event.respondWith((async()=>{const response=await fetch(request);await checkProtocol(response,event.clientId).catch(()=>{});return response})());return;
 }
 if(url.pathname.startsWith('/api/'))return;
 if(ASSETS.includes(url.pathname)&&!url.search){event.respondWith((async()=>{const cached=await caches.match(url.pathname,{cacheName:CACHE});return cached??fetch(request)})());return}
 if(request.mode==='navigate')event.respondWith(fetch(request).catch(async()=>{const fallback=await caches.match('/offline.html',{cacheName:CACHE});return fallback??new Response('Offline',{status:503,headers:{'Content-Type':'text/plain'}})}));
});
