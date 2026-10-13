CREATE TABLE IF NOT EXISTS public.recovery_view_caps(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),recovery_id uuid NOT NULL REFERENCES public.liability_recoveries(id) ON DELETE RESTRICT,token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX IF NOT EXISTS recovery_view_expiry_idx ON public.recovery_view_caps(expires_at,id);
CREATE OR REPLACE FUNCTION public.gw_recovery_view_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='UPDATE' OR OLD.expires_at>clock_timestamp() OR current_setting('gw.operational_retention_hold',true)='true' THEN RAISE EXCEPTION 'RECOVERY_VIEW_RETAINED';END IF;RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.gw_recovery_view_guard() FROM PUBLIC;
CREATE TRIGGER recovery_view_guard BEFORE UPDATE OR DELETE ON public.recovery_view_caps FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_view_guard();
-- Supabase Data API grants: public.recovery_view_caps is ephemeral server-only
-- authority for a closed statement, excluded from financial archives.
ALTER TABLE public.recovery_view_caps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recovery_view_caps FROM PUBLIC,gw_read,gw_service;
GRANT SELECT,INSERT,DELETE ON public.recovery_view_caps TO gw_service;
CREATE POLICY recovery_view_service ON public.recovery_view_caps TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DO $$ DECLARE browser text;BEGIN FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.recovery_view_caps FROM %I',browser);END IF;END LOOP;END $$;
