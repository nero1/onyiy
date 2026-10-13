ALTER TABLE public.wallet_links ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
CREATE TABLE IF NOT EXISTS public.wallet_challenges(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,environment text NOT NULL CHECK(environment='testnet'),chain text NOT NULL CHECK(chain IN ('eth','bnb','sol','tron')),
 asset_key text NOT NULL,address text NOT NULL,message text NOT NULL,session_generation uuid NOT NULL,expires_at timestamptz NOT NULL,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.crypto_invoices(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,plan_version_id uuid NOT NULL REFERENCES public.plan_versions(id) ON DELETE RESTRICT,asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL,session_generation uuid NOT NULL,wallet_id uuid NOT NULL REFERENCES public.wallet_links(id) ON DELETE RESTRICT,wallet_revision integer NOT NULL,
 environment text NOT NULL CHECK(environment='testnet'),chain text NOT NULL,registry_hash text NOT NULL CHECK(length(registry_hash)=64),treasury text NOT NULL,sender text NOT NULL,expected_base_units numeric(78,0) NOT NULL CHECK(expected_base_units>0),
 usd_reference numeric(38,18) NOT NULL CHECK(usd_reference>0),expires_at timestamptz NOT NULL,status text NOT NULL DEFAULT 'quoted' CHECK(status IN ('quoted','submitted','credited','exception','expired','cancelled')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(user_id,request_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS crypto_invoice_open_idx ON public.crypto_invoices(user_id,plan_version_id) WHERE status IN ('quoted','submitted');
CREATE TABLE IF NOT EXISTS public.crypto_submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_id uuid NOT NULL REFERENCES public.crypto_invoices(id) ON DELETE RESTRICT,tx_hash text NOT NULL,event_index integer NOT NULL CHECK(event_index>=0),first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(invoice_id,tx_hash,event_index));
CREATE TABLE IF NOT EXISTS public.crypto_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_id uuid NOT NULL REFERENCES public.crypto_invoices(id) ON DELETE RESTRICT,asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
 environment text NOT NULL CHECK(environment='testnet'),chain text NOT NULL,tx_hash text NOT NULL,event_index integer NOT NULL CHECK(event_index>=0),amount_base_units numeric(78,0) NOT NULL CHECK(amount_base_units>=0),
 sender text NOT NULL,destination text NOT NULL,block_hash text NOT NULL,block_height numeric(78,0) NOT NULL,
 status text NOT NULL CHECK(status IN ('confirmed','credited','exception','reorged')),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(environment,chain,tx_hash,event_index,asset_id)
);
CREATE TABLE IF NOT EXISTS public.price_quotes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,asset_usd text NOT NULL,native_usd text NOT NULL,
 observed_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,source text NOT NULL,fingerprint text NOT NULL CHECK(length(fingerprint)=64),created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.crypto_obligations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,kind text NOT NULL CHECK(kind IN ('withdrawal','business','refund','sweep')),
 business_key text NOT NULL UNIQUE,request_hash text NOT NULL CHECK(length(request_hash)=64),environment text NOT NULL CHECK(environment='testnet'),chain text NOT NULL,
 treasury_fingerprint text NOT NULL CHECK(length(treasury_fingerprint)=64),configuration_hash text NOT NULL CHECK(length(configuration_hash)=64),registry_hash text NOT NULL CHECK(length(registry_hash)=64),
 destination text NOT NULL,source_purpose text NOT NULL,wallet_revision integer,session_generation uuid,
 gross_base_units numeric(78,0) NOT NULL CHECK(gross_base_units>0),charge_base_units numeric(78,0) NOT NULL CHECK(charge_base_units>=0),net_base_units numeric(78,0) NOT NULL CHECK(net_base_units>0),
 native_fee_quote numeric(78,0) NOT NULL CHECK(native_fee_quote>=0),rate_snapshot jsonb NOT NULL,fee_snapshot jsonb NOT NULL,
 status text NOT NULL DEFAULT 'quoted' CHECK(status IN ('quoted','held','approved','signing','broadcast','settled','awaiting_requote','exception','cancelled')),
 quote_expires_at timestamptz NOT NULL,approved_at timestamptz,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK(net_base_units+charge_base_units=gross_base_units)
);
CREATE INDEX IF NOT EXISTS obligation_pending_idx ON public.crypto_obligations(status,created_at,id);
CREATE TABLE IF NOT EXISTS public.signer_states(
 treasury_fingerprint text PRIMARY KEY CHECK(length(treasury_fingerprint)=64),environment text NOT NULL CHECK(environment='testnet'),chain text NOT NULL,
 next_nonce numeric(78,0) NOT NULL DEFAULT 0 CHECK(next_nonce>=0),lease_token uuid,lease_generation integer NOT NULL DEFAULT 0,lease_until timestamptz,heartbeat_at timestamptz,configuration_hash text
);
CREATE TABLE IF NOT EXISTS public.signer_reservations(
 obligation_id uuid NOT NULL REFERENCES public.crypto_obligations(id) ON DELETE RESTRICT,treasury_fingerprint text NOT NULL,asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,signing_day date NOT NULL,
 principal_usd_micros numeric(78,0) NOT NULL CHECK(principal_usd_micros>=0),native_fee_reserved numeric(78,0) NOT NULL CHECK(native_fee_reserved>=0),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(obligation_id,signing_day)
);
CREATE TABLE IF NOT EXISTS public.signed_attempts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),obligation_id uuid NOT NULL REFERENCES public.crypto_obligations(id) ON DELETE RESTRICT,attempt integer NOT NULL CHECK(attempt>0),
 environment text NOT NULL CHECK(environment='testnet'),chain text NOT NULL,tx_hash text NOT NULL UNIQUE,nonce numeric(78,0),valid_until_height numeric(78,0),
 signed_cipher text NOT NULL,native_fee_cap numeric(78,0) NOT NULL CHECK(native_fee_cap>=0),intent_hash text NOT NULL CHECK(length(intent_hash)=64),configuration_hash text NOT NULL CHECK(length(configuration_hash)=64),
 status text NOT NULL DEFAULT 'signed' CHECK(status IN ('signed','broadcast','confirmed','failed','expired','unknown')),actual_native_fee numeric(78,0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),broadcast_at timestamptz,confirmed_at timestamptz,UNIQUE(obligation_id,attempt)
);
CREATE TABLE IF NOT EXISTS public.worker_requests(
 nonce uuid PRIMARY KEY,environment text NOT NULL CHECK(environment='testnet'),purpose text NOT NULL,body_hash text NOT NULL CHECK(length(body_hash)=64),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.operational_alerts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),environment text NOT NULL CHECK(environment IN ('simulation','testnet')),asset_id uuid REFERENCES public.assets(id) ON DELETE RESTRICT,
 condition_key text NOT NULL UNIQUE,severity text NOT NULL CHECK(severity IN ('P1','P2','P3','INFO')),category text NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','resolved')),
 safe_details jsonb NOT NULL DEFAULT '{}',next_reminder_at timestamptz NOT NULL DEFAULT clock_timestamp(),reminders integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),acknowledged_at timestamptz,resolved_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.alert_deliveries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),alert_id uuid NOT NULL REFERENCES public.operational_alerts(id) ON DELETE RESTRICT,business_key text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','delivered','failed')),attempts integer NOT NULL DEFAULT 0,lease_token uuid,lease_generation integer NOT NULL DEFAULT 0,lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),delivered_at timestamptz
);
CREATE OR REPLACE FUNCTION public.gw_financial_adapter_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_RETAINED';END IF;
 IF TG_TABLE_NAME IN ('crypto_invoices','crypto_submissions','crypto_events') THEN
  IF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN RAISE EXCEPTION 'INVOICE_SNAPSHOT_IMMUTABLE';END IF;
 ELSIF TG_TABLE_NAME='crypto_obligations' THEN
  IF (to_jsonb(NEW)-ARRAY['status','approved_at','completed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','approved_at','completed_at']) THEN RAISE EXCEPTION 'OBLIGATION_SNAPSHOT_IMMUTABLE';END IF;
 ELSIF TG_TABLE_NAME='signed_attempts' THEN
  IF (to_jsonb(NEW)-ARRAY['status','actual_native_fee','broadcast_at','confirmed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','actual_native_fee','broadcast_at','confirmed_at']) THEN RAISE EXCEPTION 'SIGNED_ATTEMPT_IMMUTABLE';END IF;
 ELSE RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_financial_adapter_guard() FROM PUBLIC;
