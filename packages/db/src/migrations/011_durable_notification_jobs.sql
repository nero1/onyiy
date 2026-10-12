CREATE TABLE IF NOT EXISTS public.outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_key text NOT NULL UNIQUE,
  environment text NOT NULL CHECK (environment IN ('simulation','testnet','mainnet')),
  kind text NOT NULL CHECK (kind='notification'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object' AND octet_length(payload::text)<=8192),
  dispatched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON public.outbox(environment,created_at,id) WHERE dispatched_at IS NULL;
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid NOT NULL UNIQUE REFERENCES public.outbox(id) ON DELETE RESTRICT,
  business_key text NOT NULL UNIQUE,
  environment text NOT NULL CHECK (environment IN ('simulation','testnet','mainnet')),
  kind text NOT NULL CHECK (kind='notification'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object' AND octet_length(payload::text)<=8192),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','retry_wait','dead_letter')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts>=0),
  retry_limit integer NOT NULL CHECK (retry_limit BETWEEN 1 AND 1000000),
  due_at timestamptz NOT NULL DEFAULT now(),
  lease_generation integer NOT NULL DEFAULT 0 CHECK (lease_generation BETWEEN 0 AND 1000000),
  lease_token uuid,
  lease_until timestamptz,
  last_error_code text CHECK (last_error_code IN ('TRANSIENT_FAILURE','INVALID_JOB','LEASE_EXPIRED','PERMANENT_FAILURE')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_lease_shape CHECK ((status='running' AND lease_token IS NOT NULL AND lease_until IS NOT NULL) OR (status<>'running' AND lease_token IS NULL AND lease_until IS NULL)),
  CONSTRAINT jobs_completion_shape CHECK ((status IN ('done','dead_letter') AND completed_at IS NOT NULL) OR (status NOT IN ('done','dead_letter') AND completed_at IS NULL))
);
CREATE INDEX IF NOT EXISTS jobs_due_idx ON public.jobs(environment,status,due_at,id);
CREATE INDEX IF NOT EXISTS jobs_expired_lease_idx ON public.jobs(environment,lease_until,id) WHERE status='running';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS delivery_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_delivery_key_unique ON public.notifications(delivery_key);
CREATE TABLE IF NOT EXISTS public.scheduler_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL CHECK (environment IN ('simulation','testnet','mainnet')),
  nonce uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(environment,nonce)
);
CREATE INDEX IF NOT EXISTS scheduler_nonce_expiry_idx ON public.scheduler_nonces(expires_at,id);
CREATE TABLE IF NOT EXISTS public.scheduler_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL CHECK (environment IN ('simulation','testnet','mainnet')),
  run_key text NOT NULL,
  lease_generation integer NOT NULL DEFAULT 1 CHECK (lease_generation BETWEEN 1 AND 1000000),
  lease_token uuid NOT NULL,
  lease_until timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(environment,run_key)
);
CREATE INDEX IF NOT EXISTS scheduler_runs_lease_idx ON public.scheduler_runs(environment,lease_until,id) WHERE completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.gw_job_source_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.outbox o WHERE o.id=NEW.outbox_id AND ROW(o.business_key,o.environment,o.kind,o.payload) IS NOT DISTINCT FROM ROW(NEW.business_key,NEW.environment,NEW.kind,NEW.payload))
    THEN RAISE EXCEPTION 'JOB_SOURCE_INVALID'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_job_source_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS jobs_source_guard ON public.jobs;
CREATE TRIGGER jobs_source_guard BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.gw_job_source_guard();

CREATE OR REPLACE FUNCTION public.gw_job_identity_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'DURABLE_WORK_RETAINED'; END IF;
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
DROP TRIGGER IF EXISTS outbox_identity_guard ON public.outbox;
CREATE TRIGGER outbox_identity_guard BEFORE UPDATE OR DELETE ON public.outbox FOR EACH ROW EXECUTE FUNCTION public.gw_job_identity_guard();
DROP TRIGGER IF EXISTS jobs_identity_guard ON public.jobs;
CREATE TRIGGER jobs_identity_guard BEFORE UPDATE OR DELETE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.gw_job_identity_guard();
-- Supabase Data API grants: durable work/replay is server-only, never browser-accessible.
REVOKE ALL ON public.outbox,public.jobs,public.scheduler_nonces,public.scheduler_runs FROM PUBLIC,gw_read,gw_service;
DO $$
DECLARE table_name text; browser text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['outbox','jobs','scheduler_nonces','scheduler_runs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('DROP POLICY IF EXISTS gw_work_service ON public.%I',table_name);
    EXECUTE format('CREATE POLICY gw_work_service ON public.%I TO gw_service USING (environment=current_setting(''gw.environment'',true)) WITH CHECK (environment=current_setting(''gw.environment'',true))',table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,gw_read,gw_service',table_name);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO gw_service',table_name);
    FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
        EXECUTE format('REVOKE ALL ON public.%I FROM %I',table_name,browser);
      END IF;
    END LOOP;
  END LOOP;
END $$;
GRANT DELETE ON public.scheduler_nonces TO gw_service;
DO $$
DECLARE browser text;
BEGIN
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_job_identity_guard() FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_job_source_guard() FROM %I',browser);
    END IF;
  END LOOP;
END $$;
