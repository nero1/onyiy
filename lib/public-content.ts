import type { Locale } from './i18n';

export type PublicArticle = {
  locale: Locale;
  slug: string;
  title: string;
  body: string;
  version: number;
};

export type PublicGift = {
  id: string;
  name: string;
  slug?: string;
  symbol?: string;
  asset?: string;
  amount_base_units: string;
  amount_giv?: string;
  decimals?: number;
  receipts_required: number;
  status: string;
};

export type PublicSearch = { locale: Locale; query: string; rows: PublicArticle[] };
