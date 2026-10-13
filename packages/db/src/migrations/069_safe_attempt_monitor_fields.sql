CREATE OR REPLACE VIEW public.gw_signed_attempt_status WITH (security_barrier=true) AS SELECT id,obligation_id,tx_hash,nonce,native_fee_cap,status,actual_native_fee,intent_hash,configuration_hash,valid_until_height,expires_at,previous_attempt_id,signed_at_height,created_at FROM public.signed_attempts;
REVOKE ALL ON public.gw_signed_attempt_status FROM PUBLIC,gw_read;
GRANT SELECT ON public.gw_signed_attempt_status TO gw_service;
