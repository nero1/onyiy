-- Commit guards validate their immutable account, independently of temporary
-- read scope. A native portfolio restores the application scope before commit.
-- The private helper has no runtime grant; public reads retain their checks.
CREATE FUNCTION public.gw_counter_account_total(target uuid) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE value numeric;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.ledger_accounts WHERE id=target) THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;
 IF public.gw_counter_ready() THEN
  SELECT balance INTO value FROM public.ledger_account_totals WHERE account_id=target;
  IF NOT FOUND THEN
   IF EXISTS(SELECT 1 FROM public.ledger_postings WHERE account_id=target) THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;
   RETURN 0;
  END IF;
 ELSE
  SELECT coalesce(sum(CASE WHEN direction='credit' THEN amount_base_units ELSE -amount_base_units END),0) INTO value FROM public.ledger_postings WHERE account_id=target;
 END IF;
 RETURN value;
END $$;
REVOKE ALL ON FUNCTION public.gw_counter_account_total(uuid) FROM PUBLIC,gw_read,gw_service;
CREATE OR REPLACE FUNCTION public.gw_check_user_payable() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a public.ledger_accounts;net numeric;BEGIN SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='user' AND a.purpose IN ('available_payable','held_payable','refund_payable','incoming_payable') THEN
  net:=public.gw_counter_account_total(a.id);IF net<0 THEN RAISE EXCEPTION 'USER_PAYABLE_NEGATIVE';END IF;
 END IF;RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.gw_unallocated_source_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a public.ledger_accounts;balance numeric;BEGIN SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='system' AND a.purpose='unallocated_payable' THEN balance:=public.gw_counter_account_total(a.id);IF balance<0 THEN RAISE EXCEPTION 'UNALLOCATED_SOURCE_NEGATIVE';END IF;END IF;RETURN NULL;
END $$;
-- Supabase Data API grants unchanged; no table/public/runtime grant is added.
