'use client';
import {useEffect,useRef,useState} from 'react';
import {APP_WIRE_VERSION,APP_MINIMUM_SERVER_VERSION} from '@gifters/domain';
import {useAppearance} from './appearance-provider';
import {pendingPayment,paymentInFlight,paymentFlightEvent} from '@/lib/payment-receipts';
import {copy,type Locale} from '@/lib/i18n';
import {requireClientUpdate} from '@/lib/client-update';
export default function PwaControls({enabled,locale,busy=false}:{enabled:boolean;locale:Locale;busy?:boolean}){
 const [install,setInstall]=useState<any>(null),[waiting,setWaiting]=useState<ServiceWorker|null>(null),[,refresh]=useState(0),{navigationUser}=useAppearance(),t=copy[locale];
 const policy=useRef(enabled);policy.current=enabled;
 const blocked=busy||paymentInFlight()||!!(navigationUser&&pendingPayment(navigationUser.id));
 useEffect(()=>{const changed=()=>refresh(value=>value+1);addEventListener(paymentFlightEvent,changed);return()=>removeEventListener(paymentFlightEvent,changed)},[]);
 useEffect(()=>{
  if(!('serviceWorker' in navigator))return;
  let live=true,registration:ServiceWorkerRegistration|undefined;
  const protocol=()=>navigator.serviceWorker.controller?.postMessage({type:'GW_CLIENT_PROTOCOL',version:APP_WIRE_VERSION,minimum:APP_MINIMUM_SERVER_VERSION});
  const prompt=(event:Event)=>{event.preventDefault();if(live)setInstall(event)};
  const change=()=>{if(live)setWaiting(registration?.waiting??null)};
  const found=()=>registration?.installing?.addEventListener('statechange',change);
  if(!enabled){void navigator.serviceWorker.getRegistrations().then(rows=>{if(!live||policy.current)return;for(const row of rows)if(new URL(row.active?.scriptURL??row.waiting?.scriptURL??row.installing?.scriptURL??location.href).pathname==='/sw.js')void row.unregister().catch(()=>{})}).catch(()=>{});if(typeof caches!=='undefined')void caches.keys().then(keys=>{if(!live||policy.current)return;for(const key of keys)if(key.startsWith('gw-public-shell-'))void caches.delete(key).catch(()=>{})}).catch(()=>{});setInstall(null);setWaiting(null);return()=>{live=false};}
  addEventListener('beforeinstallprompt',prompt);navigator.serviceWorker.addEventListener('controllerchange',protocol);
  void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(value=>{if(!live){if(!policy.current)void value.unregister().catch(()=>{});return}registration=value;setWaiting(value.waiting);value.addEventListener('updatefound',found);protocol()}).catch(()=>{});
  return()=>{live=false;removeEventListener('beforeinstallprompt',prompt);navigator.serviceWorker.removeEventListener('controllerchange',protocol);registration?.removeEventListener('updatefound',found);registration?.installing?.removeEventListener('statechange',change)};
 },[enabled]);
 return <>{enabled&&install&&<button disabled={blocked} onClick={async()=>{await install.prompt();await install.userChoice;setInstall(null)}}>{t.installApp}</button>}{enabled&&waiting&&<button disabled={blocked} onClick={()=>{if(paymentInFlight()||navigationUser&&pendingPayment(navigationUser.id))return;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(paymentInFlight()||navigationUser&&pendingPayment(navigationUser.id)){requireClientUpdate();return}location.reload()},{once:true});waiting.postMessage({type:'GW_APPLY_UPDATE'})}}>{t.updateApp}</button>}</>;
}
