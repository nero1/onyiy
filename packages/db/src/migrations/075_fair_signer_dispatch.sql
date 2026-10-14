CREATE TABLE public.signer_dispatch_cursor (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 last_created_at timestamptz,
 last_id uuid,
 CHECK((last_created_at IS NULL)=(last_id IS NULL))
);
-- Supabase Data API grants: public.signer_dispatch_cursor is ephemeral signer
-- scheduling metadata; it grants no financial mutation or signing capability.
ALTER TABLE public.signer_dispatch_cursor ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signer_dispatch_cursor FROM PUBLIC,gw_read,gw_service,gw_signer;
GRANT SELECT,INSERT ON public.signer_dispatch_cursor TO gw_signer;
GRANT UPDATE(last_created_at,last_id) ON public.signer_dispatch_cursor TO gw_signer;
CREATE POLICY signer_dispatch_scope ON public.signer_dispatch_cursor TO gw_signer
 USING(current_setting('gw.environment',true)='testnet') WITH CHECK(current_setting('gw.environment',true)='testnet');
DO $$ DECLARE browser text;BEGIN
 FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.signer_dispatch_cursor FROM %I',browser);END IF;
 END LOOP;
END $$;
