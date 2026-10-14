"use client";
import {errorMessage} from "@/lib/error-messages";
import {loadSession} from '@/lib/auth-client';
import {rememberPayment,pendingPayment,forgetPayment,beginPayment,endPayment} from '@/lib/payment-receipts';
import { useEffect, useState, useRef } from "react";
import {
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
const AuthPanel=dynamic(()=>import('./auth-panel'),{ssr:false});
import type {BotProof} from "./bot-check";
import dynamic from "next/dynamic";
const BotCheck=dynamic(()=>import("./bot-check"));
const NativeAdmin = dynamic(() => import("./native-admin"));
const AdminPanel = dynamic(() => import("./admin-panel"));
import { formatBaseUnits, decimalToBaseUnits } from "@gifters/domain";
import type { NativeCurrency, PreparedPayment } from "@/lib/native-wallet";
type Catalog = {
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
    version_id?: string;
  }[];
};
export default function NativePortal() {
  const [locale, setLocale] = useState<Locale>("en"),
    [session, setSession] = useState<SessionResult | null>(null),
    [catalog, setCatalog] = useState<Catalog | null>(null),
    [manifest, setManifest] = useState<any>(null),
    [data, setData] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [botReady,setBotReady]=useState(false),[botProof,setBotProof]=useState<BotProof|undefined>(),[botReset,setBotReset]=useState(0);
  const [payment, setPayment] = useState<PreparedPayment | null>(null),
    [sentHash,setSentHash]=useState(''),
    [existingInvoice,setExistingInvoice]=useState(''),[existingHash,setExistingHash]=useState(''),
    [withdrawal, setWithdrawal] = useState<any>(null),
    [gross, setGross] = useState("");
  const current = useRef<SessionResult | null>(null),
    financialFlight = useRef(false),
    epoch = useRef(0),
    mounted = useRef(true),
    user = session?.user ?? null,
    fr = locale === "fr",
    t = copy[locale];
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
      api<any>("/manifest", ""),
      api<Catalog>("/crypto/catalog", ""),
      loadSession(),
    ])
      .then(([m, c, s]) => {
        if (mounted.current && epoch.current === active) {
          setManifest(m);
          setCatalog(c);
          receive(s);
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
  async function load() {
    if (!user || session?.requires_mfa || user.status === "pending_consent")
      return;
    const active = epoch.current;
    try {
      const result = await api<any>("/me/crypto", user.username);
      if (mounted.current && epoch.current === active) setData(result);
    } catch (error) {
      if (epoch.current === active) setNotice(errorMessage(error,locale));
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
        { plan_id: plan.id, asset_key: currency.key,...(botProof?{bot_proof:botProof}:{}) },
      );
      if (epoch.current !== active) return;
      const prepared = await mutation<PreparedPayment>(
        "/gifts/crypto/prepare",
        owner,
        { invoice_id: invoice.id },
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
      const value = await mutation<any>(
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
  async function recoverWithdrawal(row: any, requote: boolean) {
    if (!user) return;
    const active = epoch.current,
      owner = user.username;
    await financial(async () => {
      const value = await mutation<any>(
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
      <h1>{fr ? "Portefeuille de test" : "Testnet wallet"}</h1>
      <p>
        {fr
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
        environment={session?.environment}
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
          {catalog?.plans
            .filter((plan) => plan.status === "active")
            .map((plan) => (
              <article className="card" key={plan.version_id ?? plan.id}>
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
                <button
                  disabled={
                    busy || !botReady || !catalog.execution_enabled || !navigator.onLine
                  }
                  onClick={() => void quoteGift(plan)}
                >
                  {fr ? "Vérifier le paiement" : "Review payment"}
                </button>
              </article>
            ))}
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
              <p className="wallet-address">{payment.destination}</p>
              <button
                disabled={busy || !navigator.onLine}
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
                (data?.balances ?? []).some(
                  (row: any) =>
                    row.asset_id === asset.id && BigInt(row.amount) !== 0n,
                ),
            )
            .map((currency) => {
              const wallet = data?.wallets?.find(
                  (row: any) => row.network === currency.network,
                ),
                balance = data?.balances?.find(
                  (row: any) =>
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
                  {balance?.under_review&&<p role="status">{fr?"Monnaie en cours de révision réseau. Les soldes sont conservés.":"Currency under chain review. Balances are retained."}</p>}
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
                            {new Date(wallet.cooling_until).toLocaleString(
                              locale,
                            )}
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
                      !catalog.execution_enabled ||
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
          {data?.cycles?.map((row: any) => (
            <article className="card" key={row.id}>
              <h2>
                {row.name} · {row.asset} · {row.network}
              </h2>
              <p>
                {t.credited}: {row.credited_count}/{row.receipts_required} ·{" "}
                {row.status}
              </p>
              {row.under_review&&<p>{fr?"Financement sous révision — position historique conservée.":"Funding under review — historical position retained."}</p>}
              {row.display_position && (
                <p>
                  {t.position}: {row.display_position}
                </p>
              )}
            </article>
          ))}
          {data?.withdrawals?.map((row: any) => (
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
