"use client";
import {useLocalizedNotice} from './use-localized-notice';

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
    [treasury, setTreasury] = useState(""),
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
    [error,setError]=useLocalizedNotice(locale);
  const [view,setView]=useState<'current'|'history'>('current'),[lookup,setLookup]=useState('');
  const [inventory,setInventory]=useState<{current_address:string;rows:{address:string;current:boolean}[];next_after:string|null}|null>(null);
  async function loadTreasuries(after?:string){
    const query=new URLSearchParams({asset_key:asset});if(after)query.set('after',after);
    await act(async()=>{const value=await api<NonNullable<typeof inventory>>('/admin/crypto/checkpoints?'+query,owner,{signal:AbortSignal.timeout(10000)});setInventory(value);return {status:'loaded'};});
  }
  async function loadRecords(kind?:'runs'|'inflows'|'outflows',cursor?:string){
    const query=new URLSearchParams({view});if(lookup.trim())query.set('id',lookup.trim());if(kind&&cursor)query.set('cursor_'+kind,cursor);
    await act(async()=>{const value=await api<any>('/admin/crypto/recovery-state?'+query,owner,{signal:AbortSignal.timeout(10000)});setRows((old:any)=>kind?{...old,[kind]:value[kind],['next_'+kind]:value['next_'+kind]}:value);return {status:'loaded'};});
  }
  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setResult(await fn());
    } catch (e) {
      setError({error:e});
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
      {result?.reason==='ADDRESS_CUSTODY_INCOMPLETE'&&<p role="status">{fr?'Scannez chaque adresse conservée jusqu’au même bloc finalisé, puis relancez la comparaison. Les fonds restent réservés.':'Scan every retained address through the same finalized block, then repeat the balance comparison. Funds remain held.'}</p>}
      {result?.expiry_closure && <p role="status">
        {fr?'Expiration confirmée : clôturez cette obligation via la récupération appropriée, puis lancez un nouveau rapprochement. Les fonds restent réservés.':'Expiry verified: close this obligation through its recovery action, then start a fresh reconciliation. Funds remain held.'}
        {' '}{result.expiry_closure.obligation_id} · {result.expiry_closure.kind}
      </p>}
      <label>{fr?'Vue des dossiers':'Records view'}<select value={view} disabled={busy} onChange={event=>{setView(event.target.value as 'current'|'history');setRows(null);}}><option value="current">{fr?'Non résolus':'Unresolved'}</option><option value="history">{fr?'Tout l’historique':'All history'}</option></select></label>
      <label>{fr?'UUID exact du dossier':'Exact record UUID'}<input value={lookup} disabled={busy} maxLength={36} onChange={event=>{setLookup(event.target.value);setRows(null);}}/></label>
      <button disabled={busy} onClick={()=>void loadRecords()}>{fr?'Charger / première page':'Load / first page'}</button>
      {rows&&<div>{(['runs','inflows','outflows'] as const).map(kind=>rows['next_'+kind]&&<button key={kind} disabled={busy} onClick={()=>void loadRecords(kind,rows['next_'+kind])}>{kind==='runs'?(fr?'Rapprochements suivants':'Next scans'):kind==='inflows'?(fr?'Entrées suivantes':'Next inflows'):(fr?'Sorties suivantes':'Next outflows')}</button>)}</div>}
      {rows && (
        <div className="stack">
          {rows.runs.map((r: any) => (
            <article key={r.id}>
              <button onClick={() => setRunId(r.id)}>{r.id}</button>
              <p>
                {r.state} · {r.cursor_height}/{r.through_height} ·{" "}
                {r.reason_code==='ADDRESS_CUSTODY_INCOMPLETE'?(fr?'Autres adresses encore à rapprocher':'Other addresses still need reconciliation'):r.reason_code}
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
            onChange={(e) => {setAsset(e.target.value);setInventory(null);setTreasury("");}}
            maxLength={30}
          />
        </label>
        <button onClick={()=>void loadTreasuries()}>{fr?'Charger les adresses de réception':'Load receiving addresses'}</button>
        {inventory&&<div>
          <p>{fr?'Adresse actuelle':'Current address'}: {inventory.current_address}</p>
          {inventory.rows.map(row=><p key={row.address}><button onClick={()=>setTreasury(row.address)}>{row.address}</button> · {row.current?(fr?'Actuelle':'Current'):(fr?'Historique — surveillance conservée':'Historical — monitoring retained')}</p>)}
          {inventory.next_after&&<button onClick={()=>void loadTreasuries(inventory.next_after!)}>{fr?'Adresses suivantes':'Next addresses'}</button>}
        </div>}
        <label>{fr?'Adresse à scanner (vide = actuelle)':'Address to scan (blank = current)'}<input value={treasury} maxLength={128} onChange={event=>setTreasury(event.target.value)}/></label>
        <p>{fr?'Rapprochez toutes les adresses conservées au même bloc finalisé. Un solde nul ne retire pas une ancienne adresse de la surveillance.':'Reconcile every retained address at the same finalized block. A zero balance does not retire an old address from monitoring.'}</p>
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
        <p>{`checkpoint:${asset}:${treasury.trim()?treasury.trim()+':':''}${height}:${hash}`}</p>
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
                  ...(treasury.trim()?{treasury_address:treasury.trim()}:{}),
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
