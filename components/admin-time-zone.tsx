'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {api} from '@/lib/api-client';
import {defaultTimeZone} from '@/lib/display-time';
import type {Locale} from '@/lib/i18n';
import {DisplayTimeZoneProvider} from './appearance-provider';
export default function AdminTimeZone({owner,locale,children}:{owner:string;locale:Locale;children:ReactNode}){
 const [zone,setZone]=useState(defaultTimeZone),[unavailable,setUnavailable]=useState(false);
 useEffect(()=>{let active=true,busy=false;const controller=new AbortController();setZone(defaultTimeZone);const load=()=>{if(busy)return;busy=true;void api<{time_zone:string}>('/admin/display-policy',owner,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])}).then(value=>{if(active){setZone(value.time_zone);setUnavailable(false)}}).catch(()=>{if(active)setUnavailable(true)}).finally(()=>{busy=false})};load();addEventListener('gw:admin-time-zone-changed',load);return()=>{active=false;controller.abort();removeEventListener('gw:admin-time-zone-changed',load)}},[owner]);
 return <DisplayTimeZoneProvider zone={zone}><small>{locale==='fr'?'Fuseau horaire affiché':'Displayed time zone'}: {zone}{unavailable?(locale==='fr'?' — réglage enregistré indisponible':' — saved setting unavailable'):''}</small>{children}</DisplayTimeZoneProvider>;
}
