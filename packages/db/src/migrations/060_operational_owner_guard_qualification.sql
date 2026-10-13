-- Qualify the local owner-kind variable; preserved059 remains unchanged.
CREATE OR REPLACE FUNCTION public.gw_operational_recovery_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.crypto_obligations;j public.ledger_journals;total integer;valid integer;attempts integer;proof jsonb;expected_owner_type text;
BEGIN
 SELECT * INTO o FROM public.crypto_obligations WHERE id=NEW.id;IF o.kind NOT IN ('business','refund') OR o.completed_at IS NULL OR o.status NOT IN ('cancelled','exception') THEN RETURN NULL;END IF;
 SELECT * INTO j FROM public.ledger_journals WHERE business_key='crypto-operational-release:'||o.id;IF NOT FOUND THEN RAISE EXCEPTION 'OPERATIONAL_RELEASE_REQUIRED';END IF;
 expected_owner_type:=CASE WHEN o.user_id IS NULL THEN 'platform' ELSE 'user' END;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=o.asset_id AND a.owner_type=expected_owner_type AND a.owner_id IS NOT DISTINCT FROM o.user_id AND p.amount_base_units=o.gross_base_units AND ((a.purpose='held_payable' AND p.direction='debit') OR (a.purpose=o.source_purpose AND p.direction='credit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 OR j.ledger_type<>'OPERATIONAL_HOLD_RELEASE' OR j.metadata->>'obligation_id' IS DISTINCT FROM o.id::text OR o.charge_base_units<>0 OR o.gross_base_units<>o.net_base_units THEN RAISE EXCEPTION 'OPERATIONAL_RELEASE_MISMATCH';END IF;
 SELECT count(*) INTO attempts FROM public.signed_attempts WHERE obligation_id=o.id;SELECT result->'attempts' INTO proof FROM public.operation_keys WHERE business_key='crypto-operational-recovery:'||o.id;
 IF jsonb_typeof(proof) IS DISTINCT FROM 'array' OR jsonb_array_length(proof)<>attempts OR (o.status='cancelled' AND attempts>0) OR EXISTS(SELECT 1 FROM public.signed_attempts a WHERE a.obligation_id=o.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(proof) e WHERE e->>'id'=a.id::text AND e->>'state' IN ('failed','expired','superseded') AND e->>'hash'~'^[0-9a-f]{64}$')) THEN RAISE EXCEPTION 'OPERATIONAL_RECOVERY_UNPROVEN';END IF;RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_operational_recovery_guard() FROM PUBLIC;
