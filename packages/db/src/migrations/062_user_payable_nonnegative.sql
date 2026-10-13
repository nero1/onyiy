-- Extends the commit-time invariant to native held/refund/incoming rights. The
-- first failed retry fixture is retained; this never rewrites prior journals.
CREATE OR REPLACE FUNCTION public.gw_lock_user_payable() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.ledger_accounts;BEGIN SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='user' AND a.purpose IN ('available_payable','held_payable','refund_payable','incoming_payable') THEN PERFORM pg_advisory_xact_lock(hashtextextended('user-payable:'||a.owner_id||':'||a.asset_id,0));END IF;RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.gw_check_user_payable() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.ledger_accounts;net numeric;BEGIN SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='user' AND a.purpose IN ('available_payable','held_payable','refund_payable','incoming_payable') THEN
  SELECT coalesce(sum(CASE WHEN direction='credit' THEN amount_base_units ELSE -amount_base_units END),0) INTO net FROM public.ledger_postings WHERE account_id=a.id;
  IF net<0 THEN RAISE EXCEPTION 'USER_PAYABLE_NEGATIVE';END IF;
 END IF;RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_lock_user_payable(),public.gw_check_user_payable() FROM PUBLIC;
CREATE TRIGGER user_payable_lock BEFORE INSERT ON public.ledger_postings FOR EACH ROW EXECUTE FUNCTION public.gw_lock_user_payable();
CREATE CONSTRAINT TRIGGER user_payable_nonnegative AFTER INSERT ON public.ledger_postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_check_user_payable();
