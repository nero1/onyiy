'use client';
import {useEffect,useState,type ReactNode} from 'react';
import type {Locale} from '@/lib/i18n';

/** The adjacent read-only field remains available when clipboard access is denied. */
export default function CopyButton({text,locale,children}:{text:string;locale:Locale;children:ReactNode}){
 const [copied,setCopied]=useState<boolean|null>(null),fr=locale==='fr';
 useEffect(()=>setCopied(null),[text]);
 async function copy(){
  try{await navigator.clipboard.writeText(text);setCopied(true)}
  catch{setCopied(false)}
 }
 return <><button onClick={()=>void copy()}>{children}</button><p role="status">{copied===null?'':copied?(fr?'Copié.':'Copied.'):(fr?'Sélectionnez et copiez le texte dans le champ ci-dessus.':'Select and copy the text in the field above.')}</p></>;
}
