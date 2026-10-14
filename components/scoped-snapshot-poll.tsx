'use client';
import type {DashboardDto,NativePortfolioDto} from '@/lib/financial-contracts';
import {useEffect,useRef,useState} from 'react';
import {subscribePrivatePoll,type PollPath,type PollState} from '@/lib/private-poll';
import {errorMessage} from '@/lib/error-messages';
import type {Locale} from '@/lib/i18n';
type CommonProps={owner:string;generation:string;seconds:number;enabled:boolean;locale:Locale;onStart:()=>unknown;onError?:(error:unknown,token:unknown)=>void};
type Props=CommonProps & (
 {path:'/me/dashboard';onValue:(value:DashboardDto,token:unknown)=>void} |
 {path:'/me/crypto';onValue:(value:NativePortfolioDto,token:unknown)=>void} |
 {path:Exclude<PollPath,'/me/dashboard'|'/me/crypto'>;onValue:(value:unknown,token:unknown)=>void}
);
// The resource path fixes the JSON transport contract; private-poll retains
// unknown values internally so shared resources cannot erase consumer typing.
function publish(props:Props,value:unknown,token:unknown){
 if(props.path==='/me/dashboard')props.onValue(value as DashboardDto,token);
 else if(props.path==='/me/crypto')props.onValue(value as NativePortfolioDto,token);
 else props.onValue(value,token);
}

export default function ScopedSnapshotPoll(props:Props){
 const callbacks=useRef(props);callbacks.current=props;
 const [state,setState]=useState<PollState>({}),subscription=useRef<ReturnType<typeof subscribePrivatePoll>|null>(null),fr=props.locale==='fr';
 useEffect(()=>{
  setState({});if(!props.enabled)return;
  const active=subscribePrivatePoll({owner:props.owner,generation:props.generation,path:props.path,seconds:props.seconds,start:()=>callbacks.current.onStart(),value:(value,token)=>publish(callbacks.current,value,token),state:(value,token)=>{setState(value);if(value.error)callbacks.current.onError?.(value.error,token);}});subscription.current=active;
  return()=>{active.dispose();subscription.current=null;};
 },[props.owner,props.generation,props.path,props.seconds,props.enabled]);
 return <div className="muted" role="status">{state.observedAt&&<span>{fr?'Actualisé à':'Updated at'} {new Date(state.observedAt).toLocaleTimeString(props.locale)}</span>}{!!state.error&&<><span>{errorMessage(state.error,props.locale)}</span>{state.stopped&&<button onClick={()=>subscription.current?.retry()}>{fr?'Réessayer les mises à jour':'Retry live updates'}</button>}</>}</div>;
}
