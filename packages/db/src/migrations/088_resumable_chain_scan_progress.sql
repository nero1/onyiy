ALTER TABLE public.chain_recovery_runs ADD COLUMN scan_progress jsonb;
ALTER TABLE public.chain_recovery_runs ADD CONSTRAINT recovery_progress_shape CHECK(scan_progress IS NULL OR (jsonb_typeof(scan_progress)='object' AND octet_length(scan_progress::text)<=16384 AND scan_progress->>'stage' IN ('discover','verify','book','known_next','known_index','known_settle','known_expiry','balance')));
GRANT UPDATE(scan_progress) ON public.chain_recovery_runs TO gw_service;
ALTER TABLE public.chain_scan_pages ADD COLUMN progress_before jsonb;
ALTER TABLE public.chain_scan_pages ADD COLUMN progress_after jsonb;
DO $$ DECLARE name text;BEGIN
 FOR name IN SELECT conname FROM pg_constraint WHERE conrelid='public.chain_scan_pages'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%from_height < through_height%' LOOP EXECUTE format('ALTER TABLE public.chain_scan_pages DROP CONSTRAINT %I',name);END LOOP;
END $$;
ALTER TABLE public.chain_scan_pages ADD CONSTRAINT scan_page_height_order CHECK(from_height<=through_height);
CREATE OR REPLACE FUNCTION public.gw_recovery_run_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'CHAIN_RECOVERY_EVIDENCE_RETAINED';END IF;
 IF (to_jsonb(NEW)-ARRAY['cursor_height','state','revision','incoming_count','outgoing_count','reason_code','completed_at','known_attempt_cursor','scan_progress']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['cursor_height','state','revision','incoming_count','outgoing_count','reason_code','completed_at','known_attempt_cursor','scan_progress']) OR OLD.state='reconciled' OR NEW.cursor_height<OLD.cursor_height OR NEW.revision<>OLD.revision+1 OR NEW.incoming_count<OLD.incoming_count OR NEW.outgoing_count<OLD.outgoing_count OR (OLD.known_attempt_cursor IS NOT NULL AND (NEW.known_attempt_cursor IS NULL OR NEW.known_attempt_cursor<OLD.known_attempt_cursor)) THEN RAISE EXCEPTION 'RECOVERY_RUN_IMMUTABLE';END IF;
 IF OLD.scan_progress IS NOT NULL AND OLD.scan_progress->'cursor' IS NOT NULL AND NEW.scan_progress->'cursor' IS NOT NULL AND
   ROW((NEW.scan_progress->'cursor'->>'height')::numeric,(NEW.scan_progress->'cursor'->>'transaction')::integer,(NEW.scan_progress->'cursor'->>'event')::integer)<ROW((OLD.scan_progress->'cursor'->>'height')::numeric,(OLD.scan_progress->'cursor'->>'transaction')::integer,(OLD.scan_progress->'cursor'->>'event')::integer) THEN RAISE EXCEPTION 'SCAN_CURSOR_REGRESSION';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_recovery_run_guard() FROM PUBLIC;
-- Existing server-only RLS/role and Supabase Data API revokes remain in force.
-- Progress and immutable page inventories are retained with original financial IDs.
