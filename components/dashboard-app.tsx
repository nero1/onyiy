'use client';

import { useEffect, useMemo, useState } from 'react';
import { copy, type Locale } from '@/lib/i18n';
import { api, mutation, ApiError } from '@/lib/api-client';
import { formatBaseUnits } from '@gifters/domain';
import {
  activateUserScope,
  loadPublicSnapshot,
  loadUserSnapshot,
  savePublicSnapshot,
  saveUserSnapshot,
} from '@/lib/storage';

type User = { id: string; username: string; role: string; status: string; locale: string };
type Plan = { id: string; name: string; slug: string; usd_reference: string; receipts_required: number; status: string; amount_base_units: string; amount_giv: string; expected_giv: string };
type Dashboard = { user: User; asset: { symbol: string; decimals: number }; balances: { available: string; held: string; withdrawn: string }; points: number; cycles: any[]; notifications: any[]; wallet: any | null };
type Notice = { kind: 'error' | 'ok'; text: string } | null;

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
  const [busy, setBusy] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    const initialUser = localStorage.getItem('sim_user') ?? 'member_01';
    const initialLocale = (localStorage.getItem('locale') as Locale | null) ?? 'en';
    const initialTheme = localStorage.getItem('theme') ?? 'light';
    setUsername(initialUser);
    setLocale(initialLocale === 'fr' ? 'fr' : 'en');
    setTheme(initialTheme === 'dark' ? 'dark' : 'light');
    setPlans(loadPublicSnapshot<Plan[]>('plans') ?? []);
    setManifest(loadPublicSnapshot<any>('manifest'));
    setDash(loadUserSnapshot<Dashboard>(initialUser, 'dashboard'));
    setOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('locale', locale); }, [locale]);

  useEffect(() => {
    activateUserScope(username);
    localStorage.setItem('sim_user', username);
    setDash(loadUserSnapshot<Dashboard>(username, 'dashboard'));
  }, [username]);

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
    api<Plan[]>('/plans', '').then((value) => {
      setPlans(value);
      savePublicSnapshot('plans', value, 5 * 60_000);
    }).catch(() => undefined);
    api<any>('/manifest', '').then((value) => {
      setManifest(value);
      savePublicSnapshot('manifest', value, 5 * 60_000);
    }).catch(() => undefined);
  }, [online]);

  async function refresh() {
    if (!username) return;
    if (!online) {
      const cached = loadUserSnapshot<Dashboard>(username, 'dashboard');
      if (cached) setDash(cached);
      return;
    }
    try {
      const fresh = await api<Dashboard>('/me/dashboard', username);
      setDash(fresh);
      const safeSnapshot = { ...fresh, wallet: null, notifications: [] } as Dashboard;
      saveUserSnapshot(username, 'dashboard', safeSnapshot, 30 * 60_000);
      setNotice(null);
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof ApiError ? error.code : String(error) });
    }
  }

  useEffect(() => { void refresh(); }, [username, online]);

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
      await Promise.all([refresh(), api<Plan[]>('/plans', '').then(setPlans)]);
      setNotice({ kind: 'ok', text: 'Done' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof ApiError ? error.code : String(error) });
    } finally {
      setBusy(false);
    }
  }

  async function doWithdraw() {
    if (!dash?.wallet) return;
    const gross = Math.round(Number(withdraw) * 100).toString();
    await act(async () => {
      const quote: any = await mutation('/me/withdrawals/quotes', username, { gross_base_units: gross });
      await mutation(`/me/withdrawals/${quote.id}/confirm`, username, {});
    });
  }

  if (!dash || !manifest) return <main className="center">{t.loading}</main>;

  return (
    <div className="app">
      {!online && <div className="offline" role="status">{t.offline}</div>}
      <header className="topbar">
        <div><div className="brand">🎁 {t.brand}</div><div className="tagline">{t.tagline}</div></div>
        <div className="top-actions">
          <span className="env">{t.simulation}</span>
          <select aria-label={t.chooseUser} value={username} onChange={(event) => setUsername(event.target.value)}>
            {users.map((user) => <option key={user.id} value={user.username}>{user.username} · {user.role} · {user.status}</option>)}
          </select>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '☾' : '☀'}</button>
          <button onClick={() => setLocale(locale === 'en' ? 'fr' : 'en')}>{locale.toUpperCase()}</button>
        </div>
      </header>

      {manifest.activity_statements?.length > 0 && <div className="ticker" aria-live="polite">{manifest.activity_statements[ticker]}</div>}
      {notice && <div className={`notice ${notice.kind}`}>{notice.text}</div>}

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
            <div className="withdraw-row"><input aria-label={t.withdrawAmount} type="number" min="0.01" step="0.01" value={withdraw} onChange={(event) => setWithdraw(event.target.value)} /><button className="primary" disabled={busy || !online} onClick={doWithdraw}>{t.withdraw}</button></div>
          </> : <button className="primary" disabled={busy || dash.user.status !== 'active' || !online} onClick={() => act(() => mutation('/me/wallets/simulate', username, {}))}>{t.linkWallet}</button>}
        </section>

        <section><h2>{t.notifications}</h2><div className="stack">{dash.notifications.map((item) => <article className="card note" key={item.id}><strong>{item.title_key.replaceAll('_', ' ')}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString(locale)}</small></article>)}</div></section>

        {dash.user.role === 'admin' && <section><h2>{t.admin}</h2><div className="card admin-grid">
          <div><h3>Plans</h3>{plans.map((plan) => <div className="admin-row" key={plan.id}><span>{plan.name} · {plan.status}</span><div><button disabled={busy || plan.status === 'active'} onClick={() => act(() => mutation(`/admin/plans/${plan.id}/activate`, username, {}))}>{t.activate}</button><button onClick={async () => setQueue(await api(`/admin/queue/${plan.id}`, username))}>{t.queue}</button></div></div>)}</div>
          <div><h3>Ledger</h3><button onClick={async () => { const result: any = await api('/admin/reconcile', username); setNotice({ kind: result.balanced ? 'ok' : 'error', text: result.balanced ? t.balanced : `${result.imbalanced_journals.length} imbalanced` }); }}>{t.reconcile}</button>{queue && <pre className="queue">{JSON.stringify(queue, null, 2)}</pre>}</div>
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
