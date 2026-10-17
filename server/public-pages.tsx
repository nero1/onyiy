import ProfileDisclosure from '@/components/profile-disclosure';
import type {ProfilePresentation} from './presentation';
import type { Metadata } from 'next';
import {headers} from 'next/headers';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { loadManifest, type Manifest } from '@gifters/config';
import { formatBaseUnits } from '@gifters/domain';
import type { Locale } from '@/lib/i18n';
import type { PublicArticle, PublicGift } from '@/lib/public-content';
import { getPublicCatalog, getPublicHelp, getPublicManifest, getPublicNativeCatalog, unavailablePublicManifest } from './public-reads';

export type PublicPolicy = Pick<Manifest, 'product_content' | 'feature_help' | 'feature_gifts' | 'feature_wallets' | 'feature_referrals' | 'feature_admin' | 'feature_moderation' | 'terms_content'|'profile_revision'|'deployment_profile'> & {presentation?:ProfilePresentation};
export type LocaleQuery = Promise<{ locale?: string | string[]; article?: string | string[]; slug?: string | string[] }>;
const publicRequest = cache(async (path: string) => {
  const incoming = await headers(), selected = new Headers();
  const forwarded = incoming.get('x-vercel-forwarded-for');
  if (forwarded) selected.set('x-vercel-forwarded-for', forwarded);
  return new Request(new URL('/api/v1' + path, loadManifest().product_content.domain), { headers: selected });
});
export const publicPolicy = cache(async () => {
  try { return (await getPublicManifest(await publicRequest('/manifest'))).data as PublicPolicy; }
  catch { return unavailablePublicManifest() as PublicPolicy; }
});
export const publishedArticles = cache(async (locale: Locale) => (await getPublicHelp(locale, await publicRequest('/help'))).data as PublicArticle[]);
export function publicLocale(value: string | string[] | undefined): Locale { return value === 'fr' ? 'fr' : 'en'; }
export function localizedPath(path: string, locale: Locale) { return path + (locale === 'fr' ? '?locale=fr' : ''); }
export function canonicalOrigin(policy: PublicPolicy) { return new URL(policy.product_content.domain).origin; }

export async function publicMetadata(path: string, locale: Locale, title?: string, description?: string): Promise<Metadata> {
  const policy = await publicPolicy(), origin = canonicalOrigin(policy);
  const actualTitle = title ?? 'Gifters World';
  const actualDescription = description ?? policy.product_content.short_description[locale];
  const languages: Record<string, string> = { en: origin + path, fr: origin + localizedPath(path, 'fr') };
  const slug = path.startsWith('/help/') ? path.slice(6) : path === '/how-it-works' ? 'mechanics' : path === '/privacy' ? 'privacy' : null;
  if (slug && policy.feature_help) {
    for (const language of ['en', 'fr'] as const) if (!(await publishedArticles(language)).some(row => row.slug === slug)) delete languages[language];
  }
  return {
    title: actualTitle, description: actualDescription,
    alternates: {
      canonical: origin + localizedPath(path, locale),
      languages,
    },
    openGraph: { title: actualTitle, description: actualDescription, url: origin + localizedPath(path, locale), locale: locale === 'fr' ? 'fr_FR' : 'en_US' },
  };
}

