CREATE INDEX IF NOT EXISTS native_hold_obligation_idx ON public.ledger_journals((metadata->>'obligation_id')) WHERE ledger_type='PAYOUT_HOLD';
CREATE OR REPLACE FUNCTION public.gw_refund_hold_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.crypto_obligations;j public.ledger_journals;journals integer;total integer;valid integer;
BEGIN
 SELECT * INTO o FROM public.crypto_obligations WHERE id=NEW.id;IF o.kind<>'refund' THEN RETURN NULL;END IF;
 IF o.user_id IS NULL OR o.source_purpose<>'refund_payable' OR o.charge_base_units<>0 OR o.net_base_units<>o.gross_base_units THEN RAISE EXCEPTION 'REFUND_INTENT_INVALID';END IF;
 SELECT count(*) INTO journals FROM public.ledger_journals WHERE ledger_type='PAYOUT_HOLD' AND metadata->>'obligation_id'=o.id::text;
 IF journals<>1 THEN RAISE EXCEPTION 'REFUND_HOLD_REQUIRED';END IF;
 SELECT * INTO j FROM public.ledger_journals WHERE ledger_type='PAYOUT_HOLD' AND metadata->>'obligation_id'=o.id::text;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=o.asset_id AND a.owner_type='user' AND a.owner_id=o.user_id AND p.amount_base_units=o.gross_base_units AND ((a.purpose='refund_payable' AND p.direction='debit') OR (a.purpose='held_payable' AND p.direction='credit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 THEN RAISE EXCEPTION 'REFUND_HOLD_MISMATCH';END IF;RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_refund_hold_guard() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER refund_hold_obligation_guard AFTER INSERT OR UPDATE ON public.crypto_obligations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_refund_hold_guard();
