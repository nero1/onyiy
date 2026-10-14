GRANT DELETE ON public.auth_flows,public.rate_limits TO gw_service;
CREATE OR REPLACE FUNCTION public.gw_expired_identity_delete_guard() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='auth_flows' AND OLD.expires_at>=clock_timestamp()-interval '60 seconds' THEN RAISE EXCEPTION 'ACTIVE_IDENTITY_RECORD_RETAINED';END IF;
 IF TG_TABLE_NAME='rate_limits' AND OLD.expires_at>=clock_timestamp()-OLD.window_seconds*interval '1 second' THEN RAISE EXCEPTION 'ACTIVE_IDENTITY_RECORD_RETAINED';END IF;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.gw_expired_identity_delete_guard() FROM PUBLIC;
CREATE TRIGGER expired_flow_delete_guard BEFORE DELETE ON public.auth_flows FOR EACH ROW EXECUTE FUNCTION public.gw_expired_identity_delete_guard();
CREATE TRIGGER expired_rate_delete_guard BEFORE DELETE ON public.rate_limits FOR EACH ROW EXECUTE FUNCTION public.gw_expired_identity_delete_guard();
