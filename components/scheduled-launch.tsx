'use client';
import {useEffect,useState} from 'react';
import type {Locale} from '@/lib/i18n';
import {useDisplayTimeZone} from './appearance-provider';
import {formatDisplayDate} from '@/lib/display-time';
export default function ScheduledLaunch({at,locale}:{at:string;locale:Locale}){
 const zone=useDisplayTimeZone(),[now,setNow]=useState<number|null>(null),fr=locale==='fr';
 useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[at]);
 const seconds=now===null?null:Math.max(0,Math.ceil((new Date(at).getTime()-now)/1000));
 return <p><time dateTime={at}>{formatDisplayDate(at,locale,zone)}</time>{seconds!==null&&<span>{' · '}{seconds===0?(fr?'En attente des vérifications de lancement':'Awaiting launch checks'):`${Math.floor(seconds/86400)}${fr?'j':'d'} ${Math.floor(seconds%86400/3600)}h ${Math.floor(seconds%3600/60)}m ${seconds%60}s`}</span>}</p>;
}
