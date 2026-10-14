'use client';
import {errorMessage} from '@/lib/error-messages';
import {loadSession} from '@/lib/auth-client';
import type {BotProof} from './bot-check';
const BotCheck=dynamic(()=>import('./bot-check'));

import { useEffect, useMemo, useState, useRef } from 'react';
import { copy, type Locale } from '@/lib/i18n';
import dynamic from 'next/dynamic';
import PwaControls from '@/components/pwa-controls';
const MemberRecords=dynamic(()=>import('./member-records'),{ssr:false});
const NotificationInbox=dynamic(()=>import('@/components/notification-inbox'),{ssr:false});
const AdminPanel=dynamic(()=>import('@/components/admin-panel'),{ssr:false});
const AuthPanel=dynamic(()=>import('@/components/auth-panel'),{ssr:false});
import type {AuthUser,SessionResult} from '@/lib/auth-client';
import { api, mutation, ApiError, setClientSession } from '@/lib/api-client';
import { configurePublicDataBudget,loadPublicCatalog,savePublicCatalog } from '@/lib/public-data-cache';
import { formatBaseUnits, decimalToBaseUnits } from '@gifters/domain';
import {
  activateUserScope,
  activeSessionGeneration,
  clearActiveUserScope,
  configureSnapshotBudget,
  loadPublicSnapshot,
  loadUserSnapshot,
  savePublicSnapshot,
  saveUserSnapshot,
} from '@/lib/storage';

type User = { id: string; username: string; role: string; status: string; locale: string };
type Plan = { id: string; name: string; slug: string; usd_reference: string; receipts_required: number; status: string; amount_base_units: string; amount_giv: string; expected_giv: string };
type Notification = {id:string;title_key:string;body:string;created_at:string;read_at:string | null};
type Dashboard = { user: User;consent?:{required:boolean;terms_content:any;minimum_age:number}; asset: { symbol: string; decimals: number }; balances: { available: string; held: string; incoming?:string;refundable?:string; withdrawn: string }; points: number; cycles: any[]; notifications: Notification[];notification_badge?:{has_new:boolean}; financial_review?:boolean;pending_invoices?:(Omit<GiftQuote,'owner'> & {plan_id:string})[];pending_withdrawals?:{id:string;status:string;gross_base_units:string}[]; wallet: any | null };
type Notice = { kind: 'error' | 'ok'; text: string } | null;
type GiftQuote={id:string;expected_base_units:string;expires_at:string;status:string;owner:string};
type WithdrawalQuote = {id:string;grossBaseUnits:string;feeBaseUnits:string;netBaseUnits:string;destination:string};

function preference(key:string){try{return localStorage.getItem(key)}catch{return null}}
function remember(key:string,value:string){try{localStorage.setItem(key,value)}catch{/* Display preference persistence is optional. */}}
function cacheMs(manifest:any,key:string){const seconds=manifest?.cache_policy?.[key];return Number.isSafeInteger(seconds) && seconds>0?seconds*1000:0}

