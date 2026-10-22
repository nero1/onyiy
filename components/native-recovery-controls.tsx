"use client";
import {useState} from 'react';
import {decimalToBaseUnits} from '@gifters/domain';
import {mutation} from '@/lib/api-client';
import type {Locale} from '@/lib/i18n';
import type {NativeCurrency} from '@/lib/native-wallet';
import CopyButton from './copy-button';
import type {NativeAdminRecovery,NativeAdminRecoveryLink} from '@/lib/financial-contracts';
export type NativeControlProps={owner:string;locale:Locale;assets:NativeCurrency[];currency:string;reason:string;busy:boolean;enabled:boolean;run:(action:()=>Promise<unknown>)=>Promise<void>};
export default function NativeRecoveryControls({owner,locale,assets,currency,reason,busy,enabled,run}:NativeControlProps){
 const fr=locale==='fr';
 const [target,setTarget]=useState(''),[recoveryGross,setRecoveryGross]=useState(''),[proofReference,setProofReference]=useState(''),[recovery,setRecovery]=useState<NativeAdminRecovery|null>(null),[approval,setApproval]=useState(''),[link,setLink]=useState('');
 return <fieldset disabled={busy || !enabled || reason.trim().length < 10}>
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
              const value = await mutation<NativeAdminRecovery>(
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
                  const value = await mutation<NativeAdminRecoveryLink>(
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
                <CopyButton text={link} locale={locale}>
                  {fr ? "Copier le lien" : "Copy link"}
                </CopyButton>
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
      </fieldset>;
}
