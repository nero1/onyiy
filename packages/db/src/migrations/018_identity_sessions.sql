ALTER TABLE public.users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1 CHECK(session_version>0);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age_confirmed_at timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age_minimum_accepted integer CHECK(age_minimum_accepted BETWEEN 1 AND 120);
CREATE TABLE IF NOT EXISTS public.user_identities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 provider text NOT NULL CHECK(provider IN ('google','simulation')),subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 255),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(provider,subject)
);
CREATE TABLE IF NOT EXISTS public.auth_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 generation uuid NOT NULL DEFAULT gen_random_uuid(),session_version integer NOT NULL CHECK(session_version>0),
 access_hash text NOT NULL UNIQUE CHECK(length(access_hash)=64),csrf_hash text NOT NULL CHECK(length(csrf_hash)=64),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 access_expires_at timestamptz NOT NULL,idle_expires_at timestamptz NOT NULL,absolute_expires_at timestamptz NOT NULL,
 pre_auth boolean NOT NULL DEFAULT false,revoked_at timestamptz,step_up_at timestamptz,
 CHECK(access_expires_at>created_at AND idle_expires_at>created_at AND absolute_expires_at>created_at)
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON public.auth_sessions(user_id,id);
CREATE TABLE IF NOT EXISTS public.auth_refresh_tokens (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64),session_id uuid NOT NULL REFERENCES public.auth_sessions(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz NOT NULL,used_at timestamptz,
 CHECK(expires_at>created_at)
);
CREATE INDEX IF NOT EXISTS auth_refresh_session_idx ON public.auth_refresh_tokens(session_id);
CREATE TABLE IF NOT EXISTS public.auth_factors (
 user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT,id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 secret_cipher text NOT NULL CHECK(length(secret_cipher) BETWEEN 60 AND 512),active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),setup_expires_at timestamptz NOT NULL,
 last_step bigint NOT NULL DEFAULT -1 CHECK(last_step>=-1)
);
CREATE TABLE IF NOT EXISTS public.auth_totp_replays (
 factor_id uuid NOT NULL REFERENCES public.auth_factors(id) ON DELETE RESTRICT,time_step bigint NOT NULL CHECK(time_step>=0),
 accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(factor_id,time_step)
);
CREATE TABLE IF NOT EXISTS public.auth_recovery_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),factor_id uuid NOT NULL REFERENCES public.auth_factors(id) ON DELETE RESTRICT,
 code_hash text NOT NULL UNIQUE CHECK(length(code_hash)=64),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),used_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.auth_flows (
 state_hash text PRIMARY KEY CHECK(length(state_hash)=64),nonce_hash text NOT NULL CHECK(length(nonce_hash)=64),
 verifier_cipher text NOT NULL CHECK(length(verifier_cipher) BETWEEN 60 AND 512),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,used_at timestamptz,CHECK(expires_at>created_at)
);
CREATE TABLE IF NOT EXISTS public.rate_limits (
 key_hash text PRIMARY KEY CHECK(length(key_hash)=64),environment text NOT NULL CHECK(environment IN ('simulation','testnet','mainnet')),
 window_start timestamptz NOT NULL,window_seconds integer NOT NULL CHECK(window_seconds BETWEEN 1 AND 1000000),
 used integer NOT NULL CHECK(used>0),expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_expiry_idx ON public.rate_limits(environment,expires_at,key_hash);
CREATE OR REPLACE FUNCTION public.gw_identity_revocation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status OR NEW.role IS DISTINCT FROM OLD.role THEN
  NEW.session_version:=OLD.session_version+1;
  UPDATE public.auth_sessions SET revoked_at=coalesce(revoked_at,clock_timestamp()) WHERE user_id=OLD.id;
 ELSIF NEW.session_version<OLD.session_version THEN RAISE EXCEPTION 'SESSION_VERSION_INVALID';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_identity_revocation() FROM PUBLIC;
DROP TRIGGER IF EXISTS identity_revocation ON public.users;
CREATE TRIGGER identity_revocation BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.gw_identity_revocation();
GRANT INSERT ON public.users TO gw_service;
-- Supabase Data API grants: identities/factors/tokens/rate records are server-only.
DO $$
DECLARE resource text;browser text;
BEGIN
 FOREACH resource IN ARRAY ARRAY['user_identities','auth_sessions','auth_refresh_tokens','auth_factors','auth_totp_replays','auth_recovery_codes','auth_flows','rate_limits'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',resource);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,gw_read,gw_service',resource);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO gw_service',resource);
  EXECUTE format('DROP POLICY IF EXISTS gw_identity_service ON public.%I',resource);
  EXECUTE format('CREATE POLICY gw_identity_service ON public.%I TO gw_service USING (current_setting(''gw.environment'',true)=''simulation'') WITH CHECK (current_setting(''gw.environment'',true)=''simulation'')',resource);
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',resource,browser);END IF;
  END LOOP;
 END LOOP;
END $$;
-- Explicit classifications: public.user_identities public.auth_sessions public.auth_refresh_tokens
-- public.auth_factors public.auth_totp_replays public.auth_recovery_codes public.auth_flows public.rate_limits

REVOKE UPDATE ON public.user_identities,public.auth_totp_replays FROM gw_service;
CREATE OR REPLACE FUNCTION public.gw_session_history_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_TABLE_NAME='auth_sessions' THEN
  IF (NEW.id,NEW.user_id,NEW.generation,NEW.session_version,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.generation,OLD.session_version,OLD.created_at)
   OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN RAISE EXCEPTION 'SESSION_HISTORY_INVALID';END IF;
 ELSIF TG_TABLE_NAME='auth_refresh_tokens' THEN
  IF (NEW.token_hash,NEW.session_id,NEW.created_at,NEW.expires_at) IS DISTINCT FROM (OLD.token_hash,OLD.session_id,OLD.created_at,OLD.expires_at)
   OR (OLD.used_at IS NOT NULL AND NEW.used_at IS DISTINCT FROM OLD.used_at) THEN RAISE EXCEPTION 'SESSION_HISTORY_INVALID';END IF;
 ELSIF TG_TABLE_NAME='auth_recovery_codes' THEN
  IF (NEW.id,NEW.factor_id,NEW.code_hash,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.factor_id,OLD.code_hash,OLD.created_at)
   OR (OLD.used_at IS NOT NULL AND NEW.used_at IS DISTINCT FROM OLD.used_at) THEN RAISE EXCEPTION 'SESSION_HISTORY_INVALID';END IF;
 ELSIF TG_TABLE_NAME='auth_factors' THEN
  IF (NEW.user_id,NEW.id) IS DISTINCT FROM (OLD.user_id,OLD.id) OR NEW.last_step<OLD.last_step
   OR (OLD.active AND (NOT NEW.active OR NEW.secret_cipher IS DISTINCT FROM OLD.secret_cipher)) THEN RAISE EXCEPTION 'FACTOR_HISTORY_INVALID';END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_session_history_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS session_history_guard ON public.auth_sessions;
CREATE TRIGGER session_history_guard BEFORE UPDATE ON public.auth_sessions FOR EACH ROW EXECUTE FUNCTION public.gw_session_history_guard();
DROP TRIGGER IF EXISTS refresh_history_guard ON public.auth_refresh_tokens;
CREATE TRIGGER refresh_history_guard BEFORE UPDATE ON public.auth_refresh_tokens FOR EACH ROW EXECUTE FUNCTION public.gw_session_history_guard();
DROP TRIGGER IF EXISTS recovery_history_guard ON public.auth_recovery_codes;
CREATE TRIGGER recovery_history_guard BEFORE UPDATE ON public.auth_recovery_codes FOR EACH ROW EXECUTE FUNCTION public.gw_session_history_guard();
DROP TRIGGER IF EXISTS factor_history_guard ON public.auth_factors;
CREATE TRIGGER factor_history_guard BEFORE UPDATE ON public.auth_factors FOR EACH ROW EXECUTE FUNCTION public.gw_session_history_guard();
