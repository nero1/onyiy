-- Internal transaction marker seals each journal after its creating transaction.
-- Existing financial values and journal identities remain untouched.
ALTER TABLE public.ledger_journals ADD COLUMN IF NOT EXISTS created_txid bigint NOT NULL DEFAULT txid_current();

CREATE OR REPLACE FUNCTION public.gw_seal_ledger_posting()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE creator bigint;
BEGIN
  SELECT created_txid INTO creator FROM public.ledger_journals WHERE id = NEW.journal_id;
  IF creator IS NULL OR creator <> txid_current() THEN
    RAISE EXCEPTION 'LEDGER_JOURNAL_SEALED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.gw_validate_ledger_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE target uuid; debit numeric; credit numeric; asset_count integer; line_count integer;
BEGIN
  IF TG_TABLE_NAME = 'ledger_journals' THEN target := NEW.id; ELSE target := NEW.journal_id; END IF;
  SELECT coalesce(sum(p.amount_base_units) FILTER (WHERE p.direction = 'debit'),0),
         coalesce(sum(p.amount_base_units) FILTER (WHERE p.direction = 'credit'),0),
         count(DISTINCT a.asset_id), count(*)
  INTO debit, credit, asset_count, line_count
  FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id
  WHERE p.journal_id=target;
  IF debit <= 0 OR debit <> credit OR asset_count <> 1 OR line_count < 2 THEN
    RAISE EXCEPTION 'LEDGER_UNBALANCED';
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.gw_seal_ledger_posting() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gw_validate_ledger_balance() FROM PUBLIC;
DROP TRIGGER IF EXISTS ledger_posting_sealed ON public.ledger_postings;
CREATE TRIGGER ledger_posting_sealed BEFORE INSERT ON public.ledger_postings
FOR EACH ROW EXECUTE FUNCTION public.gw_seal_ledger_posting();
DROP TRIGGER IF EXISTS ledger_journal_balanced ON public.ledger_journals;
CREATE CONSTRAINT TRIGGER ledger_journal_balanced AFTER INSERT ON public.ledger_journals
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_validate_ledger_balance();
DROP TRIGGER IF EXISTS ledger_posting_balanced ON public.ledger_postings;
CREATE CONSTRAINT TRIGGER ledger_posting_balanced AFTER INSERT ON public.ledger_postings
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_validate_ledger_balance();
-- No new table or browser/Data API permission is introduced.
