CREATE TABLE IF NOT EXISTS public.bot_challenges(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,session_generation uuid NOT NULL,environment text NOT NULL CHECK(environment IN ('simulation','testnet')),surface text NOT NULL CHECK(surface IN ('consent','suspicious_checkout')),provider text NOT NULL CHECK(provider IN ('dummy','turnstile')),dummy_hash text,expires_at timestamptz NOT NULL,consumed_at timestamptz,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX IF NOT EXISTS bot_challenge_expiry_idx ON public.bot_challenges(expires_at,id);
CREATE TABLE IF NOT EXISTS public.bot_token_uses(token_hash text PRIMARY KEY CHECK(length(token_hash)=64),challenge_id uuid NOT NULL UNIQUE REFERENCES public.bot_challenges(id) ON DELETE RESTRICT,request_key text NOT NULL,environment text NOT NULL CHECK(environment IN ('simulation','testnet')),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX IF NOT EXISTS bot_token_expiry_idx ON public.bot_token_uses(expires_at,token_hash);
CREATE TABLE IF NOT EXISTS public.abuse_signals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,category text NOT NULL CHECK(category='payment_proof_failure'),source_key text NOT NULL UNIQUE CHECK(length(source_key)=64),created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX IF NOT EXISTS abuse_user_time_idx ON public.abuse_signals(user_id,created_at,id);
CREATE OR REPLACE FUNCTION public.gw_bot_history_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF current_setting('gw.operational_retention_hold',true)='true' OR (TG_TABLE_NAME='abuse_signals' AND OLD.created_at>clock_timestamp()-interval '7 days') OR (TG_TABLE_NAME<>'abuse_signals' AND OLD.expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'BOT_HISTORY_RETAINED';END IF;RETURN OLD;
 END IF;
 IF TG_TABLE_NAME<>'bot_challenges' OR (to_jsonb(NEW)-'consumed_at') IS DISTINCT FROM (to_jsonb(OLD)-'consumed_at') OR OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL OR NEW.consumed_at>clock_timestamp() OR OLD.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'BOT_CHALLENGE_IMMUTABLE';END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_bot_history_guard() FROM PUBLIC;
-- Supabase Data API grants: public.bot_challenges, public.bot_token_uses and
-- public.abuse_signals are server-only; never expose token hashes or private flags.
DO $$ DECLARE resource text;browser text;BEGIN FOREACH resource IN ARRAY ARRAY['bot_challenges','bot_token_uses','abuse_signals'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',resource);EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,gw_read,gw_service',resource);
 EXECUTE format('GRANT SELECT,INSERT,DELETE ON public.%I TO gw_service',resource);
 EXECUTE format('CREATE POLICY bot_service ON public.%I TO gw_service USING(current_setting(''gw.access'',true)=''service'') WITH CHECK(current_setting(''gw.access'',true)=''service'')',resource);
 EXECUTE format('CREATE TRIGGER bot_history_guard BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.gw_bot_history_guard()',resource);
 FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',resource,browser);END IF;END LOOP;
END LOOP;END $$;
GRANT UPDATE(consumed_at) ON public.bot_challenges TO gw_service;
