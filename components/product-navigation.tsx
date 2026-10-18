import type { Manifest } from '@gifters/config';
import { copy, type Locale } from '@/lib/i18n';
type Policy = Pick<Manifest, 'feature_gifts' | 'feature_wallets' | 'feature_referrals' | 'feature_help' | 'feature_admin' | 'feature_moderation'>;
export default function ProductNavigation({ locale, policy, user,readOnlyPreview=false }: { locale: Locale; policy: Policy | null; user?: {role:string;status:string} | null;readOnlyPreview?:boolean }) {
  const t = copy[locale], restricted = user && !['active', 'deactivated'].includes(user.status);
  const links: { href: string; label: string }[] = [];
  if(readOnlyPreview)return <nav className="primary-navigation" aria-label={t.navigation}><a href={'/?locale='+locale}>{locale==='fr'?'Accueil':'Home'}</a>{policy?.feature_gifts&&<a href={'/gifts'+('?locale='+locale)}>{t.gifts}</a>}{policy?.feature_help&&<a href={'/help'+('?locale='+locale)}>{t.help}</a>}</nav>;
  if (policy?.feature_gifts) links.push({ href: '/gifts', label: t.gifts });
  if (policy?.feature_wallets && !restricted) links.push({ href: '/wallet', label: t.wallet });
  if (policy?.feature_referrals && !restricted) links.push({ href: '/referrals', label: locale === 'fr' ? 'Parrainages' : 'Referrals' });
  links.push({ href: '/settings/account', label: locale === 'fr' ? 'Paramètres' : 'Settings' });
  if (policy?.feature_help) links.push({ href: '/help', label: t.help });
  if (user?.role === 'admin') links.push({ href: policy?.feature_admin?'/admin':'/settings/account?preview=admin', label: policy?.feature_admin?t.admin:t.admin+(locale==='fr'?' (lecture seule)':' (read-only)') });
  if(user&&(user.role==='admin'||user.role==='moderator'&&policy?.feature_moderation))links.push({href:policy?.feature_moderation?'/moderation':'/settings/account?preview=moderation',label:(locale==='fr'?'Modération':'Moderation')+(!policy?.feature_moderation?(locale==='fr'?' (lecture seule)':' (read-only)'):'')});
  return <nav className="primary-navigation" aria-label={t.navigation}>{links.map(link => <a key={link.href} href={link.href + (link.href.includes('?')?'&':'?')+'locale='+locale}>{link.label}</a>)}</nav>;
}
