-- Public search remains under published-only RLS; drafts have no public index.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public VERSION '1.6';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pg_trgm' AND e.extversion='1.6' AND n.nspname='public') THEN
  RAISE EXCEPTION 'SEARCH_EXTENSION_INCOMPATIBLE';
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS help_published_en_search_idx ON public.help_articles
 USING gin ((setweight(to_tsvector('english'::regconfig,title),'A') || setweight(to_tsvector('english'::regconfig,body),'B')))
 WHERE published AND locale='en';
CREATE INDEX IF NOT EXISTS help_published_fr_search_idx ON public.help_articles
 USING gin ((setweight(to_tsvector('french'::regconfig,title),'A') || setweight(to_tsvector('french'::regconfig,body),'B')))
 WHERE published AND locale='fr';
CREATE INDEX IF NOT EXISTS help_published_title_trigram_idx ON public.help_articles
 USING gin (lower(title) gin_trgm_ops) WHERE published;
