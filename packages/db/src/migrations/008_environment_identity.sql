-- Internal identity proves migration/runtime URLs target the same namespace.
CREATE TABLE IF NOT EXISTS public.environment_instances (
  environment text PRIMARY KEY CHECK (environment IN ('simulation','testnet','mainnet')),
  instance_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.environment_instances(environment) VALUES ('simulation') ON CONFLICT DO NOTHING;
ALTER TABLE public.environment_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gw_instance_read ON public.environment_instances;
CREATE POLICY gw_instance_read ON public.environment_instances FOR SELECT TO gw_service
  USING (environment=current_setting('gw.environment',true));

-- Supabase Data API grants: internal metadata; no browser or Data API access.
REVOKE ALL ON public.environment_instances FROM PUBLIC, gw_read, gw_service;
GRANT SELECT ON public.environment_instances TO gw_service;
DO $$
DECLARE browser text;
BEGIN
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
      EXECUTE format('REVOKE ALL ON public.environment_instances FROM %I',browser);
    END IF;
  END LOOP;
END $$;
