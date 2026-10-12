ALTER TABLE public.outbox DROP CONSTRAINT IF EXISTS outbox_kind_check;
ALTER TABLE public.outbox ADD CONSTRAINT outbox_kind_check CHECK (kind IN ('notification','financial_reconciliation','operational_cleanup'));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_kind_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_kind_check CHECK (kind IN ('notification','financial_reconciliation','operational_cleanup'));
CREATE INDEX IF NOT EXISTS scheduler_runs_completed_idx ON public.scheduler_runs(environment,completed_at,id) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS scheduler_nonce_environment_expiry_idx ON public.scheduler_nonces(environment,expires_at,id);

CREATE TABLE IF NOT EXISTS public.maintenance_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_job_id uuid NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE RESTRICT,
  environment text NOT NULL CHECK (environment IN ('simulation','testnet','mainnet')),
  run_date date NOT NULL,
  page_number integer NOT NULL CHECK (page_number BETWEEN 0 AND 1000000),
  lease_generation integer NOT NULL CHECK (lease_generation BETWEEN 1 AND 1000000),
  nonces_deleted integer NOT NULL CHECK (nonces_deleted BETWEEN 0 AND 100),
  runs_deleted integer NOT NULL CHECK (runs_deleted BETWEEN 0 AND 100),
  batch_limit integer NOT NULL CHECK (batch_limit BETWEEN 1 AND 100),
  held boolean NOT NULL,
  more_possible boolean NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT maintenance_result_bounds CHECK (nonces_deleted<=batch_limit AND runs_deleted<=batch_limit AND (NOT held OR (nonces_deleted=0 AND runs_deleted=0 AND NOT more_possible)))
);
CREATE INDEX IF NOT EXISTS maintenance_history_idx ON public.maintenance_results(environment,checked_at,id);
DROP TRIGGER IF EXISTS maintenance_results_append_only ON public.maintenance_results;
CREATE TRIGGER maintenance_results_append_only BEFORE UPDATE OR DELETE ON public.maintenance_results FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE OR REPLACE FUNCTION public.gw_maintenance_result_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE id=NEW.source_job_id AND kind='operational_cleanup'
    AND environment=NEW.environment AND payload->>'anchor'=NEW.run_date::text AND (payload->>'page')::integer=NEW.page_number AND status='running'
    AND lease_generation=NEW.lease_generation AND lease_until>clock_timestamp()) THEN
    RAISE EXCEPTION 'MAINTENANCE_RESULT_INVALID';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_maintenance_result_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS maintenance_result_guard ON public.maintenance_results;
CREATE TRIGGER maintenance_result_guard BEFORE INSERT ON public.maintenance_results FOR EACH ROW EXECUTE FUNCTION public.gw_maintenance_result_guard();

CREATE OR REPLACE FUNCTION public.gw_scheduler_retention_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE days numeric; cutoff timestamptz;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF TG_TABLE_NAME='scheduler_nonces' THEN RAISE EXCEPTION 'SCHEDULER_IDENTITY_IMMUTABLE'; END IF;
    IF ROW(NEW.id,NEW.environment,NEW.run_key,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.environment,OLD.run_key,OLD.created_at)
      OR NEW.lease_generation<OLD.lease_generation OR (OLD.completed_at IS NOT NULL AND NEW IS DISTINCT FROM OLD) THEN
      RAISE EXCEPTION 'SCHEDULER_IDENTITY_IMMUTABLE';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME='scheduler_nonces' THEN
    -- Future signed timestamps can remain acceptable for two skew windows.
    IF OLD.expires_at>=clock_timestamp() OR OLD.created_at+interval '600 seconds'>=clock_timestamp() THEN
      RAISE EXCEPTION 'SCHEDULER_RECORD_RETAINED';
    END IF;
  ELSE
    SELECT (value->>'http_replay_days')::numeric INTO days FROM public.x_manifest WHERE key='retention_policy' AND scope='staff';
    IF days IS NULL OR days<1 OR days>2147483647 OR days<>trunc(days) THEN RAISE EXCEPTION 'CONFIGURATION_INVALID'; END IF;
    cutoff:=clock_timestamp()-days*interval '1 day';
    IF OLD.completed_at IS NULL OR OLD.completed_at>=cutoff OR OLD.created_at>=cutoff OR OLD.lease_until>=clock_timestamp()
      OR OLD.run_key !~ '^[0-9]{1,12}$' THEN RAISE EXCEPTION 'SCHEDULER_RECORD_RETAINED'; END IF;
    IF OLD.run_key::numeric*300>=extract(epoch FROM cutoff) THEN RAISE EXCEPTION 'SCHEDULER_RECORD_RETAINED'; END IF;
  END IF;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.gw_scheduler_retention_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS scheduler_nonce_retention_guard ON public.scheduler_nonces;
CREATE TRIGGER scheduler_nonce_retention_guard BEFORE UPDATE OR DELETE ON public.scheduler_nonces FOR EACH ROW EXECUTE FUNCTION public.gw_scheduler_retention_guard();
DROP TRIGGER IF EXISTS scheduler_run_retention_guard ON public.scheduler_runs;
CREATE TRIGGER scheduler_run_retention_guard BEFORE UPDATE OR DELETE ON public.scheduler_runs FOR EACH ROW EXECUTE FUNCTION public.gw_scheduler_retention_guard();

-- Supabase Data API grants: retention results and coordination are server-only.
ALTER TABLE public.maintenance_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gw_maintenance_service ON public.maintenance_results;
CREATE POLICY gw_maintenance_service ON public.maintenance_results TO gw_service USING (environment=current_setting('gw.environment',true)) WITH CHECK (environment=current_setting('gw.environment',true));
REVOKE ALL ON public.maintenance_results FROM PUBLIC,gw_read,gw_service;
GRANT SELECT,INSERT ON public.maintenance_results TO gw_service;
GRANT DELETE ON public.scheduler_runs TO gw_service;
DO $$
DECLARE browser text;
BEGIN
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
      EXECUTE format('REVOKE ALL ON public.maintenance_results FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_maintenance_result_guard() FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_scheduler_retention_guard() FROM %I',browser);
    END IF;
  END LOOP;
END $$;
