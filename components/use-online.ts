'use client';
import {useSyncExternalStore} from 'react';
function subscribe(changed:()=>void){addEventListener('online',changed);addEventListener('offline',changed);return()=>{removeEventListener('online',changed);removeEventListener('offline',changed);};}
export function useOnline(){return useSyncExternalStore(subscribe,()=>navigator.onLine,()=>false);}
