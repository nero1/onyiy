CREATE TABLE IF NOT EXISTS public.recovery_outflow_resolutions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),outflow_id uuid NOT NULL REFERENCES public.recovery_outflows(id) ON DELETE RESTRICT,asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,tx_hash text NOT NULL,event_index integer NOT NULL,principal_base_units numeric(78,0) NOT NULL CHECK(principal_base_units>=0),native_asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,native_fee_base_units numeric(78,0) NOT NULL CHECK(native_fee_base_units>=0),account_setup_base_units numeric(78,0) NOT NULL CHECK(account_setup_base_units>=0 AND account_setup_base_units<=native_fee_base_units),setup_journal_id uuid REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,principal_journal_id uuid REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,gas_journal_id uuid REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,proof_reference text NOT NULL,reason text NOT NULL,evidence_hash text NOT NULL CHECK(length(evidence_hash)=64),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(asset_id,tx_hash,event_index));
CREATE TRIGGER recovery_outflow_resolution_retained BEFORE UPDATE OR DELETE ON public.recovery_outflow_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();
-- Supabase Data API grants: public.recovery_outflow_resolutions is permanent
-- staff-reviewed economic evidence; no browser, signer or generic edits.
ALTER TABLE public.recovery_outflow_resolutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recovery_outflow_resolutions FROM PUBLIC,gw_read,gw_signer;
GRANT SELECT,INSERT ON public.recovery_outflow_resolutions TO gw_service;
CREATE POLICY outflow_resolution_service ON public.recovery_outflow_resolutions TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DO $$ DECLARE browser text;BEGIN FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.recovery_outflow_resolutions FROM %I',browser);END IF;END LOOP;END $$;
CREATE OR REPLACE FUNCTION public.gw_recovery_loss_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.recovery_outflow_resolutions;o public.recovery_outflows;j public.ledger_journals;total integer;valid integer;
BEGIN
 SELECT * INTO r FROM public.recovery_outflow_resolutions WHERE id=NEW.id;SELECT * INTO o FROM public.recovery_outflows WHERE id=r.outflow_id;
 IF o.status<>'review' OR (o.asset_id,o.tx_hash,o.event_index,o.amount_base_units) IS DISTINCT FROM (r.asset_id,r.tx_hash,r.event_index,r.principal_base_units) THEN RAISE EXCEPTION 'RECOVERY_LOSS_EVIDENCE_INVALID';END IF;
 IF r.principal_base_units>0 THEN
 SELECT * INTO j FROM public.ledger_journals WHERE id=r.principal_journal_id;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=r.asset_id AND a.owner_id IS NULL AND p.amount_base_units=r.principal_base_units AND ((a.owner_type='system' AND a.purpose='treasury_asset' AND p.direction='credit') OR (a.owner_type='platform' AND a.purpose='chain_loss_expense' AND p.direction='debit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 OR j.ledger_type<>'RECOVERY_OUTFLOW_LOSS' OR j.metadata->>'resolution_id' IS DISTINCT FROM r.id::text THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 ELSIF r.principal_journal_id IS NOT NULL THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 IF r.native_fee_base_units-r.account_setup_base_units>0 THEN
 SELECT * INTO j FROM public.ledger_journals WHERE id=r.gas_journal_id;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=r.native_asset_id AND a.owner_id IS NULL AND p.amount_base_units=r.native_fee_base_units-r.account_setup_base_units AND ((a.owner_type='system' AND a.purpose='treasury_asset' AND p.direction='credit') OR (a.owner_type='platform' AND a.purpose='network_fee_expense' AND p.direction='debit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 OR j.ledger_type<>'RECOVERY_OUTFLOW_GAS' OR j.metadata->>'resolution_id' IS DISTINCT FROM r.id::text THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 ELSIF r.gas_journal_id IS NOT NULL THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 IF r.account_setup_base_units>0 THEN
 SELECT * INTO j FROM public.ledger_journals WHERE id=r.setup_journal_id;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=r.native_asset_id AND a.owner_id IS NULL AND p.amount_base_units=r.account_setup_base_units AND ((a.owner_type='system' AND a.purpose='treasury_asset' AND p.direction='credit') OR (a.owner_type='platform' AND a.purpose='recipient_account_setup_expense' AND p.direction='debit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 OR j.ledger_type<>'RECOVERY_OUTFLOW_SETUP' OR j.metadata->>'resolution_id' IS DISTINCT FROM r.id::text THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 ELSIF r.setup_journal_id IS NOT NULL THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_recovery_loss_guard() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER recovery_loss_guard AFTER INSERT ON public.recovery_outflow_resolutions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_loss_guard();
