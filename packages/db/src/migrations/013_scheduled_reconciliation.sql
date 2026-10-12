ALTER TABLE public.outbox DROP CONSTRAINT IF EXISTS outbox_kind_check;
ALTER TABLE public.outbox ADD CONSTRAINT outbox_kind_check CHECK (kind IN ('notification','financial_reconciliation'));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_kind_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_kind_check CHECK (kind IN ('notification','financial_reconciliation'));
CREATE TABLE IF NOT EXISTS public.financial_reconciliation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_job_id uuid NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE RESTRICT,
  environment text NOT NULL CHECK (environment IN ('simulation','testnet','mainnet')),
  run_date date NOT NULL,
  balanced boolean NOT NULL,
  consistent boolean NOT NULL,
  lineage_complete boolean NOT NULL,
  result jsonb NOT NULL CHECK (jsonb_typeof(result)='object' AND octet_length(result::text)<=131072),
  snapshot_started_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS reconciliation_history_idx ON public.financial_reconciliation_results(environment,checked_at,id);
DROP TRIGGER IF EXISTS reconciliation_results_append_only ON public.financial_reconciliation_results;
CREATE TRIGGER reconciliation_results_append_only BEFORE UPDATE OR DELETE ON public.financial_reconciliation_results FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();
CREATE OR REPLACE FUNCTION public.gw_reconciliation_result_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE id=NEW.source_job_id AND kind='financial_reconciliation' AND environment=NEW.environment AND payload->>'anchor'=NEW.run_date::text AND status='running' AND lease_until>clock_timestamp())
    OR (NEW.result->>'balanced')::boolean IS DISTINCT FROM NEW.balanced OR (NEW.result->>'consistent')::boolean IS DISTINCT FROM NEW.consistent OR (NEW.result->>'lineage_complete')::boolean IS DISTINCT FROM NEW.lineage_complete
    THEN RAISE EXCEPTION 'RECONCILIATION_RESULT_INVALID'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_reconciliation_result_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS reconciliation_result_guard ON public.financial_reconciliation_results;
CREATE TRIGGER reconciliation_result_guard BEFORE INSERT ON public.financial_reconciliation_results FOR EACH ROW EXECUTE FUNCTION public.gw_reconciliation_result_guard();
-- Supabase Data API grants: financial diagnostics are server/staff-only.
ALTER TABLE public.financial_reconciliation_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gw_reconciliation_service ON public.financial_reconciliation_results;
CREATE POLICY gw_reconciliation_service ON public.financial_reconciliation_results TO gw_service USING (environment=current_setting('gw.environment',true)) WITH CHECK (environment=current_setting('gw.environment',true));
REVOKE ALL ON public.financial_reconciliation_results FROM PUBLIC,gw_read,gw_service;
GRANT SELECT,INSERT ON public.financial_reconciliation_results TO gw_service;
DO $$
DECLARE browser text;
BEGIN
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
      EXECUTE format('REVOKE ALL ON public.financial_reconciliation_results FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_reconciliation_result_guard() FROM %I',browser);
    END IF;
  END LOOP;
END $$;
