CREATE OR REPLACE FUNCTION public.gw_check_treasury_sweep(target uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.crypto_obligations;j public.ledger_journals;component text;expected_type text;p1 text;p2 text;owner1 text;owner2 text;d1 text;d2 text;total integer;valid integer;held boolean:=false;settled boolean:=false;moved boolean:=false;released boolean:=false;attempts integer;proof jsonb;
BEGIN
 SELECT * INTO o FROM public.crypto_obligations WHERE id=target;IF NOT FOUND OR o.kind<>'sweep' THEN RETURN;END IF;
 IF o.user_id IS NOT NULL OR o.environment<>'testnet' OR o.source_purpose<>'treasury_sweep_clearing' OR o.gross_base_units<>o.net_base_units OR o.charge_base_units<>0 OR coalesce(o.fee_snapshot->>'nativeFloor','')!~'^(0|[1-9][0-9]{0,77})$' THEN RAISE EXCEPTION 'SWEEP_INTENT_INVALID';END IF;
 FOREACH component IN ARRAY ARRAY['hold','settle','move','release'] LOOP
  SELECT * INTO j FROM public.ledger_journals WHERE business_key=CASE WHEN component='settle' THEN 'crypto-settle:'||o.id ELSE 'treasury-sweep-'||component||':'||o.id END;
  IF NOT FOUND THEN CONTINUE;END IF;
  IF component='hold' THEN held:=true;expected_type:='TREASURY_SWEEP_HOLD';p1:='treasury_sweep_clearing';owner1:='system';d1:='debit';p2:='held_payable';owner2:='platform';d2:='credit';
  ELSIF component='settle' THEN settled:=true;expected_type:='TREASURY_SWEEP_SETTLE';p1:='held_payable';owner1:='platform';d1:='debit';p2:='treasury_asset';owner2:='system';d2:='credit';
  ELSIF component='move' THEN moved:=true;expected_type:='TREASURY_SWEEP_MOVE';p1:='reserve_treasury_asset';owner1:='system';d1:='debit';p2:='treasury_sweep_clearing';owner2:='system';d2:='credit';
  ELSE released:=true;expected_type:='TREASURY_SWEEP_RELEASE';p1:='held_payable';owner1:='platform';d1:='debit';p2:='treasury_sweep_clearing';owner2:='system';d2:='credit';END IF;
  SELECT count(*),count(*) FILTER(WHERE a.asset_id=o.asset_id AND a.owner_id IS NULL AND p.amount_base_units=o.gross_base_units AND ((a.purpose=p1 AND a.owner_type=owner1 AND p.direction=d1) OR (a.purpose=p2 AND a.owner_type=owner2 AND p.direction=d2))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
  IF j.ledger_type<>expected_type OR j.metadata->>'obligation_id' IS DISTINCT FROM o.id::text OR total<>2 OR valid<>2 THEN RAISE EXCEPTION 'SWEEP_JOURNAL_MISMATCH';END IF;
 END LOOP;
 SELECT count(*) INTO attempts FROM public.signed_attempts WHERE obligation_id=o.id;
 IF o.status='quoted' THEN IF held OR settled OR moved OR released THEN RAISE EXCEPTION 'SWEEP_STATE_INVALID';END IF;
 ELSIF o.status='cancelled' THEN IF attempts<>0 OR settled OR moved OR held<>released THEN RAISE EXCEPTION 'SWEEP_STATE_INVALID';END IF;
 ELSIF o.status='settled' THEN IF NOT held OR NOT settled OR NOT moved OR released OR o.completed_at IS NULL THEN RAISE EXCEPTION 'SWEEP_STATE_INVALID';END IF;
 ELSIF o.status='exception' AND o.completed_at IS NOT NULL THEN
  SELECT result->'attempts' INTO proof FROM public.operation_keys WHERE business_key='treasury-sweep-recovery:'||o.id;
  IF NOT held OR NOT released OR settled OR moved OR jsonb_typeof(proof) IS DISTINCT FROM 'array' OR jsonb_array_length(proof)<>attempts OR EXISTS(SELECT 1 FROM public.signed_attempts a WHERE a.obligation_id=o.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(proof) e WHERE e->>'id'=a.id::text AND e->>'state' IN ('failed','expired','superseded') AND e->>'hash'~'^[0-9a-f]{64}$')) THEN RAISE EXCEPTION 'SWEEP_RECOVERY_UNPROVEN';END IF;
 ELSE IF NOT held OR settled OR moved OR released THEN RAISE EXCEPTION 'SWEEP_STATE_INVALID';END IF;END IF;
END $$;
REVOKE ALL ON FUNCTION public.gw_check_treasury_sweep(uuid) FROM PUBLIC,gw_read,gw_service,gw_signer;
CREATE OR REPLACE FUNCTION public.gw_treasury_sweep_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE target uuid;j public.ledger_journals;BEGIN
 IF TG_TABLE_NAME='crypto_obligations' THEN target:=NEW.id;
 ELSIF TG_TABLE_NAME='ledger_journals' THEN target:=NULLIF(NEW.metadata->>'obligation_id','')::uuid;
 ELSE SELECT * INTO j FROM public.ledger_journals WHERE id=NEW.journal_id;target:=NULLIF(j.metadata->>'obligation_id','')::uuid;END IF;
 IF target IS NOT NULL THEN PERFORM public.gw_check_treasury_sweep(target);END IF;RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_treasury_sweep_guard() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER treasury_sweep_obligation_guard AFTER INSERT OR UPDATE ON public.crypto_obligations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_treasury_sweep_guard();
CREATE CONSTRAINT TRIGGER treasury_sweep_journal_guard AFTER INSERT ON public.ledger_journals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_treasury_sweep_guard();
CREATE CONSTRAINT TRIGGER treasury_sweep_posting_guard AFTER INSERT ON public.ledger_postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_treasury_sweep_guard();
