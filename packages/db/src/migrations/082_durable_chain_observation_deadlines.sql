CREATE TABLE public.chain_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_key text NOT NULL UNIQUE,
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 invoice_id uuid NOT NULL REFERENCES public.crypto_invoices(id) ON DELETE RESTRICT,
 tx_hash text NOT NULL,event_index integer NOT NULL CHECK(event_index BETWEEN -1 AND 1000),
 source_job_id uuid UNIQUE REFERENCES public.jobs(id) ON DELETE RESTRICT,
 rounds integer NOT NULL DEFAULT 0 CHECK(rounds BETWEEN 0 AND 2880),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done','review')),
 next_observation_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(invoice_id,tx_hash,event_index)
);
CREATE INDEX chain_observation_due_idx ON public.chain_observations(status,next_observation_at,id);
-- Supabase Data API grants: public.chain_observations is server-only durable
-- observation coordination; no browser/signer access or signing authority.
ALTER TABLE public.chain_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chain_observations FROM PUBLIC,gw_read,gw_signer;
GRANT SELECT,INSERT ON public.chain_observations TO gw_service;
GRANT UPDATE(source_job_id,rounds,status,next_observation_at) ON public.chain_observations TO gw_service;
CREATE POLICY observation_service ON public.chain_observations TO gw_service
 USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
CREATE OR REPLACE FUNCTION public.gw_observation_identity_guard() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'OBSERVATION_IDENTITY_RETAINED';END IF;
 IF (to_jsonb(NEW)-ARRAY['source_job_id','rounds','status','next_observation_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['source_job_id','rounds','status','next_observation_at']) OR NEW.rounds<OLD.rounds OR (OLD.source_job_id IS NOT NULL AND NEW.source_job_id IS DISTINCT FROM OLD.source_job_id) OR (OLD.status<>'pending' AND NEW.status<>OLD.status) THEN RAISE EXCEPTION 'OBSERVATION_IDENTITY_IMMUTABLE';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_observation_identity_guard() FROM PUBLIC;
CREATE TRIGGER observation_identity_guard BEFORE UPDATE OR DELETE ON public.chain_observations FOR EACH ROW EXECUTE FUNCTION public.gw_observation_identity_guard();
DO $$ DECLARE browser text;BEGIN
 FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.chain_observations FROM %I',browser);END IF;
 END LOOP;
END $$;
