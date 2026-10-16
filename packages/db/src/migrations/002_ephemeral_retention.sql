-- Bounded retention of expendable messages/work payloads. Keys and money remain.
-- Paste the complete file once after 001; never replace installed receipts.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('gw-schema-migrations',0));
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='120s';
ALTER TABLE public.notifications ADD COLUMN retired_at timestamptz, ADD COLUMN retired_body_hash text,
 ADD CONSTRAINT notifications_retirement_check CHECK((retired_at IS NULL AND retired_body_hash IS NULL) OR (retired_at IS NOT NULL AND retired_body_hash IS NOT NULL AND retired_body_hash ~ '^[a-f0-9]{64}$'));
ALTER TABLE public.jobs ADD COLUMN retired_at timestamptz, ADD COLUMN retired_payload_hash text,
 ADD CONSTRAINT jobs_retirement_check CHECK((retired_at IS NULL AND retired_payload_hash IS NULL) OR (retired_at IS NOT NULL AND retired_payload_hash IS NOT NULL AND retired_payload_hash ~ '^[a-f0-9]{64}$'));
ALTER TABLE public.outbox ADD COLUMN retired_at timestamptz, ADD COLUMN retired_payload_hash text,
 ADD CONSTRAINT outbox_retirement_check CHECK((retired_at IS NULL AND retired_payload_hash IS NULL) OR (retired_at IS NOT NULL AND retired_payload_hash IS NOT NULL AND retired_payload_hash ~ '^[a-f0-9]{64}$'));
CREATE INDEX notifications_retention_idx ON public.notifications(created_at,id) WHERE retired_at IS NULL;
CREATE INDEX jobs_retention_idx ON public.jobs(environment,completed_at,id) WHERE status='done' AND retired_at IS NULL;
CREATE INDEX outbox_retention_idx ON public.outbox(environment,created_at,id) WHERE retired_at IS NULL;

CREATE OR REPLACE FUNCTION public.gw_job_identity_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'DURABLE_WORK_RETAINED'; END IF;

  IF OLD.retired_at IS NULL AND NEW.retired_at IS NOT NULL THEN
   IF NEW.payload<>'{}'::jsonb OR NEW.retired_payload_hash IS DISTINCT FROM encode(sha256(convert_to(OLD.payload::text,'UTF8')),'hex')
    OR OLD.kind NOT IN ('notification','own_export','operational_cleanup','privacy_redaction')
    OR (to_jsonb(NEW)-ARRAY['payload','retired_at','retired_payload_hash']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['payload','retired_at','retired_payload_hash'])
    OR current_setting('gw.operational_retention_hold',true)='true' THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;
   IF TG_TABLE_NAME='jobs' THEN
    IF OLD.status<>'done' OR OLD.completed_at IS NULL OR OLD.completed_at>=clock_timestamp()-((SELECT value->>'job_terminal_days' FROM public.x_manifest WHERE key='retention_policy')::integer)*interval '1 day'
      OR OLD.lease_token IS NOT NULL OR OLD.lease_until IS NOT NULL THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;
   ELSE
    IF OLD.dispatched_at IS NULL OR NOT EXISTS(SELECT 1 FROM public.jobs j WHERE j.outbox_id=OLD.id AND j.status='done' AND j.retired_at IS NOT NULL) THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;
   END IF;
   RETURN NEW;
  END IF;
  IF (NEW.retired_at,NEW.retired_payload_hash) IS DISTINCT FROM (OLD.retired_at,OLD.retired_payload_hash) THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;
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

CREATE OR REPLACE FUNCTION public.gw_notification_view_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
BEGIN
 IF TG_TABLE_NAME='notification_views' THEN
  IF TG_OP='UPDATE' AND (NEW.user_id<>OLD.user_id OR (NEW.seen_at,NEW.seen_id)<(OLD.seen_at,OLD.seen_id)) THEN RAISE EXCEPTION 'NOTIFICATION_SEEN_INVALID';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE id=NEW.seen_id AND user_id=NEW.user_id AND created_at=NEW.seen_at) THEN RAISE EXCEPTION 'NOTIFICATION_SEEN_INVALID';END IF;
 ELSE
  IF OLD.retired_at IS NULL AND NEW.retired_at IS NOT NULL THEN
   IF NEW.body<>'[expired]' OR NEW.retired_body_hash IS DISTINCT FROM encode(sha256(convert_to(OLD.body,'UTF8')),'hex')
    OR OLD.created_at>=clock_timestamp()-((SELECT value->>'notification_days' FROM public.x_manifest WHERE key='retention_policy')::integer)*interval '1 day'
    OR (to_jsonb(NEW)-ARRAY['body','retired_at','retired_body_hash']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['body','retired_at','retired_body_hash'])
    OR current_setting('gw.operational_retention_hold',true)='true' THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;
   RETURN NEW;
  END IF;
  IF (NEW.retired_at,NEW.retired_body_hash) IS DISTINCT FROM (OLD.retired_at,OLD.retired_body_hash) THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;

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

