-- Drizzle/JavaScript serializes timestamps to millisecond precision. Preserve
-- full source timestamps while comparing copied redaction metadata at that
-- precision; original payload/digest/identity remain exact.
CREATE OR REPLACE FUNCTION public.gw_job_source_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.outbox o WHERE o.id=NEW.outbox_id AND ROW(o.business_key,o.environment,o.kind,o.payload,date_trunc('milliseconds',o.redacted_at),o.redacted_payload_hash) IS NOT DISTINCT FROM ROW(NEW.business_key,NEW.environment,NEW.kind,NEW.payload,date_trunc('milliseconds',NEW.redacted_at),NEW.redacted_payload_hash))
    THEN RAISE EXCEPTION 'JOB_SOURCE_INVALID'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_job_source_guard() FROM PUBLIC;
