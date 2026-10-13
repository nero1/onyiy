CREATE OR REPLACE FUNCTION public.gw_failed_closure_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.completed_at IS NOT NULL AND (NEW.status,NEW.completed_at) IS DISTINCT FROM (OLD.status,OLD.completed_at) THEN RAISE EXCEPTION 'COMPLETED_OBLIGATION_IMMUTABLE';END IF;
 -- Sweep recovery is checked against every independently verified attempt and
 -- its exact company clearing/hold/release by the deferred057 contract. It does
 -- not require the web process to write protected signer outcome metadata.
 IF NEW.kind<>'sweep' AND NEW.status='exception' AND NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
  IF OLD.status<>'exception' OR NOT EXISTS(SELECT 1 FROM public.gw_signed_attempt_status WHERE obligation_id=NEW.id AND status IN ('failed','expired')) OR EXISTS(SELECT 1 FROM public.gw_signed_attempt_status WHERE obligation_id=NEW.id AND status NOT IN ('failed','superseded','expired')) OR
     NOT EXISTS(SELECT 1 FROM public.operation_keys WHERE business_key='crypto-failed-close:'||NEW.id::text AND result->>'obligation_id'=NEW.id::text AND result->>'status'='failed_closed') THEN RAISE EXCEPTION 'FAILED_CLOSURE_PROOF_REQUIRED';END IF;
 END IF;
 IF TG_OP='INSERT' AND NEW.previous_obligation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.crypto_obligations p WHERE p.id=NEW.previous_obligation_id AND p.user_id=NEW.user_id AND p.asset_id=NEW.asset_id AND p.kind='withdrawal' AND (p.status='cancelled' OR p.status='exception' AND p.completed_at IS NOT NULL)) THEN RAISE EXCEPTION 'PREVIOUS_OBLIGATION_NOT_CLOSED';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_failed_closure_guard() FROM PUBLIC;
