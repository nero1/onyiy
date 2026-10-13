CREATE OR REPLACE FUNCTION public.gw_operational_recovery_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.crypto_obligations;j public.ledger_journals;total integer;valid integer;attempts integer;proof jsonb;owner_type text;
BEGIN
 SELECT * INTO o FROM public.crypto_obligations WHERE id=NEW.id;IF o.kind NOT IN ('business','refund') OR o.completed_at IS NULL OR o.status NOT IN ('cancelled','exception') THEN RETURN NULL;END IF;
 SELECT * INTO j FROM public.ledger_journals WHERE business_key='crypto-operational-release:'||o.id;IF NOT FOUND THEN RAISE EXCEPTION 'OPERATIONAL_RELEASE_REQUIRED';END IF;
 owner_type:=CASE WHEN o.user_id IS NULL THEN 'platform' ELSE 'user' END;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=o.asset_id AND a.owner_type=owner_type AND a.owner_id IS NOT DISTINCT FROM o.user_id AND p.amount_base_units=o.gross_base_units AND ((a.purpose='held_payable' AND p.direction='debit') OR (a.purpose=o.source_purpose AND p.direction='credit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 OR j.ledger_type<>'OPERATIONAL_HOLD_RELEASE' OR j.metadata->>'obligation_id' IS DISTINCT FROM o.id::text OR o.charge_base_units<>0 OR o.gross_base_units<>o.net_base_units THEN RAISE EXCEPTION 'OPERATIONAL_RELEASE_MISMATCH';END IF;
 SELECT count(*) INTO attempts FROM public.signed_attempts WHERE obligation_id=o.id;SELECT result->'attempts' INTO proof FROM public.operation_keys WHERE business_key='crypto-operational-recovery:'||o.id;
 IF jsonb_typeof(proof) IS DISTINCT FROM 'array' OR jsonb_array_length(proof)<>attempts OR (o.status='cancelled' AND attempts>0) OR EXISTS(SELECT 1 FROM public.signed_attempts a WHERE a.obligation_id=o.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(proof) e WHERE e->>'id'=a.id::text AND e->>'state' IN ('failed','expired','superseded') AND e->>'hash'~'^[0-9a-f]{64}$')) THEN RAISE EXCEPTION 'OPERATIONAL_RECOVERY_UNPROVEN';END IF;RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_operational_recovery_guard() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER operational_recovery_guard AFTER UPDATE ON public.crypto_obligations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_operational_recovery_guard();
CREATE OR REPLACE FUNCTION public.gw_failed_closure_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.completed_at IS NOT NULL AND (NEW.status,NEW.completed_at) IS DISTINCT FROM (OLD.status,OLD.completed_at) THEN RAISE EXCEPTION 'COMPLETED_OBLIGATION_IMMUTABLE';END IF;
 IF NEW.kind NOT IN ('sweep','business','refund') AND NEW.status='exception' AND NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
  IF OLD.status<>'exception' OR NOT EXISTS(SELECT 1 FROM public.gw_signed_attempt_status WHERE obligation_id=NEW.id AND status IN ('failed','expired')) OR EXISTS(SELECT 1 FROM public.gw_signed_attempt_status WHERE obligation_id=NEW.id AND status NOT IN ('failed','superseded','expired')) OR NOT EXISTS(SELECT 1 FROM public.operation_keys WHERE business_key='crypto-failed-close:'||NEW.id::text AND result->>'obligation_id'=NEW.id::text AND result->>'status'='failed_closed') THEN RAISE EXCEPTION 'FAILED_CLOSURE_PROOF_REQUIRED';END IF;
 END IF;
 IF TG_OP='INSERT' AND NEW.previous_obligation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.crypto_obligations p WHERE p.id=NEW.previous_obligation_id AND p.user_id IS NOT DISTINCT FROM NEW.user_id AND p.asset_id=NEW.asset_id AND p.kind=NEW.kind AND p.source_purpose=NEW.source_purpose AND (p.status='cancelled' OR p.status='exception' AND p.completed_at IS NOT NULL)) THEN RAISE EXCEPTION 'PREVIOUS_OBLIGATION_NOT_CLOSED';END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_failed_closure_guard() FROM PUBLIC;
