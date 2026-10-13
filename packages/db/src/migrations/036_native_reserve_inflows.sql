CREATE TABLE IF NOT EXISTS public.native_reserve_inflows(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 environment text NOT NULL CHECK(environment='testnet'),chain text NOT NULL,network text NOT NULL,tx_hash text NOT NULL,event_index integer NOT NULL CHECK(event_index>=0),sender text NOT NULL,destination text NOT NULL,
 amount_base_units numeric(78,0) NOT NULL CHECK(amount_base_units>0),block_hash text NOT NULL,block_height numeric(78,0) NOT NULL,statement_hash text NOT NULL CHECK(length(statement_hash)=64),request_hash text NOT NULL CHECK(length(request_hash)=64),journal_id uuid NOT NULL REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(environment,chain,network,tx_hash,event_index,asset_id)
);
ALTER TABLE public.native_reserve_inflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY reserve_inflow_service ON public.native_reserve_inflows TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
CREATE TRIGGER immutable_reserve_inflow BEFORE UPDATE OR DELETE ON public.native_reserve_inflows FOR EACH ROW EXECUTE FUNCTION public.gw_financial_adapter_guard();
-- Supabase Data API grants: public.native_reserve_inflows is server-only immutable financial history.
REVOKE ALL ON public.native_reserve_inflows FROM PUBLIC,gw_read;
GRANT SELECT,INSERT ON public.native_reserve_inflows TO gw_service;
DO $$ DECLARE role_name text;BEGIN FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN EXECUTE format('REVOKE ALL ON public.native_reserve_inflows FROM %I',role_name);END IF;END LOOP;END $$;
