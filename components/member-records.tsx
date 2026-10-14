'use client';
import {useEffect,useRef,useState} from 'react';
import {api,clientSessionMatches} from '@/lib/api-client';
import {errorMessage} from '@/lib/error-messages';
import {formatBaseUnits} from '@gifters/domain';
import type {Locale} from '@/lib/i18n';
import type {MemberCollection,MemberRecord,MemberRecordPage} from '@/lib/member-records';
type Props={owner:string;generation:string;environment:'simulation'|'testnet';locale:Locale;collections:MemberCollection[];history:boolean;disabled:boolean;revision?:object|null;onInvoice?:(row:MemberRecord)=>void;onCancelInvoice?:(row:MemberRecord)=>void;onWithdrawal?:(row:MemberRecord)=>void};
/** Each page replaces the previous page; neither financial work nor browser
 * memory is bounded by the dashboard's recent-history window. */
export default function MemberRecords(props:Props){
 const {owner,generation,environment,locale,collections,history,disabled}=props,fr=locale==='fr';
 const [collection,setCollection]=useState<MemberCollection>(collections[0]),[view,setView]=useState<'current'|'history'>('current'),[page,setPage]=useState<MemberRecordPage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const sequence=useRef(0),controller=useRef<AbortController|null>(null);
 const scope=owner+'|'+generation+'|'+environment+'|'+collection+'|'+view;
 const activeScope=useRef(scope);activeScope.current=scope;
 async function load(after?:string){
  controller.current?.abort();const cancel=new AbortController();controller.current=cancel;
  const serial=++sequence.current,started=scope,timer=setTimeout(()=>cancel.abort(),10000);
  const valid=()=>sequence.current===serial&&activeScope.current===started&&clientSessionMatches(owner,generation)&&!cancel.signal.aborted;
  setBusy(true);setError('');setPage(null);
  try{
   if(!navigator.onLine)throw new Error('PROVIDER_UNAVAILABLE');
   const query=new URLSearchParams({environment,collection,view});if(after)query.set('after',after);
   const result=await api<MemberRecordPage>('/me/records?'+query,owner,{signal:cancel.signal});
   if(valid())setPage(result);
  }catch(cause){if(sequence.current===serial&&activeScope.current===started&&clientSessionMatches(owner,generation))setError(errorMessage(cause,locale));}
  finally{clearTimeout(timer);if(sequence.current===serial&&activeScope.current===started)setBusy(false);}
 }
 useEffect(()=>{void load();return()=>{sequence.current++;controller.current?.abort();};},[scope,props.revision]);
 const state=(value:string)=>({active:fr?'Actif':'Active',completed:fr?'Terminé':'Completed',exception:fr?'À examiner':'Under review',quoted:fr?'Devis':'Quoted',submitted:fr?'Soumis':'Submitted',held:fr?'Réservé':'Held',approved:fr?'Approuvé':'Approved',sending:fr?'Envoi en cours':'Sending',awaiting_requote:fr?'Nouveau devis requis':'Fresh quote required',settled:fr?'Réglé':'Settled',cancelled:fr?'Annulé':'Cancelled',credited:fr?'Crédité':'Credited',expired:fr?'Expiré':'Expired',failed:fr?'Échec':'Failed'}[value]??value);
 return <section className="card" aria-busy={busy}>
  <h2>{fr?'Tous mes éléments en cours':'All my current items'}</h2>
  <p>{fr?'Les éléments en cours sont indépendants de l’historique récent. Actualisez pour voir les changements.':'Current items are independent of recent history. Refresh to see changes.'}</p>
  <label>{fr?'Type':'Type'} <select value={collection} onChange={event=>setCollection(event.target.value as MemberCollection)}>{collections.map(kind=><option key={kind} value={kind}>{kind==='cycles'?(fr?'Cycles':'Cycles'):kind==='invoices'?(fr?'Paiements':'Payments'):(fr?'Retraits et remboursements':'Withdrawals and refunds')}</option>)}</select></label>
  {history&&<label>{fr?'Vue':'View'} <select value={view} onChange={event=>setView(event.target.value as 'current'|'history')}><option value="current">{fr?'En cours':'Current'}</option><option value="history">{fr?'Tout l’historique':'All history'}</option></select></label>}
  <button disabled={busy||!navigator.onLine} onClick={()=>void load()}>{fr?'Actualiser / première page':'Refresh / first page'}</button>
  {error&&<p role="alert">{error}</p>}
  {page?.rows.length===0&&<p>{fr?'Aucun élément dans cette vue.':'No items in this view.'}</p>}
  {page?.rows.map(row=><article className="card" key={row.id}>
   <h3>{row.name??row.asset} · {row.asset} · {row.network}</h3><p>{state(row.under_review?'exception':row.status)}</p>
   <code>{row.id}</code>
   {row.credited_count!==undefined&&<p>{row.credited_count} / {row.receipts_required}{row.display_position?` · ${fr?'Position':'Position'} ${row.display_position}`:''}</p>}
   {(row.amount_base_units??row.gross_base_units)&&<p>{formatBaseUnits(BigInt(row.amount_base_units??row.gross_base_units!),row.decimals)} {row.asset}</p>}
   {collection==='invoices'&&view==='current'&&<>
    {props.onInvoice&&(environment==='testnet'||row.status==='quoted')&&<button disabled={disabled||busy||!navigator.onLine} onClick={()=>props.onInvoice!(row)}>{fr?'Ouvrir le paiement enregistré':'Open saved payment'}</button>}
    {props.onCancelInvoice&&row.status==='quoted'&&<button disabled={disabled||busy||!navigator.onLine} onClick={()=>props.onCancelInvoice!(row)}>{fr?'Annuler le devis':'Cancel quote'}</button>}
   </>}
   {collection==='withdrawals'&&view==='current'&&props.onWithdrawal&&(!row.kind||row.kind==='withdrawal')&&(environment==='simulation'?row.status==='held':['held','quoted','approved','awaiting_requote','exception'].includes(row.status))&&<button disabled={disabled||busy||!navigator.onLine} onClick={()=>props.onWithdrawal!(row)}>{fr?'Annuler et récupérer le solde':'Cancel and recover balance'}</button>}
  </article>)}
  {page?.next_after&&<button disabled={busy||!navigator.onLine} onClick={()=>void load(page.next_after!)}>{fr?'Page suivante':'Next page'}</button>}
 </section>;
}
