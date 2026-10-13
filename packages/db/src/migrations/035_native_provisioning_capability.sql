GRANT INSERT ON public.assets TO gw_service;
GRANT UPDATE(enabled,registry_binding) ON public.assets TO gw_service;
-- Existing operational native fee assets have an unambiguous native identity.
UPDATE public.assets SET registry_binding=jsonb_build_object('key',lower(symbol),'chain',CASE symbol WHEN 'ETH' THEN 'eth' WHEN 'BNB' THEN 'bnb' WHEN 'SOL' THEN 'sol' ELSE 'tron' END,'network',chain_id,'kind','native','decimals',decimals,'contract',NULL,'mint',NULL)
WHERE registry_binding IS NULL AND environment='testnet' AND ((symbol='ETH' AND chain_id='11155111' AND decimals=18) OR (symbol='BNB' AND chain_id='97' AND decimals=18) OR (symbol='SOL' AND chain_id='devnet' AND decimals=9) OR (symbol='TRX' AND chain_id IN ('nile','shasta') AND decimals=6));
-- A first binding is allowed only while a previously unbound asset is unused.
CREATE OR REPLACE FUNCTION public.gw_registry_first_binding_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.registry_binding IS NULL AND NEW.registry_binding IS NOT NULL AND (EXISTS(SELECT 1 FROM public.ledger_accounts WHERE asset_id=OLD.id) OR EXISTS(SELECT 1 FROM public.plan_versions WHERE asset_id=OLD.id)) THEN RAISE EXCEPTION 'USED_ASSET_BINDING_REQUIRED';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_registry_first_binding_guard() FROM PUBLIC;
CREATE TRIGGER registry_first_binding_guard BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.gw_registry_first_binding_guard();
