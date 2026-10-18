'use client';
import {useTransition} from 'react';
import {copy} from '@/lib/i18n';
import {useAppearance} from '@/components/appearance-provider';
export default function ErrorPage({retry}:{error:Error&{digest?:string};retry:()=>void}){
 const {locale}=useAppearance(),[pending,start]=useTransition(),t=copy[locale];
 return <main className="public-page" lang={locale}><h1>{t.brand}</h1><p role="alert">{t.error}</p><button disabled={pending} onClick={()=>start(retry)}>{t.retry}</button><a href="/">{t.home}</a></main>;
}
