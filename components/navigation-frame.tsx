'use client';
import type { Manifest } from '@gifters/config';
import PwaControls from './pwa-controls';
import ClientCompatibilityNotice from './client-compatibility';
import ProductNavigation from './product-navigation';
import { useAppearance } from './appearance-provider';
import { copy } from '@/lib/i18n';
type Policy = Pick<Manifest, 'feature_gifts' | 'feature_wallets' | 'feature_referrals' | 'feature_help' | 'feature_admin' | 'feature_moderation'|'feature_pwa'>;
export default function NavigationFrame({ policy,readOnlyPreview=false }: { policy: Policy;readOnlyPreview?:boolean }) {
  const { locale, theme, setLocale, setTheme, navigationUser } = useAppearance();
  const t = copy[locale];
  return <><ClientCompatibilityNotice/><ProductNavigation locale={locale} policy={policy} user={navigationUser} readOnlyPreview={readOnlyPreview}/><div className="appearance-controls">
    <button aria-label={t.language} onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}>{locale.toUpperCase()}</button>
    <button aria-label={t.theme} aria-pressed={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? t.light : t.dark}</button>
    <PwaControls enabled={policy.feature_pwa} locale={locale}/>
  </div></>;
}
