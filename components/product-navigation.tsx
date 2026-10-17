import type { Manifest } from '@gifters/config';
import { copy, type Locale } from '@/lib/i18n';
type Policy = Pick<Manifest, 'feature_gifts' | 'feature_wallets' | 'feature_referrals' | 'feature_help' | 'feature_admin' | 'feature_moderation'>;
export default function ProductNavigation({ locale, policy, user,readOnlyPreview=false }: { locale: Locale; policy: Policy | null; user?: {role:string;status:string} | null;readOnlyPreview?:boolean }) {
  const t = copy[locale], restricted = user && !['active', 'deactivated'].includes(user.status);
  const links: { href: string; label: string }[] = [];
  if(readOnlyPreview)return <nav className="primary-navigation" aria-label={t.navigation}><a href={locale==='fr'?'/?locale=fr':'/'}>{locale==='fr'?'Accueil':'Home'}</a>{policy?.feature_gifts&&<a href={'/gifts'+(locale==='fr'?'?locale=fr':'')}>{t.gifts}</a>}{policy?.feature_help&&<a href={'/help'+(locale==='fr'?'?locale=fr':'')}>{t.help}</a>}</nav>;
  if (policy?.feature_gifts) links.push({ href: '/gifts', label: t.gifts });
  if (policy?.feature_wallets && !restricted) links.push({ href: '/wallet', label: t.wallet });
  if (policy?.feature_referrals && !restricted) links.push({ href: '/referrals', label: locale === 'fr' ? 'Parrainages' : 'Referrals' });
  links.push({ href: '/settings/account', label: locale === 'fr' ? 'Paramètres' : 'Settings' });
  if (policy?.feature_help) links.push({ href: '/help', label: t.help });
  if (user?.role === 'admin' && policy?.feature_admin) links.push({ href: '/admin', label: t.admin });
  if (user && ['admin', 'moderator'].includes(user.role) && policy?.feature_moderation) links.push({ href: '/moderation', label: locale === 'fr' ? 'Modération' : 'Moderation' });
  return <nav className="primary-navigation" aria-label={t.navigation}>{links.map(link => <a key={link.href} href={link.href + (locale === 'fr' ? '?locale=fr' : '')}>{link.label}</a>)}</nav>;
}
