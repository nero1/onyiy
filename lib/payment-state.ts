import type {Locale} from './i18n';
const labels={
 active:['Active','Actif'],completed:['Cycle complete','Cycle terminé'],exception:['Under review','À examiner'],
 quoted:['Quote ready','Devis prêt'],submitted:['Submitted for verification','Soumis pour vérification'],
 held:['Reserved','Réservé'],approved:['Approved','Approuvé'],signing:['Preparing signature','Préparation de la signature'],
 signed:['Signed; submission pending','Signé ; en attente d’envoi'],
 sending:['Sending','Envoi en cours'],broadcast:['Submitted to network','Soumis au réseau'],
 awaiting_requote:['Fresh quote required','Nouveau devis requis'],settled:['Settled','Réglé'],cancelled:['Cancelled','Annulé'],
 confirmed:['Transfer confirmed','Transfert confirmé'],reorged:['Chain confirmation reversed','Confirmation réseau annulée'],
 credited:['Balance credited','Solde crédité'],expired:['Expired','Expiré'],failed:['Failed','Échec'],
 failed_closed:['Closed after failure','Clôturé après échec'],
} as const;
export function paymentStateLabel(value:string,locale:Locale){return labels[value as keyof typeof labels]?.[locale==='fr'?1:0]??value;}
const historyLabels={
 GIV_GRANT:['Simulation credit','Crédit de simulation'],CHAIN_IN:['Incoming transfer recorded','Transfert entrant enregistré'],NATIVE_TOPUP:['Gas funding','Approvisionnement des frais'],
 GIFT_IN:['Gift payment','Paiement du don'],RECEIVER_ALLOCATE:['Receiver balance credit','Crédit du solde bénéficiaire'],REFERRAL_ALLOCATE:['Referral balance credit','Crédit de parrainage'],
 PAYOUT_HOLD:['Withdrawal reserved','Retrait réservé'],PAYOUT_SETTLE:['Withdrawal settled','Retrait réglé'],HOLD_RELEASE:['Reserved balance released','Solde réservé libéré'],
 WITHDRAWAL_FEE_CHARGE:['Withdrawal fee','Frais de retrait'],WITHDRAWAL_FEE_REFUND:['Unused fee returned','Frais inutilisés restitués'],
 REFUND_HOLD:['Refund reserved','Remboursement réservé'],REFUND_SETTLE:['Refund settled','Remboursement réglé'],
 REORG_COMPENSATE:['Funding correction','Correction du financement'],REORG_LOSS:['Funding invalidation','Invalidation du financement'],REORG_RECONFIRM:['Funding reconfirmed','Financement reconfirmé'],ADMIN_ADJUST:['Recorded adjustment','Ajustement enregistré'],
 signup:['Signup points','Points d’inscription'],gift_sender:['Gift points','Points du don'],gift_referrer:['Referral points','Points de parrainage'],
 withdrawal:['Withdrawal','Retrait'],refund:['Refund','Remboursement'],unallocated_refund:['Unassigned payment refund','Remboursement du paiement non attribué'],
 available_payable:['Available balance','Solde disponible'],held_payable:['Reserved balance','Solde réservé'],refund_payable:['Refund balance','Solde à rembourser'],
 credit:['Credit','Crédit'],debit:['Debit','Débit'],
} as const;
export function historyEntryLabel(value:string,locale:Locale){
 if(value.startsWith('gift_reorg_'))return locale==='fr'?'Correction des points':'Points correction';
 return historyLabels[value as keyof typeof historyLabels]?.[locale==='fr'?1:0]??paymentStateLabel(value,locale);
}
