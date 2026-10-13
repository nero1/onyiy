-- Independent signer evaluates live limits and native beneficiary liabilities.
GRANT SELECT ON public.x_manifest,public.ledger_accounts,public.ledger_postings,public.operational_alerts,public.alert_deliveries TO gw_signer;
CREATE POLICY signer_manifest_read ON public.x_manifest FOR SELECT TO gw_signer USING(current_setting('gw.environment',true)='testnet');
CREATE POLICY signer_account_read ON public.ledger_accounts FOR SELECT TO gw_signer USING(asset_id IN (SELECT id FROM public.assets WHERE environment='testnet'));
CREATE POLICY signer_posting_read ON public.ledger_postings FOR SELECT TO gw_signer USING(account_id IN (SELECT id FROM public.ledger_accounts));
CREATE POLICY signer_alert_read ON public.operational_alerts FOR SELECT TO gw_signer USING(environment='testnet');
CREATE POLICY signer_delivery_read ON public.alert_deliveries FOR SELECT TO gw_signer USING(alert_id IN (SELECT id FROM public.operational_alerts WHERE environment='testnet'));

-- Trigger may inspect existence of protected attempts without exposing bytes.
ALTER FUNCTION public.gw_financial_state_guard() SECURITY DEFINER;