export async function PublicCatalog({ locale }: { locale: Locale }) {
  const policy = await publicPolicy();
  if (!policy.feature_gifts) return null;
  const native = process.env.APP_ENV === 'testnet'||process.env.APP_ENV==='mainnet';
  let result: {data:unknown};
  try { result = native ? await getPublicNativeCatalog(await publicRequest('/crypto/catalog')) : await getPublicCatalog(await publicRequest('/plans')); }
  catch { return <section className="public-page" lang={locale}><h1>{locale==='fr'?'Catalogue des dons':'Gift catalog'}</h1><p>{locale==='fr'?'Le catalogue est temporairement indisponible. Actualisez avant de choisir un don.':'The catalog is temporarily unavailable. Refresh before choosing a gift.'}</p></section>; }
  const gifts: PublicGift[] = native ? (result.data as { plans: PublicGift[] }).plans : result.data as PublicGift[];
  if(gifts.some(gift=>gift.profile_revision!==policy.profile_revision))return <p>{locale==='fr'?'Actualisation des informations des dons. Veuillez actualiser.':'Gift information is updating. Please refresh.'}</p>;
  const nonce=(await headers()).get('x-nonce')??undefined;
  const structured=JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'Gifters World',url:canonicalOrigin(policy),inLanguage:locale}).replaceAll('<','\\u003c');
  return <section className="public-page" lang={locale} aria-labelledby="public-gifts-title">
    <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{__html:structured}}/>
    <h1 id="public-gifts-title">{locale === 'fr' ? 'Catalogue des dons' : 'Gift catalog'}</h1>
    <p>{policy.product_content.tagline[locale]}</p><ProfileDisclosure presentation={policy.presentation} locale={locale}/>
    <p>{process.env.APP_ENV==='mainnet' ? (locale==='fr'?'Catalogue mainnet — aperçu en lecture seule, paiements indisponibles.':'Mainnet catalogue — read-only preview, payments unavailable.') : native ? (locale === 'fr' ? 'Réseaux de test — aucune valeur monétaire réelle.' : 'Test networks — no real monetary value.') : (locale === 'fr' ? 'Simulation GIV — aucune valeur monétaire réelle.' : 'GIV simulation — no real monetary value.')}</p>
    <div className="gift-tiles">{gifts.map((gift, index) => <article className="card" key={gift.id + ':' + index}>
      <h2>{gift.name}</h2><ProfileDisclosure presentation={policy.presentation} locale={locale} queue={gift.queue_disclosure} plan={gift.plan}/>
      <p>{gift.amount_giv ?? formatBaseUnits(BigInt(gift.amount_base_units), gift.decimals ?? 18)} {gift.symbol ?? gift.asset ?? 'GIV'}</p>
      <p>{locale === 'fr' ? 'Réceptions requises' : 'Required receipts'}: {gift.receipts_required}</p>
      <p>{locale === 'fr' ? 'État' : 'Status'}: {({active:locale==='fr'?'Actif':'Active',disabled:locale==='fr'?'Désactivé':'Disabled',scheduled:locale==='fr'?'Prévu':'Scheduled',paused:locale==='fr'?'Suspendu':'Paused',retired:locale==='fr'?'Archivé':'Retired'} as Record<string,string>)[gift.status]??gift.status}</p>
    </article>)}</div>
    {!gifts.length && <p>{locale === 'fr' ? 'Aucun don disponible.' : 'No gifts available.'}</p>}
    {policy.feature_help && <a href={localizedPath('/how-it-works', locale)}>{locale === 'fr' ? 'Comment ça marche' : 'How it works'}</a>}
  </section>;
}

export async function PublishedPage({ locale, slug }: { locale: Locale; slug: string }) {
  const policy = await publicPolicy();
  if (!policy.feature_help) notFound();
  if(slug==='mechanics'&&policy.presentation?.transparent)return <main className="public-page" lang={locale}><h1>{locale==='fr'?'Comment ça marche':'How It Works'}</h1><ProfileDisclosure presentation={policy.presentation} locale={locale} mode="mechanics"/></main>;
  const article = slug==='terms'?{title:locale==='fr'?'Conditions publiées':'Published terms',version:policy.terms_content.version,body:policy.terms_content.body[locale]}:(await publishedArticles(locale)).find(row => row.slug === slug);
  if (!article) notFound();
  return <main className="public-page" lang={locale}>
    <nav aria-label={locale === 'fr' ? 'Navigation' : 'Navigation'}><a href={localizedPath('/', locale)}>{locale === 'fr' ? 'Accueil' : 'Home'}</a><a href={localizedPath('/help', locale)}>{locale === 'fr' ? 'Aide' : 'Help'}</a></nav>
    <article><h1>{article.title}</h1><p>{locale === 'fr' ? 'Version publiée' : 'Published version'}: {article.version}</p><p className="text-body">{article.body}</p></article>
  </main>;
}
