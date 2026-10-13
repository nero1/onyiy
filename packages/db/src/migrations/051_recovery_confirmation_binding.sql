ALTER TABLE public.liability_recoveries ADD COLUMN IF NOT EXISTS confirmation_hash text CHECK(confirmation_hash IS NULL OR length(confirmation_hash)=64);
CREATE OR REPLACE FUNCTION public.gw_liability_recovery_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LIABILITY_RECOVERY_RETAINED';END IF;
 IF (to_jsonb(NEW)-ARRAY['signature_hash','confirmation_hash','confirmed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['signature_hash','confirmation_hash','confirmed_at']) OR OLD.confirmed_at IS NOT NULL OR NEW.confirmed_at IS NULL OR NEW.signature_hash IS NULL OR NEW.confirmation_hash IS NULL OR OLD.expires_at<=clock_timestamp() OR NEW.confirmed_at>clock_timestamp() THEN RAISE EXCEPTION 'LIABILITY_RECOVERY_IMMUTABLE';END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_liability_recovery_guard() FROM PUBLIC;
