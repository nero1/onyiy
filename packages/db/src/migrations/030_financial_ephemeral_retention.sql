CREATE OR REPLACE FUNCTION public.gw_financial_ephemeral_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.expires_at>clock_timestamp() OR current_setting('gw.operational_retention_hold',true)='true' THEN RAISE EXCEPTION 'FINANCIAL_EPHEMERAL_RETAINED';END IF;
  RETURN OLD;
 END IF;
 IF TG_TABLE_NAME='worker_requests' OR (to_jsonb(NEW)-'used_at') IS DISTINCT FROM (to_jsonb(OLD)-'used_at') OR OLD.used_at IS NOT NULL OR NEW.used_at IS NULL OR NEW.used_at>clock_timestamp() OR OLD.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'FINANCIAL_EPHEMERAL_IMMUTABLE';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_financial_ephemeral_guard() FROM PUBLIC;
CREATE TRIGGER wallet_challenge_guard BEFORE UPDATE OR DELETE ON public.wallet_challenges FOR EACH ROW EXECUTE FUNCTION public.gw_financial_ephemeral_guard();
CREATE TRIGGER worker_nonce_guard BEFORE UPDATE OR DELETE ON public.worker_requests FOR EACH ROW EXECUTE FUNCTION public.gw_financial_ephemeral_guard();
GRANT DELETE ON public.wallet_challenges,public.worker_requests TO gw_service;