DO $$ DECLARE resource text;BEGIN FOREACH resource IN ARRAY ARRAY['crypto_invoices','crypto_submissions','crypto_events','crypto_obligations','signed_attempts','price_quotes','signer_reservations'] LOOP
 EXECUTE format('CREATE TRIGGER financial_adapter_guard BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.gw_financial_adapter_guard()',resource);
END LOOP;END $$;
-- Supabase Data API grants: all resources are server/isolated worker only.
-- public.wallet_challenges, public.crypto_invoices, public.crypto_submissions, public.crypto_events,
-- public.price_quotes, public.crypto_obligations, public.signer_states,
-- public.signer_reservations, public.signed_attempts, public.worker_requests,
-- public.operational_alerts, public.alert_deliveries have no browser grants.
DO $$ DECLARE resource text; browser text;BEGIN
 FOREACH resource IN ARRAY ARRAY['wallet_challenges','crypto_invoices','crypto_submissions','crypto_events','price_quotes','crypto_obligations','signer_states','signer_reservations','signed_attempts','worker_requests','operational_alerts','alert_deliveries'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',resource);EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,gw_read,gw_service',resource);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO gw_service',resource);
  EXECUTE format('CREATE POLICY adapter_service ON public.%I TO gw_service USING(current_setting(''gw.access'',true)=''service'') WITH CHECK(current_setting(''gw.access'',true)=''service'')',resource);
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',resource,browser);END IF;END LOOP;
 END LOOP;
