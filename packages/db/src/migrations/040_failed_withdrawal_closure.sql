ALTER TABLE public.crypto_obligations ADD COLUMN IF NOT EXISTS previous_obligation_id uuid REFERENCES public.crypto_obligations(id) ON DELETE RESTRICT;
-- Terminal failures retain their immutable approved snapshot and signed lineage.
-- Closing one requires a committed permanent closure result and every attempt
-- positively failed; an unresolved/expired hash can never pass this guard.
CREATE OR REPLACE FUNCTION public.gw_failed_closure_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.completed_at IS NOT NULL AND (NEW.status,NEW.completed_at) IS DISTINCT FROM (OLD.status,OLD.completed_at) THEN RAISE EXCEPTION 'COMPLETED_OBLIGATION_IMMUTABLE';END IF;
 IF NEW.status='exception' AND NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
  IF OLD.status<>'exception' OR NOT EXISTS(SELECT 1 FROM public.signed_attempts WHERE obligation_id=NEW.id) OR EXISTS(SELECT 1 FROM public.signed_attempts WHERE obligation_id=NEW.id AND status<>'failed') OR
     NOT EXISTS(SELECT 1 FROM public.operation_keys WHERE business_key='crypto-failed-close:'||NEW.id::text AND result->>'obligation_id'=NEW.id::text AND result->>'status'='failed_closed') THEN RAISE EXCEPTION 'FAILED_CLOSURE_PROOF_REQUIRED';END IF;
 END IF;
 IF TG_OP='INSERT' AND NEW.previous_obligation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.crypto_obligations p WHERE p.id=NEW.previous_obligation_id AND p.user_id=NEW.user_id AND p.asset_id=NEW.asset_id AND p.kind='withdrawal' AND (p.status='cancelled' OR p.status='exception' AND p.completed_at IS NOT NULL)) THEN RAISE EXCEPTION 'PREVIOUS_OBLIGATION_NOT_CLOSED';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_failed_closure_guard() FROM PUBLIC;
CREATE TRIGGER failed_closure_guard BEFORE INSERT OR UPDATE ON public.crypto_obligations FOR EACH ROW EXECUTE FUNCTION public.gw_failed_closure_guard();
-- No new browser/runtime capabilities; existing server-only obligation policies apply.
