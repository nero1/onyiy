'use client';
import {useEffect,useState} from 'react';
import type {Locale} from '@/lib/i18n';
import {formatDisplayDate} from '@/lib/display-time';
import {useDisplayTimeZone} from './appearance-provider';
export default function CycleCooldown({until,locale}:{until:string;locale:Locale}){
 const zone=useDisplayTimeZone(),fr=locale==='fr',[now,setNow]=useState<number|null>(null),deadline=new Date(until).getTime();
 useEffect(()=>{
  const update=()=>{if(document.visibilityState==='visible')setNow(Date.now())};
  update();const timer=setInterval(update,1000);document.addEventListener('visibilitychange',update);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update)};
 },[until]);
 if(!Number.isFinite(deadline))return null;
 const seconds=now===null?null:Math.max(0,Math.ceil((deadline-now)/1000));
 return <p>{fr?'Délai avant un nouveau cycle':'Rejoin cooldown'}: <time dateTime={until}>{formatDisplayDate(until,locale,zone)}</time>{seconds!==null&&<span>{' · '}{seconds===0?(fr?'Délai terminé':'Cooldown complete'):`${Math.floor(seconds/86400)}${fr?'j':'d'} ${Math.floor(seconds%86400/3600)}h ${Math.floor(seconds%3600/60)}m ${seconds%60}s`}</span>}</p>;
}
