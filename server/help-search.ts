import { and, asc, desc, eq, or, sql } from 'drizzle-orm';
import { helpArticles, readManifest, withContext, type DbExecutor } from '@gifters/db';
import type { Locale } from '@/lib/i18n';
import type { PublicArticle } from '@/lib/public-content';

export async function searchPublishedHelp(locale: Locale, query: string) {
  return withContext({ access: 'public', snapshot: true }, tx => searchPublishedHelpRows(tx, locale, query));
}

export async function searchPublishedHelpRows(tx: DbExecutor, locale: Locale, query: string) {
    // Locale branches match the immutable expression indexes exactly. Query
    // text is always a bound value, never SQL syntax or a text-search grammar.
    const config = locale === 'fr' ? sql`'french'::regconfig` : sql`'english'::regconfig`;
    const vector = sql`setweight(to_tsvector(${config}, ${helpArticles.title}), 'A') || setweight(to_tsvector(${config}, ${helpArticles.body}), 'B')`;
    const terms = sql`plainto_tsquery(${config}, ${query})`;
    const exact = sql`lower(${helpArticles.title}) = lower(${query})`;
    const match = sql`${vector} @@ ${terms}`;
    const fuzzy = sql`lower(${helpArticles.title}) % lower(${query})`;
    await tx.execute(sql`set local pg_trgm.similarity_threshold='0.2'`);
    return tx.select({ locale: helpArticles.locale, slug: helpArticles.slug, title: helpArticles.title, body: helpArticles.body, version: helpArticles.version })
      .from(helpArticles)
      .where(and(eq(helpArticles.locale, locale), eq(helpArticles.published, true), or(exact, match, fuzzy)))
      .orderBy(desc(exact), desc(match), desc(sql`ts_rank_cd(${vector}, ${terms})`), desc(sql`similarity(lower(${helpArticles.title}), lower(${query}))`), asc(helpArticles.slug))
      .limit(20) as Promise<PublicArticle[]>;
}

export async function publicSearchPolicy() {
  const policy = await withContext({ access: 'service', snapshot: true }, tx => readManifest(tx));
  if (!policy.feature_help) throw new Error('FEATURE_DISABLED');
  return policy;
}
