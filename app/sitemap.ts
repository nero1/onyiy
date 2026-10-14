import type { MetadataRoute } from 'next';
import { canonicalOrigin, publicPolicy, publishedArticles, localizedPath } from '@/server/public-pages';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const policy = await publicPolicy(), origin = canonicalOrigin(policy);
  const articles = policy.feature_help ? { en: await publishedArticles('en'), fr: await publishedArticles('fr') } : { en: [], fr: [] };
  const paths = new Set(['/']);
  if (policy.feature_gifts) paths.add('/gifts');
  if (policy.feature_help) {
    paths.add('/help');paths.add('/terms');
    for (const locale of ['en', 'fr'] as const) {
      for (const article of articles[locale]) {
        paths.add('/help/' + article.slug);
        if (article.slug === 'mechanics') paths.add('/how-it-works');
        if (['terms', 'privacy'].includes(article.slug)) paths.add('/' + article.slug);
      }
    }
  }
  const entries: MetadataRoute.Sitemap = [];
  for (const path of paths) {
    const slug = path.startsWith('/help/') ? path.slice(6) : path === '/privacy' ? 'privacy' : path === '/how-it-works' ? 'mechanics' : null;
    const languages: Record<string, string> = {};
    for (const locale of ['en', 'fr'] as const) if (!slug || articles[locale].some(row => row.slug === slug)) languages[locale] = origin + localizedPath(path, locale);
    for (const locale of ['en', 'fr'] as const) {
      // A locale's missing translation is not advertised as a working URL.
      if (!languages[locale]) continue;
      entries.push({ url: origin + localizedPath(path, locale), alternates: { languages } });
    }
  }
  return entries;
}
