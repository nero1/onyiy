'use client';
import {useEffect,useRef} from 'react';
/** All portals discard private reads on the same cross-tab identity signals. */
export function useSessionInvalidation(invalidate:()=>void,onDispose?:()=>void){
 const callback=useRef(invalidate),dispose=useRef(onDispose);callback.current=invalidate;dispose.current=onDispose;
 useEffect(()=>{
  const changed=()=>callback.current(),storage=(event:StorageEvent)=>{if(event.key===null||event.key==='gw:v3:active-user'||event.key==='gw:v3:active-session')changed();};
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('gw-session-scope-v1'):null;if(channel)channel.onmessage=changed;
  window.addEventListener('storage',storage);window.addEventListener('gw:identity',changed);
  return()=>{dispose.current?.();channel?.close();window.removeEventListener('storage',storage);window.removeEventListener('gw:identity',changed);};
 },[]);
}
