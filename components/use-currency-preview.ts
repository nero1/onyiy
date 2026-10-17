'use client';
import {useEffect,useRef,useState} from 'react';
import {mayAdvanceCurrency} from '@/lib/currency-preview';

export function useCurrencyPreview(choices:string[],allowed:boolean,seconds:number){
  const [selected,setSelected]=useState(''),[paused,setPaused]=useState(false),[reduced,setReduced]=useState(false);
  const keys=JSON.stringify(choices),latest=useRef({choices,allowed,paused,selected,seconds});
  latest.current={choices,allowed,paused,selected,seconds};
  const activity=useRef(0),advanced=useRef(0);
  const value=choices.includes(selected)?selected:choices[0]??'';
  useEffect(()=>{
    const motion=matchMedia('(prefers-reduced-motion: reduce)'),remember=()=>{activity.current=performance.now()},change=()=>{setReduced(motion.matches);remember()};
    change();advanced.current=performance.now();
    motion.addEventListener('change',change);
    const events=['pointerdown','pointermove','keydown','scroll','focusin','focusout','visibilitychange'] as const;
    for(const event of events)document.addEventListener(event,remember,{passive:true});
    const timer=setInterval(()=>{
      const state=latest.current,now=performance.now(),focused=!!document.activeElement&&document.activeElement!==document.body&&document.activeElement!==document.documentElement;
      if(!mayAdvanceCurrency({count:state.choices.length,allowed:state.allowed,paused:state.paused,visible:document.visibilityState==='visible',focused,reducedMotion:motion.matches,now,lastActivity:activity.current,lastAdvance:advanced.current,interval:state.seconds*1000}))return;
      advanced.current=now;
      setSelected(current=>state.choices[(Math.max(0,state.choices.indexOf(current))+1)%state.choices.length]);
    },500);
    return()=>{clearInterval(timer);motion.removeEventListener('change',change);for(const event of events)document.removeEventListener(event,remember)};
  },[keys]);
  return {value,paused,reduced,select:(next:string)=>{if(choices.includes(next)){setSelected(next);setPaused(true);activity.current=performance.now()}},toggle:()=>{setPaused(current=>!current);activity.current=performance.now()}};
}
