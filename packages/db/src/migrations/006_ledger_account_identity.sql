-- Financial owners retain their user tombstone; deleting profile/auth data must
-- not orphan an accrued entitlement. Orphaned legacy rows require review.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ledger_accounts_owner_user_fk' AND conrelid='public.ledger_accounts'::regclass) THEN
    ALTER TABLE public.ledger_accounts ADD CONSTRAINT ledger_accounts_owner_user_fk
      FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.gw_reject_account_reassignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ledger_postings WHERE account_id=OLD.id) THEN
    RAISE EXCEPTION 'LEDGER_ACCOUNT_IMMUTABLE';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.gw_reject_account_reassignment() FROM PUBLIC;
DROP TRIGGER IF EXISTS ledger_account_identity ON public.ledger_accounts;
CREATE TRIGGER ledger_account_identity BEFORE UPDATE OR DELETE ON public.ledger_accounts
FOR EACH ROW EXECUTE FUNCTION public.gw_reject_account_reassignment();
-- No new table or browser/Data API permission is introduced.
