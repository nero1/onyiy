ALTER TABLE public.crypto_obligations DROP CONSTRAINT IF EXISTS crypto_obligations_kind_check;
ALTER TABLE public.crypto_obligations ADD CONSTRAINT crypto_obligations_kind_check CHECK(kind IN ('withdrawal','business','refund','sweep','recovery'));
CREATE TABLE IF NOT EXISTS public.liability_recoveries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,obligation_id uuid NOT NULL UNIQUE REFERENCES public.crypto_obligations(id) ON DELETE RESTRICT,proof_reference text NOT NULL,statement text NOT NULL,statement_hash text NOT NULL CHECK(length(statement_hash)=64),signature_hash text,expires_at timestamptz NOT NULL,confirmed_at timestamptz,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE OR REPLACE FUNCTION public.gw_liability_recovery_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LIABILITY_RECOVERY_RETAINED';END IF;
 IF (to_jsonb(NEW)-ARRAY['signature_hash','confirmed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['signature_hash','confirmed_at']) OR OLD.confirmed_at IS NOT NULL OR NEW.confirmed_at IS NULL OR NEW.signature_hash IS NULL OR OLD.expires_at<=clock_timestamp() OR NEW.confirmed_at>clock_timestamp() THEN RAISE EXCEPTION 'LIABILITY_RECOVERY_IMMUTABLE';END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_liability_recovery_guard() FROM PUBLIC;
CREATE TRIGGER liability_recovery_guard BEFORE UPDATE OR DELETE ON public.liability_recoveries FOR EACH ROW EXECUTE FUNCTION public.gw_liability_recovery_guard();
-- Supabase Data API grants: public.liability_recoveries is server-only financial
-- evidence; no raw reusable signature, private key or identity reassignment.
ALTER TABLE public.liability_recoveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.liability_recoveries FROM PUBLIC,gw_read,gw_service;
GRANT SELECT,INSERT,UPDATE ON public.liability_recoveries TO gw_service;
CREATE POLICY recovery_service ON public.liability_recoveries TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DO $$ DECLARE browser text;BEGIN FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.liability_recoveries FROM %I',browser);END IF;END LOOP;END $$;
CREATE OR REPLACE FUNCTION public.gw_signer_owner_fence(obligation uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.crypto_obligations;u public.users;w public.wallet_links;
BEGIN
 IF current_setting('gw.environment',true)<>'testnet' THEN RAISE EXCEPTION 'SIGNER_SCOPE_DENIED';END IF;
 SELECT * INTO o FROM public.crypto_obligations WHERE id=obligation AND environment='testnet';IF NOT FOUND THEN RETURN false;END IF;
 IF o.user_id IS NULL THEN RETURN o.kind IN ('business','sweep');END IF;
 SELECT * INTO u FROM public.users WHERE id=o.user_id FOR SHARE;
 IF o.kind='refund' THEN RETURN true;END IF;
 IF o.kind='recovery' THEN RETURN EXISTS(SELECT 1 FROM public.liability_recoveries r WHERE r.obligation_id=o.id AND r.user_id=o.user_id AND r.asset_id=o.asset_id AND r.confirmed_at IS NOT NULL);END IF;
 IF u.status NOT IN ('active','deactivated') OR u.consented_at IS NULL THEN RETURN false;END IF;
 SELECT * INTO w FROM public.wallet_links WHERE user_id=o.user_id AND environment='testnet' AND chain_id=o.registry_snapshot->>'network';
 RETURN w.address=o.destination AND w.revision=o.wallet_revision AND coalesce(w.cooling_until<=clock_timestamp(),true);
END $$;
REVOKE ALL ON FUNCTION public.gw_signer_owner_fence(uuid) FROM PUBLIC,gw_read,gw_service;
GRANT EXECUTE ON FUNCTION public.gw_signer_owner_fence(uuid) TO gw_signer;