CREATE FUNCTION public.gw_retire_ephemeral_batch(maximum integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE policy jsonb; selected_environment text; notices integer; work integer; dispatch integer; more boolean;
BEGIN
 selected_environment:=current_setting('gw.environment',true);
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' OR selected_environment NOT IN ('simulation','testnet') OR selected_environment IS NULL OR maximum<1 OR maximum>100 OR maximum IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF current_setting('gw.operational_retention_hold',true)='true' THEN RETURN jsonb_build_object('notifications',0,'jobs',0,'outbox',0,'held',true,'more_possible',false); END IF;
 SELECT value INTO policy FROM public.x_manifest WHERE key='retention_policy' AND scope='staff' FOR SHARE;
 IF policy IS NULL OR policy->>'notification_days' IS NULL OR policy->>'job_terminal_days' IS NULL OR (policy->>'notification_days')::integer NOT BETWEEN 1 AND 1000000 OR (policy->>'job_terminal_days')::integer NOT BETWEEN 1 AND 1000000 THEN RAISE EXCEPTION 'CONFIGURATION_INVALID'; END IF;
 WITH candidates AS (SELECT n.id FROM public.notifications n WHERE n.retired_at IS NULL AND n.created_at<clock_timestamp()-(policy->>'notification_days')::integer*interval '1 day' ORDER BY n.created_at,n.id LIMIT maximum FOR UPDATE SKIP LOCKED)
 UPDATE public.notifications n SET body='[expired]',retired_at=clock_timestamp(),retired_body_hash=encode(sha256(convert_to(n.body,'UTF8')),'hex') FROM candidates c WHERE n.id=c.id;
 GET DIAGNOSTICS notices=ROW_COUNT;
 WITH candidates AS (SELECT j.id FROM public.jobs j WHERE j.environment=selected_environment AND j.status='done' AND j.retired_at IS NULL AND j.completed_at<clock_timestamp()-(policy->>'job_terminal_days')::integer*interval '1 day'
  AND j.kind IN ('notification','own_export','operational_cleanup','privacy_redaction') AND j.lease_token IS NULL AND j.lease_until IS NULL
  ORDER BY j.completed_at,j.id LIMIT maximum FOR UPDATE SKIP LOCKED)
 UPDATE public.jobs j SET payload='{}'::jsonb,retired_at=clock_timestamp(),retired_payload_hash=encode(sha256(convert_to(j.payload::text,'UTF8')),'hex') FROM candidates c WHERE j.id=c.id;
 GET DIAGNOSTICS work=ROW_COUNT;
 WITH candidates AS (SELECT o.id FROM public.outbox o JOIN public.jobs j ON j.outbox_id=o.id WHERE o.environment=selected_environment AND o.retired_at IS NULL AND o.dispatched_at IS NOT NULL AND j.status='done' AND j.retired_at IS NOT NULL
  AND o.kind IN ('notification','own_export','operational_cleanup','privacy_redaction') ORDER BY o.created_at,o.id LIMIT maximum FOR UPDATE OF o SKIP LOCKED)
 UPDATE public.outbox o SET payload='{}'::jsonb,retired_at=clock_timestamp(),retired_payload_hash=encode(sha256(convert_to(o.payload::text,'UTF8')),'hex') FROM candidates c WHERE o.id=c.id;
 GET DIAGNOSTICS dispatch=ROW_COUNT;
 SELECT EXISTS(SELECT 1 FROM public.notifications n WHERE n.retired_at IS NULL AND n.created_at<clock_timestamp()-(policy->>'notification_days')::integer*interval '1 day')
  OR EXISTS(SELECT 1 FROM public.jobs j WHERE j.environment=selected_environment AND j.status='done' AND j.retired_at IS NULL AND j.completed_at<clock_timestamp()-(policy->>'job_terminal_days')::integer*interval '1 day' AND j.kind IN ('notification','own_export','operational_cleanup','privacy_redaction') AND j.lease_token IS NULL AND j.lease_until IS NULL)
  OR EXISTS(SELECT 1 FROM public.outbox o JOIN public.jobs j ON j.outbox_id=o.id WHERE o.environment=selected_environment AND o.retired_at IS NULL AND o.dispatched_at IS NOT NULL AND j.status='done' AND j.retired_at IS NOT NULL AND o.kind IN ('notification','own_export','operational_cleanup','privacy_redaction')) INTO more;
 RETURN jsonb_build_object('notifications',notices,'jobs',work,'outbox',dispatch,'held',false,'more_possible',more);
END $$;
DO $acl$
DECLARE recipient text;
BEGIN
 FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid='public.gw_retire_ephemeral_batch(integer)'::regprocedure AND a.grantee<>p.proowner
 LOOP EXECUTE 'REVOKE ALL ON FUNCTION public.gw_retire_ephemeral_batch(integer) FROM '||recipient; END LOOP;
END $acl$;
GRANT EXECUTE ON FUNCTION public.gw_retire_ephemeral_batch(integer) TO gw_service;
-- Keep ordinary dispatch/retry/privacy updates, without granting new lifecycle fields.
REVOKE UPDATE ON TABLE public.jobs, public.outbox FROM gw_service;
REVOKE UPDATE(retired_at,retired_payload_hash) ON public.jobs FROM gw_service;
REVOKE UPDATE(retired_at,retired_payload_hash) ON public.outbox FROM gw_service;
GRANT UPDATE(status,attempts,retry_limit,due_at,lease_generation,lease_token,lease_until,last_error_code,completed_at,updated_at,payload,redacted_at,redacted_payload_hash) ON public.jobs TO gw_service;
GRANT UPDATE(dispatched_at,payload,redacted_at,redacted_payload_hash) ON public.outbox TO gw_service;
-- No direct retirement-column writes, table DELETE, financial mutation or new
-- browser-role grants are introduced. Permanent keys/lineage remain online.

-- Baseline receipt: SHA256 of every preceding byte; generated, do not edit.
INSERT INTO public.schema_migrations(name,sha256) VALUES('002_ephemeral_retention.sql','9803ff7f3b6806a6d4bf7702e03e8d79'||'3e970d887ad844734074c7943a223914');
COMMIT;
