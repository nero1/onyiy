'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { copy, type Locale } from '@/lib/i18n';
import { api, mutation, ApiError } from '@/lib/api-client';
import { formatBaseUnits, decimalToBaseUnits } from '@gifters/domain';
import {
  activateUserScope,
  loadPublicSnapshot,
  loadUserSnapshot,
  savePublicSnapshot,
  saveUserSnapshot,
} from '@/lib/storage';

type User = { id: string; username: string; role: string; status: string; locale: string };
type Plan = { id: string; name: string; slug: string; usd_reference: string; receipts_required: number; status: string; amount_base_units: string; amount_giv: string; expected_giv: string };
type Notification = {id:string;title_key:string;body:string;created_at:string;read_at:string | null};
type Dashboard = { user: User; asset: { symbol: string; decimals: number }; balances: { available: string; held: string; withdrawn: string }; points: number; cycles: any[]; notifications: Notification[]; pending_withdrawals?:{id:string;status:string;gross_base_units:string}[]; wallet: any | null };
type Notice = { kind: 'error' | 'ok'; text: string } | null;
type WithdrawalQuote = {id:string;grossBaseUnits:string;feeBaseUnits:string;netBaseUnits:string;destination:string};

function preference(key:string){try{return localStorage.getItem(key)}catch{return null}}
function remember(key:string,value:string){try{localStorage.setItem(key,value)}catch{/* Display preference persistence is optional. */}}
function cacheMs(manifest:any,key:string){const seconds=manifest?.cache_policy?.[key];return Number.isSafeInteger(seconds) && seconds>0?seconds*1000:0}

