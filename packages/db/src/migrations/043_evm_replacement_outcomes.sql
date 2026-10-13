ALTER TABLE public.signed_attempts DROP CONSTRAINT IF EXISTS signed_attempts_status_check;
ALTER TABLE public.signed_attempts ADD CONSTRAINT signed_attempts_status_check CHECK(status IN ('signed','broadcast','confirmed','failed','expired','unknown','superseded'));
CREATE OR REPLACE FUNCTION public.gw_financial_state_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
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
  ) THEN RAISE EXCEPTION 'OBLIGATION_TRANSITION_DENIED';END IF;
  IF NEW.status='cancelled' AND EXISTS(SELECT 1 FROM public.signed_attempts WHERE obligation_id=OLD.id) THEN RAISE EXCEPTION 'SIGNED_HOLD_RELEASE_DENIED';END IF;
 ELSIF TG_TABLE_NAME='signed_attempts' THEN
  IF OLD.status<>NEW.status AND NOT (OLD.status IN ('signed','broadcast') AND NEW.status IN ('broadcast','confirmed','failed','superseded')) THEN RAISE EXCEPTION 'SIGNED_ATTEMPT_TRANSITION_DENIED';END IF;
  IF NEW.status='superseded' AND (NEW.chain NOT IN ('eth','bnb') OR NEW.actual_native_fee<>0 OR NOT EXISTS(SELECT 1 FROM public.signed_attempts winner WHERE winner.obligation_id=NEW.obligation_id AND winner.id<>NEW.id AND winner.nonce=NEW.nonce AND winner.status IN ('confirmed','failed'))) THEN RAISE EXCEPTION 'NONCE_WINNER_REQUIRED';END IF;
  IF OLD.status IN ('confirmed','failed','expired','superseded') AND (NEW.status,NEW.actual_native_fee,NEW.confirmed_at) IS DISTINCT FROM (OLD.status,OLD.actual_native_fee,OLD.confirmed_at) THEN RAISE EXCEPTION 'ATTEMPT_OUTCOME_IMMUTABLE';END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_financial_state_guard() FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.gw_failed_closure_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.completed_at IS NOT NULL AND (NEW.status,NEW.completed_at) IS DISTINCT FROM (OLD.status,OLD.completed_at) THEN RAISE EXCEPTION 'COMPLETED_OBLIGATION_IMMUTABLE';END IF;
 IF NEW.status='exception' AND NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
  IF OLD.status<>'exception' OR NOT EXISTS(SELECT 1 FROM public.gw_signed_attempt_status WHERE obligation_id=NEW.id AND status='failed') OR EXISTS(SELECT 1 FROM public.gw_signed_attempt_status WHERE obligation_id=NEW.id AND status NOT IN ('failed','superseded')) OR
     NOT EXISTS(SELECT 1 FROM public.operation_keys WHERE business_key='crypto-failed-close:'||NEW.id::text AND result->>'obligation_id'=NEW.id::text AND result->>'status'='failed_closed') THEN RAISE EXCEPTION 'FAILED_CLOSURE_PROOF_REQUIRED';END IF;
 END IF;
 IF TG_OP='INSERT' AND NEW.previous_obligation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.crypto_obligations p WHERE p.id=NEW.previous_obligation_id AND p.user_id=NEW.user_id AND p.asset_id=NEW.asset_id AND p.kind='withdrawal' AND (p.status='cancelled' OR p.status='exception' AND p.completed_at IS NOT NULL)) THEN RAISE EXCEPTION 'PREVIOUS_OBLIGATION_NOT_CLOSED';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_failed_closure_guard() FROM PUBLIC;
