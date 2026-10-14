CREATE TABLE public.chain_fee_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 environment text NOT NULL CHECK(environment='testnet'),
 chain text NOT NULL CHECK(chain IN ('eth','bnb','sol','tron')),
 network text NOT NULL,
 tx_hash text NOT NULL,
 native_asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
 network_fee_base_units numeric(78,0) NOT NULL CHECK(network_fee_base_units>=0),
 account_setup_base_units numeric(78,0) NOT NULL CHECK(account_setup_base_units>=0),
 gas_journal_id uuid UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
 setup_journal_id uuid UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX chain_fee_identity_idx ON public.chain_fee_claims(environment,chain,network,tx_hash);
CREATE TRIGGER chain_fee_retained BEFORE UPDATE OR DELETE ON public.chain_fee_claims
 FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();
-- Supabase Data API grants: public.chain_fee_claims retains transaction-level
-- cost ownership; service-only, no browser or signer access.
ALTER TABLE public.chain_fee_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chain_fee_claims FROM PUBLIC,gw_read,gw_signer;
GRANT SELECT,INSERT ON public.chain_fee_claims TO gw_service;
CREATE POLICY chain_fee_service ON public.chain_fee_claims TO gw_service
 USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DO $$ DECLARE browser text;BEGIN
 FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.chain_fee_claims FROM %I',browser);END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.gw_chain_fee_guard() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE a public.assets;j public.ledger_journals;cost numeric;journal uuid;purpose text;component text;total integer;valid integer;
BEGIN
 SELECT * INTO a FROM public.assets WHERE id=NEW.native_asset_id;
 IF a.environment<>'testnet' OR a.chain_id<>NEW.network OR a.symbol<>(CASE NEW.chain WHEN 'eth' THEN 'ETH' WHEN 'bnb' THEN 'BNB' WHEN 'sol' THEN 'SOL' WHEN 'tron' THEN 'TRX' END) THEN RAISE EXCEPTION 'CHAIN_FEE_ASSET_INVALID';END IF;
 FOR component,cost,journal,purpose IN SELECT * FROM (VALUES
  ('network',NEW.network_fee_base_units,NEW.gas_journal_id,'network_fee_expense'),
  ('setup',NEW.account_setup_base_units,NEW.setup_journal_id,'recipient_account_setup_expense')) v LOOP
  IF cost=0 THEN IF journal IS NOT NULL THEN RAISE EXCEPTION 'CHAIN_FEE_JOURNAL_INVALID';END IF;CONTINUE;END IF;
  SELECT * INTO j FROM public.ledger_journals WHERE id=journal;
  SELECT count(*),count(*) FILTER(WHERE ac.asset_id=NEW.native_asset_id AND ac.owner_id IS NULL AND p.amount_base_units=cost AND ((ac.owner_type='system' AND ac.purpose='treasury_asset' AND p.direction='credit') OR (ac.owner_type='platform' AND ac.purpose=purpose AND p.direction='debit')))
   INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts ac ON ac.id=p.account_id WHERE p.journal_id=journal;
  IF total<>2 OR valid<>2 OR j.id IS NULL THEN RAISE EXCEPTION 'CHAIN_FEE_JOURNAL_INVALID';END IF;
  IF j.business_key='chain-fee:'||NEW.environment||':'||NEW.chain||':'||NEW.network||':'||NEW.tx_hash||':'||component THEN
   IF j.metadata->>'tx_hash' IS DISTINCT FROM NEW.tx_hash OR j.metadata->>'network' IS DISTINCT FROM NEW.network OR j.metadata->>'chain' IS DISTINCT FROM NEW.chain THEN RAISE EXCEPTION 'CHAIN_FEE_JOURNAL_INVALID';END IF;
  ELSIF j.business_key=(CASE component WHEN 'network' THEN 'gas:testnet:'||NEW.chain||':'||NEW.tx_hash ELSE 'account-setup:'||NEW.chain||':'||NEW.tx_hash END) THEN
   NULL; -- Retained legacy key; exact native-asset postings checked above.
  ELSIF NOT EXISTS(SELECT 1 FROM public.recovery_outflow_resolutions r WHERE r.native_asset_id=NEW.native_asset_id AND r.tx_hash=NEW.tx_hash AND (CASE component WHEN 'network' THEN r.gas_journal_id ELSE r.setup_journal_id END)=journal) THEN
   RAISE EXCEPTION 'CHAIN_FEE_JOURNAL_INVALID';
  END IF;
 END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_chain_fee_guard() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER chain_fee_guard AFTER INSERT ON public.chain_fee_claims
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_chain_fee_guard();

-- Per-event principal remains independent; fees reference one retained claim.
CREATE OR REPLACE FUNCTION public.gw_recovery_loss_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.recovery_outflow_resolutions;o public.recovery_outflows;j public.ledger_journals;total integer;valid integer;claim public.chain_fee_claims;registry jsonb;
BEGIN
 SELECT * INTO r FROM public.recovery_outflow_resolutions WHERE id=NEW.id;SELECT * INTO o FROM public.recovery_outflows WHERE id=r.outflow_id;
 IF o.status<>'review' OR (o.asset_id,o.tx_hash,o.event_index,o.amount_base_units) IS DISTINCT FROM (r.asset_id,r.tx_hash,r.event_index,r.principal_base_units) THEN RAISE EXCEPTION 'RECOVERY_LOSS_EVIDENCE_INVALID';END IF;
 IF r.principal_base_units>0 THEN
 SELECT * INTO j FROM public.ledger_journals WHERE id=r.principal_journal_id;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=r.asset_id AND a.owner_id IS NULL AND p.amount_base_units=r.principal_base_units AND ((a.owner_type='system' AND a.purpose='treasury_asset' AND p.direction='credit') OR (a.owner_type='platform' AND a.purpose='chain_loss_expense' AND p.direction='debit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 OR j.ledger_type<>'RECOVERY_OUTFLOW_LOSS' OR j.metadata->>'resolution_id' IS DISTINCT FROM r.id::text THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 ELSIF r.principal_journal_id IS NOT NULL THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 SELECT c.registry_snapshot INTO registry FROM public.recovery_outflows o2 JOIN public.chain_recovery_runs run ON run.id=o2.run_id JOIN public.chain_checkpoints c ON c.id=run.checkpoint_id WHERE o2.id=r.outflow_id;
 SELECT * INTO claim FROM public.chain_fee_claims WHERE environment='testnet' AND chain=registry->>'chain' AND network=registry->>'network' AND tx_hash=r.tx_hash;
 IF claim.id IS NULL OR (claim.native_asset_id,claim.network_fee_base_units+claim.account_setup_base_units,claim.account_setup_base_units,claim.gas_journal_id,claim.setup_journal_id) IS DISTINCT FROM (r.native_asset_id,r.native_fee_base_units,r.account_setup_base_units,r.gas_journal_id,r.setup_journal_id) THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_recovery_loss_guard() FROM PUBLIC;
