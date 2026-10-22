'use client';
import {useEffect,useRef,useState} from 'react';
import {api,mutation} from '@/lib/api-client';
import type {JsonWire} from '@/lib/financial-contracts';
import type {adminQueuePage} from '@/server/admin-queue';
import type {Locale} from '@/lib/i18n';
import {useLocalizedNotice} from './use-localized-notice';
type Page=JsonWire<Awaited<ReturnType<typeof adminQueuePage>>>;
export default function AdminQueue({owner,planId,locale,enabled,priority=false,bootstrap=false,reason}:{owner:string;planId:string;locale:Locale;enabled:boolean;priority?:boolean;bootstrap?:boolean;reason:string}){
 const fr=locale==='fr',[page,setPage]=useState<Page|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useLocalizedNotice(locale),serial=useRef(0),lifetime=useRef(new AbortController());
 const activePlan=useRef(planId);activePlan.current=planId;
 const [partition,setPartition]=useState('');
 async function load(cursor?:string){const revision=++serial.current,selected=planId;setBusy(true);setNotice('');setPage(null);try{const params=new URLSearchParams({plan_id:selected,page:'1'});if(partition)params.set('partition_id',partition);if(cursor)params.set('cursor',cursor);const value=await api<Page>('/admin/queue?'+params,owner,{signal:AbortSignal.any([lifetime.current.signal,AbortSignal.timeout(10000)])});if(revision===serial.current&&activePlan.current===selected)setPage(value);}catch(error){if(revision===serial.current)setNotice({error});}finally{if(revision===serial.current)setBusy(false);}}
 useEffect(()=>{lifetime.current=new AbortController();setPage(null);if(planId)void load();return()=>{serial.current++;lifetime.current.abort();};},[owner,planId,partition]);
 async function act(action:()=>Promise<unknown>){if(busy||!enabled)return;setBusy(true);const revision=++serial.current;try{await action();if(revision===serial.current)await load();}catch(error){if(revision===serial.current)setNotice({error});}finally{if(revision===serial.current)setBusy(false);}}
 const blocked=busy||!enabled||reason.trim().length<3;
 return <section className="stack"><p role="status">{notice}</p><button disabled={busy||!planId} onClick={()=>void load()}>{fr?'Actualiser la file / première page':'Refresh queue / first page'}</button>
 {page&&<label>{fr?'File de monnaie active':'Active currency queue'}<select disabled={busy} value={partition} onChange={event=>setPartition(event.target.value)}><option value="">{fr?'Toutes les monnaies et versions':'All currencies and versions'}</option>{page.partitions.map(row=><option key={row.id} value={row.id}>{row.asset} · {row.network} · v{row.version}</option>)}</select></label>}
 {page?.rows.map(row=><article key={row.id}><h4>{row.plan_name} · {row.asset} · {row.network} · v{row.version}</h4><strong>{row.username??row.platform_role??row.kind}</strong><p>{row.ticket} · {row.status} · {row.credited_count}/{row.required_count} · {row.serving_position??'—'}</p>
 {priority&&row.kind==='member'&&row.status==='waiting'&&<button disabled={blocked} onClick={()=>void act(()=>mutation('/admin/priority',owner,{entry_id:row.id,plan_id:planId,partition_id:row.partition_id,enabled:row.priority_ticket===null,revision:row.priority_revision,reason}))}>{row.priority_ticket===null?(fr?'Activer la priorité':'Enable priority'):(fr?'Retirer la priorité':'Revoke priority')}</button>}
 {bootstrap&&row.kind==='bootstrap'&&<button disabled={blocked||row.status!=='waiting'||row.credited_count!==0} onClick={()=>void act(()=>mutation('/admin/bootstrap',owner,{plan_id:planId,partition_id:row.partition_id,revision:String(row.partition_revision),action:'remove',entry_id:row.id,reason}))}>{fr?'Retirer la position non financée':'Remove unfunded position'}</button>}
 </article>)}
 {bootstrap&&page&&page.partitions.filter(row=>!partition||row.id===partition).map(row=><button key={row.id} disabled={blocked} onClick={()=>void act(()=>mutation('/admin/bootstrap',owner,{plan_id:planId,partition_id:row.id,revision:String(row.revision),action:'add',count:1,priority:false,reason}))}>{fr?'Ajouter une position système':'Add system position'} · {row.asset} · {row.network} · v{row.version}</button>)}
 {page?.rows.length===0&&<p>{fr?'Cette file est vide.':'This queue is empty.'}</p>}{page?.next_cursor&&<button disabled={busy} onClick={()=>void load(page.next_cursor!)}>{fr?'Page suivante':'Next page'}</button>}</section>;
}
