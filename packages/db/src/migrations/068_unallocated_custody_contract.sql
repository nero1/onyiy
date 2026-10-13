CREATE OR REPLACE FUNCTION public.gw_unallocated_custody_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE i public.unallocated_inflows;j public.ledger_journals;total integer;valid integer;
BEGIN
 SELECT * INTO i FROM public.unallocated_inflows WHERE id=NEW.id;
 SELECT * INTO j FROM public.ledger_journals WHERE id=i.journal_id;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=i.asset_id AND a.owner_id IS NULL AND a.owner_type='system' AND p.amount_base_units=i.amount_base_units AND ((a.purpose='treasury_asset' AND p.direction='debit') OR (a.purpose='unallocated_payable' AND p.direction='credit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=i.journal_id;
 IF total<>2 OR valid<>2 OR j.ledger_type<>'CHAIN_UNALLOCATED' OR j.business_key<>'unallocated:'||i.id OR j.metadata->>'unallocated_id' IS DISTINCT FROM i.id::text OR NOT EXISTS(SELECT 1 FROM public.operation_keys WHERE business_key='chain-event:'||i.environment||':'||i.chain||':'||i.network||':'||i.tx_hash||':'||i.event_index||':'||i.asset_id AND result->>'purpose'='unallocated') THEN RAISE EXCEPTION 'UNALLOCATED_CUSTODY_INVALID';END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_unallocated_custody_guard() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER unmatched_custody_guard AFTER INSERT ON public.unallocated_inflows DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_unallocated_custody_guard();
-- Serialize source debits against refund retry and preserve nonnegative unmatched
-- liability without weakening existing user liability guards.
CREATE OR REPLACE FUNCTION public.gw_unallocated_source_lock() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE a public.ledger_accounts;BEGIN
 SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='system' AND a.purpose='unallocated_payable' THEN PERFORM pg_advisory_xact_lock(hashtextextended('unallocated-source:'||a.asset_id,0));END IF;RETURN NEW;
END $$;
CREATE TRIGGER unmatched_source_lock BEFORE INSERT ON public.ledger_postings FOR EACH ROW EXECUTE FUNCTION public.gw_unallocated_source_lock();
CREATE OR REPLACE FUNCTION public.gw_unallocated_source_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.ledger_accounts;balance numeric;BEGIN
 SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='system' AND a.purpose='unallocated_payable' THEN SELECT coalesce(sum(CASE WHEN direction='credit' THEN amount_base_units ELSE -amount_base_units END),0) INTO balance FROM public.ledger_postings WHERE account_id=a.id;IF balance<0 THEN RAISE EXCEPTION 'UNALLOCATED_SOURCE_NEGATIVE';END IF;END IF;RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_unallocated_source_lock(),public.gw_unallocated_source_guard() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER unmatched_source_guard AFTER INSERT ON public.ledger_postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_unallocated_source_guard();