END $$;
REVOKE UPDATE ON public.crypto_submissions,public.price_quotes,public.signer_reservations,public.worker_requests FROM gw_service;
-- The web workload cannot read/write encrypted signed bytes or signing state.
REVOKE ALL ON public.signed_attempts,public.signer_states,public.signer_reservations FROM gw_service;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='gw_signer') THEN CREATE ROLE gw_signer NOLOGIN NOINHERIT;END IF;END $$;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='gw_signer' AND (rolcanlogin OR rolinherit OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole)) THEN RAISE EXCEPTION 'SIGNER_ROLE_UNSAFE';END IF;END $$;
GRANT USAGE ON SCHEMA public TO gw_signer;
GRANT SELECT ON public.assets,public.crypto_obligations,public.price_quotes TO gw_signer;
GRANT SELECT,INSERT,UPDATE ON public.signer_states,public.signed_attempts TO gw_signer;
GRANT SELECT,INSERT ON public.signer_reservations TO gw_signer;
CREATE POLICY signer_obligations ON public.crypto_obligations FOR SELECT TO gw_signer USING(environment='testnet' AND status IN ('approved','signing','broadcast','awaiting_requote','exception'));
CREATE POLICY signer_assets ON public.assets FOR SELECT TO gw_signer USING(environment='testnet');
CREATE POLICY signer_prices ON public.price_quotes FOR SELECT TO gw_signer USING(true);
DO $$ DECLARE resource text;BEGIN FOREACH resource IN ARRAY ARRAY['signer_states','signed_attempts','signer_reservations'] LOOP
 EXECUTE format('CREATE POLICY isolated_signer ON public.%I TO gw_signer USING(current_setting(''gw.environment'',true)=''testnet'') WITH CHECK(current_setting(''gw.environment'',true)=''testnet'')',resource);
END LOOP;END $$;

CREATE OR REPLACE VIEW public.gw_signed_attempt_status WITH (security_barrier=true) AS SELECT id,obligation_id,tx_hash,nonce,native_fee_cap,status,actual_native_fee,intent_hash,configuration_hash FROM public.signed_attempts;
REVOKE ALL ON public.gw_signed_attempt_status FROM PUBLIC;
GRANT SELECT ON public.gw_signed_attempt_status TO gw_service;
GRANT UPDATE(status) ON public.crypto_obligations TO gw_signer;
CREATE POLICY signer_obligation_transition ON public.crypto_obligations FOR UPDATE TO gw_signer USING(environment='testnet' AND status IN ('approved','signing','broadcast')) WITH CHECK(environment='testnet' AND status IN ('signing','broadcast','exception','awaiting_requote'));
