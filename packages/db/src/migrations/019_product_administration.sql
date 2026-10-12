ALTER TABLE public.queue_entries ADD COLUMN IF NOT EXISTS priority_revision integer NOT NULL DEFAULT 1 CHECK(priority_revision>0);
CREATE TABLE IF NOT EXISTS public.help_articles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),locale text NOT NULL CHECK(locale IN ('en','fr')),slug text NOT NULL CHECK(slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200),body text NOT NULL CHECK(length(body) BETWEEN 1 AND 20000),published boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 edited_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,UNIQUE(locale,slug)
);
CREATE INDEX IF NOT EXISTS help_public_locale_idx ON public.help_articles(locale,published,slug);
CREATE TABLE IF NOT EXISTS public.slug_redirects (
 locale text NOT NULL CHECK(locale IN ('en','fr')),old_slug text NOT NULL CHECK(old_slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
 article_id uuid NOT NULL REFERENCES public.help_articles(id) ON DELETE RESTRICT,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(locale,old_slug)
);
CREATE TABLE IF NOT EXISTS public.notification_views (
 user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,seen_at timestamptz NOT NULL,seen_id uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.gw_notification_view_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_TABLE_NAME='notification_views' THEN
  IF TG_OP='UPDATE' AND (NEW.user_id<>OLD.user_id OR (NEW.seen_at,NEW.seen_id)<(OLD.seen_at,OLD.seen_id)) THEN RAISE EXCEPTION 'NOTIFICATION_SEEN_INVALID';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE id=NEW.seen_id AND user_id=NEW.user_id AND created_at=NEW.seen_at) THEN RAISE EXCEPTION 'NOTIFICATION_SEEN_INVALID';END IF;
 ELSE
  IF (NEW.id,NEW.user_id,NEW.title_key,NEW.body,NEW.created_at,NEW.delivery_key) IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.title_key,OLD.body,OLD.created_at,OLD.delivery_key)
   OR (OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at) THEN RAISE EXCEPTION 'NOTIFICATION_HISTORY_INVALID';END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_notification_view_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS notification_seen_guard ON public.notification_views;
CREATE TRIGGER notification_seen_guard BEFORE INSERT OR UPDATE ON public.notification_views FOR EACH ROW EXECUTE FUNCTION public.gw_notification_view_guard();
DROP TRIGGER IF EXISTS notification_read_guard ON public.notifications;
CREATE TRIGGER notification_read_guard BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.gw_notification_view_guard();
-- Supabase Data API grants: public.help_articles is projected through server routes;
-- public.slug_redirects and public.notification_views have no browser grants.
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.help_articles,public.slug_redirects,public.notification_views FROM PUBLIC,gw_read,gw_service;
GRANT SELECT ON public.help_articles,public.slug_redirects,public.notification_views TO gw_read;
GRANT SELECT,INSERT,UPDATE ON public.help_articles,public.notification_views TO gw_service;
GRANT SELECT,INSERT ON public.slug_redirects TO gw_service;
GRANT UPDATE(read_at) ON public.notifications TO gw_service;
DROP POLICY IF EXISTS help_read ON public.help_articles;
CREATE POLICY help_read ON public.help_articles FOR SELECT TO gw_read USING (published OR public.gw_staff_reader());
DROP POLICY IF EXISTS help_service ON public.help_articles;
CREATE POLICY help_service ON public.help_articles TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DROP POLICY IF EXISTS help_redirect_read ON public.slug_redirects;
CREATE POLICY help_redirect_read ON public.slug_redirects FOR SELECT TO gw_read USING(EXISTS(SELECT 1 FROM public.help_articles WHERE id=article_id AND published));
DROP POLICY IF EXISTS help_redirect_service ON public.slug_redirects;
CREATE POLICY help_redirect_service ON public.slug_redirects TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DROP POLICY IF EXISTS notification_views_owned ON public.notification_views;
CREATE POLICY notification_views_owned ON public.notification_views TO gw_read USING(public.gw_owns(user_id));
DROP POLICY IF EXISTS notification_views_service ON public.notification_views;
CREATE POLICY notification_views_service ON public.notification_views TO gw_service USING(user_id=public.gw_actor_id()) WITH CHECK(user_id=public.gw_actor_id());
DO $$ DECLARE browser text; BEGIN
 FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.help_articles,public.slug_redirects,public.notification_views FROM %I',browser);END IF;
 END LOOP;
END $$;
