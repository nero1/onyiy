"use client";
import NativeSweepControls from './native-sweep-controls';
import NativeRecoveryControls from './native-recovery-controls';
import type {NativeAdminObligationPage,NativeAdminAlerts,NativeAdminReviews,NativeAdminPlans} from '@/lib/financial-contracts';
import {useLocalizedNotice} from './use-localized-notice';
import AdminTimeZone from './admin-time-zone';

import ChainRecoveryAdmin from "./chain-recovery-admin";
import { decimalToBaseUnits, formatBaseUnits } from "@gifters/domain";
import { useState } from "react";
import { api, mutation, ApiError } from "@/lib/api-client";
import type { Locale } from "@/lib/i18n";
import type { NativeCurrency } from "@/lib/native-wallet";
export default function NativeAdmin({
  owner,
  locale,
  assets,
  enabled,
}: {
  owner: string;
  locale: Locale;
  assets: NativeCurrency[];
  enabled: boolean;
}) {
  const [previousId, setPreviousId] = useState("");
  const [pricingMode,setPricingMode]=useState<'usd_at_activation'|'fixed_token'>('usd_at_activation');
  const [fixedAmount,setFixedAmount]=useState(''),[launchAt,setLaunchAt]=useState('');
  const [obligations, setObligations] = useState<NativeAdminObligationPage['rows']>([]),
    [obligationCursor, setObligationCursor] = useState<string | null>(null);
  const [eventId, setEventId] = useState(""),
    [reviews, setReviews] = useState<NativeAdminReviews['rows']>([]),[reviewCursor,setReviewCursor]=useState<string|null>(null),[reviewView,setReviewView]=useState<'current'|'history'>('current');
  async function loadReviews(cursor?:string){const query=new URLSearchParams({view:reviewView});if(cursor)query.set('cursor',cursor);const page=await api<NativeAdminReviews>('/admin/crypto/reorg?'+query,owner);setReviews(page.rows);setReviewCursor(page.next_cursor);}
  const fr = locale === "fr",
    [reason, setReason] = useState(""),
    [currency, setCurrency] = useState(assets[0]?.key ?? "bnb"),
    [plan, setPlan] = useState(""),
    [revision, setRevision] = useState("1"),
    [plans, setPlans] = useState<NativeAdminPlans>([]),
    [alerts, setAlerts] = useState<NativeAdminAlerts['rows']>([]),
    [alertCursor,setAlertCursor]=useState<string|null>(null),[alertView,setAlertView]=useState<'current'|'history'>('current'),
    [role, setRole] = useState("developer"),
    [obligation, setObligation] = useState(""),
    [message,setMessage]=useLocalizedNotice(locale),
    [busy, setBusy] = useState(false);
  const [activationProbe,setActivationProbe]=useState<{asset_key:string;alert_id:string;configuration_hash:string}|null>(null);
  const keys = [
    "eth",
    "bnb",
    "sol",
    "usdt_bnb",
    "usdt_sol",
    "usdt_tron",
    "jaga_bnb",
    "trx",
  ];
  async function run(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setMessage({copy:{fr:"Action enregistrée.",en:"Action recorded."}});
    } catch (e) {
      setMessage({error:e});
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminTimeZone owner={owner} locale={locale}><section className="card">
      <ChainRecoveryAdmin owner={owner} locale={locale} enabled={enabled}/>
      <h2>
        {fr ? "Administration des paiements" : "Payment administration"}
      </h2>
      <p role="status">{message}</p>
      {!enabled && (
        <p>{fr ? "Aperçu en lecture seule" : "Read-only preview"}</p>
      )}
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            setPlans(await api<NativeAdminPlans>("/admin/plans", owner));
            const alertPage=await api<NativeAdminAlerts>("/admin/crypto/alerts?view="+alertView,owner);setAlerts(alertPage.rows);setAlertCursor(alertPage.next_cursor);
            await loadReviews();
            const page = await api<NativeAdminObligationPage>("/admin/crypto/obligations", owner);
            setObligations(page.rows);
            setObligationCursor(page.next_after);
          })
        }
      >
        {fr ? "Charger les contrôles" : "Load controls"}
      </button>
      <label>
        {fr ? "Monnaie" : "Currency"}
        <select value={currency} onChange={(e) => {setCurrency(e.target.value);setFixedAmount('')}}>
          {keys.map((key) => (
            <option key={key}>{key}</option>
          ))}
        </select>
      </label>
      <label>
        {fr ? "Motif" : "Reason"}
        <input
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <fieldset disabled={busy || !enabled || reason.trim().length < 5}>
        <legend>
          {fr ? "Registre vérifié et plans" : "Verified registry and plans"}
        </legend>
        <p>
          {fr
            ? "L’identité de la monnaie provient du registre vérifié du serveur. Les adresses de la plateforme sont configurées séparément."
            : "Currency identity comes from the verified server registry. Platform addresses are configured separately."}
        </p>
        <button
          onClick={() =>
            void run(() =>
              mutation("/admin/crypto/assets", owner, {
                asset_key: currency,
                enabled: false,
                reason,
              }),
            )
          }
        >
          {fr ? "Préparer désactivé" : "Stage disabled"}
        </button>
        <button
          onClick={() =>
            void run(() =>
              mutation("/admin/crypto/assets", owner, {
                asset_key: currency,
                enabled: true,
                reason,
              }),
            )
          }
        >
          {fr ? "Activer la monnaie vérifiée" : "Enable verified currency"}
        </button>
        <label>
          Plan
          <select
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value);
              setRevision(
                String(
                  plans.find((v) => v.id === e.target.value)?.revision ?? 1,
                ),
              );
            }}
          >
            <option value="">—</option>
            {plans.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {row.status}
              </option>
            ))}
          </select>
        </label>
        <label>{fr?'Prix du plan':'Plan price'}<select value={pricingMode} onChange={event=>setPricingMode(event.target.value as 'usd_at_activation'|'fixed_token')}><option value="usd_at_activation">{fr?'Valeur USD convertie à l’activation':'USD value converted at activation'}</option><option value="fixed_token">{fr?'Montant fixe dans la monnaie choisie':'Fixed amount in the selected currency'}</option></select></label>
        {pricingMode==='fixed_token'&&<label>{fr?'Montant exact du don':'Exact gift amount'}<input inputMode="decimal" maxLength={100} value={fixedAmount} onChange={event=>setFixedAmount(event.target.value)}/><small>{fr?'Le montant est figé pour cette file. Une cotation récente reste nécessaire pour la valeur USD de référence.':'The amount is fixed for this queue. A fresh price is still required for its USD reference.'}</small></label>}
        <button
          disabled={!plan||pricingMode==='fixed_token'&&!fixedAmount.trim()}
          onClick={() =>
            void run(() =>
              mutation("/admin/crypto/plans", owner, {
                asset_key: currency,
                plan_id: plan,
                pricing_mode:pricingMode,
                ...(pricingMode==='fixed_token'?{amount_base_units:decimalToBaseUnits(fixedAmount.trim(),assets.find(asset=>asset.key===currency)?.decimals??-1).toString()}:{}),
                reason,
              }),
            )
          }
        >
          {fr
            ? "Activer le plan pour cette monnaie"
            : "Activate plan for this currency"}
        </button>
        <label>{fr?'Lancement programmé (UTC)':'Scheduled launch (UTC)'}<input type="datetime-local" value={launchAt} onChange={event=>setLaunchAt(event.target.value)}/></label>
        <p>{fr?'Enregistrez d’abord un plan désactivé. Ajoutez chaque monnaie avec la même date. Le prix et les autorisations seront vérifiés au lancement.':'Save a disabled plan first. Add each currency with the same date. Price and approvals will be checked at launch.'}</p>
        <button disabled={!plan||!launchAt||currency==='trx'||pricingMode==='fixed_token'&&!fixedAmount.trim()} onClick={()=>void run(async()=>{
          const result=await mutation<{revision:number}>('/admin/crypto/plans/schedule',owner,{plan_id:plan,revision:Number(revision),
          asset_key:currency,launch_at:new Date(launchAt+'Z').toISOString(),pricing_mode:pricingMode,...(pricingMode==='fixed_token'?{amount_base_units:decimalToBaseUnits(fixedAmount.trim(),assets.find(asset=>asset.key===currency)?.decimals??-1).toString()}:{}),reason});setRevision(String(result.revision));setPlans(await api<NativeAdminPlans>('/admin/plans',owner));
        })}>{fr?'Programmer cette monnaie':'Schedule this currency'}</button>
        <button disabled={!plan} onClick={()=>void run(()=>mutation('/admin/crypto/plans',owner,{asset_key:currency,plan_id:plan,resume_only:true,reason}))}>{fr?'Reprendre le prix existant sans le modifier':'Resume the existing price unchanged'}</button>
      </fieldset>
      <fieldset disabled={busy || !enabled || reason.trim().length < 5}>
        <legend>{fr ? "Règlements" : "Settlements"}</legend>
        <label>
          {fr ? "Bénéficiaire" : "Beneficiary"}
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {[
              "developer",
              "marketing",
              "bootstrap_developer",
              "bootstrap_marketing",
              "bootstrap_platform",
              "bootstrap_custom_bootstrap",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          {fr
            ? "Demande clôturée à relier (facultatif)"
            : "Closed request to link (optional)"}
          <input
            value={previousId}
            onChange={(e) => setPreviousId(e.target.value)}
          />
        </label>
        <label>
          {fr ? "Événement entrant à rembourser" : "Incoming event to refund"}
          <input value={eventId} onChange={(e) => setEventId(e.target.value)} />
        </label>
        <button
          disabled={!eventId}
          onClick={() =>
            void run(() =>
              mutation("/admin/crypto/refunds", owner, {
                event_id: eventId,
                previous_obligation_id: previousId || undefined,
                reason,
              }),
            )
          }
        >
          {fr
            ? "Préparer le remboursement au payeur d’origine"
            : "Prepare refund to original payer"}
        </button>
        <button
          onClick={() =>
            void run(() =>
              mutation("/admin/crypto/business", owner, {
                asset_key: currency,
                role,
                previous_obligation_id: previousId || undefined,
                reason,
              }),
            )
          }
        >
          {fr ? "Préparer le règlement" : "Prepare settlement"}
        </button>
        <label>
          {fr ? "Identifiant de demande" : "Obligation ID"}
          <input
            value={obligation}
            onChange={(e) => setObligation(e.target.value)}
          />
        </label>
        <button
          disabled={!obligation}
          onClick={() =>
            void run(() =>
              mutation("/admin/crypto/approve", owner, {
                obligation_id: obligation,
                reason,
              }),
            )
          }
        >
          {fr ? "Approuver une demande retenue" : "Approve held request"}
        </button>
        <button
          onClick={() =>
            void run(async() =>{
              const result=await mutation<{alert_id:string;configuration_hash:string}>("/admin/crypto/alert-probe", owner, {
                asset_key: currency,
              });setActivationProbe({...result,asset_key:currency});
            })
          }
        >
          {fr ? "Vérifier le canal d’alerte" : "Check alert channel"}
        </button>
        {activationProbe&&<section aria-label={fr?'Configuration à vérifier':'Configuration to review'}><p>{activationProbe.asset_key} · {fr?'Alerte':'Alert'}: {activationProbe.alert_id}</p><label>{fr?'Empreinte de configuration':'Configuration hash'}<input readOnly value={activationProbe.configuration_hash} onFocus={event=>event.currentTarget.select()}/></label><p>{fr?'Attendez l’accusé de réception signé avant de copier cette empreinte dans les approbations du déploiement.':'Wait for the signed delivery acknowledgement before copying this hash into the deployment approvals.'}</p></section>}
      </fieldset>
      <NativeRecoveryControls key={'recovery:'+owner+':'+currency} owner={owner} locale={locale} assets={assets} currency={currency} reason={reason} busy={busy} enabled={enabled} run={run}/>
      <label>{fr?'Vue des révisions de finalité':'Finality review view'}<select value={reviewView} disabled={busy} onChange={event=>{setReviewView(event.target.value as 'current'|'history');setReviews([]);setReviewCursor(null);}}><option value="current">{fr?'Non résolues':'Unresolved'}</option><option value="history">{fr?'Tout l’historique':'All history'}</option></select></label>
      <button disabled={busy} onClick={()=>void run(()=>loadReviews())}>{fr?'Actualiser les révisions / première page':'Refresh reviews / first page'}</button>
      {reviewCursor&&<button disabled={busy} onClick={()=>void run(()=>loadReviews(reviewCursor))}>{fr?'Révisions suivantes':'Next reviews'}</button>}
      <fieldset disabled={busy || !enabled || reason.trim().length < 10}>
        <legend>{fr ? "Révision de finalité" : "Finality review"}</legend>
        <p>
          {fr
            ? "Une disparition seule ne suffit pas. Deux fournisseurs doivent prouver le remplacement du bloc finalisé. Les soldes et l’historique sont conservés."
            : "Absence alone is insufficient. Two providers must prove replacement of the finalized block. Balances and history are retained."}
        </p>
        <label>
          {fr ? "Identifiant de l’événement entrant" : "Incoming event ID"}
          <input value={eventId} onChange={(e) => setEventId(e.target.value)} />
        </label>
        <button
          disabled={!eventId}
          onClick={() =>
            void run(async () => {
              await mutation("/admin/crypto/reorg", owner, {
                event_id: eventId,
                reason,
              });
              await loadReviews();
            })
          }
        >
          {fr ? "Vérifier et ouvrir la révision" : "Verify and open review"}
        </button>
        {reviews.map((row) => (
          <article key={row.review_id}>
            <p>
              {row.event_id} · {row.amount_base_units} ·{" "}
              {row.resolved_at
                ? fr
                  ? "Reconfirmé"
                  : "Reconfirmed"
                : fr
                  ? "Monnaie suspendue"
                  : "Currency paused"}
            </p>
            {!row.resolved_at && (
              <button
                onClick={() =>
                  void run(async () => {
                    await mutation("/admin/crypto/reorg/reconfirm", owner, {
                      review_id: row.review_id,
                      reason,
                    });
                    await loadReviews();
                  })
                }
              >
                {fr ? "Vérifier la reconfirmation" : "Verify reconfirmation"}
              </button>
            )}
          </article>
        ))}
      </fieldset>
      <NativeSweepControls key={'sweep:'+owner+':'+currency} owner={owner} locale={locale} assets={assets} currency={currency} reason={reason} busy={busy} enabled={enabled} run={run}/>
      <section className="card">
        <h3>{fr ? "Demandes financières" : "Financial requests"}</h3>
        {obligations.map((row) => (
          <article key={row.id}>
            <p>
              {row.kind} · {row.asset} · {row.network} · {row.status}
            </p>
            <p>
              {formatBaseUnits(BigInt(row.gross_base_units), row.decimals)} →{" "}
              {formatBaseUnits(BigInt(row.net_base_units), row.decimals)}{" "}
              {row.asset}
            </p>
            <p className="wallet-address">{row.destination}</p>
            <small>{row.id}</small>
            {!row.completed_at && ["business", "refund", "unallocated_refund"].includes(row.kind) && (
              <button
                disabled={busy || !enabled || reason.trim().length < 10}
                onClick={() =>
                  void run(async () => {
                    await mutation("/admin/crypto/operational/recover", owner, {
                      obligation_id: row.id,
                      reason,
                    });
                    const page = await api<NativeAdminObligationPage>(
                      "/admin/crypto/obligations",
                      owner,
                    );
                    setObligations(page.rows);
                    setObligationCursor(page.next_after);
                  })
                }
              >
                {fr
                  ? "Récupérer si non signé ou positivement résolu"
                  : "Recover if unsigned or positively resolved"}
              </button>
            )}
          </article>
        ))}
        {obligationCursor && (
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const page = await api<NativeAdminObligationPage>(
                  "/admin/crypto/obligations?after=" +
                    encodeURIComponent(obligationCursor),
                  owner,
                );
                setObligations(page.rows);
                setObligationCursor(page.next_after);
              })
            }
          >
            {fr ? "Page suivante" : "Next page"}
          </button>
        )}
      </section>
      <label>{fr?'Vue des alertes':'Alert view'}<select value={alertView} disabled={busy} onChange={event=>{setAlertView(event.target.value as 'current'|'history');setAlerts([]);setAlertCursor(null);}}><option value="current">{fr?'Non résolues':'Unresolved'}</option><option value="history">{fr?'Tout l’historique':'All history'}</option></select></label>
      <button disabled={busy} onClick={()=>void run(async()=>{const page=await api<NativeAdminAlerts>('/admin/crypto/alerts?view='+alertView,owner);setAlerts(page.rows);setAlertCursor(page.next_cursor);})}>{fr?'Actualiser les alertes / première page':'Refresh alerts / first page'}</button>
      {alertCursor&&<button disabled={busy} onClick={()=>void run(async()=>{const page=await api<NativeAdminAlerts>('/admin/crypto/alerts?view='+alertView+'&cursor='+encodeURIComponent(alertCursor),owner);setAlerts(page.rows);setAlertCursor(page.next_cursor);})}>{fr?'Alertes suivantes':'Next alerts'}</button>}
      {alerts.map((row) => (
        <article key={row.id}>
          <p>
            {row.severity} · {row.category} · {row.status} · {row.reminders}
          </p>
          {row.status !== "resolved" && (
            <>
              <button
                disabled={busy || !enabled || reason.trim().length < 5}
                onClick={() =>
                  void run(() =>
                    mutation("/admin/crypto/alerts", owner, {
                      alert_id: row.id,
                      action: "acknowledge",
                      reason,
                    }),
                  )
                }
              >
                {fr ? "Accuser réception" : "Acknowledge"}
              </button>
              <button
                disabled={busy || !enabled || reason.trim().length < 5}
                onClick={() =>
                  void run(() =>
                    mutation("/admin/crypto/alerts", owner, {
                      alert_id: row.id,
                      action: "resolve",
                      reason,
                    }),
                  )
                }
              >
                {fr ? "Résoudre" : "Resolve"}
              </button>
            </>
          )}
        </article>
      ))}
    </section></AdminTimeZone>
  );
}
