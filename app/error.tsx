'use client';
import {useEffect,useState,useTransition} from 'react';
import {copy,type Locale} from '@/lib/i18n';
export default function ErrorPage({retry}:{error:Error&{digest?:string};retry:()=>void}){const [locale,setLocale]=useState<Locale>('en'),[pending,start]=useTransition();useEffect(()=>{try{setLocale(localStorage.getItem('locale')==='fr'?'fr':'en')}catch{}},[]);const t=copy[locale];return <main className="public-page" lang={locale}><h1>{t.brand}</h1><p role="alert">{t.error}</p><button disabled={pending} onClick={()=>start(retry)}>{t.retry}</button><a href="/">{t.home}</a></main>}
