"use client";
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
  const [target, setTarget] = useState(""),
    [recoveryGross, setRecoveryGross] = useState(""),
    [proofReference, setProofReference] = useState(""),
    [recovery, setRecovery] = useState<any>(null),
    [approval, setApproval] = useState(""),
    [link, setLink] = useState("");
  const [previousId, setPreviousId] = useState("");
  const [obligations, setObligations] = useState<any[]>([]),
    [obligationCursor, setObligationCursor] = useState<string | null>(null);
  const [sweepGross, setSweepGross] = useState(""),
    [sweep, setSweep] = useState<any>(null);
  const [eventId, setEventId] = useState(""),
    [reviews, setReviews] = useState<any[]>([]);
  const fr = locale === "fr",
    [reason, setReason] = useState(""),
    [currency, setCurrency] = useState(assets[0]?.key ?? "bnb"),
    [plan, setPlan] = useState(""),
    [revision, setRevision] = useState("1"),
    [plans, setPlans] = useState<any[]>([]),
    [alerts, setAlerts] = useState<any[]>([]),
    [role, setRole] = useState("developer"),
    [obligation, setObligation] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
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
      setMessage(fr ? "Action enregistrée." : "Action recorded.");
    } catch (e) {
      setMessage(e instanceof ApiError ? e.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <h2>
        {fr ? "Administration des réseaux de test" : "Testnet administration"}
      </h2>
      <p role="status">{message}</p>
      {!enabled && (
        <p>{fr ? "Aperçu en lecture seule" : "Read-only preview"}</p>
      )}
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            setPlans(await api<any[]>("/admin/plans", owner));
            setAlerts(await api<any[]>("/admin/crypto/alerts", owner));
            setReviews(await api<any[]>("/admin/crypto/reorg", owner));
            const page = await api<any>("/admin/crypto/obligations", owner);
            setObligations(page.rows);
            setObligationCursor(page.next_after);
          })
        }
      >
        {fr ? "Charger les contrôles" : "Load controls"}
      </button>
      <label>
        {fr ? "Monnaie" : "Currency"}
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
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
        <button
          disabled={!plan}
          onClick={() =>
            void run(() =>
              mutation("/admin/crypto/plans", owner, {
                asset_key: currency,
                plan_id: plan,
                reason,
              }),
            )
          }
        >
          {fr
            ? "Activer le plan pour cette monnaie"
            : "Activate plan for this currency"}
        </button>
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
            void run(() =>
              mutation("/admin/crypto/alert-probe", owner, {
                asset_key: currency,
              }),
            )
          }
        >
          {fr ? "Vérifier le canal d’alerte" : "Check alert channel"}
        </button>
      </fieldset>
      <fieldset disabled={busy || !enabled || reason.trim().length < 10}>
        <legend>
          {fr
            ? "Récupération d’un solde conservé"
            : "Retained balance recovery"}
        </legend>
        <p>
          {fr
            ? "Examinez l’identité du demandeur et son dossier. Le paiement utilise uniquement son portefeuille vérifié d’origine et n’accorde aucun accès au compte."
            : "Review the claimant’s identity and case. Payment uses only the original verified wallet and grants no account access."}
        </p>
        <label>
          {fr ? "Identifiant financier du membre" : "Member financial ID"}
          <input value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label>
          {fr ? "Référence du dossier vérifié" : "Verified case reference"}
          <input
            maxLength={200}
            value={proofReference}
            onChange={(e) => setProofReference(e.target.value)}
          />
        </label>
        <label>
          {fr
            ? "Montant brut dans la monnaie sélectionnée"
            : "Gross amount in selected currency"}
          <input
            inputMode="decimal"
            value={recoveryGross}
            onChange={(e) => setRecoveryGross(e.target.value)}
          />
        </label>
        <button
          disabled={!target || !proofReference || !recoveryGross}
          onClick={() =>
            void run(async () => {
              const asset = assets.find((v) => v.key === currency);
              if (!asset) throw new Error("CURRENCY_NOT_PROVISIONED");
              const value = await mutation<any>(
                "/admin/crypto/recovery/quote",
                owner,
                {
                  user_id: target,
                  asset_key: currency,
                  gross_base_units: decimalToBaseUnits(
                    recoveryGross,
                    asset.decimals,
                  ).toString(),
                  proof_reference: proofReference,
                  reason,
                },
              );
              setRecovery(value);
              setApproval("");
              setLink("");
            })
          }
        >
          {fr
            ? "Préparer le devis et l’approbation"
            : "Prepare quote and approval"}
        </button>
        {recovery && (
          <>
            <pre className="recovery-statement">{recovery.statement}</pre>
            <button
              onClick={() =>
                void run(async () => {
                  const value = await mutation<any>(
                    "/admin/crypto/recovery/link",
                    owner,
                    { recovery_id: recovery.recovery_id },
                  );
                  setLink(
                    location.origin +
                      "/recover#id=" +
                      encodeURIComponent(value.recovery_id) +
                      "&token=" +
                      encodeURIComponent(value.view_token),
                  );
                })
              }
            >
              {fr
                ? "Créer un lien temporaire pour le demandeur"
                : "Create temporary claimant link"}
            </button>
            {link && (
              <>
                <input
                  aria-label={fr ? "Lien temporaire" : "Temporary link"}
                  readOnly
                  value={link}
                />
                <button
                  onClick={() =>
                    void run(() => navigator.clipboard.writeText(link))
                  }
                >
                  {fr ? "Copier le lien" : "Copy link"}
                </button>
              </>
            )}
            <label>
              {fr
                ? "Approbation signée par le portefeuille d’origine"
                : "Approval signed by original wallet"}
              <textarea
                value={approval}
                onChange={(e) => setApproval(e.target.value)}
                maxLength={2048}
              />
            </label>
            <button
              disabled={!approval}
              onClick={() =>
                void run(async () => {
                  await mutation("/admin/crypto/recovery/confirm", owner, {
                    recovery_id: recovery.recovery_id,
                    signature: approval,
                    reason,
                  });
                  setApproval("");
                  setLink("");
                })
              }
            >
              {fr ? "Confirmer la demande prouvée" : "Confirm proven request"}
            </button>
            <button
              onClick={() =>
                void run(async () => {
                  await mutation("/admin/crypto/recovery/cancel", owner, {
                    recovery_id: recovery.recovery_id,
                    reason,
                  });
                  setRecovery(null);
                  setApproval("");
                  setLink("");
                })
              }
            >
              {fr
                ? "Annuler si aucune signature de transfert n’existe"
                : "Cancel if no transfer was signed"}
            </button>
          </>
        )}
      </fieldset>
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
              setReviews(await api<any[]>("/admin/crypto/reorg", owner));
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
                    setReviews(await api<any[]>("/admin/crypto/reorg", owner));
                  })
                }
              >
                {fr ? "Vérifier la reconfirmation" : "Verify reconfirmation"}
              </button>
            )}
          </article>
        ))}
      </fieldset>
      <fieldset disabled={busy || !enabled || reason.trim().length < 10}>
        <legend>
          {fr
            ? "Transfert de réserve de la plateforme"
            : "Platform reserve sweep"}
        </legend>
        <p>
          {fr
            ? "Le montant doit provenir du surplus comptabilisé. Les obligations et la réserve de gaz restent protégées. La destination est configurée par l’opérateur."
            : "The amount must come from recorded surplus. Beneficiary liabilities and gas reserves remain protected. The operator configures the destination."}
        </p>
        <label>
          {fr
            ? "Montant dans la monnaie sélectionnée"
            : "Amount in selected currency"}
          <input
            inputMode="decimal"
            value={sweepGross}
            onChange={(e) => setSweepGross(e.target.value)}
          />
        </label>
        <button
          disabled={!sweepGross}
          onClick={() =>
            void run(async () => {
              const asset = assets.find((a) => a.key === currency);
              if (!asset) throw new Error("CURRENCY_NOT_PROVISIONED");
              const value = await mutation<any>(
                "/admin/crypto/sweeps/quote",
                owner,
                {
                  asset_key: currency,
                  amount_base_units: decimalToBaseUnits(
                    sweepGross,
                    asset.decimals,
                  ).toString(),
                  reason,
                },
              );
              setSweep(value);
            })
          }
        >
          {fr ? "Examiner le transfert" : "Review sweep"}
        </button>
        {sweep && (
          <>
            <p>
              {sweep.status} ·{" "}
              {formatBaseUnits(BigInt(sweep.amount_base_units), sweep.decimals)}{" "}
              {sweep.asset}
            </p>
            <p className="wallet-address">{sweep.destination}</p>
            <p>
              {fr ? "Frais natifs approuvés" : "Approved native fee"}:{" "}
              {formatBaseUnits(
                BigInt(sweep.native_fee_base_units),
                sweep.native_decimals,
              )}{" "}
              {sweep.native_asset}
            </p>
            <button
              disabled={sweep.status !== "quoted"}
              onClick={() =>
                void run(async () => {
                  const value = await mutation<any>(
                    "/admin/crypto/sweeps/confirm",
                    owner,
                    { obligation_id: sweep.id, reason },
                  );
                  setSweep((old: any) => ({ ...old, ...value }));
                })
              }
            >
              {fr
                ? "Confirmer la destination et le montant"
                : "Confirm destination and amount"}
            </button>
            <button
              disabled={
                sweep.status === "settled" ||
                sweep.status === "cancelled" ||
                sweep.status === "failed_closed"
              }
              onClick={() =>
                void run(async () => {
                  const value = await mutation<any>(
                    "/admin/crypto/sweeps/recover",
                    owner,
                    { obligation_id: sweep.id, reason },
                  );
                  setSweep((old: any) => ({ ...old, ...value }));
                })
              }
            >
              {fr
                ? "Annuler si non signé ou positivement résolu"
                : "Cancel if unsigned or positively resolved"}
            </button>
          </>
        )}
      </fieldset>
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
            {!row.completed_at && ["business", "refund"].includes(row.kind) && (
              <button
                disabled={busy || !enabled || reason.trim().length < 10}
                onClick={() =>
                  void run(async () => {
                    await mutation("/admin/crypto/operational/recover", owner, {
                      obligation_id: row.id,
                      reason,
                    });
                    const page = await api<any>(
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
                const page = await api<any>(
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
    </section>
  );
}
