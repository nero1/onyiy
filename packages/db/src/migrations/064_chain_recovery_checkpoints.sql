CREATE TABLE IF NOT EXISTS public.chain_checkpoints(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,binding_fingerprint text NOT NULL CHECK(length(binding_fingerprint)=64),treasury_fingerprint text NOT NULL CHECK(length(treasury_fingerprint)=64),treasury_sender text NOT NULL,registry_snapshot jsonb NOT NULL,configuration_hash text NOT NULL CHECK(length(configuration_hash)=64),height numeric(78,0) NOT NULL CHECK(height>=0),block_hash text NOT NULL,actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,proof_reference text NOT NULL CHECK(length(proof_reference) BETWEEN 5 AND 200),created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE IF NOT EXISTS public.chain_recovery_runs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),checkpoint_id uuid NOT NULL REFERENCES public.chain_checkpoints(id) ON DELETE RESTRICT,binding_fingerprint text NOT NULL CHECK(length(binding_fingerprint)=64),through_height numeric(78,0) NOT NULL,cursor_height numeric(78,0) NOT NULL,state text NOT NULL DEFAULT 'scanning' CHECK(state IN ('scanning','review','reconciled')),revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),incoming_count integer NOT NULL DEFAULT 0 CHECK(incoming_count>=0),outgoing_count integer NOT NULL DEFAULT 0 CHECK(outgoing_count>=0),reason_code text,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),completed_at timestamptz,CHECK(cursor_height<=through_height));
CREATE INDEX checkpoint_treasury_idx ON public.chain_checkpoints(treasury_fingerprint,asset_id,created_at,id);
CREATE TABLE IF NOT EXISTS public.chain_scan_pages(run_id uuid NOT NULL REFERENCES public.chain_recovery_runs(id) ON DELETE RESTRICT,revision integer NOT NULL,from_height numeric(78,0) NOT NULL,through_height numeric(78,0) NOT NULL,evidence_hash text NOT NULL CHECK(length(evidence_hash)=64),incoming_count integer NOT NULL,outgoing_count integer NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(run_id,revision),CHECK(from_height<through_height),CHECK(incoming_count>=0 AND outgoing_count>=0));
CREATE TABLE IF NOT EXISTS public.unallocated_inflows(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,environment text NOT NULL CHECK(environment='testnet'),chain text NOT NULL,network text NOT NULL,tx_hash text NOT NULL,event_index integer NOT NULL CHECK(event_index>=0),sender text NOT NULL,destination text NOT NULL,amount_base_units numeric(78,0) NOT NULL CHECK(amount_base_units>0),block_hash text NOT NULL,block_height numeric(78,0) NOT NULL CHECK(block_height>=0),registry_snapshot jsonb NOT NULL,treasury_fingerprint text NOT NULL CHECK(length(treasury_fingerprint)=64),journal_id uuid NOT NULL UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(asset_id,environment,chain,network,tx_hash,event_index));
CREATE INDEX unmatched_sender_idx ON public.unallocated_inflows(asset_id,sender,created_at,id);
CREATE TABLE IF NOT EXISTS public.recovery_outflows(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),run_id uuid NOT NULL REFERENCES public.chain_recovery_runs(id) ON DELETE RESTRICT,asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,tx_hash text NOT NULL,event_index integer NOT NULL,sender text NOT NULL,destination text NOT NULL,amount_base_units numeric(78,0) NOT NULL CHECK(amount_base_units>=0),block_height numeric(78,0) NOT NULL,status text NOT NULL CHECK(status IN ('matched','review')),obligation_id uuid REFERENCES public.crypto_obligations(id) ON DELETE RESTRICT,evidence_hash text NOT NULL CHECK(length(evidence_hash)=64),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(run_id,tx_hash,event_index));
CREATE OR REPLACE FUNCTION public.gw_recovery_evidence_retained() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'CHAIN_RECOVERY_EVIDENCE_RETAINED';END $$;
REVOKE ALL ON FUNCTION public.gw_recovery_evidence_retained() FROM PUBLIC;
CREATE TRIGGER checkpoint_retained BEFORE UPDATE OR DELETE ON public.chain_checkpoints FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();
CREATE TRIGGER scan_page_retained BEFORE UPDATE OR DELETE ON public.chain_scan_pages FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();
CREATE TRIGGER unmatched_retained BEFORE UPDATE OR DELETE ON public.unallocated_inflows FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();
CREATE TRIGGER recovery_outflow_retained BEFORE UPDATE OR DELETE ON public.recovery_outflows FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();
CREATE OR REPLACE FUNCTION public.gw_recovery_run_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'CHAIN_RECOVERY_EVIDENCE_RETAINED';END IF;
 IF (to_jsonb(NEW)-ARRAY['cursor_height','state','revision','incoming_count','outgoing_count','reason_code','completed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['cursor_height','state','revision','incoming_count','outgoing_count','reason_code','completed_at']) OR OLD.state='reconciled' OR NEW.cursor_height<OLD.cursor_height OR NEW.revision<OLD.revision OR NEW.incoming_count<OLD.incoming_count OR NEW.outgoing_count<OLD.outgoing_count THEN RAISE EXCEPTION 'RECOVERY_RUN_IMMUTABLE';END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_recovery_run_guard() FROM PUBLIC;
CREATE TRIGGER recovery_run_guard BEFORE UPDATE OR DELETE ON public.chain_recovery_runs FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_run_guard();
-- Supabase Data API grants: public.chain_checkpoints, public.chain_recovery_runs,
-- public.chain_scan_pages, public.unallocated_inflows, public.recovery_outflows
-- are retained private evidence; no browser or signer write access.
DO $$ DECLARE resource text;browser text;BEGIN
 FOREACH resource IN ARRAY ARRAY['chain_checkpoints','chain_recovery_runs','chain_scan_pages','unallocated_inflows','recovery_outflows'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',resource);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,gw_read,gw_service,gw_signer',resource);
  EXECUTE format('GRANT SELECT,INSERT ON public.%I TO gw_service',resource);
  EXECUTE format('CREATE POLICY recovery_service ON public.%I TO gw_service USING(current_setting(''gw.access'',true)=''service'') WITH CHECK(current_setting(''gw.access'',true)=''service'')',resource);
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',resource,browser);END IF;END LOOP;
 END LOOP;
END $$;
GRANT UPDATE(cursor_height,state,revision,incoming_count,outgoing_count,reason_code,completed_at) ON public.chain_recovery_runs TO gw_service;
CREATE OR REPLACE FUNCTION public.gw_native_asset_fence(asset uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE binding text;BEGIN
 PERFORM pg_advisory_xact_lock_shared(hashtextextended('financial-policy',0));
 IF EXISTS(SELECT 1 FROM public.crypto_reorg_reviews r LEFT JOIN public.crypto_reorg_resolutions s ON s.review_id=r.id WHERE r.asset_id=asset AND s.review_id IS NULL) THEN RETURN false;END IF;
 IF EXISTS(SELECT 1 FROM public.chain_checkpoints WHERE asset_id=asset) THEN
  binding:=current_setting('gw.database_binding',true);
  IF binding IS NULL OR length(binding)<>64 OR NOT EXISTS(SELECT 1 FROM public.chain_recovery_runs r JOIN public.chain_checkpoints c ON c.id=r.checkpoint_id WHERE c.asset_id=asset AND r.binding_fingerprint=binding AND r.state='reconciled' AND r.id=(SELECT r2.id FROM public.chain_recovery_runs r2 JOIN public.chain_checkpoints c2 ON c2.id=r2.checkpoint_id WHERE c2.asset_id=asset AND r2.binding_fingerprint=binding ORDER BY r2.created_at DESC,r2.id DESC LIMIT 1)) THEN RETURN false;END IF;
 END IF;RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.gw_native_asset_fence(uuid) FROM PUBLIC,gw_read;
GRANT EXECUTE ON FUNCTION public.gw_native_asset_fence(uuid) TO gw_service,gw_signer;
