CREATE OR REPLACE VIEW public.gw_signer_health WITH (security_barrier=true) AS
 SELECT s.treasury_fingerprint,s.chain,s.heartbeat_at,
 coalesce((SELECT sum(r.native_fee_reserved) FROM public.signer_reservations r JOIN public.crypto_obligations o ON o.id=r.obligation_id WHERE r.treasury_fingerprint=s.treasury_fingerprint AND o.status IN ('approved','signing','broadcast','exception','awaiting_requote')),0)::numeric(78,0) AS native_reserved
 FROM public.signer_states s WHERE s.environment='testnet';
REVOKE ALL ON public.gw_signer_health FROM PUBLIC,gw_read;
GRANT SELECT ON public.gw_signer_health TO gw_service;
