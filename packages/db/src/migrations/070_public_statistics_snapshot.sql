CREATE TABLE IF NOT EXISTS public.public_statistics(environment text PRIMARY KEY CHECK(environment IN ('simulation','testnet')),members bigint NOT NULL CHECK(members>=0),pending_registrations bigint NOT NULL CHECK(pending_registrations>=0),settled_member_usd numeric(78,18) NOT NULL CHECK(settled_member_usd>=0),observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz NOT NULL);
-- Supabase Data API grants: public.public_statistics contains only explicitly
-- projected environment-specific counters; no financial evidence or identity.
ALTER TABLE public.public_statistics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_statistics FROM PUBLIC,gw_read,gw_signer;
GRANT SELECT,INSERT,UPDATE ON public.public_statistics TO gw_service;
CREATE POLICY stats_service ON public.public_statistics TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DO $$ DECLARE browser text;BEGIN FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.public_statistics FROM %I',browser);END IF;END LOOP;END $$;
