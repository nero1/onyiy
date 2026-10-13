CREATE TABLE public.crypto_reorg_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid NOT NULL REFERENCES public.crypto_events(id) ON DELETE RESTRICT,asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,revision integer NOT NULL CHECK(revision BETWEEN 1 AND 1000000),amount_base_units numeric(78,0) NOT NULL CHECK(amount_base_units>0),original_block_hash text NOT NULL,evidence_hash text NOT NULL CHECK(length(evidence_hash)=64),loss_journal_id uuid NOT NULL UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 500),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(event_id,revision));
CREATE TABLE public.crypto_reorg_resolutions(review_id uuid PRIMARY KEY REFERENCES public.crypto_reorg_reviews(id) ON DELETE RESTRICT,journal_id uuid NOT NULL UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,block_hash text NOT NULL,evidence_hash text NOT NULL CHECK(length(evidence_hash)=64),reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 500),created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX crypto_reorg_asset_idx ON public.crypto_reorg_reviews(asset_id,event_id,revision);
CREATE OR REPLACE FUNCTION public.gw_native_review_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'NATIVE_REVIEW_RETAINED';END $$;
REVOKE ALL ON FUNCTION public.gw_native_review_immutable() FROM PUBLIC;
CREATE TRIGGER native_review_immutable BEFORE UPDATE OR DELETE ON public.crypto_reorg_reviews FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_immutable();
CREATE TRIGGER native_resolution_immutable BEFORE UPDATE OR DELETE ON public.crypto_reorg_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_immutable();
-- Supabase Data API grants: native review and resolution are private retained
-- financial evidence. Signing authority sees only the boolean safety fence.
ALTER TABLE public.crypto_reorg_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_reorg_resolutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crypto_reorg_reviews,public.crypto_reorg_resolutions FROM PUBLIC,gw_read,gw_service,gw_signer;
GRANT SELECT,INSERT ON public.crypto_reorg_reviews,public.crypto_reorg_resolutions TO gw_service;
CREATE POLICY native_review_service ON public.crypto_reorg_reviews TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
CREATE POLICY native_resolution_service ON public.crypto_reorg_resolutions TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DO $$ DECLARE browser text;BEGIN FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.crypto_reorg_reviews,public.crypto_reorg_resolutions FROM %I',browser);END IF;END LOOP;END $$;
CREATE OR REPLACE FUNCTION public.gw_native_asset_fence(asset uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock_shared(hashtextextended('financial-policy',0));
 RETURN NOT EXISTS(SELECT 1 FROM public.crypto_reorg_reviews r LEFT JOIN public.crypto_reorg_resolutions s ON s.review_id=r.id WHERE r.asset_id=asset AND s.review_id IS NULL);
END $$;
REVOKE ALL ON FUNCTION public.gw_native_asset_fence(uuid) FROM PUBLIC,gw_read;
GRANT EXECUTE ON FUNCTION public.gw_native_asset_fence(uuid) TO gw_service,gw_signer;
ALTER FUNCTION public.gw_signer_owner_fence(uuid) RENAME TO gw_signer_identity_fence;
REVOKE ALL ON FUNCTION public.gw_signer_identity_fence(uuid) FROM PUBLIC,gw_read,gw_service,gw_signer;
CREATE FUNCTION public.gw_signer_owner_fence(obligation uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE asset uuid;BEGIN
 IF NOT public.gw_signer_identity_fence(obligation) THEN RETURN false;END IF;
 SELECT asset_id INTO asset FROM public.crypto_obligations WHERE id=obligation;
 RETURN public.gw_native_asset_fence(asset);
END $$;
REVOKE ALL ON FUNCTION public.gw_signer_owner_fence(uuid) FROM PUBLIC,gw_read,gw_service;
GRANT EXECUTE ON FUNCTION public.gw_signer_owner_fence(uuid) TO gw_signer;
CREATE OR REPLACE FUNCTION public.gw_native_intake_fence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_TABLE_NAME='crypto_obligations' AND TG_OP='UPDATE' AND NEW.status NOT IN ('approved','signing') THEN RETURN NEW;END IF;
 IF TG_TABLE_NAME='crypto_obligations' AND TG_OP='UPDATE' AND NEW.status=OLD.status THEN RETURN NEW;END IF;
 IF NOT public.gw_native_asset_fence(NEW.asset_id) THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_native_intake_fence() FROM PUBLIC;
CREATE TRIGGER native_invoice_review_fence BEFORE INSERT ON public.crypto_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_native_intake_fence();
CREATE TRIGGER native_obligation_review_fence BEFORE INSERT OR UPDATE ON public.crypto_obligations FOR EACH ROW EXECUTE FUNCTION public.gw_native_intake_fence();
CREATE OR REPLACE FUNCTION public.gw_native_review_journal_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.crypto_events;r public.crypto_reorg_reviews;j public.ledger_journals;lines integer;valid integer;asset uuid;amount numeric;review uuid;cash_direction text;loss_direction text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('financial-policy',0));
 IF TG_TABLE_NAME='crypto_reorg_reviews' THEN
  SELECT * INTO e FROM public.crypto_events WHERE id=NEW.event_id;
  IF e.asset_id IS DISTINCT FROM NEW.asset_id OR e.amount_base_units IS DISTINCT FROM NEW.amount_base_units OR e.block_hash IS DISTINCT FROM NEW.original_block_hash THEN RAISE EXCEPTION 'NATIVE_REVIEW_SOURCE_MISMATCH';END IF;
  asset:=NEW.asset_id;amount:=NEW.amount_base_units;review:=NEW.id;cash_direction:='credit';loss_direction:='debit';SELECT * INTO j FROM public.ledger_journals WHERE id=NEW.loss_journal_id;
  IF j.ledger_type IS DISTINCT FROM 'REORG_LOSS' THEN RAISE EXCEPTION 'NATIVE_REVIEW_JOURNAL_MISMATCH';END IF;
 ELSE
  SELECT * INTO r FROM public.crypto_reorg_reviews WHERE id=NEW.review_id;asset:=r.asset_id;amount:=r.amount_base_units;review:=r.id;cash_direction:='debit';loss_direction:='credit';SELECT * INTO j FROM public.ledger_journals WHERE id=NEW.journal_id;
  IF j.ledger_type IS DISTINCT FROM 'REORG_RECONFIRM' THEN RAISE EXCEPTION 'NATIVE_REVIEW_JOURNAL_MISMATCH';END IF;
 END IF;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=asset AND a.owner_type='system' AND a.owner_id IS NULL AND p.amount_base_units=amount AND ((a.purpose='treasury_asset' AND p.direction=cash_direction) OR (a.purpose='chain_loss_expense' AND p.direction=loss_direction))) INTO lines,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF lines<>2 OR valid<>2 OR j.metadata->>'review_id' IS DISTINCT FROM review::text THEN RAISE EXCEPTION 'NATIVE_REVIEW_JOURNAL_MISMATCH';END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_native_review_journal_guard() FROM PUBLIC;
CREATE TRIGGER native_review_journal_guard BEFORE INSERT ON public.crypto_reorg_reviews FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_journal_guard();
CREATE TRIGGER native_resolution_journal_guard BEFORE INSERT ON public.crypto_reorg_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_journal_guard();
CREATE OR REPLACE FUNCTION public.gw_native_attempt_review_fence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE asset uuid;BEGIN SELECT asset_id INTO asset FROM public.crypto_obligations WHERE id=NEW.obligation_id;IF NOT public.gw_native_asset_fence(asset) THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;RETURN NEW;END $$;
REVOKE ALL ON FUNCTION public.gw_native_attempt_review_fence() FROM PUBLIC;
CREATE TRIGGER native_attempt_review_fence BEFORE INSERT ON public.signed_attempts FOR EACH ROW EXECUTE FUNCTION public.gw_native_attempt_review_fence();
