'use client';
import TransactionReference from './transaction-reference';
import {useLocalizedNotice} from './use-localized-notice';
import {paymentStateLabel} from '@/lib/payment-state';
import CycleCooldown from './cycle-cooldown';
import {useDisplayTimeZone} from './appearance-provider';
import {formatDisplayDate} from '@/lib/display-time';
import {useEffect,useRef,useState} from 'react';
import {api,clientSessionMatches} from '@/lib/api-client';

import {formatBaseUnits} from '@gifters/domain';
import type {Locale} from '@/lib/i18n';
import type {MemberCollection,MemberRecord,MemberRecordPage} from '@/lib/member-records';
type Props={owner:string;generation:string;environment:'simulation'|'testnet'|'mainnet';locale:Locale;collections:MemberCollection[];history:boolean;disabled:boolean;revision?:object|null;onInvoice?:(row:MemberRecord)=>void;onCancelInvoice?:(row:MemberRecord)=>void;onWithdrawal?:(row:MemberRecord)=>void};
/** Each page replaces the previous page; neither financial work nor browser
 * memory is bounded by the dashboard's recent-history window. */
export default function MemberRecords(props:Props){
 const {owner,generation,environment,locale,collections,history,disabled}=props,fr=locale==='fr',zone=useDisplayTimeZone();
 const [collection,setCollection]=useState<MemberCollection>(collections[0]),[view,setView]=useState<'current'|'history'|'completed'>('current'),[page,setPage]=useState<MemberRecordPage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useLocalizedNotice(locale);
 const pageStart=useRef<string|undefined>(undefined),previousScope=useRef('');
 const sequence=useRef(0),controller=useRef<AbortController|null>(null);
 const scope=owner+'|'+generation+'|'+environment+'|'+collection+'|'+view;
 const activeScope=useRef(scope);activeScope.current=scope;
 async function load(after?:string){
  pageStart.current=after;
  controller.current?.abort();const cancel=new AbortController();controller.current=cancel;
  const serial=++sequence.current,started=scope,timer=setTimeout(()=>cancel.abort(),10000);
  const valid=()=>sequence.current===serial&&activeScope.current===started&&clientSessionMatches(owner,generation)&&!cancel.signal.aborted;
  setBusy(true);setError('');setPage(null);
  try{
   if(!navigator.onLine)throw new Error('PROVIDER_UNAVAILABLE');
   const query=new URLSearchParams({environment,collection,view});if(after)query.set('after',after);
   const result=await api<MemberRecordPage>('/me/records?'+query,owner,{signal:cancel.signal});
   if(valid())setPage(result);
  }catch(cause){if(sequence.current===serial&&activeScope.current===started&&clientSessionMatches(owner,generation))setError({error:cause});}
  finally{clearTimeout(timer);if(sequence.current===serial&&activeScope.current===started)setBusy(false);}
 }
 useEffect(()=>{if(previousScope.current!==scope){previousScope.current=scope;pageStart.current=undefined;}void load(pageStart.current);return()=>{sequence.current++;controller.current?.abort();};},[scope,props.revision]);
 return <section className="card" aria-busy={busy}>
  <h2>{view==='completed'?(fr?'Cycles terminés':'Completed cycles'):view==='history'?(fr?'Tout mon historique':'All my history'):(fr?'Tous mes éléments en cours':'All my current items')}</h2>
  <p>{view==='current'?(fr?'Les éléments en cours sont indépendants de l’historique récent. Actualisez pour voir les changements.':'Current items are independent of recent history. Refresh to see changes.'):(fr?'Les montants conservent leur monnaie et leur réseau d’origine.':'Amounts retain their original currency and network.')}</p>
  <label>{fr?'Type':'Type'} <select value={collection} onChange={event=>{const next=event.target.value as MemberCollection;setCollection(next);if(next!=='cycles'&&view==='completed')setView('history')}}>{collections.map(kind=><option key={kind} value={kind}>{kind==='cycles'?(fr?'Cycles':'Cycles'):kind==='invoices'?(fr?'Paiements':'Payments'):(fr?'Retraits et remboursements':'Withdrawals and refunds')}</option>)}</select></label>
  {history&&<label>{fr?'Vue':'View'} <select value={view} onChange={event=>setView(event.target.value as 'current'|'history'|'completed')}><option value="current">{fr?'En cours':'Current'}</option><option value="history">{fr?'Tout l’historique':'All history'}</option>{collection==='cycles'&&<option value="completed">{fr?'Terminés':'Completed'}</option>}</select></label>}
  <button disabled={busy||!navigator.onLine} onClick={()=>void load()}>{fr?'Actualiser / première page':'Refresh / first page'}</button>
  {error&&<p role="alert">{error}</p>}
  {page?.rows.length===0&&<p>{fr?'Aucun élément dans cette vue.':'No items in this view.'}</p>}
  {page?.rows.map(row=><article className="card" key={row.id}>
   <h3>{row.name??row.asset} · {row.asset} · {row.network}</h3><p>{paymentStateLabel(row.under_review?'exception':(row.display_status??row.status),locale)}</p>
   <code>{row.id}</code>{row.send_pending&&<p role="status">{fr?'Envoi incertain : vérifiez l’historique du portefeuille et ouvrez ce paiement pour fournir sa transaction. Ne payez pas à nouveau.':'Send outcome unknown: check wallet history and open this payment to submit its transaction hash. Do not pay again.'}</p>}
   {row.tx_hash&&<p>{fr?"Transaction enregistrée":"Recorded transaction"}: <TransactionReference hash={row.tx_hash} network={row.network} environment={environment} locale={locale} registryExplorer={row.explorer??undefined}/></p>}
   {collection==='cycles'&&row.completed_at&&<p>{fr?'Clôture enregistrée':'Recorded completion'}: <time dateTime={new Date(row.completed_at).toISOString()}>{formatDisplayDate(row.completed_at,locale,zone)}</time></p>}
   {collection==='cycles'&&row.status==='completed'&&!row.under_review&&row.cooldown_ends_at&&<CycleCooldown until={new Date(row.cooldown_ends_at).toISOString()} locale={locale}/>}

   {row.credited_count!==undefined&&<p>{row.credited_count} / {row.receipts_required}{row.display_position?` · ${fr?'Position':'Position'} ${row.display_position}`:''}</p>}
   {(row.amount_base_units??row.gross_base_units)&&<p>{formatBaseUnits(BigInt(row.amount_base_units??row.gross_base_units!),row.decimals)} {row.asset}</p>}
   {collection==='invoices'&&view==='current'&&<>
    {props.onInvoice&&(environment!=='simulation'||row.status==='quoted')&&<button disabled={disabled||busy||!navigator.onLine} onClick={()=>props.onInvoice!(row)}>{fr?'Ouvrir le paiement enregistré':'Open saved payment'}</button>}
    {props.onCancelInvoice&&row.status==='quoted'&&!row.send_pending&&<button disabled={disabled||busy||!navigator.onLine} onClick={()=>props.onCancelInvoice!(row)}>{fr?'Annuler le devis':'Cancel quote'}</button>}
   </>}
   {collection==='withdrawals'&&view==='current'&&props.onWithdrawal&&(!row.kind||row.kind==='withdrawal')&&(environment==='simulation'?row.status==='held':['held','quoted','approved','awaiting_requote','exception'].includes(row.status))&&<button disabled={disabled||busy||!navigator.onLine} onClick={()=>props.onWithdrawal!(row)}>{fr?'Annuler et récupérer le solde':'Cancel and recover balance'}</button>}
  </article>)}
  {page?.next_after&&<button disabled={busy||!navigator.onLine} onClick={()=>void load(page.next_after!)}>{fr?'Page suivante':'Next page'}</button>}
 </section>;
}
