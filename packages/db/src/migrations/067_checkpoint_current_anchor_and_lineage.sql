ALTER TABLE public.chain_recovery_runs ADD COLUMN known_attempt_cursor uuid;
GRANT UPDATE(known_attempt_cursor) ON public.chain_recovery_runs TO gw_service;
CREATE OR REPLACE FUNCTION public.gw_recovery_run_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'CHAIN_RECOVERY_EVIDENCE_RETAINED';END IF;
 IF (to_jsonb(NEW)-ARRAY['cursor_height','state','revision','incoming_count','outgoing_count','reason_code','completed_at','known_attempt_cursor']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['cursor_height','state','revision','incoming_count','outgoing_count','reason_code','completed_at','known_attempt_cursor']) OR OLD.state='reconciled' OR NEW.cursor_height<OLD.cursor_height OR NEW.revision<OLD.revision OR NEW.incoming_count<OLD.incoming_count OR NEW.outgoing_count<OLD.outgoing_count OR (OLD.known_attempt_cursor IS NOT NULL AND (NEW.known_attempt_cursor IS NULL OR NEW.known_attempt_cursor<OLD.known_attempt_cursor)) THEN RAISE EXCEPTION 'RECOVERY_RUN_IMMUTABLE';END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_recovery_run_guard() FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.gw_native_asset_fence(asset uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE binding text;checkpoint uuid;BEGIN
 PERFORM pg_advisory_xact_lock_shared(hashtextextended('financial-policy',0));
 IF EXISTS(SELECT 1 FROM public.crypto_reorg_reviews r LEFT JOIN public.crypto_reorg_resolutions s ON s.review_id=r.id WHERE r.asset_id=asset AND s.review_id IS NULL) THEN RETURN false;END IF;
 SELECT id INTO checkpoint FROM public.chain_checkpoints WHERE asset_id=asset ORDER BY created_at DESC,id DESC LIMIT 1;
 IF checkpoint IS NOT NULL THEN
  binding:=current_setting('gw.database_binding',true);
  IF binding IS NULL OR length(binding)<>64 OR NOT EXISTS(SELECT 1 FROM public.chain_recovery_runs r JOIN public.chain_checkpoints c ON c.id=r.checkpoint_id WHERE c.id=checkpoint AND c.binding_fingerprint=binding AND r.binding_fingerprint=binding AND r.state='reconciled' AND r.id=(SELECT r2.id FROM public.chain_recovery_runs r2 WHERE r2.checkpoint_id=checkpoint ORDER BY r2.created_at DESC,r2.id DESC LIMIT 1)) THEN RETURN false;END IF;
 END IF;RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.gw_native_asset_fence(uuid) FROM PUBLIC,gw_read;
GRANT EXECUTE ON FUNCTION public.gw_native_asset_fence(uuid) TO gw_service,gw_signer;
CREATE INDEX recovery_known_attempt_order ON public.signed_attempts(obligation_id,id);
