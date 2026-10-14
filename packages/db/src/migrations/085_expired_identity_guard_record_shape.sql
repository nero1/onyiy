-- Prepare table-specific expressions only for the corresponding OLD record;
-- auth_flows has no window_seconds column.
CREATE OR REPLACE FUNCTION public.gw_expired_identity_delete_guard() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='auth_flows' THEN
  IF OLD.expires_at>=clock_timestamp()-interval '60 seconds' THEN RAISE EXCEPTION 'ACTIVE_IDENTITY_RECORD_RETAINED';END IF;
 ELSIF TG_TABLE_NAME='rate_limits' THEN
  IF OLD.expires_at>=clock_timestamp()-OLD.window_seconds*interval '1 second' THEN RAISE EXCEPTION 'ACTIVE_IDENTITY_RECORD_RETAINED';END IF;
 ELSE RAISE EXCEPTION 'IDENTITY_CLEANUP_SCOPE_DENIED';
 END IF;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.gw_expired_identity_delete_guard() FROM PUBLIC;
