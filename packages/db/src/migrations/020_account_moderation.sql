ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_revision integer NOT NULL DEFAULT 1 CHECK(account_revision>0);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspension_until timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suspension_previous_status text CHECK(suspension_previous_status IN ('active','deactivated'));
CREATE TABLE IF NOT EXISTS public.reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 target_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,reason_hash text NOT NULL CHECK(length(reason_hash)=64),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed','appealed')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),case_token_hash text,case_token_expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_dedupe_idx ON public.reports(actor_id,target_id,reason_hash,created_at);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status,created_at,id);
CREATE TABLE IF NOT EXISTS public.appeals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')),revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS appeal_open_case_unique ON public.appeals(report_id) WHERE status='open';
CREATE OR REPLACE FUNCTION public.gw_case_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_TABLE_NAME='reports' THEN
  IF (NEW.id,NEW.actor_id,NEW.target_id,NEW.reason_hash,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.actor_id,OLD.target_id,OLD.reason_hash,OLD.created_at) THEN RAISE EXCEPTION 'CASE_HISTORY_INVALID';END IF;
 ELSE
  IF (NEW.id,NEW.report_id,NEW.actor_id,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.report_id,OLD.actor_id,OLD.created_at) THEN RAISE EXCEPTION 'CASE_HISTORY_INVALID';END IF;
 END IF;
 IF NEW.body IS DISTINCT FROM OLD.body AND NEW.body<>'[redacted]' THEN RAISE EXCEPTION 'CASE_HISTORY_INVALID';END IF;
 IF NEW.revision<OLD.revision THEN RAISE EXCEPTION 'CASE_REVISION_INVALID';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_case_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS report_history_guard ON public.reports;
CREATE TRIGGER report_history_guard BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.gw_case_guard();
DROP TRIGGER IF EXISTS appeal_history_guard ON public.appeals;
CREATE TRIGGER appeal_history_guard BEFORE UPDATE ON public.appeals FOR EACH ROW EXECUTE FUNCTION public.gw_case_guard();
-- Supabase Data API grants: public.reports and public.appeals are server routes only.
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reports,public.appeals FROM PUBLIC,gw_read,gw_service;
GRANT SELECT ON public.reports,public.appeals TO gw_read;
GRANT SELECT,INSERT,UPDATE ON public.reports,public.appeals TO gw_service;
DROP POLICY IF EXISTS report_reader ON public.reports;
CREATE POLICY report_reader ON public.reports FOR SELECT TO gw_read USING(public.gw_owns(actor_id) OR public.gw_owns(target_id) OR public.gw_staff_reader());
DROP POLICY IF EXISTS appeal_reader ON public.appeals;
CREATE POLICY appeal_reader ON public.appeals FOR SELECT TO gw_read USING(public.gw_owns(actor_id) OR public.gw_staff_reader());
DROP POLICY IF EXISTS report_service ON public.reports;
CREATE POLICY report_service ON public.reports TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DROP POLICY IF EXISTS appeal_service ON public.appeals;
CREATE POLICY appeal_service ON public.appeals TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
-- Explicit privacy erasure is isolated from all financial tables.
GRANT DELETE ON public.referral_codes,public.user_identities,public.auth_refresh_tokens,public.auth_sessions,public.auth_totp_replays,public.auth_recovery_codes,public.auth_factors TO gw_service;
DO $$ DECLARE browser text;BEGIN
 FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.reports,public.appeals FROM %I',browser);END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.gw_account_tombstone_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.status='deleted' AND (NEW.status,NEW.username,NEW.email,NEW.role) IS DISTINCT FROM (OLD.status,OLD.username,OLD.email,OLD.role) THEN RAISE EXCEPTION 'ACCOUNT_TOMBSTONE_IMMUTABLE';END IF;
 IF NEW.account_revision<OLD.account_revision THEN RAISE EXCEPTION 'ACCOUNT_REVISION_INVALID';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_account_tombstone_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS account_tombstone_guard ON public.users;
CREATE TRIGGER account_tombstone_guard BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.gw_account_tombstone_guard();
