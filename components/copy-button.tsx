'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {Locale} from '@/lib/i18n';

/** The adjacent read-only field remains available when clipboard access is denied. */
export default function CopyButton({text,locale,children}:{text:string;locale:Locale;children:ReactNode}){
 const [copied,setCopied]=useState<boolean|null>(null),fr=locale==='fr';
 const current=useRef(text),serial=useRef(0),mounted=useRef(true);
 if(current.current!==text){current.current=text;serial.current++;}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;serial.current++;};},[]);
 useEffect(()=>setCopied(null),[text]);
 async function copy(){
  const request=++serial.current,value=text;
  const valid=()=>mounted.current&&request===serial.current&&current.current===value;
  try{await navigator.clipboard.writeText(value);if(valid())setCopied(true)}
  catch{if(valid())setCopied(false)}
 }
 return <><button type="button" onClick={()=>void copy()}>{children}</button><span role="status">{copied===null?'':copied?(fr?'Copié.':'Copied.'):(fr?'Sélectionnez et copiez le texte affiché.':'Select and copy the displayed text.')}</span></>;
}
