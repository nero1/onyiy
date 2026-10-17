'use client';
import {responsePeerCompatible} from '@gifters/domain';
import {useEffect,useState} from 'react';
import {useAppearance} from './appearance-provider';
import {clientUpdateRequired,requireClientUpdate,updateEvent} from '@/lib/client-update';
import {pendingPayment,paymentInFlight,paymentFlightEvent} from '@/lib/payment-receipts';
export default function ClientCompatibilityNotice(){
 const {locale,navigationUser}=useAppearance(),fr=locale==='fr',[required,setRequired]=useState(false),[,refresh]=useState(0),[copyFailed,setCopyFailed]=useState(false);
 useEffect(()=>{
  const changed=()=>setRequired(clientUpdateRequired()),flight=()=>refresh(value=>value+1);
  const worker=(event:MessageEvent)=>{if(event.data?.type==='GW_CLIENT_INCOMPATIBLE'&&!responsePeerCompatible(typeof event.data.version==='number'?String(event.data.version):'invalid',typeof event.data.minimum==='number'?String(event.data.minimum):'invalid'))requireClientUpdate()};
  changed();addEventListener(updateEvent,changed);addEventListener(paymentFlightEvent,flight);
  navigator.serviceWorker?.addEventListener('message',worker);
  return()=>{removeEventListener(updateEvent,changed);removeEventListener(paymentFlightEvent,flight);navigator.serviceWorker?.removeEventListener('message',worker)};
 },[]);
 if(!required)return null;
 const receipt=navigationUser?pendingPayment(navigationUser.id):null,flight=paymentInFlight();
 async function reload(){
  if(paymentInFlight())return;
  if(receipt){try{await navigator.clipboard.writeText(receipt.hash)}catch{setCopyFailed(true);return}}
  location.reload();
 }
 return <aside className="card" role="alert"><p>{fr?'L’application a changé. Rechargez-la avant une nouvelle action.':'The app changed. Reload before another action.'}</p>
  {flight&&<p>{fr?'Terminez la confirmation du portefeuille avant de recharger.':'Finish the wallet confirmation before reloading.'}</p>}
  {receipt&&<p>{fr?'Conservez ce hash pour retrouver le paiement d’origine après le rechargement. Aucun nouvel envoi automatique.':'Keep this hash to recover the original payment after reloading. No automatic resend.'}<br/><code>{receipt.hash}</code></p>}
  {copyFailed&&<p>{fr?'Copiez le hash ci-dessus, puis rechargez avec votre navigateur.':'Copy the hash above, then reload using your browser.'}</p>}
  <button disabled={flight} onClick={()=>void reload()}>{receipt?(fr?'Copier le hash et recharger':'Copy hash and reload'):(fr?'Recharger l’application':'Reload app')}</button>
 </aside>;
}
