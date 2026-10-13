"use client";
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
        <button
          onClick={() =>
            void run(() =>
              mutation("/admin/crypto/business", owner, {
                asset_key: currency,
                role,
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
