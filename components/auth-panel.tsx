'use client';
import {useLocalizedNotice} from './use-localized-notice';

import dynamic from 'next/dynamic';import type {BotProof} from './bot-check';
const BotCheck=dynamic(()=>import('./bot-check'));
import {useEffect,useState,useRef} from 'react';
import {api,mutation,ApiError,clientSessionMatches} from '@/lib/api-client';
import {copy,type Locale} from '@/lib/i18n';
import type {AuthUser,SessionResult} from '@/lib/auth-client';
type Props={environment?:'simulation'|'testnet'|'mainnet';scope?:string;securityReady?:boolean;locale:Locale;user:AuthUser|null;requiresMfa:boolean;provider:string;accounts:{username:string}[];manifest:any;onSession:(value:SessionResult)=>void};
export default function AuthPanel({environment='simulation',scope,securityReady=true,locale,user,requiresMfa,provider,accounts,manifest,onSession}:Props){
 const renderScope=(user?.id??'anonymous')+':'+(scope??'')+':'+requiresMfa;const scopeRef=useRef(renderScope);scopeRef.current=renderScope;const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);const valid=()=>mounted.current&&scopeRef.current===renderScope&&clientSessionMatches(user?.username??'',scope);
 const [botReady,setBotReady]=useState(false),[proof,setProof]=useState<BotProof|undefined>();
 const ageSatisfied=!!user?.age_confirmed&&(user.age_minimum_accepted??0)>=(manifest?.eligibility_min_age??1);
 const t=copy[locale];const [username,setUsername]=useState(user?.username??'member_01');const [newName,setNewName]=useState('');const [accepted,setAccepted]=useState(false);const [adult,setAdult]=useState(false);const [birthDate,setBirthDate]=useState('');const [referral,setReferral]=useState('');const [code,setCode]=useState('');const [recovery,setRecovery]=useState(false);const [secret,setSecret]=useState<string|null>(null);const [codes,setCodes]=useState<string[]>([]);const [enrolled,setEnrolled]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useLocalizedNotice(locale);
 useEffect(()=>{try{const url=new URL(location.href);const referral=url.searchParams.get('ref');if(referral&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(referral))setReferral(referral);if(url.searchParams.get('auth_error')==='1'){setError(t.signInFailed);url.searchParams.delete('auth_error');history.replaceState(null,'',url.pathname+url.search+url.hash)}}catch{}},[]);
 useEffect(()=>{setBusy(false);setError('');setUsername(user?.username??'member_01');setAccepted(false);setAdult(false);setBirthDate('');setBotReady(false);setProof(undefined);setSecret(null);setCodes([]);setCode('');setEnrolled(false);if(user)void api<{enrolled:boolean}>('/auth/2fa/status',user.username).then(value=>{if(valid())setEnrolled(value.enrolled)}).catch(()=>{});},[user?.id,scope,requiresMfa]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn()}catch(e){if(valid())setError({error:e})}finally{if(valid())setBusy(false)}}
 function session(value:SessionResult){if(!valid())return;setBirthDate('');if(value.recovery_codes)setCodes(value.recovery_codes);onSession(value);}
 return <section className="card auth-panel" lang={locale}>
  <h2>{requiresMfa?t.verifyAuthenticator:user?t.accountSecurity:t.signIn}</h2>
  {error&&<p role="alert">{error}</p>}
  {!user&&!requiresMfa&&(provider==='google'?<a className="primary auth-link" href="/api/v1/auth/google/start">{t.googleSignIn}</a>:<>
   <label>{t.chooseUser}<select value={username} onChange={e=>setUsername(e.target.value)} disabled={busy}>{accounts.map(value=><option key={value.username}>{value.username}</option>)}</select></label>
   <button className="primary" disabled={busy||!username} onClick={()=>run(async()=>session(await mutation<SessionResult>('/auth/simulation/session','',{username})))}>{t.signIn}</button>
   <details><summary>{t.createTestAccount}</summary><label>{t.username}<input value={newName} onChange={e=>setNewName(e.target.value.toLowerCase())} autoComplete="username" maxLength={64}/></label><button disabled={busy||!newName} onClick={()=>run(async()=>session(await mutation<SessionResult>('/auth/simulation/signup','',{username:newName,locale})))}>{t.createTestAccount}</button></details>
  </>)}
  {user&&(user.status==='pending_consent'||!ageSatisfied||user.consent_version!==manifest?.terms_content?.version)&&<>
   <h3>{environment!=='simulation'?t.consentTitleNative:t.consentTitle}</h3><p>{environment!=='simulation'?t.consentBodyNative:t.consentBody}</p><div className="terms-body">{manifest?.terms_content?.body?.[locale]}</div>
   <label>{t.username}<input value={username} disabled={!!user.consent_version} onChange={e=>setUsername(e.target.value.toLowerCase())} autoComplete="username" maxLength={64}/></label>
   <label className="checkbox-label"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>{t.acceptTerms}</label>
   <label className="checkbox-label"><input type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)}/>{t.ageConfirmation.replace('{age}',String(manifest?.eligibility_min_age??''))}</label>
   {!ageSatisfied&&<label>{t.birthDate}<input type="date" value={birthDate} max={new Date().toISOString().slice(0,10)} onChange={event=>setBirthDate(event.target.value)}/><small>{t.birthDatePrivacy}</small></label>}
   {!user.consent_version&&<label>{t.referralCode}<input value={referral} onChange={e=>setReferral(e.target.value)} maxLength={36}/></label>}
   {scope&&<BotCheck key={renderScope} owner={user.username} generation={scope} surface="consent" locale={locale} onReady={(ready,value)=>{setBotReady(ready);setProof(value)}}/>}
   <button className="primary" disabled={busy||codes.length>0||!accepted||!adult||!ageSatisfied&&!birthDate||!manifest||!botReady} onClick={()=>run(async()=>session(await mutation<SessionResult>('/me/consent',user.username,{accepted:true,adult:true,...(birthDate?{birth_date:birthDate}:{}),minimum_age:manifest.eligibility_min_age,terms_version:manifest.terms_content.version,username,...(proof?{bot_proof:proof}:{}),...(referral?{referral_code:referral}:{})})))}>{t.accept}</button>
  </>}
  {securityReady&&user&&user.status!=='pending_consent'&&!enrolled&&!secret&&<button disabled={busy} onClick={()=>run(async()=>{const result=await mutation<{secret:string}>('/auth/2fa/setup',user.username,{});if(valid())setSecret(result.secret)})}>{t.setupAuthenticator}</button>}
  {secret&&<div><p>{t.authenticatorInstructions}</p><code className="setup-secret">{secret}</code></div>}
  {(requiresMfa||enrolled||secret)&&<>
   <label>{recovery?t.recoveryCode:t.authenticatorCode}<input value={code} onChange={e=>setCode(e.target.value)} autoComplete="one-time-code" inputMode={recovery?'text':'numeric'} maxLength={100}/></label>
   {(requiresMfa||enrolled)&&<label className="checkbox-label"><input type="checkbox" checked={recovery} onChange={e=>{setRecovery(e.target.checked);setCode('')}}/>{t.useRecoveryCode}</label>}
   <button className="primary" disabled={busy||!code||(!requiresMfa&&!securityReady)} onClick={()=>run(async()=>{const value=await mutation<SessionResult>('/auth/2fa/verify',requiresMfa?'':user?.username??'',{code,recovery});if(!valid())return;setSecret(null);setCode('');setEnrolled(true);session(value)})}>{t.verifyAuthenticator}</button>
  </>}
  {codes.length>0&&<div><p>{t.recoveryInstructions}</p><pre>{codes.join('\n')}</pre><button onClick={()=>setCodes([])}>{t.savedRecoveryCodes}</button></div>}
  {requiresMfa&&<button disabled={busy} onClick={()=>run(async()=>{await mutation('/auth/cancel','',{});if(!valid())return;onSession({user:null,provider})})}>{t.cancel}</button>}
  {user&&<button disabled={busy} onClick={()=>run(async()=>{await mutation('/auth/logout-all',user.username,{});if(!valid())return;onSession({user:null,provider})})}>{t.signOutAll}</button>}
 </section>;
}
