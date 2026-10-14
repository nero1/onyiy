import type { Locale } from './i18n';
const titles = {
  gift_sent: { en: 'Gift confirmed', fr: 'Don confirmé' },
  gift_received: { en: 'Gift received', fr: 'Don reçu' },
  withdrawal_settled: { en: 'Withdrawal settled', fr: 'Retrait réglé' },
  incoming_exception: { en: 'Payment needs review', fr: 'Paiement à examiner' },
  financial_review: { en: 'Financial review', fr: 'Vérification financière' },
  account_update: { en: 'Account update', fr: 'Mise à jour du compte' },
  admin_message: { en: 'Staff message', fr: 'Message du personnel' },
} as const;
type Title = keyof typeof titles;
export function notificationTitle(key: string, locale: Locale) {
  return Object.hasOwn(titles,key) ? titles[key as Title][locale] : locale === 'fr' ? 'Notification' : 'Notification';
}

/** Translate known product templates at display time, preserving immutable
 * messages and exact amounts. Free-form staff content retains its authored text. */
export function notificationBody(key: string, body: string, locale: Locale) {
  if (locale === 'en' || key === 'admin_message') return body;
  if (key === 'gift_sent') {
    const match = /^(.*) gift confirmed\. You joined the receiver queue\.$/.exec(body);
    if (match) return `Don ${match[1]} confirmé. Vous avez rejoint la file de réception.`;
  }
  if (key === 'gift_received') {
    const match = /^You received (.+) from a subsequent gift\.( Your cycle is complete\.)?$/.exec(body);
    if (match) return `Vous avez reçu ${match[1]} d’un don suivant.${match[2] ? ' Votre cycle est terminé.' : ''}`;
  }
  if (key === 'withdrawal_settled') {
    const match = /^Simulation withdrawal settled for (.+) GIV\. No on-chain export occurred\.$/.exec(body);
    if (match) return `Retrait de simulation réglé pour ${match[1]} GIV. Aucun transfert sur une chaîne n’a eu lieu.`;
  }
  const messages: Record<string, string> = {
    'Your GIV payment has a refundable amount awaiting simulation review. No extra queue right was created.': 'Votre paiement GIV comporte un montant remboursable en attente de vérification. Aucun droit supplémentaire dans la file n’a été créé.',
    'An incoming GIV event was invalidated. Affected activity is paused for review; balances, holds and historical withdrawals are preserved.': 'Un événement GIV entrant a été invalidé. Les opérations concernées sont suspendues ; les soldes, réservations et retraits existants sont conservés.',
    'A testnet incoming event is under chain review. Existing balances, holds and payout history are retained; new activity in this currency is paused.': 'Un événement entrant de test est en cours de vérification. Les soldes, réservations et retraits existants sont conservés ; les nouvelles opérations dans cette monnaie sont suspendues.',
  };
  if (messages[body]) return messages[body];
  if (key === 'account_update') {
    try {
      const value: unknown = JSON.parse(body);
      if (value && typeof value === 'object' && 'status' in value && typeof value.status === 'string') {
        const states: Record<string, string> = { active: 'actif', suspended: 'suspendu', banned: 'banni', deactivated: 'désactivé', deleted: 'supprimé', pending_consent: 'consentement en attente' };
        if (states[value.status]) return 'État du compte : ' + states[value.status] + '.';
      }
    } catch { /* Older authored messages remain readable. */ }
  }
  return body;
}
