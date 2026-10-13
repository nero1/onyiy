ALTER TABLE public.signed_attempts ADD COLUMN IF NOT EXISTS previous_attempt_id uuid REFERENCES public.signed_attempts(id) ON DELETE RESTRICT;
ALTER TABLE public.signed_attempts ADD COLUMN IF NOT EXISTS signed_at_height numeric(78,0) CHECK(signed_at_height>=0);
-- Acquires the same user-before-obligation order as web confirmation/cancellation.
-- Worker receives a boolean only; it gains no identity or factor capability.
CREATE OR REPLACE FUNCTION public.gw_signer_owner_fence(obligation uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.crypto_obligations; u public.users; w public.wallet_links;
BEGIN
 IF current_setting('gw.environment',true)<>'testnet' THEN RAISE EXCEPTION 'SIGNER_SCOPE_DENIED';END IF;
 SELECT * INTO o FROM public.crypto_obligations WHERE id=obligation AND environment='testnet';
 IF NOT FOUND THEN RETURN false;END IF;
 IF o.user_id IS NULL THEN RETURN o.kind IN ('business','sweep');END IF;
 SELECT * INTO u FROM public.users WHERE id=o.user_id FOR SHARE;
 IF o.kind='refund' THEN RETURN true;END IF;
 IF u.status NOT IN ('active','deactivated') OR u.consented_at IS NULL THEN RETURN false;END IF;
 SELECT * INTO w FROM public.wallet_links WHERE user_id=o.user_id AND environment='testnet' AND chain_id=o.registry_snapshot->>'network';
 RETURN w.address=o.destination AND w.revision=o.wallet_revision AND coalesce(w.cooling_until<=clock_timestamp(),true);
END $$;
REVOKE ALL ON FUNCTION public.gw_signer_owner_fence(uuid) FROM PUBLIC,gw_read,gw_service;
GRANT EXECUTE ON FUNCTION public.gw_signer_owner_fence(uuid) TO gw_signer;
CREATE OR REPLACE FUNCTION public.gw_attempt_lineage_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE previous public.signed_attempts;
BEGIN
 IF TG_OP='UPDATE' AND OLD.status IN ('confirmed','failed','expired') AND (NEW.status,NEW.actual_native_fee,NEW.confirmed_at) IS DISTINCT FROM (OLD.status,OLD.actual_native_fee,OLD.confirmed_at) THEN RAISE EXCEPTION 'ATTEMPT_OUTCOME_IMMUTABLE';END IF;
 IF TG_OP='INSERT' AND NEW.previous_attempt_id IS NOT NULL THEN
  SELECT * INTO previous FROM public.signed_attempts WHERE id=NEW.previous_attempt_id;
  IF previous.obligation_id<>NEW.obligation_id OR previous.environment<>NEW.environment OR previous.chain<>NEW.chain OR previous.configuration_hash<>NEW.configuration_hash OR previous.attempt+1<>NEW.attempt THEN RAISE EXCEPTION 'ATTEMPT_LINEAGE_INVALID';END IF;
  IF NEW.chain IN ('eth','bnb') AND previous.nonce IS DISTINCT FROM NEW.nonce THEN RAISE EXCEPTION 'REPLACEMENT_NONCE_CHANGED';END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_attempt_lineage_guard() FROM PUBLIC;
CREATE TRIGGER attempt_lineage_guard BEFORE INSERT OR UPDATE ON public.signed_attempts FOR EACH ROW EXECUTE FUNCTION public.gw_attempt_lineage_guard();
