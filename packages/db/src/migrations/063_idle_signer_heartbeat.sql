CREATE TABLE IF NOT EXISTS public.signer_heartbeats(treasury_fingerprint text PRIMARY KEY CHECK(length(treasury_fingerprint)=64),environment text NOT NULL CHECK(environment='testnet'),chain text NOT NULL CHECK(chain IN ('eth','bnb','sol','tron')),configuration_hash text NOT NULL CHECK(length(configuration_hash)=64),heartbeat_at timestamptz NOT NULL DEFAULT clock_timestamp());
-- Supabase Data API grants: public.signer_heartbeats is isolated signer state.
-- Web sees the closed health view, never signer authority or nonce state.
ALTER TABLE public.signer_heartbeats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signer_heartbeats FROM PUBLIC,gw_read,gw_service;
GRANT SELECT,INSERT,UPDATE ON public.signer_heartbeats TO gw_signer;
CREATE POLICY signer_heartbeat_worker ON public.signer_heartbeats TO gw_signer USING(environment='testnet' AND current_setting('gw.environment',true)='testnet') WITH CHECK(environment='testnet' AND current_setting('gw.environment',true)='testnet');
DO $$ DECLARE browser text;BEGIN FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.signer_heartbeats FROM %I',browser);END IF;END LOOP;END $$;
CREATE OR REPLACE VIEW public.gw_signer_health WITH (security_barrier=true) AS
 SELECT h.treasury_fingerprint,h.chain,greatest(h.heartbeat_at,s.heartbeat_at) AS heartbeat_at,
 coalesce((SELECT sum(r.native_fee_reserved) FROM public.signer_reservations r JOIN public.crypto_obligations o ON o.id=r.obligation_id WHERE r.treasury_fingerprint=h.treasury_fingerprint AND o.completed_at IS NULL AND o.status IN ('approved','signing','broadcast','exception','awaiting_requote')),0)::numeric(78,0) AS native_reserved
 FROM (SELECT treasury_fingerprint,chain,heartbeat_at FROM public.signer_heartbeats WHERE environment='testnet'
 UNION ALL SELECT treasury_fingerprint,chain,heartbeat_at FROM public.signer_states s0 WHERE s0.environment='testnet' AND NOT EXISTS(SELECT 1 FROM public.signer_heartbeats h0 WHERE h0.treasury_fingerprint=s0.treasury_fingerprint)) h
 LEFT JOIN public.signer_states s ON s.treasury_fingerprint=h.treasury_fingerprint;
REVOKE ALL ON public.gw_signer_health FROM PUBLIC,gw_read;
GRANT SELECT ON public.gw_signer_health TO gw_service;
