ALTER TABLE public.operational_alerts ADD COLUMN occurrence integer NOT NULL DEFAULT 1 CHECK(occurrence>0),
 ADD COLUMN escalation_step integer NOT NULL DEFAULT 0 CHECK(escalation_step>=0),
 ADD COLUMN occurrence_started_at timestamptz NOT NULL DEFAULT clock_timestamp();
UPDATE public.operational_alerts SET occurrence_started_at=created_at;
ALTER TABLE public.alert_deliveries ADD COLUMN occurrence integer NOT NULL DEFAULT 1 CHECK(occurrence>0),
 ADD COLUMN payload_text text,
 ADD COLUMN payload_hash text CHECK(payload_hash IS NULL OR length(payload_hash)=64);
ALTER TABLE public.alert_deliveries DROP CONSTRAINT alert_deliveries_status_check;
ALTER TABLE public.alert_deliveries ADD CONSTRAINT alert_deliveries_status_check CHECK(status IN ('pending','sending','delivered','failed','cancelled'));
-- No historical body is fabricated for an attempted legacy delivery. Keep its
-- attempted evidence and retire uncertain retries instead of recycling a key.
UPDATE public.alert_deliveries SET status='cancelled',lease_token=NULL,lease_until=NULL WHERE attempts>0 AND status IN ('pending','sending','failed');
UPDATE public.alert_deliveries d SET payload_text=jsonb_build_object('version',1,'environment','testnet','delivery_key',d.business_key,'severity',a.severity,'category',a.category,'details',a.safe_details)::text
 FROM public.operational_alerts a WHERE a.id=d.alert_id AND d.attempts=0;
UPDATE public.alert_deliveries SET payload_hash=encode(sha256(convert_to(payload_text,'UTF8')),'hex') WHERE payload_text IS NOT NULL;
CREATE INDEX alert_claim_priority_idx ON public.operational_alerts(severity,status,occurrence,id);
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
 IF body IS DISTINCT FROM jsonb_build_object('version',1,'environment','testnet','delivery_key',NEW.business_key,'severity',a.severity,'category',a.category,'details',a.safe_details) THEN RAISE EXCEPTION 'ALERT_PAYLOAD_REQUIRED';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_alert_delivery_guard() FROM PUBLIC;
CREATE TRIGGER alert_delivery_guard BEFORE INSERT OR UPDATE OR DELETE ON public.alert_deliveries FOR EACH ROW EXECUTE FUNCTION public.gw_alert_delivery_guard();
