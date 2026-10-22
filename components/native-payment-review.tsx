"use client";
import CopyButton from './copy-button';
import TransactionReference from './transaction-reference';
import {formatBaseUnits} from '@gifters/domain';
import {copy,type Locale} from '@/lib/i18n';
import type {PreparedPayment} from '@/lib/native-wallet';
import type {ProfilePresentation} from '@/server/presentation';
import ProfileDisclosure from './profile-disclosure';
type Props={payment:PreparedPayment;locale:Locale;presentation?:ProfilePresentation;profileRevision?:number;busy:boolean;sentHash:string;onApprove:()=>void;onCancel:()=>void};
export default function NativePaymentReview({payment,locale,presentation,profileRevision,busy,sentHash,onApprove,onCancel}:Props){const fr=locale==='fr',t=copy[locale];return <section
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
<ProfileDisclosure presentation={presentation} locale={locale} queue={payment.queue_disclosure} plan={payment.plan} mode="checkout"/><p className="wallet-address">{fr?'Depuis':'From'}: {payment.sender} <CopyButton text={payment.sender} locale={locale}>{fr?'Copier l’adresse':'Copy address'}</CopyButton></p><p className="wallet-address">{fr?'Vers':'To'}: {payment.destination} <CopyButton text={payment.destination} locale={locale}>{fr?'Copier l’adresse':'Copy address'}</CopyButton></p>
              <button
                disabled={busy || !navigator.onLine || !sentHash&&payment.profile_revision!==profileRevision}
                onClick={onApprove}
              >
                {sentHash?(fr?"Soumettre le transfert déjà envoyé":"Submit the transfer already sent"):(fr ? "Approuver dans le portefeuille" : "Approve in wallet")}
              </button>
              {sentHash&&<p><TransactionReference hash={sentHash} network={payment.network} environment={payment.environment} locale={locale} registryExplorer={payment.explorer}/></p>}
              <button disabled={busy||!!sentHash} onClick={onCancel}>
                {t.cancel}
              </button>
            </section>;
}
