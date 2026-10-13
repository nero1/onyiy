ALTER TABLE public.crypto_obligations DROP CONSTRAINT crypto_obligations_kind_check;
ALTER TABLE public.crypto_obligations ADD CONSTRAINT crypto_obligations_kind_check CHECK(kind IN ('withdrawal','business','refund','sweep','recovery','unallocated_refund'));
CREATE TABLE IF NOT EXISTS public.unallocated_refund_claims(inflow_id uuid PRIMARY KEY REFERENCES public.unallocated_inflows(id) ON DELETE RESTRICT,actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,statement_hash text NOT NULL CHECK(length(statement_hash)=64),signature_hash text NOT NULL CHECK(length(signature_hash)=64),proof_reference text NOT NULL CHECK(length(proof_reference) BETWEEN 5 AND 200),created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TRIGGER unmatched_claim_retained BEFORE UPDATE OR DELETE ON public.unallocated_refund_claims FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();
-- Supabase Data API grants: public.unallocated_refund_claims is private retained
-- original-wallet evidence; no raw reusable signature or account access.
ALTER TABLE public.unallocated_refund_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unallocated_refund_claims FROM PUBLIC,gw_read,gw_signer;
GRANT SELECT,INSERT ON public.unallocated_refund_claims TO gw_service;
CREATE POLICY unmatched_claim_service ON public.unallocated_refund_claims TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DO $$ DECLARE browser text;BEGIN FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.unallocated_refund_claims FROM %I',browser);END IF;END LOOP;END $$;
CREATE OR REPLACE FUNCTION public.gw_signer_identity_fence(obligation uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.crypto_obligations;u public.users;w public.wallet_links;
BEGIN
 IF current_setting('gw.environment',true)<>'testnet' THEN RAISE EXCEPTION 'SIGNER_SCOPE_DENIED';END IF;
 SELECT * INTO o FROM public.crypto_obligations WHERE id=obligation AND environment='testnet';IF NOT FOUND THEN RETURN false;END IF;
 IF o.user_id IS NULL THEN
  IF o.kind='unallocated_refund' THEN RETURN EXISTS(SELECT 1 FROM public.unallocated_inflows i JOIN public.unallocated_refund_claims c ON c.inflow_id=i.id WHERE i.id=(o.fee_snapshot->>'inflow_id')::uuid AND i.asset_id=o.asset_id AND i.sender=o.destination AND i.amount_base_units=o.gross_base_units);END IF;
  RETURN o.kind IN ('business','sweep');
 END IF;
 SELECT * INTO u FROM public.users WHERE id=o.user_id FOR SHARE;
 IF o.kind='refund' THEN RETURN true;END IF;
 IF o.kind='recovery' THEN RETURN EXISTS(SELECT 1 FROM public.liability_recoveries r WHERE r.obligation_id=o.id AND r.user_id=o.user_id AND r.asset_id=o.asset_id AND r.confirmed_at IS NOT NULL);END IF;
 IF u.status NOT IN ('active','deactivated') OR u.consented_at IS NULL THEN RETURN false;END IF;
 SELECT * INTO w FROM public.wallet_links WHERE user_id=o.user_id AND environment='testnet' AND chain_id=o.registry_snapshot->>'network';
 RETURN w.address=o.destination AND w.revision=o.wallet_revision AND coalesce(w.cooling_until<=clock_timestamp(),true);
END $$;
REVOKE ALL ON FUNCTION public.gw_signer_identity_fence(uuid) FROM PUBLIC,gw_read,gw_service,gw_signer;
CREATE OR REPLACE FUNCTION public.gw_unallocated_refund_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.crypto_obligations;i public.unallocated_inflows;j public.ledger_journals;total integer;valid integer;
BEGIN
 SELECT * INTO o FROM public.crypto_obligations WHERE id=NEW.id;IF o.kind<>'unallocated_refund' THEN RETURN NULL;END IF;
 SELECT * INTO i FROM public.unallocated_inflows WHERE id=(o.fee_snapshot->>'inflow_id')::uuid;
 IF i.id IS NULL OR i.asset_id<>o.asset_id OR i.sender<>o.destination OR i.amount_base_units<>o.gross_base_units OR o.net_base_units<>o.gross_base_units OR o.charge_base_units<>0 OR o.user_id IS NOT NULL OR o.source_purpose<>'unallocated_payable' OR NOT EXISTS(SELECT 1 FROM public.unallocated_refund_claims WHERE inflow_id=i.id) THEN RAISE EXCEPTION 'UNALLOCATED_REFUND_INVALID';END IF;
 SELECT * INTO j FROM public.ledger_journals WHERE business_key='unallocated-hold:'||o.id;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=o.asset_id AND a.owner_id IS NULL AND p.amount_base_units=o.gross_base_units AND ((a.owner_type='system' AND a.purpose='unallocated_payable' AND p.direction='debit') OR (a.owner_type='platform' AND a.purpose='held_payable' AND p.direction='credit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 OR j.metadata->>'obligation_id' IS DISTINCT FROM o.id::text THEN RAISE EXCEPTION 'UNALLOCATED_HOLD_REQUIRED';END IF;RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_unallocated_refund_guard() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER unallocated_refund_guard AFTER INSERT OR UPDATE ON public.crypto_obligations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_unallocated_refund_guard();
