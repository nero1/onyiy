-- This small infrastructure migration may bootstrap before application DDL so
-- CI proves its target before applying financial migrations. Provision groups
-- first, as SETUP requires; no browser or financial permissions are added.
CREATE TABLE IF NOT EXISTS public.deployment_binding_challenges (
  id uuid PRIMARY KEY,
  environment text NOT NULL CHECK (environment IN ('simulation','testnet','mainnet')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS binding_challenge_expiry_idx ON public.deployment_binding_challenges(expires_at,id);
-- Supabase Data API grants: server-only, owner-written connection proof.
ALTER TABLE public.deployment_binding_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gw_binding_read ON public.deployment_binding_challenges;
CREATE POLICY gw_binding_read ON public.deployment_binding_challenges FOR SELECT TO gw_service
  USING (environment=current_setting('gw.environment',true) AND expires_at>clock_timestamp());
REVOKE ALL ON public.deployment_binding_challenges FROM PUBLIC,gw_read,gw_service;
GRANT SELECT ON public.deployment_binding_challenges TO gw_service;
DO $$
DECLARE browser text;
BEGIN
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
      EXECUTE format('REVOKE ALL ON public.deployment_binding_challenges FROM %I',browser);
    END IF;
  END LOOP;
END $$;
