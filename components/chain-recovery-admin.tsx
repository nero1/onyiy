"use client";
import {errorMessage} from "@/lib/error-messages";
import { useState } from "react";
import { api, mutation, ApiError } from "@/lib/api-client";
import type { Locale } from "@/lib/i18n";
export default function ChainRecoveryAdmin({
  owner,
  locale,
  enabled,
}: {
  owner: string;
  locale: Locale;
  enabled: boolean;
}) {
  const fr = locale === "fr",
    [lossId, setLossId] = useState(""),
    [lossAmount, setLossAmount] = useState(""),
    [asset, setAsset] = useState("bnb"),
    [height, setHeight] = useState(""),
    [hash, setHash] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [reference, setReference] = useState(""),
    [reason, setReason] = useState(""),
    [checkpoint, setCheckpoint] = useState(""),
    [through, setThrough] = useState(""),
    [runId, setRunId] = useState(""),
    [inflow, setInflow] = useState(""),
    [signature, setSignature] = useState(""),
    [previous, setPrevious] = useState(""),
    [statement, setStatement] = useState(""),
    [rows, setRows] = useState<any>(null),
    [result, setResult] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setResult(await fn());
    } catch (e) {
      setError(errorMessage(e, locale));
    } finally {
      setBusy(false);
    }
  }
  const blocked = busy || !enabled;
  const stageLabel=(stage:string)=>({discover:fr?'Recherche des mouvements':'Finding transfers',verify:fr?'Vérification de la preuve':'Verifying evidence',book:fr?'Enregistrement du mouvement vérifié':'Recording verified transfer',known_next:fr?'Contrôle des tentatives conservées':'Checking retained attempts',known_index:fr?'Recherche de la tentative':'Locating retained attempt',known_settle:fr?'Contrôle du règlement':'Checking settlement',known_expiry:fr?'Vérification de l’expiration':'Verifying expiry',balance:fr?'Comparaison des fonds conservés':'Comparing custody balance'} as Record<string,string>)[stage]??'';
  return (
    <section>
      <h3>
        {fr
          ? "Récupération après un point de contrôle"
          : "Recovery from a checkpoint"}
      </h3>
      <p>
        {fr
          ? "Un nouveau point de contrôle suspend les opérations. Deux fournisseurs doivent confirmer les preuves ; la reprise exige un rapprochement complet."
          : "A new checkpoint pauses activity. Two providers must confirm evidence; resuming requires complete reconciliation."}
      </p>
      {error && <p role="alert">{error}</p>}
      {result?.expiry_closure && <p role="status">
        {fr?'Expiration confirmée : clôturez cette obligation via la récupération appropriée, puis lancez un nouveau rapprochement. Les fonds restent réservés.':'Expiry verified: close this obligation through its recovery action, then start a fresh reconciliation. Funds remain held.'}
        {' '}{result.expiry_closure.obligation_id} · {result.expiry_closure.kind}
      </p>}
      <button
        disabled={busy}
        onClick={() =>
          void act(async () => {
            const value = await api<any>("/admin/crypto/recovery-state", owner);
            setRows(value);
            return { status: "loaded" };
          })
        }
      >
        {fr ? "Charger les dossiers" : "Load recovery records"}
      </button>
      {rows && (
        <div className="stack">
          {rows.runs.map((r: any) => (
            <article key={r.id}>
              <button onClick={() => setRunId(r.id)}>{r.id}</button>
              <p>
                {r.state} · {r.cursor_height}/{r.through_height} ·{" "}
                {r.reason_code}
                {r.scan_stage&&<> · {stageLabel(r.scan_stage)}</>}
                {r.scan_cursor&&<> · {fr?'Transaction / événement':'Transaction / event'} {r.scan_cursor.transaction} / {r.scan_cursor.event}</>}
              </p>
            </article>
          ))}
          {rows.outflows.map((r: any) => (
            <article key={r.id}>
              <button
                onClick={() => {
                  setLossId(r.id);
                  setLossAmount(r.amount_base_units);
                }}
              >
                {r.id}
              </button>
              <p>
                {r.amount_base_units} · {r.network} · {r.tx_hash}
              </p>
            </article>
          ))}
          {rows.inflows.map((r: any) => (
            <article key={r.id}>
              <button onClick={() => setInflow(r.id)}>{r.id}</button>
              <p>
                {r.amount_base_units} · {r.asset} · {r.network} · {r.sender}
              </p>
            </article>
          ))}
        </div>
      )}
      <fieldset disabled={blocked}>
        <label>
          {fr ? "Actif" : "Asset"}
          <input
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            maxLength={30}
          />
        </label>
        <label>
          {fr ? "Hauteur finalisée" : "Finalized height"}
          <input
            inputMode="numeric"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </label>
        <label>
          {fr ? "Hash du bloc" : "Block hash"}
          <input value={hash} onChange={(e) => setHash(e.target.value)} />
        </label>
        <label>
          {fr ? "Référence du dossier" : "Case reference"}
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        <label>
          {fr ? "Motif" : "Reason"}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        </label>
        <p>{`checkpoint:${asset}:${height}:${hash}`}</p>
        <label>
          {fr ? "Confirmation exacte" : "Exact confirmation"}
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
        <button
          onClick={() =>
            void act(async () => {
              const value = await mutation<any>(
                "/admin/crypto/checkpoints",
                owner,
                {
                  asset_key: asset,
                  height,
                  block_hash: hash,
                  proof_reference: reference,
                  confirmation,
                  reason,
                },
              );
              setCheckpoint(value.checkpoint_id);
              return value;
            })
          }
        >
          {fr ? "Enregistrer et suspendre" : "Register and pause"}
        </button>
        <label>
          {fr ? "Identifiant du point" : "Checkpoint ID"}
          <input
            value={checkpoint}
            onChange={(e) => setCheckpoint(e.target.value)}
          />
        </label>
        <label>
          {fr ? "Scanner jusqu’à la hauteur" : "Scan through height"}
          <input
            inputMode="numeric"
            value={through}
            onChange={(e) => setThrough(e.target.value)}
          />
        </label>
        <button
          onClick={() =>
            void act(async () => {
              const value = await mutation<any>(
                "/admin/crypto/scans/start",
                owner,
                { checkpoint_id: checkpoint, through_height: through },
              );
              setRunId(value.run_id);
              return value;
            })
          }
        >
          {fr ? "Commencer le rapprochement" : "Start reconciliation"}
        </button>
        <label>
          {fr ? "Identifiant du scan" : "Scan ID"}
          <input value={runId} onChange={(e) => setRunId(e.target.value)} />
        </label>
        <button
          onClick={() =>
            void act(() =>
              mutation("/admin/crypto/scans/page", owner, { run_id: runId }),
            )
          }
        >
          {fr ? "Traiter une page bornée" : "Process one bounded page"}
        </button>
        <h4>{fr ? "Sortie inconnue vérifiée" : "Verified unknown outflow"}</h4>
        <label>
          {fr ? "Identifiant de la sortie" : "Outflow ID"}
          <input value={lossId} onChange={(e) => setLossId(e.target.value)} />
        </label>
        <label>
          {fr ? "Principal en unités de base" : "Principal in base units"}
          <input
            value={lossAmount}
            onChange={(e) => setLossAmount(e.target.value)}
          />
        </label>
        <p>{`loss:${lossId}:${lossAmount}`}</p>
        <button
          disabled={confirmation !== `loss:${lossId}:${lossAmount}`}
          onClick={() =>
            void act(() =>
              mutation("/admin/crypto/scans/resolve", owner, {
                outflow_id: lossId,
                proof_reference: reference,
                confirmation,
                reason,
              }),
            )
          }
        >
          {fr
            ? "Enregistrer la perte de la société puis rescanner"
            : "Record company loss, then rescan"}
        </button>
        <h4>
          {fr
            ? "Retour à l’expéditeur d’origine"
            : "Return to the original sender"}
        </h4>
        <label>
          {fr ? "Identifiant de l’entrée" : "Inflow ID"}
          <input value={inflow} onChange={(e) => setInflow(e.target.value)} />
        </label>
        <button
          onClick={() =>
            void act(async () => {
              const value = await mutation<any>(
                "/admin/crypto/unmatched/statement",
                owner,
                { inflow_id: inflow },
              );
              setStatement(value.statement);
              return { inflow_id: inflow };
            })
          }
        >
          {fr ? "Préparer la déclaration" : "Prepare sender statement"}
        </button>
        {statement && <pre className="wrap">{statement}</pre>}
        <label>
          {fr
            ? "Signature du portefeuille d’origine"
            : "Original wallet signature"}
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            maxLength={2048}
          />
        </label>
        <label>
          {fr
            ? "Demande précédente clôturée (facultatif)"
            : "Closed previous request (optional)"}
          <input
            value={previous}
            onChange={(e) => setPrevious(e.target.value)}
          />
        </label>
        <button
          onClick={() =>
            void act(async () => {
              try {
                return await mutation("/admin/crypto/unmatched/refund", owner, {
                  inflow_id: inflow,
                  signature,
                  proof_reference: reference,
                  reason,
                  ...(previous ? { previous_obligation_id: previous } : {}),
                });
              } finally {
                setSignature("");
              }
            })
          }
        >
          {fr ? "Réserver le retour intégral" : "Reserve full-principal return"}
        </button>
      </fieldset>
      {result && (
        <pre className="wrap" role="status">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </section>
  );
}
