'use client';
import {useEffect,useState} from 'react';
import {copy,type Locale} from '@/lib/i18n';
export default function PwaControls({enabled,locale,busy=false}:{enabled:boolean;locale:Locale;busy?:boolean}){const [install,setInstall]=useState<any>(null),[waiting,setWaiting]=useState<ServiceWorker|null>(null);const t=copy[locale];
 useEffect(()=>{if(!('serviceWorker' in navigator))return;let live=true,registration:ServiceWorkerRegistration|undefined;const prompt=(event:Event)=>{event.preventDefault();if(live)setInstall(event)};const change=()=>{if(live)setWaiting(registration?.waiting??null)};
 if(!enabled){void navigator.serviceWorker.getRegistrations().then(rows=>{for(const row of rows)if(new URL(row.active?.scriptURL??row.waiting?.scriptURL??row.installing?.scriptURL??location.href).pathname==='/sw.js')void row.unregister()});void caches.keys().then(keys=>{for(const key of keys)if(key.startsWith('gw-public-shell-'))void caches.delete(key)});setInstall(null);setWaiting(null);return;}
 addEventListener('beforeinstallprompt',prompt);void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(value=>{if(!live)return;registration=value;setWaiting(value.waiting);value.addEventListener('updatefound',()=>{value.installing?.addEventListener('statechange',change)})}).catch(()=>{});return()=>{live=false;removeEventListener('beforeinstallprompt',prompt)};
 },[enabled]);
 return <>{enabled&&install&&<button disabled={busy} onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null)}}>{t.installApp}</button>}{enabled&&waiting&&<button disabled={busy} onClick={()=>{navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});waiting.postMessage({type:'GW_APPLY_UPDATE'})}}>{t.updateApp}</button>}</>;
}
