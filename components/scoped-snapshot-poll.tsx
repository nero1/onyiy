'use client';
import {useEffect,useRef,useState} from 'react';
import {subscribePrivatePoll,type PollPath,type PollState} from '@/lib/private-poll';
import {errorMessage} from '@/lib/error-messages';
import type {Locale} from '@/lib/i18n';
type Props={owner:string;generation:string;path:PollPath;seconds:number;enabled:boolean;locale:Locale;onStart:()=>unknown;onValue:(value:any,token:unknown)=>void;onError?:(error:unknown,token:unknown)=>void};
export default function ScopedSnapshotPoll(props:Props){
 const callbacks=useRef(props);callbacks.current=props;
 const [state,setState]=useState<PollState>({}),subscription=useRef<ReturnType<typeof subscribePrivatePoll>|null>(null),fr=props.locale==='fr';
 useEffect(()=>{
  setState({});if(!props.enabled)return;
  const active=subscribePrivatePoll({owner:props.owner,generation:props.generation,path:props.path,seconds:props.seconds,start:()=>callbacks.current.onStart(),value:(value,token)=>callbacks.current.onValue(value,token),state:(value,token)=>{setState(value);if(value.error)callbacks.current.onError?.(value.error,token);}});subscription.current=active;
  return()=>{active.dispose();subscription.current=null;};
 },[props.owner,props.generation,props.path,props.seconds,props.enabled]);
 return <div className="muted" role="status">{state.observedAt&&<span>{fr?'Actualisé à':'Updated at'} {new Date(state.observedAt).toLocaleTimeString(props.locale)}</span>}{!!state.error&&<><span>{errorMessage(state.error,props.locale)}</span>{state.stopped&&<button onClick={()=>subscription.current?.retry()}>{fr?'Réessayer les mises à jour':'Retry live updates'}</button>}</>}</div>;
}
