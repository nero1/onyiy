-- Identity/session/rate infrastructure is server-only in both supported app
-- environments. Keep unsupported/mainnet scopes, browser roles and member
-- contexts outside this policy; no financial table or role grant changes.
DO $$
DECLARE resource text;
BEGIN
 FOREACH resource IN ARRAY ARRAY[
  'user_identities','auth_sessions','auth_refresh_tokens','auth_factors',
  'auth_totp_replays','auth_recovery_codes','auth_flows','rate_limits'
 ] LOOP
  EXECUTE format('DROP POLICY IF EXISTS gw_identity_service ON public.%I',resource);
  EXECUTE format(
   'CREATE POLICY gw_identity_service ON public.%I TO gw_service USING (current_setting(''gw.environment'',true) IN (''simulation'',''testnet'') AND current_setting(''gw.access'',true)=''service'') WITH CHECK (current_setting(''gw.environment'',true) IN (''simulation'',''testnet'') AND current_setting(''gw.access'',true)=''service'')',resource
  );
 END LOOP;
END $$;
