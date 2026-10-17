"use client";
import {useCurrencyPreview} from './use-currency-preview';
import {currencyCopy} from '@/lib/currency-copy';
import {formatDisplayDate} from '@/lib/display-time';
import {useDisplayTimeZone} from './appearance-provider';
import ProfileDisclosure from './profile-disclosure';
import {latestPublicManifest} from '@/lib/profile-state';
import type {ProfilePresentation,PublicQueueDisclosure,PlanFinancialPresentation} from '@/server/presentation';
import type {PublicManifestDto,NativePortfolioDto,NativeWithdrawalQuote,NativeWithdrawalReview,NativeWithdrawalRow} from '@/lib/financial-contracts';
import type {MemberRecord} from '@/lib/member-records';
import {useAppearance,useNavigationIdentity} from './appearance-provider';
import {errorMessage} from "@/lib/error-messages";
import {loadSession} from '@/lib/auth-client';
import {rememberPayment,pendingPayment,forgetPayment,beginPayment,endPayment} from '@/lib/payment-receipts';
import { useEffect, useState, useRef } from "react";
import {
  ApiError,
  api,
  mutation,
  clientSessionMatches,
  setClientSession,
} from "@/lib/api-client";
import { copy, type Locale } from "@/lib/i18n";
import type { AuthUser, SessionResult } from "@/lib/auth-client";
import {
  activateUserScope,
  activeSessionGeneration,
  clearActiveUserScope,
} from "@/lib/storage";
const ScopedSnapshotPoll=dynamic(()=>import('./scoped-snapshot-poll'),{ssr:false});
const NotificationInbox=dynamic(()=>import('./notification-inbox'),{ssr:false});
const MemberRecords=dynamic(()=>import('./member-records'),{ssr:false});
const NativeWalletSummary=dynamic(()=>import('./native-wallet-summary'),{ssr:false});
const AuthPanel=dynamic(()=>import('./auth-panel'),{ssr:false});
import type {BotProof} from "./bot-check";
import dynamic from "next/dynamic";
const BotCheck=dynamic(()=>import("./bot-check"));
const NativeAdmin = dynamic(() => import("./native-admin"));
const AdminPanel = dynamic(() => import("./admin-panel"));
import { formatBaseUnits, decimalToBaseUnits } from "@gifters/domain";
import type { NativeCurrency, PreparedPayment } from "@/lib/native-wallet";
type Catalog = {
  profile_revision:number;presentation?:ProfilePresentation;
  mode: string;
  execution_enabled: boolean;
  assets: NativeCurrency[];
  plans: {
    id: string;
    name: string;
    asset_id: string;
    asset: string;
    network: string;
    decimals: number;
    amount_base_units: string;
    receipts_required: number;
    status: string;
    version_id?: string;profile_revision?:number;queue_disclosure?:PublicQueueDisclosure|null;plan?:PlanFinancialPresentation;
  }[];
};
export default function NativePortal({environment='testnet'}:{environment?:'testnet'|'mainnet'}) {
 const timeZone=useDisplayTimeZone();
  const {locale,setLocale}=useAppearance();
  const [session, setSession] = useState<SessionResult | null>(null),
    [catalog, setCatalog] = useState<Catalog | null>(null),
    [manifest, setManifest] = useState<PublicManifestDto|null>(null),
    [data, setData] = useState<NativePortfolioDto|null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [botReady,setBotReady]=useState(false),[botProof,setBotProof]=useState<BotProof|undefined>(),[botReset,setBotReset]=useState(0);
  const [payment, setPayment] = useState<PreparedPayment | null>(null),
    [sentHash,setSentHash]=useState(''),
    [existingInvoice,setExistingInvoice]=useState(''),[existingHash,setExistingHash]=useState(''),
    [withdrawal, setWithdrawal] = useState<NativeWithdrawalReview|null>(null),
    [gross, setGross] = useState("");
  const current = useRef<SessionResult | null>(null),
    financialFlight = useRef(false),
    readGeneration=useRef(0),
    epoch = useRef(0),
    mounted = useRef(true),
    user = session?.user ?? null,
    fr = locale === "fr",
    t = copy[locale];
  const enabledCurrencies=(catalog?.assets??[]).filter(asset=>asset.enabled);
  const currencyPreview=useCurrencyPreview(enabledCurrencies.map(asset=>asset.id),!!manifest?.feature_gifts&&!!data&&!busy&&!payment&&!withdrawal&&!existingInvoice&&!existingHash&&!data.cycles.some(cycle=>cycle.status!=='completed'||cycle.under_review),manifest?.ui_rotation_policy.currency_seconds??10);
  const giftPlans=manifest?.feature_gifts&&catalog?.profile_revision===manifest?.profile_revision?(catalog?.plans??[]).filter(plan=>plan.status==='active'&&plan.asset_id===currencyPreview.value):[];
  const currencyText=currencyCopy[locale];
  const currencySelector=(position:string)=>enabledCurrencies.length?<section aria-label={currencyText.currency}><label htmlFor={'gift-currency-'+position}>{currencyText.currency}</label><select id={'gift-currency-'+position} value={currencyPreview.value} onChange={event=>currencyPreview.select(event.target.value)}>{enabledCurrencies.map(asset=><option value={asset.id} key={asset.id}>{asset.symbol} · {asset.network}</option>)}</select>{enabledCurrencies.length>1&&<><button aria-pressed={currencyPreview.paused||currencyPreview.reduced} disabled={currencyPreview.reduced} onClick={currencyPreview.toggle}>{currencyPreview.paused||currencyPreview.reduced?currencyText.resume:currencyText.pause}</button><small>{currencyText.idle}</small></>}</section>:null;
  useNavigationIdentity(session?.requires_mfa?null:user);
  function receive(value: SessionResult) {
    epoch.current++;
    const old = current.current;
    current.current = value;
    const changed = value.user
      ? activeSessionGeneration(value.user.username) !== value.generation
      : !!old?.user;
    setClientSession(value.user?.username ?? "", value.generation ?? "");
    if (value.user && value.generation)
      activateUserScope(value.user.username, value.generation);
    else if (old?.user) clearActiveUserScope(old.user.username, old.generation);
    if (changed && typeof BroadcastChannel === "function") {
      const channel = new BroadcastChannel("gw-session-scope-v1");
      channel.postMessage({
        type: "GW_SCOPE",
        owner: value.user?.username ?? "",
        generation: value.generation ?? "",
      });
      channel.close();
    }
    setData(null);
    const retained=value.user?pendingPayment(value.user.id):null;
    setPayment(retained?.prepared??null);setSentHash(retained?.hash??'');
    setWithdrawal(null);
    setGross("");
    setExistingInvoice('');setExistingHash('');
    setBotReady(false);setBotProof(undefined);setBotReset(v=>v+1);
    setNotice("");
    setBusy(false);
    setSession(value);
  }
  useEffect(() => {
    mounted.current = true;
    const active = ++epoch.current;
    void Promise.all([
      api<PublicManifestDto>("/manifest", ""),
      api<Catalog>("/crypto/catalog", "").catch(()=>null),
      loadSession(),
    ])
      .then(([m, c, s]) => {
        if (mounted.current && epoch.current === active) {
          setManifest(old=>latestPublicManifest(old,m));
          setCatalog(c??{mode:s.environment??m.payment_environment??"unavailable",profile_revision:0,execution_enabled:false,assets:[],plans:[]});
          receive(s);
          if(!c)setNotice(t.error);
        }
      })
      .catch(() => {
        if (mounted.current && epoch.current === active) setNotice(t.error);
      });
    const changed = () => {
      const version = ++epoch.current;
      setData(null);
      setSession(null);
      setPayment(null);
      setWithdrawal(null);
      setGross("");
      setBotReady(false);setBotProof(undefined);setBotReset(v=>v+1);
      setNotice("");
      setBusy(false);
      void loadSession()
        .then((value) => {
          if (mounted.current && epoch.current === version) receive(value);
        })
        .catch(() => {
          if (mounted.current && epoch.current === version)
            receive({ user: null, provider: "google" });
        });
    };
    const storage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === "gw:v3:active-user" ||
        event.key === "gw:v3:active-session"
      )
        changed();
    };
    const channel =
      typeof BroadcastChannel === "function"
        ? new BroadcastChannel("gw-session-scope-v1")
        : null;
    if (channel) channel.onmessage = () => changed();
    window.addEventListener("storage", storage);
    window.addEventListener("gw:identity", changed);
    return () => {
      mounted.current = false;
      epoch.current++;
      window.removeEventListener("gw:identity", changed);
      window.removeEventListener("storage", storage);
      channel?.close();
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  function applyPortfolio(value:NativePortfolioDto){setData(value);if(value.manifest)setManifest(old=>old?latestPublicManifest(old,{...old,...value.manifest}):old);if(value.user)setSession(old=>old?.user?{...old,user:{...old.user,...value.user}}:old);}
  async function load() {
    if (!user || session?.requires_mfa || user.status === "pending_consent")
      return;
    const active = epoch.current,serial=++readGeneration.current;
    try {
      const result = await api<NativePortfolioDto>("/me/crypto", user.username);
      if (mounted.current && epoch.current === active&&serial===readGeneration.current) applyPortfolio(result);
    } catch (error) {
      if (epoch.current === active&&serial===readGeneration.current) setNotice(errorMessage(error,locale));
    }
  }
  useEffect(() => {
    setData(null);
    void load();
  }, [user?.id, session?.generation, session?.requires_mfa]);
  async function link(currency: NativeCurrency) {
    if (!user || !session?.generation || !navigator.onLine) return;
    const active = epoch.current,
      owner = user.username,
      generation = session.generation,
      valid = () =>
        mounted.current &&
        epoch.current === active &&
        clientSessionMatches(owner, generation);
    setBusy(true);
    setNotice("");
    try {
      const wallet = await import("@/lib/native-wallet"),
        address = await wallet.connectNativeWallet(currency);
      if (!valid()) return;
      const challenge = await mutation<{
        id: string;
        message: string;
        network: string;
      }>("/me/wallets/challenge", owner, {
        asset_key: currency.key,
        address,
        session_generation: generation,
      });
      if (!valid()) return;
      if (challenge.network !== currency.network)
        throw new Error("WRONG_NETWORK");
      const signature = await wallet.signNativeOwnership(
        currency,
        address,
        challenge.message,
      );
      if (!valid()) return;
      await mutation("/me/wallets/proof", owner, {
        challenge_id: challenge.id,
        signature,
      });
      if (valid()) {
        setNotice(
          fr
            ? "Adresse vérifiée. Aucun transfert effectué."
            : "Address verified. No transfer was made.",
        );
        await load();
      }
    } catch {
      if (valid())
        setNotice(
          fr
            ? "La connexion ou la preuve a échoué. Aucun transfert n’a été demandé."
            : "Connection or proof failed. No transfer was requested.",
        );
    } finally {
      if (valid()) setBusy(false);
    }
  }
  useEffect(()=>{let active=true;const controller=new AbortController();const pull=()=>{if(!navigator.onLine||document.visibilityState!=='visible')return;void Promise.all([api<PublicManifestDto>('/manifest','',{signal:controller.signal}),api<Catalog>('/crypto/catalog','',{signal:controller.signal})]).then(([m,c])=>{if(!active)return;setManifest(old=>latestPublicManifest(old,m));setCatalog(c);}).catch(()=>{});};const interval=manifest?.presentation?.client_poll_seconds??60;const timer=setInterval(pull,(Number.isSafeInteger(interval)&&interval>=15&&interval<=300?interval:60)*1000);addEventListener('gw:profile-changed',pull);return()=>{active=false;controller.abort();clearInterval(timer);removeEventListener('gw:profile-changed',pull);};},[manifest?.presentation?.client_poll_seconds]);
  async function financial(action: () => Promise<void>, safeRecovery=false) {
    if (!user || (!catalog?.execution_enabled&&!safeRecovery) || !navigator.onLine || busy || financialFlight.current) return;
    financialFlight.current=true;
    const active = epoch.current;
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      if (mounted.current && epoch.current === active)setNotice(errorMessage(error,locale));
    } finally {
      financialFlight.current=false;
      if (epoch.current === active) setBusy(false);
    }
  }
  async function quoteGift(plan: Catalog["plans"][number]) {
    if (!user || !session?.generation) return;
    const active = epoch.current,
      owner = user.username;
    await financial(async () => {
      const currency = catalog!.assets.find((v) => v.id === plan.asset_id)!;
      const invoice = await mutation<{ id: string }>(
        "/gifts/crypto/invoices",
        owner,
        { plan_id: plan.id, asset_key: currency.key,profile_revision:manifest?.profile_revision,...(botProof?{bot_proof:botProof}:{}) },
      );
      if (epoch.current !== active) return;
      const prepared = await mutation<PreparedPayment>(
        "/gifts/crypto/prepare",
        owner,
        { invoice_id: invoice.id,profile_revision:manifest?.profile_revision },
      );
      if (epoch.current === active) {setPayment(prepared);setBotReset(v=>v+1);}
    });
  }
  async function pay() {
    if (!user || !payment) return;
    const active = epoch.current,
      owner = user.username,
      prepared = payment,
      currency = catalog!.assets.find((v) => v.key === prepared.asset_key)!;
    await financial(async () => {
      const wallet = await import("@/lib/native-wallet");
      if (epoch.current !== active) return;
      beginPayment(user.id);
      try{
      const retained=pendingPayment(user.id);
      if(retained&&retained.prepared.invoice_id!==prepared.invoice_id)throw new ApiError('VERSION_CONFLICT');
      if(!retained){const valid=await mutation<{invoice_id:string;profile_revision:number;sender:string;destination:string;amount_base_units:string}>('/gifts/crypto/validate',owner,{invoice_id:prepared.invoice_id,profile_revision:prepared.profile_revision});if(epoch.current!==active)return;if(valid.sender!==prepared.sender||valid.destination!==prepared.destination||valid.amount_base_units!==prepared.amount_base_units)throw new ApiError('VERSION_CONFLICT');}
      const hash = retained?.prepared.invoice_id===prepared.invoice_id?retained.hash:await wallet.sendNativePayment(
        currency,
        prepared,
        () =>
          mounted.current &&
          epoch.current === active &&
          clientSessionMatches(owner, session!.generation!),
      );
      rememberPayment(user.id,prepared,hash);
      if (epoch.current !== active) return;
      setSentHash(hash);
      await mutation("/gifts/crypto/transaction", owner, {
        invoice_id: prepared.invoice_id,
        tx_hash: hash,
        event_index: -1,
      });
      if (epoch.current === active) {
        forgetPayment(user.id,prepared.invoice_id);setSentHash('');
        setPayment(null);
        setNotice(
          fr
            ? "Paiement soumis — confirmation réseau en attente."
            : "Payment submitted — awaiting network confirmation.",
        );
        await load();
      }
      }finally{endPayment(user.id);}
    },!!sentHash);
  }
  async function cancelPayment(){
    if(!user||!payment||sentHash)return;
    const id=payment.invoice_id,active=epoch.current;
    await financial(async()=>{await mutation('/gifts/crypto/cancel',user.username,{invoice_id:id});if(epoch.current===active)setPayment(null)},true);
  }
  async function submitExisting(){
    if(!user||!existingInvoice||!existingHash)return;
    const active=epoch.current;
    await financial(async()=>{await mutation('/gifts/crypto/transaction',user.username,{invoice_id:existingInvoice.trim(),tx_hash:existingHash.trim(),event_index:-1});if(active===epoch.current){setExistingInvoice('');setExistingHash('');await load()}},true);
  }
  async function quoteWithdrawal(currency: NativeCurrency) {
    if (!user) return;
    const active = epoch.current,
      owner = user.username;
    await financial(async () => {
      const value = await mutation<NativeWithdrawalQuote>(
        "/me/withdrawals/crypto/quotes",
        owner,
        {
          asset_key: currency.key,
          gross_base_units: decimalToBaseUnits(
            gross,
            currency.decimals,
          ).toString(),
        },
      );
      if (epoch.current === active)
        setWithdrawal({
          ...value,
          decimals: currency.decimals,
          symbol: currency.symbol,
          network: currency.network,
        });
    });
  }
  async function confirmWithdrawal() {
    if (!user || !withdrawal) return;
    const active = epoch.current,
      owner = user.username,
      id = withdrawal.id;
    await financial(async () => {
      await mutation("/me/withdrawals/crypto/confirm", owner, {
        obligation_id: id,
      });
      if (epoch.current === active) {
        setWithdrawal(null);
        setGross("");
        await load();
      }
    });
  }
  async function recoverWithdrawal(row: NativeWithdrawalRow|MemberRecord, requote: boolean) {
    if (!user) return;
    const active = epoch.current,
      owner = user.username;
    await financial(async () => {
      const value = await mutation<NativeWithdrawalQuote>(
        requote
          ? "/me/withdrawals/crypto/requote"
          : "/me/withdrawals/crypto/cancel",
        owner,
        { obligation_id: row.id },
      );
      if (epoch.current !== active) return;
      if (requote)
        setWithdrawal({
          ...value,
          decimals: row.decimals,
          symbol: row.asset,
          network: row.network,
        });
      await load();
    },!requote);
  }
  return (
    <main className="app account-portal">
      <nav aria-label={t.navigation}>
        <a href="/">{t.brand}</a>
        {manifest?.feature_gifts && <a href="/gifts">{t.gifts}</a>}
        {manifest?.feature_wallets && (!user || ["active","deactivated"].includes(user.status)) && <a href="/wallet/crypto">{t.wallet}</a>}
        {user && <a href="/settings/account">{t.accountSecurity}</a>}
        {manifest?.feature_help && <a href="/help">{t.help}</a>}
        <button onClick={() => setLocale(fr ? "en" : "fr")}>
          {locale.toUpperCase()}
        </button>
      </nav>
      <h1>{environment==="mainnet"?(fr?"Portefeuille":"Wallet"):(fr ? "Portefeuille de test" : "Testnet wallet")}</h1>
      <p>
        {environment==="mainnet"?(fr?"Les paiements utilisent de vraies monnaies. Vérifiez la monnaie, le réseau, le destinataire et les frais.":"Payments use real money. Check the currency, network, recipient and fees."):fr
          ? "Les monnaies et les soldes ci-dessous sont identifiés par réseau de test."
          : "Currencies and balances below identify their test network."}
      </p>
      <p role="status">{notice}</p>
      {!catalog?.execution_enabled && (
        <p className="card">
          {fr
            ? "Les transferts sont actuellement indisponibles. Vos soldes sont conservés."
            : "Transfers are currently unavailable. Existing balances are preserved."}
        </p>
      )}
      <AuthPanel
        environment={session?.environment??environment}
        scope={session?.generation}
        locale={locale}
        user={user}
        requiresMfa={session?.requires_mfa ?? false}
        provider={session?.provider ?? "google"}
        accounts={[]}
        manifest={manifest}
        onSession={receive}
      />
      {user && !session?.requires_mfa && ["active","deactivated"].includes(user.status) && (
        <>
          {session?.generation&&manifest?.feature_wallets&&manifest?.entitlements_member?.dashboard!==false&&<ScopedSnapshotPoll owner={user.username} generation={session.generation} path="/me/crypto" seconds={manifest.presentation?.transparent?manifest.presentation.client_poll_seconds:manifest.cache_policy.client_poll_seconds} enabled={!busy} locale={locale} onStart={()=>++readGeneration.current} onValue={(value,token)=>{if(token===readGeneration.current&&value.user?.username===user.username)applyPortfolio(value)}} onError={(error,token)=>{if(token===readGeneration.current&&error instanceof ApiError&&['UNAUTHENTICATED','ACCOUNT_RESTRICTED'].includes(error.code)){setData(null);if(error.code==='UNAUTHENTICATED')receive({user:null,requires_mfa:false,provider:session.provider})}}}/>}
          {data&&manifest?.feature_notifications&&<NotificationInbox key={user.username+session?.generation} user={user.username} locale={locale} initial={data.notifications??[]} badge={!!data.notification_badge?.has_new} onChange={()=>void load()}/>}

          {user.role === "admin" && (
            <>
              <AdminPanel
                key={session?.generation + ":settings"}
                user={user.username}
                locale={locale}
                plans={catalog?.plans ?? []}
                enabled={!!manifest?.feature_admin}
                priorityEnabled={!!manifest?.feature_priority}
                helpEnabled={!!manifest?.feature_help}
              />
              <NativeAdmin
                key={session?.generation + ":native"}
                owner={user.username}
                locale={locale}
                assets={catalog?.assets ?? []}
                enabled={!!manifest?.feature_admin}
              />
            </>
          )}
          {manifest?.feature_gifts && user.status === "active" && session?.generation && <BotCheck owner={user.username} generation={session.generation} surface="suspicious_checkout" locale={locale} reset={botReset} onReady={(ready,value)=>{setBotReady(ready);setBotProof(value)}}/>}
          {catalog?.profile_revision!==manifest?.profile_revision&&<p role="status">{fr?'Actualisation des informations des dons…':'Updating gift information…'}</p>}
          {manifest?.feature_gifts&&currencySelector('top')}
          {manifest?.feature_gifts&&<nav className="gift-tiles" aria-label={fr?'Dons':'Gifts'}>{giftPlans.map(plan=><button id={'gift-tile-'+(plan.version_id??plan.id)} className="gift-tile" key={plan.version_id??plan.id} onClick={()=>{const card=document.getElementById('gift-card-'+(plan.version_id??plan.id));card?.scrollIntoView({block:'start'});card?.focus({preventScroll:true})}}><span aria-hidden="true">🎁</span><strong>{plan.name}</strong><strong>{formatBaseUnits(BigInt(plan.amount_base_units),plan.decimals)} {plan.asset}</strong>{plan.plan&&<small>{manifest.presentation?.transparent?currencyText.potential:currencyText.expected}: ${plan.plan.estimated_reference_usd}</small>}</button>)}</nav>}
          {manifest?.feature_gifts&&enabledCurrencies.length>0&&!giftPlans.length&&<p>{currencyText.empty}</p>}
          {giftPlans.map((plan) => (
              <article id={'gift-card-'+(plan.version_id??plan.id)} tabIndex={-1} className="card" key={plan.version_id ?? plan.id}>
                <h2>
                  {plan.name} · {plan.asset} · {plan.network}
                </h2>
                <p>
                  {formatBaseUnits(
                    BigInt(plan.amount_base_units),
                    plan.decimals,
                  )}{" "}
                  {plan.asset}
                </p>
                <ProfileDisclosure presentation={manifest?.presentation} locale={locale} queue={plan.queue_disclosure} plan={plan.plan}/>
                <button
                  disabled={
                    busy || catalog?.profile_revision!==manifest?.profile_revision || !botReady || !catalog?.assets.find(asset=>asset.id===plan.asset_id)?.execution_enabled || !navigator.onLine
                  }
                  onClick={() => void quoteGift(plan)}
                >
                  {fr ? "Vérifier le paiement" : "Review payment"}
                </button>
                <button onClick={()=>{const tile=document.getElementById('gift-tile-'+(plan.version_id??plan.id));tile?.scrollIntoView({block:'center'});tile?.focus({preventScroll:true})}}>{currencyText.back}</button>
              </article>
            ))}
          {manifest?.feature_gifts&&currencySelector('bottom')}
          {payment && (
            <section
              className="card"
              aria-label={fr ? "Vérification du paiement" : "Payment review"}
            >
              <h2>
                {fr ? "Vérifiez avant d’approuver" : "Review before approval"}
              </h2>
              <p>
                {formatBaseUnits(
                  BigInt(payment.amount_base_units),
                  payment.decimals,
                )}{" "}
                {payment.asset} · {payment.network}
              </p>
              <p>
                {t.networkFee}:{" "}
                {formatBaseUnits(
                  BigInt(payment.network_fee_native),
                  payment.native_decimals,
                )}{" "}
                {payment.native_symbol}
              </p>
              <p>
                {fr ? "Création de compte" : "Account setup"}:{" "}
                {formatBaseUnits(
                  BigInt(payment.account_setup_native),
                  payment.native_decimals,
                )}{" "}
                {payment.native_symbol}
              </p>
              <p>
                {fr
                  ? "Payés par votre portefeuille. Aucun cycle avant confirmation du réseau."
                  : "Paid by your wallet. No cycle is admitted before network confirmation."}
              </p>
<ProfileDisclosure presentation={manifest?.presentation} locale={locale} queue={payment.queue_disclosure} plan={payment.plan} mode="checkout"/><p className="wallet-address">{payment.destination}</p>
              <button
                disabled={busy || !navigator.onLine || !sentHash&&payment.profile_revision!==manifest?.profile_revision}
                onClick={() => void pay()}
              >
                {sentHash?(fr?"Soumettre le transfert déjà envoyé":"Submit the transfer already sent"):(fr ? "Approuver dans le portefeuille" : "Approve in wallet")}
              </button>
              {sentHash&&<p className="wallet-address">{sentHash}</p>}
              <button disabled={busy||!!sentHash} onClick={() => void cancelPayment()}>
                {t.cancel}
              </button>
            </section>
          )}
          {withdrawal && (
            <section className="card" aria-label={t.reviewWithdrawal}>
              <h2>{t.reviewWithdrawal}</h2>
              <p>
                {withdrawal.symbol} · {withdrawal.network}
              </p>
              <p>
                {t.gross}:{" "}
                {formatBaseUnits(
                  BigInt(withdrawal.grossBaseUnits),
                  withdrawal.decimals,
                )}
              </p>
              <p>
                {t.networkFee}:{" "}
                {formatBaseUnits(
                  BigInt(
                    withdrawal.feeSnapshot.network_charge_base_units ??
                      withdrawal.chargeBaseUnits,
                  ),
                  withdrawal.decimals,
                )}
              </p>
              <p>
                {fr ? "Création de compte" : "Account setup"}:{" "}
                {formatBaseUnits(
                  BigInt(
                    withdrawal.feeSnapshot.account_setup_charge_base_units ??
                      "0",
                  ),
                  withdrawal.decimals,
                )}
              </p>
              <p>
                {t.net}:{" "}
                {formatBaseUnits(
                  BigInt(withdrawal.netBaseUnits),
                  withdrawal.decimals,
                )}
              </p>
              <p className="wallet-address">{withdrawal.destination}</p>
              <p>
                {fr
                  ? "Une exécution réseau échouée peut consommer des frais approuvés."
                  : "An executed failed attempt can consume approved network fees."}
              </p>
              <button
                disabled={busy || !navigator.onLine}
                onClick={() => void confirmWithdrawal()}
              >
                {t.confirmWithdrawal}
              </button>
              <button disabled={busy} onClick={() => setWithdrawal(null)}>
                {t.cancel}
              </button>
            </section>
          )}
          <section className="card">
            <h2>{fr?'Soumettre un paiement déjà envoyé':'Submit an existing payment'}</h2>
            <p>{fr?'Copiez le hash depuis votre portefeuille. Cette action ne demande aucun nouvel envoi.':'Copy the transaction hash from your wallet. This action requests no new transfer.'}</p>
            <label>{fr?'Identifiant du paiement':'Invoice ID'}<input value={existingInvoice} maxLength={36} onChange={e=>setExistingInvoice(e.target.value)}/></label>
            <label>{fr?'Hash de la transaction':'Transaction hash'}<input value={existingHash} maxLength={128} onChange={e=>setExistingHash(e.target.value)}/></label>
            <button disabled={busy||!navigator.onLine||!existingInvoice||!existingHash} onClick={()=>void submitExisting()}>{fr?'Soumettre le hash':'Submit hash'}</button>
          </section>
          <button disabled={busy} onClick={() => void load()}>
            {fr ? "Actualiser" : "Refresh"}
          </button>
          {catalog?.assets
            .filter(
              (asset) =>
                asset.enabled ||
                (data?.summary ?? []).some((row)=>row.asset_id===asset.id && BigInt(row.withdrawn_net_base_units)!==0n) ||
                (data?.balances ?? []).some(
                  (row) =>
                    row.asset_id === asset.id && BigInt(row.amount) !== 0n,
                ),
            )
            .map((currency) => {
              const wallet = data?.wallets?.find(
                  (row) => row.network === currency.network,
                ),
                summary = data?.summary?.find((row)=>row.asset_id===currency.id),
                balance = data?.balances?.find(
                  (row) =>
                    row.asset_id === currency.id &&
                    row.purpose === "available_payable",
                );
              return (
                <section className="card" key={currency.id}>
                  <h2>
                    {currency.symbol} · {currency.network}
                  </h2>
                  <p>
                    {t.available}:{" "}
                    {formatBaseUnits(
                      BigInt(balance?.amount ?? "0"),
                      currency.decimals,
                    )}{" "}
                    {currency.symbol}
                  </p>
                  <NativeWalletSummary summary={summary} decimals={currency.decimals} symbol={currency.symbol} locale={locale}/>
                  {(balance?.under_review||summary?.under_review)&&<p role="status">{fr?"Monnaie en cours de révision réseau. Les soldes sont conservés.":"Currency under chain review. Balances are retained."}</p>}
                  {wallet ? (
                    <>
                      <p>
                        {fr ? "Adresse vérifiée" : "Verified address"}:{" "}
                        <span className="wallet-address">{wallet.address}</span>
                      </p>
                      {wallet.cooling_until &&
                        new Date(wallet.cooling_until).getTime() >
                          Date.now() && (
                          <p>
                            {fr
                              ? "Modifications en attente jusqu’au"
                              : "Changes cooling until"}{" "}
                            {formatDisplayDate(wallet.cooling_until,locale,timeZone)}
                          </p>
                        )}
                    </>
                  ) : (
                    <p>
                      {fr
                        ? "En attente — aucun portefeuille"
                        : "Pending — No wallet"}
                    </p>
                  )}
                  <button
                    disabled={busy || !navigator.onLine || !currency.enabled}
                    onClick={() => void link(currency)}
                  >
                    {wallet
                      ? fr
                        ? "Changer l’adresse"
                        : "Change address"
                      : fr
                        ? "Connecter et vérifier"
                        : "Connect and verify"}
                  </button>
                  <label>
                    {fr ? "Montant brut à retirer" : "Gross withdrawal amount"}
                    <input
                      value={gross}
                      inputMode="decimal"
                      onChange={(event) => {
                        setGross(event.target.value);
                        setWithdrawal(null);
                      }}
                    />
                  </label>
                  <button
                    disabled={
                      busy ||
                      !currency.execution_enabled ||
                      !wallet ||
                      !currency.enabled ||
                      !gross ||
                      balance?.under_review ||
                      !navigator.onLine
                    }
                    onClick={() => void quoteWithdrawal(currency)}
                  >
                    {t.withdraw}
                  </button>
                </section>
              );
            })}
          {user&&session?.generation&&manifest&&(manifest.feature_gifts||manifest.feature_wallets)&&<MemberRecords key={user.username+session.generation} owner={user.username} generation={session.generation} environment={catalog?.mode==='mainnet'?'mainnet':'testnet'} locale={locale} collections={[...(manifest.feature_gifts?['cycles','invoices'] as const:[]),...(manifest.feature_wallets?['withdrawals'] as const:[])]} history={!!manifest.entitlements_member?.history} disabled={busy} revision={data} onInvoice={row=>setExistingInvoice(row.id)} onCancelInvoice={row=>void financial(async()=>{await mutation('/gifts/crypto/cancel',user.username,{invoice_id:row.id});await load()},true)} onWithdrawal={row=>void recoverWithdrawal(row,false)}/>}
          {data?.cycles?.map((row) => (
            <article className="card" key={row.id}>
              <h2>
                {row.name} · {row.asset} · {row.network}
              </h2>
              <p>
                {t.credited}: {row.credited_count}/{row.receipts_required} ·{" "}
                {row.status}
              </p>
              {row.under_review&&<p>{fr?"Financement sous révision — position historique conservée.":"Funding under review — historical position retained."}</p>}
              <ProfileDisclosure presentation={manifest?.presentation} locale={locale} queue={row.queue_disclosure} mode="cycle"/>
              {row.display_position && (
                <p>
                  {t.position}: {row.display_position}
                </p>
              )}
            </article>
          ))}
          {data?.withdrawals?.map((row) => (
            <article className="card" key={row.id}>
              <p>
                {row.status} · {row.asset} · {row.network}
              </p>
              <p>
                {t.gross}:{" "}
                {formatBaseUnits(BigInt(row.gross_base_units), row.decimals)} ·{" "}
                {fr ? "Coût approuvé" : "Approved charge"}:{" "}
                {formatBaseUnits(BigInt(row.charge_base_units), row.decimals)} ·{" "}
                {t.net}:{" "}
                {formatBaseUnits(BigInt(row.net_base_units), row.decimals)}
              </p>
              {!row.completed_at &&
                [
                  "quoted",
                  "held",
                  "approved",
                  "awaiting_requote",
                  "exception",
                ].includes(row.status) && (
                  <>
                    <button
                      disabled={busy || !navigator.onLine}
                      onClick={() => void recoverWithdrawal(row, false)}
                    >
                      {fr
                        ? "Annuler et récupérer le solde"
                        : "Cancel and recover balance"}
                    </button>
                    <button
                      disabled={busy || !catalog?.execution_enabled}
                      onClick={() => void recoverWithdrawal(row, true)}
                    >
                      {fr
                        ? "Obtenir un nouveau devis"
                        : "Request a fresh quote"}
                    </button>
                  </>
                )}
              {row.completed_at && row.status === "exception" && (
                <p>
                  {fr
                    ? "Échec résolu — solde non dépensé récupéré."
                    : "Failure resolved — unspent balance recovered."}
                </p>
              )}
            </article>
          ))}
        </>
      )}
    </main>
  );
}
