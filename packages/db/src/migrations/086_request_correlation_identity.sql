-- One HTTP/job-origin correlation UUID spans audit and durable delivery.
ALTER TABLE public.audit_events ADD COLUMN request_id uuid DEFAULT nullif(current_setting('gw.request_id',true),'')::uuid;
ALTER TABLE public.outbox ADD COLUMN request_id uuid DEFAULT nullif(current_setting('gw.request_id',true),'')::uuid;
ALTER TABLE public.jobs ADD COLUMN request_id uuid DEFAULT nullif(current_setting('gw.request_id',true),'')::uuid;
CREATE INDEX audit_request_correlation_idx ON public.audit_events(request_id,id) WHERE request_id IS NOT NULL;
CREATE INDEX job_request_correlation_idx ON public.jobs(request_id,id) WHERE request_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.gw_job_source_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.outbox o WHERE o.id=NEW.outbox_id AND ROW(o.business_key,o.environment,o.kind,o.payload,date_trunc('milliseconds',o.redacted_at),o.redacted_payload_hash,o.request_id) IS NOT DISTINCT FROM ROW(NEW.business_key,NEW.environment,NEW.kind,NEW.payload,date_trunc('milliseconds',NEW.redacted_at),NEW.redacted_payload_hash,NEW.request_id))
    THEN RAISE EXCEPTION 'JOB_SOURCE_INVALID'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_job_source_guard() FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.gw_job_identity_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'DURABLE_WORK_RETAINED'; END IF;

  IF OLD.kind='notification' AND OLD.payload->>'title_key'='admin_message' AND OLD.redacted_at IS NULL AND NEW.redacted_at IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=(OLD.payload->>'user_id')::uuid AND u.status='deleted') OR NEW.payload IS DISTINCT FROM jsonb_set(OLD.payload,'{body}','"[redacted]"'::jsonb) OR NEW.redacted_payload_hash IS DISTINCT FROM encode(sha256(convert_to(OLD.payload::text,'UTF8')),'hex') OR (to_jsonb(NEW)-ARRAY['payload','redacted_at','redacted_payload_hash']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['payload','redacted_at','redacted_payload_hash']) THEN RAISE EXCEPTION 'REDACTION_SCOPE_DENIED';END IF;
   RETURN NEW;
  END IF;
  IF (NEW.redacted_at,NEW.redacted_payload_hash) IS DISTINCT FROM (OLD.redacted_at,OLD.redacted_payload_hash) THEN RAISE EXCEPTION 'JOB_IDENTITY_IMMUTABLE';END IF;
  IF NEW.request_id IS DISTINCT FROM OLD.request_id THEN RAISE EXCEPTION 'JOB_IDENTITY_IMMUTABLE';END IF;
  IF TG_TABLE_NAME='outbox' THEN
    IF ROW(NEW.id,NEW.business_key,NEW.environment,NEW.kind,NEW.payload,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.business_key,OLD.environment,OLD.kind,OLD.payload,OLD.created_at)
      OR (OLD.dispatched_at IS NOT NULL AND NEW.dispatched_at IS DISTINCT FROM OLD.dispatched_at) THEN RAISE EXCEPTION 'JOB_IDENTITY_IMMUTABLE'; END IF;
  ELSE
    IF ROW(NEW.id,NEW.outbox_id,NEW.business_key,NEW.environment,NEW.kind,NEW.payload,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.outbox_id,OLD.business_key,OLD.environment,OLD.kind,OLD.payload,OLD.created_at)
      OR NEW.attempts<OLD.attempts OR NEW.lease_generation<OLD.lease_generation OR (OLD.status='done' AND NEW IS DISTINCT FROM OLD) THEN RAISE EXCEPTION 'JOB_IDENTITY_IMMUTABLE'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_job_identity_guard() FROM PUBLIC;
