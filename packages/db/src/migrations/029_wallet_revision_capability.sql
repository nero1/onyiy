GRANT UPDATE(address,verified_at,revision,cooling_until) ON public.wallet_links TO gw_service;
CREATE OR REPLACE FUNCTION public.gw_wallet_revision_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF (to_jsonb(NEW)-ARRAY['address','verified_at','revision','cooling_until']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['address','verified_at','revision','cooling_until']) THEN RAISE EXCEPTION 'WALLET_IDENTITY_IMMUTABLE';END IF;
 IF NEW.address IS DISTINCT FROM OLD.address THEN
  IF OLD.environment<>'testnet' OR NEW.revision<>OLD.revision+1 OR NEW.verified_at<=OLD.verified_at OR NEW.cooling_until<NEW.verified_at THEN RAISE EXCEPTION 'WALLET_REVISION_REQUIRED';END IF;
 ELSIF NEW.revision<>OLD.revision THEN RAISE EXCEPTION 'WALLET_REVISION_REQUIRED';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_wallet_revision_guard() FROM PUBLIC;
CREATE TRIGGER wallet_revision_guard BEFORE UPDATE ON public.wallet_links FOR EACH ROW EXECUTE FUNCTION public.gw_wallet_revision_guard();