export default function DashboardApp() {
  const catalogGeneration=useRef(0);
  const tabId=useRef(crypto.randomUUID());
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('member_01');
  const [authUser,setAuthUser]=useState<AuthUser|null>(null);
  const [sessionGeneration,setSessionGeneration]=useState('');
  const [requiresMfa,setRequiresMfa]=useState(false);
  const [authProvider,setAuthProvider]=useState('simulation');
  const [authReady,setAuthReady]=useState(false);
  const [botReady,setBotReady]=useState(false),[botProof,setBotProof]=useState<BotProof|undefined>(),[botReset,setBotReset]=useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [locale, setLocale] = useState<Locale>('en');
  const [theme, setTheme] = useState('light');

  const [notice, setNotice] = useState<Notice>(null);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<any[] | null>(null);
  const [withdraw, setWithdraw] = useState('10');
  const [giftQuote,setGiftQuote]=useState<GiftQuote|null>(null);
  const [withdrawalQuote,setWithdrawalQuote] = useState<(WithdrawalQuote & {owner:string}) | null>(null);
  const headerElement = useRef<HTMLElement | null>(null);
  const refreshGeneration = useRef(0);
  const currentUser = useRef(username);
  const [busy, setBusy] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    const initialUser = preference('sim_user') ?? 'member_01';
    const initialLocale = (preference('locale') as Locale | null) ?? 'en';
    const initialTheme = preference('theme') ?? 'light';
    setUsername(initialUser);
    setLocale(initialLocale === 'fr' ? 'fr' : 'en');
    setTheme(initialTheme === 'dark' ? 'dark' : 'light');
    const cachedManifest=loadPublicSnapshot<any>('manifest');
    configureSnapshotBudget(cachedManifest?.cache_policy);
    void configurePublicDataBudget(cachedManifest?.cache_policy);
    setPlans(loadPublicSnapshot<Plan[]>('plans',cacheMs(cachedManifest,'catalog_seconds')) ?? []);
    let mounted=true;const generation=catalogGeneration.current;
    void loadPublicCatalog(cacheMs(cachedManifest,'catalog_seconds')).then(value=>{
      if(mounted && generation===catalogGeneration.current && value)setPlans(value);
    });
    setManifest(cachedManifest);
    setDash(null);
    void loadSession().then(async value=>{if(mounted)receiveSession(value)}).catch(()=>{if(mounted)setAuthReady(true)});
    setOnline(navigator.onLine);
    return ()=>{mounted=false;};
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    remember('theme',theme);
  }, [theme]);

  useEffect(() => {document.documentElement.lang=locale; remember('locale',locale); }, [locale]);

  useEffect(() => {
    if(!authUser||!sessionGeneration)return;
    activateUserScope(username,sessionGeneration);
    currentUser.current = username;
    refreshGeneration.current++;
    setWithdrawalQuote(null);setGiftQuote(null);
    remember('sim_user',username);
    const ttl=cacheMs(manifest,'private_snapshot_seconds');
    setDash(ttl?loadUserSnapshot<Dashboard>(username,'dashboard',sessionGeneration,ttl):null);
  }, [username,sessionGeneration,authUser?.id]);
  useEffect(()=>{if(dash?.financial_review){setGiftQuote(null);setWithdrawalQuote(null);}},[dash?.financial_review]);
  useEffect(() => { if (!online){setWithdrawalQuote(null);setGiftQuote(null);} },[online]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    addEventListener('online', update);
    addEventListener('offline', update);
    return () => {
      removeEventListener('online', update);
      removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    let mounted=true;
    api<User[]>('/sim/users', '').then(value=>{if(mounted)setUsers(value)}).catch(() => undefined);
    api<any>('/manifest', '').then((value) => {
      if(!mounted)return;
      configureSnapshotBudget(value.cache_policy);
      void configurePublicDataBudget(value.cache_policy);
      setManifest(value);
      const ttl=cacheMs(value,'manifest_public_seconds');if(ttl)savePublicSnapshot('manifest',value,ttl);
      return refreshCatalog(value);
    }).catch(() => undefined);
    return ()=>{mounted=false;catalogGeneration.current++;};
  }, [online]);

  async function refreshCatalog(policy=manifest) {
    const generation=++catalogGeneration.current;
    const value=await api<Plan[]>('/plans','');
    if(generation!==catalogGeneration.current)return;
    setPlans(value);const ttl=cacheMs(policy,'catalog_seconds');
    if(ttl){savePublicSnapshot('plans',value,ttl);void savePublicCatalog(value,ttl);}
  }

  useEffect(() => {
    const header=headerElement.current;
    if (!header) return;
    const update=()=>document.documentElement.style.setProperty('--header-height',`${header.getBoundingClientRect().height}px`);
    update();
    const observer=new ResizeObserver(update);observer.observe(header);
    return ()=>observer.disconnect();
  },[username,dash?.user.username]);

  useEffect(()=>{if(!authUser||!sessionGeneration)return;
    function purge(){setClientSession('','');refreshGeneration.current++;currentUser.current='';clearActiveUserScope(username);setAuthUser(null);setSessionGeneration('');setDash(null);setGiftQuote(null);setWithdrawalQuote(null);setQueue(null);setRequiresMfa(false);setBotReady(false);setBotProof(undefined);}
    const storage=(event:StorageEvent)=>{if((event.key===null||event.key==='gw:v3:active-user'||event.key==='gw:v3:active-session')&&activeSessionGeneration(username)!==sessionGeneration)purge();};
    let channel:BroadcastChannel|null=null;try{channel=new BroadcastChannel('gw-session-scope-v1');channel.onmessage=event=>{const value=event.data;if(value?.type==='GW_SCOPE'&&value.tab!==tabId.current&&(value.owner!==username||value.generation!==sessionGeneration))purge();};}catch{}
    addEventListener('storage',storage);return()=>{removeEventListener('storage',storage);channel?.close();};
  },[authUser?.id,sessionGeneration,username]);

  function receiveSession(value:SessionResult){
    setClientSession(value.user?.username??'',value.generation??'');
    refreshGeneration.current++;
    try{const channel=new BroadcastChannel('gw-session-scope-v1');channel.postMessage({type:'GW_SCOPE',tab:tabId.current,owner:value.user?.username??'',generation:value.generation??''});channel.close()}catch{}
    setAuthReady(true);setRequiresMfa(value.requires_mfa??false);if(value.provider)setAuthProvider(value.provider);
    const same=value.user?.id===authUser?.id&&value.generation===sessionGeneration;
    if(!same){setBotReady(false);setBotProof(undefined);setBotReset(v=>v+1);if(!value.user||activeSessionGeneration(value.user.username)!==value.generation)clearActiveUserScope();setDash(null);setGiftQuote(null);setWithdrawalQuote(null);}
    setAuthUser(value.user);setSessionGeneration(value.generation??'');
    if(value.user){currentUser.current=value.user.username;setUsername(value.user.username);activateUserScope(value.user.username,value.generation??'');if(same)void refresh();}
  }
  async function switchAccount(next:string){if(busy)return;setBusy(true);try{receiveSession(await mutation<SessionResult>('/auth/simulation/session','',{username:next}));}catch(error){setNotice({kind:'error',text:errorMessage(error, locale)});}finally{setBusy(false)}}

  async function refresh() {
    if (!authUser||!sessionGeneration||!username || username !== currentUser.current) return;
    const generation = ++refreshGeneration.current;
    if (!online) {
      const ttl=cacheMs(manifest,'private_snapshot_seconds');
      const cached=ttl?loadUserSnapshot<Dashboard>(username,'dashboard',sessionGeneration,ttl):null;
      setDash(cached);
      return;
    }
    try {
      const fresh = await api<Dashboard>('/me/dashboard', username);
      if (generation !== refreshGeneration.current || username !== currentUser.current || fresh.user.username !== username) return;
      setDash(fresh);
      if(fresh.consent?.required)setManifest((old:any)=>({...old,terms_content:fresh.consent!.terms_content,eligibility_min_age:fresh.consent!.minimum_age}));
      const safeSnapshot = { ...fresh, wallet: null, notifications: [],pending_withdrawals:[],pending_invoices:[] } as Dashboard;
      const ttl=cacheMs(manifest,'private_snapshot_seconds');if(ttl)saveUserSnapshot(username,'dashboard',safeSnapshot,ttl,sessionGeneration);
      setNotice(null);
    } catch (error) {
      if (generation!==refreshGeneration.current || username!==currentUser.current) return;
      if (error instanceof ApiError && error.code==='UNAUTHENTICATED') {setDash(null);setGiftQuote(null);setAuthUser(null);setSessionGeneration('');}
      setNotice({ kind: 'error', text: errorMessage(error, locale) });
    }
  }

  useEffect(() => { void refresh(); }, [username,sessionGeneration,authUser?.id,online,manifest?.cache_policy?.private_snapshot_seconds]);



  const active = useMemo(() => dash?.cycles.filter((cycle) => cycle.status === 'active') ?? [], [dash]);
  const reviewed=useMemo(()=>dash?.cycles.filter(cycle=>cycle.status==='exception')??[],[dash]);
  const completed = useMemo(() => dash?.cycles.filter((cycle) => cycle.status === 'completed') ?? [], [dash]);

  async function act(fn: () => Promise<unknown>) {
    if (!online) {
      setNotice({ kind: 'error', text: t.offline });
      return;
    }
    setBusy(true);
    try {
      const result=await fn() as {status?:string;expected_base_units?:string}|undefined;
      await Promise.all([refresh(),refreshCatalog()]);
      setNotice({ kind:result?.expected_base_units && ['exception','failed'].includes(result.status??'')?'error':'ok',text:result?.expected_base_units && result.status==='submitted'?t.incomingPending:result?.expected_base_units && result.status==='exception'?t.incomingReview:result?.expected_base_units && result.status==='failed'?t.incomingRejected:t.done });
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, locale) });
    } finally {
      setBusy(false);
    }
  }

  async function requestGift(planId:string){
    if(!online || busy)return;const existing=dash?.pending_invoices?.find(item=>item.plan_id===planId && item.status==='quoted' && new Date(item.expires_at).getTime()>Date.now());if(existing){setGiftQuote({...existing,owner:username});return}const owner=username;setBusy(true);setGiftQuote(null);
    try{const quote=await mutation<Omit<GiftQuote,'owner'>>('/gifts/invoices',owner,{plan_id:planId,...(botProof?{bot_proof:botProof}:{})});if(owner===currentUser.current && navigator.onLine){setGiftQuote({...quote,owner});setBotReset(v=>v+1);}}
    catch(error){if(owner===currentUser.current)setNotice({kind:'error',text:errorMessage(error, locale)});}
    finally{setBusy(false);}
  }

  async function inspectReconciliation() {
    if (!online || busy) return;
    const actor=username;setBusy(true);
    try {
      const result=await api<{balanced:boolean;consistent:boolean;lineage_complete:boolean}>('/admin/reconcile',actor);
      if (actor!==currentUser.current) return;
      const passed=result.balanced && result.consistent && result.lineage_complete;
      setNotice({kind:passed?'ok':'error',text:passed?t.reconciliationPassed:t.reconciliationReview});
    } catch {
      if (actor===currentUser.current) setNotice({kind:'error',text:t.reconciliationReview});
    } finally {setBusy(false);}
  }

  async function doWithdraw() {
    if (!dash?.wallet) return;
    await act(async () => {
      const gross = decimalToBaseUnits(withdraw).toString();
      const quote = await mutation<WithdrawalQuote>('/me/withdrawals/quotes', username, { gross_base_units: gross });
      if (username === currentUser.current) setWithdrawalQuote({...quote,owner:username});
    });
  }

  const fullAccess=!!authUser&&['active','deactivated'].includes(authUser.status)&&!requiresMfa;
  const publicNavigation=<nav className="product-nav" aria-label={t.navigation}><a href="/">{t.home}</a>{manifest?.feature_gifts&&<a href="/gifts#gift-tiles">{t.gifts}</a>}{manifest?.feature_wallets&&fullAccess&&<a href="/wallet#wallet">{t.wallet}</a>}{manifest?.feature_points&&fullAccess&&<a href="/points">{t.points}</a>}{fullAccess&&manifest?.feature_referrals&&<a href="/referrals">{locale==='fr'?'Parrainages':'Referrals'}</a>}{authUser&&manifest?.feature_portability&&<a href="/settings/data">{locale==='fr'?'Mes données':'My data'}</a>}{fullAccess&&manifest?.feature_wallets&&manifest?.entitlements_member?.history&&<a href="/wallet/history">{locale==='fr'?'Historique':'History'}</a>}{fullAccess&&manifest?.feature_shares&&<a href="/share">{locale==='fr'?'Reçus':'Receipts'}</a>}{authUser&&<a href="/settings/account">{locale==='fr'?'Compte':'Account'}</a>}{manifest?.feature_moderation&&['admin','moderator'].includes(authUser?.role??'')&&<a href="/moderation">{locale==='fr'?'Modération':'Moderation'}</a>}{manifest?.feature_help&&<a href="/help">{t.help}</a>}{manifest&&<PwaControls enabled={!!manifest.feature_pwa} locale={locale} busy={busy}/>}</nav>;

  if(!authReady)return <main className="center"><p role="status">{t.loading}</p></main>;
  if(!authUser||requiresMfa||authUser.status==='pending_consent')return <main className="auth-page">{publicNavigation}<h1>{t.brand}</h1><button aria-label={t.language} onClick={()=>setLocale(locale==='en'?'fr':'en')}>{locale.toUpperCase()}</button><AuthPanel scope={sessionGeneration} locale={locale} user={authUser} requiresMfa={requiresMfa} provider={authProvider} accounts={users} manifest={manifest} onSession={receiveSession}/>{manifest?.feature_gifts&&<section className="plan-list" aria-label={t.gifts}>{plans.map(plan=><article className="card plan" key={plan.id}><div><h3>{plan.name}</h3><p>{plan.amount_giv} GIV · ≈ ${plan.usd_reference}</p><strong>{t.expected}: {plan.expected_giv} GIV</strong><p className="muted">{t.status}: {plan.status}</p></div></article>)}</section>}</main>;
  if(authUser.status==='suspended')return <main className="auth-page">{publicNavigation}<a href="/settings/account">{locale==='fr'?'Compte et recours':'Account and appeals'}</a><AuthPanel scope={sessionGeneration} locale={locale} user={authUser} requiresMfa={false} provider={authProvider} accounts={users} manifest={manifest} onSession={receiveSession}/></main>;
  if(!dash||!manifest||dash.user.username!==username)return <main className="center"><div><p role="status">{notice?.text??t.loading}</p><button disabled={!online||busy} onClick={()=>void refresh()}>{t.retry}</button><AuthPanel scope={sessionGeneration} securityReady={false} locale={locale} user={authUser} requiresMfa={false} provider={authProvider} accounts={users} manifest={manifest} onSession={receiveSession}/></div></main>;

  return (
    <div className="app">
      {!online && <div className="offline" role="status">{t.offline}</div>}
      <header className="topbar" ref={headerElement}>
        <div><div className="brand">🎁 {t.brand}</div><div className="tagline">{t.tagline}</div></div>
        <div className="top-actions">
          {manifest.feature_notifications&&<NotificationInbox key={username+':'+sessionGeneration} user={username} locale={locale} initial={dash.notifications} badge={!!dash.notification_badge?.has_new} onChange={()=>void refresh()}/>}
          <span className="env">{manifest.payment_environment==='testnet'?'Testnet':t.simulation}</span>
          {authProvider==='simulation'&&<select aria-label={t.chooseUser} value={username} disabled={busy} onChange={event=>void switchAccount(event.target.value)}>
            {users.map((user) => <option key={user.id} value={user.username}>{user.username} · {user.role} · {user.status}</option>)}
          </select>}
          <button aria-label={`${t.theme}: ${theme === 'light' ? t.dark : t.light}`} aria-pressed={theme === 'dark'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '☾' : '☀'}</button>
          <button aria-label={t.language} onClick={() => setLocale(locale === 'en' ? 'fr' : 'en')}>{locale.toUpperCase()}</button>
        </div>
      </header>

      {publicNavigation}

      {dash.financial_review && <section className="card" role="alert"><p>{t.financialReview}</p></section>}
      {notice && <div role={notice.kind==='error'?'alert':'status'} className={`notice ${notice.kind}`}>{notice.text}</div>}

      <main>
        <AuthPanel scope={sessionGeneration} locale={locale} user={authUser} requiresMfa={false} provider={authProvider} accounts={users} manifest={manifest} onSession={receiveSession}/>

        <section className="summary-grid">
          <Summary label={t.available} value={`${formatBaseUnits(dash.balances.available)} GIV`} />
          <Summary label={t.incoming} value={`${formatBaseUnits(dash.balances.incoming??'0')} GIV`} />
          <Summary label={t.refundable} value={`${formatBaseUnits(dash.balances.refundable??'0')} GIV`} />
          <Summary label={t.held} value={`${formatBaseUnits(dash.balances.held)} GIV`} />
          <Summary label={t.withdrawn} value={`${formatBaseUnits(dash.balances.withdrawn)} GIV`} />
          <Summary label={t.points} value={String(dash.points)} />
        </section>

        <section className="card how"><h2>{t.howTitle}</h2><p>{t.howBody}</p></section>
        <section id="gift-tiles">
          <div className="section-title"><h2>{t.gifts}</h2><span>GIV</span></div>
          <div className="gift-tiles">{plans.map((plan) => <a href={`#plan-${plan.id}`} className="gift-tile" key={plan.id}><span>🎁</span><strong>{plan.amount_giv}</strong><small>{t.expected}: {plan.expected_giv}</small></a>)}</div>
        </section>

        {manifest.feature_gifts&&sessionGeneration&&<BotCheck key={username+sessionGeneration} owner={username} generation={sessionGeneration} surface="suspicious_checkout" locale={locale} reset={botReset} onReady={(ready,value)=>{setBotReady(ready);setBotProof(value)}}/>}
        <section className="plan-list">{plans.map((plan) => (
          <article className="card plan" id={`plan-${plan.id}`} key={plan.id}>
            <div><h3>{plan.name}</h3><p>{plan.amount_giv} GIV · ≈ ${plan.usd_reference}</p><strong>{t.expected}: {plan.expected_giv} GIV</strong><p className="muted">{t.status}: {plan.status}</p></div>
            <button className="primary" disabled={busy || !botReady || dash.user.status !== 'active' || plan.status !== 'active' || dash.financial_review || dash.cycles.some(cycle=>cycle.plan_id===plan.id && cycle.queue_paused) || manifest.entitlements_member?.send_enabled_gifts===false || !!dash.consent?.required || !online} onClick={() => requestGift(plan.id)}>{t.send}</button>
          </article>
        ))}</section>

        <a className="back" href="#gift-tiles">↑ {t.backToTop}</a>
        {sessionGeneration&&(manifest.feature_gifts||manifest.feature_wallets)&&<MemberRecords key={username+sessionGeneration} owner={username} generation={sessionGeneration} environment="simulation" locale={locale} collections={[...(manifest.feature_gifts?['cycles','invoices'] as const:[]),...(manifest.feature_wallets?['withdrawals'] as const:[])]} history={!!manifest.entitlements_member?.history} disabled={busy} revision={dash} onInvoice={row=>setGiftQuote({id:row.id,status:row.status,expected_base_units:row.amount_base_units!,expires_at:String(row.expires_at),owner:username})} onCancelInvoice={row=>void act(()=>mutation(`/gifts/invoices/${row.id}/cancel`,username,{}))} onWithdrawal={row=>void act(()=>mutation(`/me/withdrawals/${row.id}/cancel`,username,{}))}/>}
        <div className="two-col">
          <section><h2>{t.active}</h2>{active.length ? active.map((cycle) => <Cycle key={cycle.id} c={cycle} t={t} />) : <p className="muted">{t.noCycles}</p>}</section>
          <section><h2>{t.completed}</h2>{completed.length ? completed.map((cycle) => <Cycle key={cycle.id} c={cycle} t={t} />) : <p className="muted">{t.noCycles}</p>}</section>
        </div>

        {!!reviewed.length && <section className="card"><h2>{t.reviewCycles}</h2>{reviewed.map(cycle=><Cycle key={cycle.id} c={cycle} t={t} />)}</section>}

        {manifest.feature_wallets&&<section className="card" id="wallet">
          <div className="section-title"><h2>{t.wallet}</h2>{dash.wallet && <span className="ok-chip">{t.linked}</span>}</div>
          {dash.wallet ? <>
            <code>{dash.wallet.address}</code>
            <div className="withdraw-row"><input aria-label={t.withdrawAmount} type="number" min="0.01" step="0.01" value={withdraw} onChange={(event) => {setWithdraw(event.target.value);setWithdrawalQuote(null);}} /><button className="primary" disabled={busy || !online || dash.financial_review} onClick={doWithdraw}>{t.withdraw}</button></div>
            {withdrawalQuote?.owner === username && <div role="region" aria-label={t.reviewWithdrawal}>
              <h3>{t.reviewWithdrawal}</h3>
              <p>{t.gross}: {formatBaseUnits(withdrawalQuote.grossBaseUnits)} GIV · {t.networkFee}: {formatBaseUnits(withdrawalQuote.feeBaseUnits)} GIV · {t.net}: {formatBaseUnits(withdrawalQuote.netBaseUnits)} GIV</p>
              <code>{withdrawalQuote.destination}</code>
              <div className="withdraw-row"><button className="primary" disabled={busy || !online} onClick={() => void act(async () => {await mutation(`/me/withdrawals/${withdrawalQuote.id}/confirm`,username,{});setWithdrawalQuote(null);})}>{t.confirmWithdrawal}</button><button disabled={busy} onClick={() => setWithdrawalQuote(null)}>{t.cancel}</button></div>
            </div>}
          </> : <button className="primary" disabled={busy || dash.user.status !== 'active' || manifest.entitlements_member?.wallet_link===false || !online} onClick={() => act(() => mutation('/me/wallets/simulate', username, {}))}>{t.linkWallet}</button>}
        </section>}

        {!!dash.pending_withdrawals?.length && <section className="card"><h2>{t.heldWithdrawals}</h2><div className="stack">{dash.pending_withdrawals.map(item=><article key={item.id}><p>{formatBaseUnits(item.gross_base_units)} GIV · {t.held}</p><button disabled={busy || !online} onClick={()=>void act(()=>mutation(`/me/withdrawals/${item.id}/cancel`,username,{}))}>{t.cancelWithdrawal}</button></article>)}</div></section>}

        {giftQuote && giftQuote.owner===username && <section className="card" aria-label={t.reviewGift}>
          <h2>{t.reviewGift}</h2><p>{t.gross}: {formatBaseUnits(giftQuote.expected_base_units)} GIV</p>
          <p>{t.expires}: {new Date(giftQuote.expires_at).toLocaleString(locale)}</p>
          <button disabled={busy || !online || new Date(giftQuote.expires_at).getTime()<=Date.now()} onClick={()=>act(async()=>{const quote=giftQuote;const result=await mutation(`/gifts/invoices/${quote.id}/transaction`,username,{});if(quote.owner===currentUser.current)setGiftQuote(null);return result})}>{t.confirmGift}</button>
          <button disabled={busy || !online} onClick={()=>act(async()=>{const quote=giftQuote;const result=await mutation(`/gifts/invoices/${quote.id}/cancel`,username,{});if(quote.owner===currentUser.current)setGiftQuote(null);return result})}>{t.cancel}</button>
        </section>}

        {manifest.feature_notifications&&<section><h2>{t.notifications}</h2><div className="stack">{dash.notifications.map((item) => <article className="card note" key={item.id}><strong>{item.title_key.replaceAll('_', ' ')}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString(locale)}</small></article>)}</div></section>}

        {dash.user.role==='admin'&&<AdminPanel key={username+':'+sessionGeneration} user={username} locale={locale} plans={plans} enabled={manifest.feature_admin} priorityEnabled={manifest.feature_priority} helpEnabled={manifest.feature_help}/>}
        {dash.user.role === 'admin' && <section><h2>{t.admin}</h2><div className="card admin-grid">
          <div><h3>Plans</h3>{plans.map((plan) => <div className="admin-row" key={plan.id}><span>{plan.name} · {plan.status}</span><div><button disabled={busy || plan.status === 'active'} onClick={() => act(() => mutation(`/admin/plans/${plan.id}/activate`, username, {}))}>{t.activate}</button><button onClick={async () => setQueue(await api(`/admin/queue/${plan.id}`, username))}>{t.queue}</button></div></div>)}</div>
          <div><h3>Ledger</h3><button disabled={busy || !online} onClick={()=>void inspectReconciliation()}>{t.reconcile}</button>{queue && <pre className="queue">{JSON.stringify(queue, null, 2)}</pre>}</div>
        </div></section>}
      </main>

      <footer><span>Gifters World · Phase One test iteration</span><span>{dash.user.username}</span></footer>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="summary"><small>{label}</small><strong>{value}</strong></div>;
}

function Cycle({ c, t }: { c: any; t: any }) {
  return <article className="card cycle"><div><strong>{c.name}</strong><p>{t.position}: {c.display_position ?? '—'}</p></div><div><strong>{c.credited_count}/{c.receipts_required}</strong><small>{t.credited}</small></div></article>;
}
