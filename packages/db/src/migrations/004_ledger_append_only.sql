-- Financial corrections are new balanced journals, never edits/deletions.
-- The separately guarded simulation reset uses TRUNCATE, not row mutation.
CREATE OR REPLACE FUNCTION public.gw_reject_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'LEDGER_APPEND_ONLY';
END;
$$;
REVOKE ALL ON FUNCTION public.gw_reject_ledger_mutation() FROM PUBLIC;
DROP TRIGGER IF EXISTS ledger_journals_append_only ON public.ledger_journals;
CREATE TRIGGER ledger_journals_append_only BEFORE UPDATE OR DELETE ON public.ledger_journals
FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();
DROP TRIGGER IF EXISTS ledger_postings_append_only ON public.ledger_postings;
CREATE TRIGGER ledger_postings_append_only BEFORE UPDATE OR DELETE ON public.ledger_postings
FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();
-- No new table or browser/Data API permission is introduced.
