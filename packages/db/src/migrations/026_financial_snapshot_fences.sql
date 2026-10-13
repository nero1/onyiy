-- Admission/execution use the approved registry, even after intake changes.
ALTER TABLE public.crypto_invoices ADD COLUMN IF NOT EXISTS registry_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.crypto_obligations ADD COLUMN IF NOT EXISTS registry_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
-- Snapshot columns are covered by the existing immutable-record guards.
CREATE OR REPLACE FUNCTION public.gw_financial_state_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_TABLE_NAME='crypto_obligations' THEN
  IF OLD.status<>NEW.status AND NOT (
   OLD.status='quoted' AND NEW.status IN ('held','approved','cancelled') OR
   OLD.status='held' AND NEW.status IN ('approved','cancelled') OR
   OLD.status='approved' AND NEW.status IN ('signing','cancelled','awaiting_requote','exception') OR
   OLD.status='signing' AND NEW.status IN ('broadcast','settled','exception','awaiting_requote') OR
   OLD.status='broadcast' AND NEW.status IN ('settled','exception') OR
   OLD.status='awaiting_requote' AND NEW.status IN ('cancelled','exception') OR
   OLD.status='exception' AND NEW.status='settled'
  ) THEN RAISE EXCEPTION 'OBLIGATION_TRANSITION_DENIED'; END IF;
  IF NEW.status='cancelled' AND EXISTS(SELECT 1 FROM public.signed_attempts WHERE obligation_id=OLD.id) THEN RAISE EXCEPTION 'SIGNED_HOLD_RELEASE_DENIED';END IF;
 ELSIF TG_TABLE_NAME='signed_attempts' THEN
  IF OLD.status<>NEW.status AND NOT (OLD.status='signed' AND NEW.status IN ('broadcast','confirmed','failed') OR OLD.status='broadcast' AND NEW.status IN ('confirmed','failed')) THEN RAISE EXCEPTION 'SIGNED_ATTEMPT_TRANSITION_DENIED';END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_financial_state_guard() FROM PUBLIC;
CREATE TRIGGER financial_state_guard BEFORE UPDATE ON public.crypto_obligations FOR EACH ROW EXECUTE FUNCTION public.gw_financial_state_guard();
CREATE TRIGGER signed_state_guard BEFORE UPDATE ON public.signed_attempts FOR EACH ROW EXECUTE FUNCTION public.gw_financial_state_guard();
