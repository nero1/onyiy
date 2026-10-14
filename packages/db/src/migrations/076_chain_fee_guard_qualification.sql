-- Qualify the fee-purpose variable separately from account columns.
CREATE OR REPLACE FUNCTION public.gw_chain_fee_guard() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE a public.assets;j public.ledger_journals;cost numeric;journal uuid;target_purpose text;component text;total integer;valid integer;
BEGIN
 SELECT * INTO a FROM public.assets WHERE id=NEW.native_asset_id;
 IF a.environment<>'testnet' OR a.chain_id<>NEW.network OR a.symbol<>(CASE NEW.chain WHEN 'eth' THEN 'ETH' WHEN 'bnb' THEN 'BNB' WHEN 'sol' THEN 'SOL' WHEN 'tron' THEN 'TRX' END) THEN RAISE EXCEPTION 'CHAIN_FEE_ASSET_INVALID';END IF;
 FOR component,cost,journal,target_purpose IN SELECT * FROM (VALUES
  ('network',NEW.network_fee_base_units,NEW.gas_journal_id,'network_fee_expense'),
  ('setup',NEW.account_setup_base_units,NEW.setup_journal_id,'recipient_account_setup_expense')) v LOOP
  IF cost=0 THEN IF journal IS NOT NULL THEN RAISE EXCEPTION 'CHAIN_FEE_JOURNAL_INVALID';END IF;CONTINUE;END IF;
  SELECT * INTO j FROM public.ledger_journals WHERE id=journal;
  SELECT count(*),count(*) FILTER(WHERE ac.asset_id=NEW.native_asset_id AND ac.owner_id IS NULL AND p.amount_base_units=cost AND ((ac.owner_type='system' AND ac.purpose='treasury_asset' AND p.direction='credit') OR (ac.owner_type='platform' AND ac.purpose=target_purpose AND p.direction='debit')))
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
