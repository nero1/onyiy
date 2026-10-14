CREATE TABLE public.operational_diagnostics (
 environment text PRIMARY KEY CHECK(environment IN ('simulation','testnet')),
 snapshot jsonb NOT NULL CHECK(octet_length(snapshot::text)<=8192),observed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.provider_quota_reports (
 environment text NOT NULL CHECK(environment IN ('simulation','testnet')),
 provider text NOT NULL CHECK(provider IN ('postgres','vercel','cache','rpc')),
 used numeric(18,0) NOT NULL CHECK(used>=0),capacity numeric(18,0) NOT NULL CHECK(capacity>0),
 observed_at timestamptz NOT NULL,revision integer NOT NULL CHECK(revision>0),
 binding_fingerprint text NOT NULL CHECK(length(binding_fingerprint)=64),
 actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 proof_reference text NOT NULL CHECK(length(proof_reference) BETWEEN 5 AND 200),
 PRIMARY KEY(environment,provider)
);
-- Supabase Data API grants: public.operational_diagnostics contains only cached
-- bounded aggregate health; public.provider_quota_reports retains audited staff
-- measurements. Neither grants browser or signer access.
DO $$ DECLARE resource text;browser text;BEGIN
 FOREACH resource IN ARRAY ARRAY['operational_diagnostics','provider_quota_reports'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',resource);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,gw_read,gw_signer',resource);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO gw_service',resource);
  EXECUTE format('CREATE POLICY operational_service ON public.%I TO gw_service USING(current_setting(''gw.access'',true)=''service'') WITH CHECK(current_setting(''gw.access'',true)=''service'')',resource);
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',resource,browser);END IF;
  END LOOP;
 END LOOP;
END $$;

-- Operational alerts snapshot their actual environment as well.
CREATE OR REPLACE FUNCTION public.gw_alert_delivery_guard() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE body jsonb;a public.operational_alerts;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ALERT_DELIVERY_RETAINED';END IF;
 IF TG_OP='UPDATE' THEN
  IF (NEW.id,NEW.alert_id,NEW.business_key,NEW.occurrence,NEW.payload_text,NEW.payload_hash,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.alert_id,OLD.business_key,OLD.occurrence,OLD.payload_text,OLD.payload_hash,OLD.created_at) OR NEW.attempts<OLD.attempts OR NEW.lease_generation<OLD.lease_generation THEN RAISE EXCEPTION 'ALERT_DELIVERY_IMMUTABLE';END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO a FROM public.operational_alerts WHERE id=NEW.alert_id;
 IF NEW.payload_text IS NULL OR NEW.payload_hash IS DISTINCT FROM encode(sha256(convert_to(NEW.payload_text,'UTF8')),'hex') OR NEW.occurrence<>a.occurrence THEN RAISE EXCEPTION 'ALERT_PAYLOAD_REQUIRED';END IF;
 body:=NEW.payload_text::jsonb;
 IF body IS DISTINCT FROM jsonb_build_object('version',1,'environment',a.environment,'delivery_key',NEW.business_key,'severity',a.severity,'category',a.category,'details',a.safe_details) THEN RAISE EXCEPTION 'ALERT_PAYLOAD_REQUIRED';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_alert_delivery_guard() FROM PUBLIC;
