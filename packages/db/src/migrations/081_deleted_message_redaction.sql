-- Nonfinancial delivery erasure keeps source IDs and original digests.
ALTER TABLE public.outbox ADD COLUMN redacted_at timestamptz, ADD COLUMN redacted_payload_hash text CHECK(redacted_payload_hash IS NULL OR length(redacted_payload_hash)=64);
ALTER TABLE public.jobs ADD COLUMN redacted_at timestamptz, ADD COLUMN redacted_payload_hash text CHECK(redacted_payload_hash IS NULL OR length(redacted_payload_hash)=64);
ALTER TABLE public.notifications ADD COLUMN redacted_at timestamptz, ADD COLUMN redacted_body_hash text CHECK(redacted_body_hash IS NULL OR length(redacted_body_hash)=64);
GRANT UPDATE(body,redacted_at,redacted_body_hash) ON public.notifications TO gw_service;
ALTER TABLE public.outbox DROP CONSTRAINT outbox_kind_check;
ALTER TABLE public.outbox ADD CONSTRAINT outbox_kind_check CHECK(kind IN ('notification','financial_reconciliation','operational_cleanup','own_export','chain_observation','privacy_redaction'));
ALTER TABLE public.jobs DROP CONSTRAINT jobs_kind_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_kind_check CHECK(kind IN ('notification','financial_reconciliation','operational_cleanup','own_export','chain_observation','privacy_redaction'));
CREATE INDEX notification_redaction_idx ON public.notifications(user_id,title_key,id) WHERE redacted_at IS NULL;
CREATE INDEX outbox_redaction_idx ON public.outbox((payload->>'user_id'),id) WHERE kind='notification' AND redacted_at IS NULL;
CREATE INDEX job_redaction_idx ON public.jobs((payload->>'user_id'),id) WHERE kind='notification' AND redacted_at IS NULL;
CREATE OR REPLACE FUNCTION public.gw_job_identity_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'DURABLE_WORK_RETAINED'; END IF;

  IF OLD.kind='notification' AND OLD.payload->>'title_key'='admin_message' AND OLD.redacted_at IS NULL AND NEW.redacted_at IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=(OLD.payload->>'user_id')::uuid AND u.status='deleted') OR NEW.payload IS DISTINCT FROM jsonb_set(OLD.payload,'{body}','"[redacted]"'::jsonb) OR NEW.redacted_payload_hash IS DISTINCT FROM encode(sha256(convert_to(OLD.payload::text,'UTF8')),'hex') OR (to_jsonb(NEW)-ARRAY['payload','redacted_at','redacted_payload_hash']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['payload','redacted_at','redacted_payload_hash']) THEN RAISE EXCEPTION 'REDACTION_SCOPE_DENIED';END IF;
   RETURN NEW;
  END IF;
  IF (NEW.redacted_at,NEW.redacted_payload_hash) IS DISTINCT FROM (OLD.redacted_at,OLD.redacted_payload_hash) THEN RAISE EXCEPTION 'JOB_IDENTITY_IMMUTABLE';END IF;
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
CREATE OR REPLACE FUNCTION public.gw_job_source_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.outbox o WHERE o.id=NEW.outbox_id AND ROW(o.business_key,o.environment,o.kind,o.payload,o.redacted_at,o.redacted_payload_hash) IS NOT DISTINCT FROM ROW(NEW.business_key,NEW.environment,NEW.kind,NEW.payload,NEW.redacted_at,NEW.redacted_payload_hash))
    THEN RAISE EXCEPTION 'JOB_SOURCE_INVALID'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_job_source_guard() FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.gw_notification_view_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='notification_views' THEN
  IF TG_OP='UPDATE' AND (NEW.user_id<>OLD.user_id OR (NEW.seen_at,NEW.seen_id)<(OLD.seen_at,OLD.seen_id)) THEN RAISE EXCEPTION 'NOTIFICATION_SEEN_INVALID';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE id=NEW.seen_id AND user_id=NEW.user_id AND created_at=NEW.seen_at) THEN RAISE EXCEPTION 'NOTIFICATION_SEEN_INVALID';END IF;
 ELSE

  IF OLD.title_key='admin_message' AND OLD.redacted_at IS NULL AND NEW.redacted_at IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=OLD.user_id AND u.status='deleted') OR NEW.body<>'[redacted]' OR NEW.redacted_body_hash IS DISTINCT FROM encode(sha256(convert_to(OLD.body,'UTF8')),'hex') OR (to_jsonb(NEW)-ARRAY['body','redacted_at','redacted_body_hash']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['body','redacted_at','redacted_body_hash']) THEN RAISE EXCEPTION 'REDACTION_SCOPE_DENIED';END IF;
   RETURN NEW;
  END IF;
  IF (NEW.redacted_at,NEW.redacted_body_hash) IS DISTINCT FROM (OLD.redacted_at,OLD.redacted_body_hash) THEN RAISE EXCEPTION 'NOTIFICATION_HISTORY_INVALID';END IF;
  IF (NEW.id,NEW.user_id,NEW.title_key,NEW.body,NEW.created_at,NEW.delivery_key) IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.title_key,OLD.body,OLD.created_at,OLD.delivery_key)
   OR (OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at) THEN RAISE EXCEPTION 'NOTIFICATION_HISTORY_INVALID';END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_notification_view_guard() FROM PUBLIC;
