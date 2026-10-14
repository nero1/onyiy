-- Preserve the existing isolated signer's testnet custody visibility through a
-- read-only aggregate capability. No service/read-role membership is added.
CREATE FUNCTION public.gw_signer_asset_balance(target uuid,purposes text[]) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE value numeric;
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'gw_signer' OR current_setting('gw.environment',true) IS DISTINCT FROM 'testnet'
  OR NOT EXISTS(SELECT 1 FROM public.assets WHERE id=target AND environment='testnet')
  OR purposes IS NULL OR cardinality(purposes) NOT BETWEEN 1 AND 20 OR array_position(purposes,NULL) IS NOT NULL
  OR NOT purposes <@ ARRAY['available_payable','held_payable','refund_payable','incoming_payable','unallocated_payable','marketing_payable','developer_payable','bootstrap_developer_payable','bootstrap_marketing_payable','bootstrap_platform_payable','bootstrap_custom_bootstrap_payable']::text[] THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 IF public.gw_counter_ready() THEN SELECT coalesce(sum(balance),0) INTO value FROM public.ledger_asset_totals WHERE asset_id=target AND purpose=ANY(purposes);
 ELSE SELECT coalesce(sum(CASE WHEN p.direction='credit' THEN p.amount_base_units ELSE -p.amount_base_units END),0) INTO value FROM public.ledger_accounts a JOIN public.ledger_postings p ON p.account_id=a.id WHERE a.asset_id=target AND a.purpose=ANY(purposes);END IF;
 RETURN value;
END $$;
REVOKE ALL ON FUNCTION public.gw_signer_asset_balance(uuid,text[]) FROM PUBLIC,gw_read,gw_service;
GRANT EXECUTE ON FUNCTION public.gw_signer_asset_balance(uuid,text[]) TO gw_signer;
-- Supabase Data API grants unchanged; browser roles receive no capability.
