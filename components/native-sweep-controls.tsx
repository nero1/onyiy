"use client";
import {useState} from 'react';
import {decimalToBaseUnits,formatBaseUnits} from '@gifters/domain';
import {mutation} from '@/lib/api-client';
import type {Locale} from '@/lib/i18n';
import type {NativeCurrency} from '@/lib/native-wallet';
import type {NativeAdminSweep,NativeAdminSweepConfirmation,NativeAdminSweepRecovery} from '@/lib/financial-contracts';
import type {NativeControlProps} from './native-recovery-controls';
export default function NativeSweepControls({owner,locale,assets,currency,reason,busy,enabled,run}:NativeControlProps){
 const fr=locale==='fr';
 const [sweepGross,setSweepGross]=useState(''),[sweep,setSweep]=useState<NativeAdminSweep|null>(null);
 return <fieldset disabled={busy || !enabled || reason.trim().length < 10}>
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
              const value = await mutation<NativeAdminSweep>(
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
                  const value = await mutation<NativeAdminSweepConfirmation>(
                    "/admin/crypto/sweeps/confirm",
                    owner,
                    { obligation_id: sweep.id, reason },
                  );
                  setSweep(old => old?({ ...old, ...value }):null);
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
                  const value = await mutation<NativeAdminSweepRecovery>(
                    "/admin/crypto/sweeps/recover",
                    owner,
                    { obligation_id: sweep.id, reason },
                  );
                  setSweep(old => old?({ ...old, ...value }):null);
                })
              }
            >
              {fr
                ? "Annuler si non signé ou positivement résolu"
                : "Cancel if unsigned or positively resolved"}
            </button>
          </>
        )}
      </fieldset>;
}