export default function DashboardApp() {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('member_01');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [locale, setLocale] = useState<Locale>('en');
  const [theme, setTheme] = useState('light');
  const [ticker, setTicker] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<any[] | null>(null);
  const [withdraw, setWithdraw] = useState('10');
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
    setPlans(loadPublicSnapshot<Plan[]>('plans',cacheMs(cachedManifest,'catalog_seconds')) ?? []);
    setManifest(cachedManifest);
    const ttl=cacheMs(cachedManifest,'private_snapshot_seconds');
    setDash(ttl?loadUserSnapshot<Dashboard>(initialUser,'dashboard','simulation',ttl):null);
    setOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    remember('theme',theme);
  }, [theme]);

  useEffect(() => { remember('locale',locale); }, [locale]);

  useEffect(() => {
    activateUserScope(username);
    currentUser.current = username;
    refreshGeneration.current++;
    setWithdrawalQuote(null);
    remember('sim_user',username);
    const ttl=cacheMs(manifest,'private_snapshot_seconds');
    setDash(ttl?loadUserSnapshot<Dashboard>(username,'dashboard','simulation',ttl):null);
  }, [username]);
  useEffect(() => { if (!online) setWithdrawalQuote(null); },[online]);

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
    api<User[]>('/sim/users', '').then(setUsers).catch(() => undefined);
    api<any>('/manifest', '').then((value) => {
      setManifest(value);
      const ttl=cacheMs(value,'manifest_public_seconds');if(ttl)savePublicSnapshot('manifest',value,ttl);
      return api<Plan[]>('/plans','').then(plans=>{setPlans(plans);const catalogTtl=cacheMs(value,'catalog_seconds');if(catalogTtl)savePublicSnapshot('plans',plans,catalogTtl)});
    }).catch(() => undefined);
  }, [online]);

  useEffect(() => {
    const header=headerElement.current;
    if (!header) return;
    const update=()=>document.documentElement.style.setProperty('--header-height',`${header.getBoundingClientRect().height}px`);
    update();
    const observer=new ResizeObserver(update);observer.observe(header);
    return ()=>observer.disconnect();
  },[username,dash?.user.username]);

  async function refresh() {
    if (!username || username !== currentUser.current) return;
    const generation = ++refreshGeneration.current;
    if (!online) {
      const ttl=cacheMs(manifest,'private_snapshot_seconds');
      const cached=ttl?loadUserSnapshot<Dashboard>(username,'dashboard','simulation',ttl):null;
      setDash(cached);
      return;
    }
    try {
      const fresh = await api<Dashboard>('/me/dashboard', username);
      if (generation !== refreshGeneration.current || username !== currentUser.current || fresh.user.username !== username) return;
      setDash(fresh);
      const safeSnapshot = { ...fresh, wallet: null, notifications: [],pending_withdrawals:[] } as Dashboard;
      const ttl=cacheMs(manifest,'private_snapshot_seconds');if(ttl)saveUserSnapshot(username,'dashboard',safeSnapshot,ttl);
      setNotice(null);
    } catch (error) {
      if (generation!==refreshGeneration.current || username!==currentUser.current) return;
      if (error instanceof ApiError && error.code==='UNAUTHENTICATED') setDash(null);
      setNotice({ kind: 'error', text: error instanceof ApiError ? error.code : String(error) });
    }
  }

  useEffect(() => { void refresh(); }, [username,online,manifest?.cache_policy?.private_snapshot_seconds]);

  useEffect(() => {
    if (!manifest?.activity_statements?.length) return;
    const id = setInterval(
      () => setTicker((value) => (value + 1) % manifest.activity_statements.length),
      (manifest.ui_rotation_policy?.activity_seconds ?? 10) * 1000,
    );
    return () => clearInterval(id);
  }, [manifest]);

  const active = useMemo(() => dash?.cycles.filter((cycle) => cycle.status === 'active') ?? [], [dash]);
  const completed = useMemo(() => dash?.cycles.filter((cycle) => cycle.status === 'completed') ?? [], [dash]);

  async function act(fn: () => Promise<unknown>) {
    if (!online) {
      setNotice({ kind: 'error', text: t.offline });
      return;
    }
    setBusy(true);
    try {
      await fn();
      await Promise.all([refresh(), api<Plan[]>('/plans','').then(value=>{setPlans(value);const ttl=cacheMs(manifest,'catalog_seconds');if(ttl)savePublicSnapshot('plans',value,ttl)})]);
      setNotice({ kind: 'ok', text: t.done });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof ApiError ? error.code : String(error) });
    } finally {
      setBusy(false);
    }
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

  if (!dash || !manifest || dash.user.username!==username) return <main className="center"><div><p role={notice?.kind==='error'?'alert':'status'}>{notice?.text ?? (online?t.loading:t.offline)}</p><select aria-label={t.chooseUser} value={username} onChange={event=>setUsername(event.target.value)}>{users.map(user=><option key={user.id} value={user.username}>{user.username}</option>)}</select><button disabled={!online || busy} onClick={()=>{activateUserScope(username);void refresh()}}>{t.retry}</button></div></main>;

  return (
    <div className="app">
      {!online && <div className="offline" role="status">{t.offline}</div>}
      <header className="topbar" ref={headerElement}>
        <div><div className="brand">🎁 {t.brand}</div><div className="tagline">{t.tagline}</div></div>
        <div className="top-actions">
          <span className="env">{t.simulation}</span>
          <select aria-label={t.chooseUser} value={username} onChange={(event) => setUsername(event.target.value)}>
            {users.map((user) => <option key={user.id} value={user.username}>{user.username} · {user.role} · {user.status}</option>)}
          </select>
          <button aria-label={`${t.theme}: ${theme === 'light' ? t.dark : t.light}`} aria-pressed={theme === 'dark'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '☾' : '☀'}</button>
          <button aria-label={t.language} onClick={() => setLocale(locale === 'en' ? 'fr' : 'en')}>{locale.toUpperCase()}</button>
        </div>
      </header>

      {manifest.activity_statements?.length > 0 && <div className="ticker" aria-live="polite">{manifest.activity_statements[ticker]}</div>}
      {notice && <div role={notice.kind==='error'?'alert':'status'} className={`notice ${notice.kind}`}>{notice.text}</div>}

      <main>
        {dash.user.status === 'pending_consent' && (
          <section className="card consent">
            <h2>{t.consentTitle}</h2><p>{t.consentBody}</p>
            <button className="primary" disabled={busy || !online} onClick={() => act(() => mutation('/me/consent', username, { accepted: true }))}>{t.accept}</button>
          </section>
        )}

        <section className="summary-grid">
          <Summary label={t.available} value={`${formatBaseUnits(dash.balances.available)} GIV`} />
          <Summary label={t.held} value={`${formatBaseUnits(dash.balances.held)} GIV`} />
          <Summary label={t.withdrawn} value={`${formatBaseUnits(dash.balances.withdrawn)} GIV`} />
          <Summary label={t.points} value={String(dash.points)} />
        </section>

        <section className="card how"><h2>{t.howTitle}</h2><p>{t.howBody}</p></section>
        <section id="gift-tiles">
          <div className="section-title"><h2>{t.gifts}</h2><span>GIV</span></div>
          <div className="gift-tiles">{plans.map((plan) => <a href={`#plan-${plan.id}`} className="gift-tile" key={plan.id}><span>🎁</span><strong>{plan.amount_giv}</strong><small>{t.expected}: {plan.expected_giv}</small></a>)}</div>
        </section>

        <section className="plan-list">{plans.map((plan) => (
          <article className="card plan" id={`plan-${plan.id}`} key={plan.id}>
            <div><h3>{plan.name}</h3><p>{plan.amount_giv} GIV · ≈ ${plan.usd_reference}</p><strong>{t.expected}: {plan.expected_giv} GIV</strong><p className="muted">{t.status}: {plan.status}</p></div>
            <button className="primary" disabled={busy || dash.user.status !== 'active' || plan.status !== 'active' || !online} onClick={() => act(() => mutation('/gifts/simulate', username, { plan_id: plan.id }))}>{t.send}</button>
          </article>
        ))}</section>

        <a className="back" href="#gift-tiles">↑ {t.backToTop}</a>
        <div className="two-col">
          <section><h2>{t.active}</h2>{active.length ? active.map((cycle) => <Cycle key={cycle.id} c={cycle} t={t} />) : <p className="muted">{t.noCycles}</p>}</section>
          <section><h2>{t.completed}</h2>{completed.length ? completed.map((cycle) => <Cycle key={cycle.id} c={cycle} t={t} />) : <p className="muted">{t.noCycles}</p>}</section>
        </div>

        <section className="card">
          <div className="section-title"><h2>{t.wallet}</h2>{dash.wallet && <span className="ok-chip">{t.linked}</span>}</div>
          {dash.wallet ? <>
            <code>{dash.wallet.address}</code>
            <div className="withdraw-row"><input aria-label={t.withdrawAmount} type="number" min="0.01" step="0.01" value={withdraw} onChange={(event) => {setWithdraw(event.target.value);setWithdrawalQuote(null);}} /><button className="primary" disabled={busy || !online} onClick={doWithdraw}>{t.withdraw}</button></div>
            {withdrawalQuote?.owner === username && <div role="region" aria-label={t.reviewWithdrawal}>
              <h3>{t.reviewWithdrawal}</h3>
              <p>{t.gross}: {formatBaseUnits(withdrawalQuote.grossBaseUnits)} GIV · {t.networkFee}: {formatBaseUnits(withdrawalQuote.feeBaseUnits)} GIV · {t.net}: {formatBaseUnits(withdrawalQuote.netBaseUnits)} GIV</p>
              <code>{withdrawalQuote.destination}</code>
              <div className="withdraw-row"><button className="primary" disabled={busy || !online} onClick={() => void act(async () => {await mutation(`/me/withdrawals/${withdrawalQuote.id}/confirm`,username,{});setWithdrawalQuote(null);})}>{t.confirmWithdrawal}</button><button disabled={busy} onClick={() => setWithdrawalQuote(null)}>{t.cancel}</button></div>
            </div>}
          </> : <button className="primary" disabled={busy || dash.user.status !== 'active' || !online} onClick={() => act(() => mutation('/me/wallets/simulate', username, {}))}>{t.linkWallet}</button>}
        </section>

        {!!dash.pending_withdrawals?.length && <section className="card"><h2>{t.heldWithdrawals}</h2><div className="stack">{dash.pending_withdrawals.map(item=><article key={item.id}><p>{formatBaseUnits(item.gross_base_units)} GIV · {t.held}</p><button disabled={busy || !online} onClick={()=>void act(()=>mutation(`/me/withdrawals/${item.id}/cancel`,username,{}))}>{t.cancelWithdrawal}</button></article>)}</div></section>}

        <section><h2>{t.notifications}</h2><div className="stack">{dash.notifications.map((item) => <article className="card note" key={item.id}><strong>{item.title_key.replaceAll('_', ' ')}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString(locale)}</small></article>)}</div></section>

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
