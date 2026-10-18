import type {Locale} from './i18n';
const labels={
 active:['Active','Actif'],completed:['Cycle complete','Cycle terminé'],exception:['Under review','À examiner'],
 quoted:['Quote ready','Devis prêt'],submitted:['Submitted for verification','Soumis pour vérification'],
 held:['Reserved','Réservé'],approved:['Approved','Approuvé'],signing:['Preparing signature','Préparation de la signature'],
 signed:['Signed; submission pending','Signé ; en attente d’envoi'],
 sending:['Sending','Envoi en cours'],broadcast:['Submitted to network','Soumis au réseau'],
 awaiting_requote:['Fresh quote required','Nouveau devis requis'],settled:['Settled','Réglé'],cancelled:['Cancelled','Annulé'],
 credited:['Balance credited','Solde crédité'],expired:['Expired','Expiré'],failed:['Failed','Échec'],
} as const;
export function paymentStateLabel(value:string,locale:Locale){return labels[value as keyof typeof labels]?.[locale==='fr'?1:0]??value;}
