/* Public shell only. Never cache API responses, cookies, private HTML or writes. */
const CACHE='gw-public-shell-v21';
const ASSETS=['/offline.html','/pwa-shell.js','/pwa-shell.css','/icon-192.png','/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const policy=await fetch('/api/v1/manifest',{cache:'no-store',credentials:'omit'});if(!policy.ok||(await policy.json()).data?.feature_pwa!==true)throw Error('PWA_DISABLED');const cache=await caches.open(CACHE);for(const path of ASSETS){const response=await fetch(path,{cache:'reload',credentials:'omit'});if(!response.ok||response.headers.has('Set-Cookie')||(await response.clone().arrayBuffer()).byteLength>1048576)throw Error('PUBLIC_ASSET_INVALID');await cache.put(path,response)}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('gw-public-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type==='GW_APPLY_UPDATE')void self.skipWaiting()});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(ASSETS.includes(url.pathname)&&!url.search){event.respondWith((async()=>{const cached=await caches.match(url.pathname,{cacheName:CACHE});return cached??fetch(request)})());return}
 if(request.mode==='navigate')event.respondWith(fetch(request).catch(async()=>{const fallback=await caches.match('/offline.html',{cacheName:CACHE});return fallback??new Response('Offline',{status:503,headers:{'Content-Type':'text/plain'}})}));
});
