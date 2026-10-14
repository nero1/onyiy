-- Recovery identity belongs to the database, never to a connection endpoint.
-- Its row is deliberately excluded from native financial archives. Existing
-- endpoint-bound checkpoints remain retained and require a new recovery scan.
CREATE TABLE public.database_binding_nonce (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 nonce uuid NOT NULL DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO public.database_binding_nonce(singleton) VALUES(true);
CREATE TRIGGER database_binding_retained BEFORE UPDATE OR DELETE ON public.database_binding_nonce
 FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();
CREATE OR REPLACE FUNCTION public.gw_database_binding() RETURNS text
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE identity uuid;
BEGIN
 SELECT nonce INTO identity FROM public.database_binding_nonce WHERE singleton;
 IF identity IS NULL THEN
  INSERT INTO public.database_binding_nonce(singleton) VALUES(true) ON CONFLICT DO NOTHING;
  SELECT nonce INTO identity FROM public.database_binding_nonce WHERE singleton;
 END IF;
 RETURN identity::text||':'||current_database()||':'||(SELECT oid::text FROM pg_database WHERE datname=current_database());
END $$;
REVOKE ALL ON FUNCTION public.gw_database_binding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_database_binding() TO gw_read,gw_service,gw_signer;
-- Supabase Data API grants: public.database_binding_nonce is owner-controlled
-- connection identity. Runtime callers may execute the fixed function only.
ALTER TABLE public.database_binding_nonce ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.database_binding_nonce FROM PUBLIC,gw_read,gw_service,gw_signer;
DO $$ DECLARE browser text;BEGIN
 FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
   EXECUTE format('REVOKE ALL ON public.database_binding_nonce FROM %I',browser);
   EXECUTE format('REVOKE ALL ON FUNCTION public.gw_database_binding() FROM %I',browser);
  END IF;
 END LOOP;
END $$;
