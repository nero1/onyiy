-- Runs after053 and before054 for populated upgrades. Existing checksums remain
-- unchanged. Only the table owner may fill a previously absent anchor from the
-- exact original evidence; all other updates/deletes remain prohibited.
CREATE OR REPLACE FUNCTION public.gw_native_review_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE column_name text;e public.crypto_events;r public.crypto_reorg_reviews;
BEGIN
 IF TG_OP='UPDATE' AND session_user=current_user AND session_user=pg_get_userbyid((SELECT relowner FROM pg_class WHERE oid=TG_RELID)) THEN
  column_name:=CASE WHEN TG_TABLE_NAME='crypto_reorg_reviews' THEN 'anchor_height' ELSE 'block_height' END;
  IF (to_jsonb(NEW)-column_name)=(to_jsonb(OLD)-column_name) AND to_jsonb(OLD)->>column_name IS NULL AND to_jsonb(NEW)->>column_name IS NOT NULL THEN
   IF TG_TABLE_NAME='crypto_reorg_reviews' THEN SELECT * INTO e FROM public.crypto_events WHERE id=(to_jsonb(NEW)->>'event_id')::uuid;
   ELSE SELECT * INTO r FROM public.crypto_reorg_reviews WHERE id=(to_jsonb(NEW)->>'review_id')::uuid;SELECT * INTO e FROM public.crypto_events WHERE id=r.event_id;END IF;
   IF (TG_TABLE_NAME='crypto_reorg_reviews' OR to_jsonb(NEW)->>'block_hash'=e.block_hash) AND to_jsonb(NEW)->>column_name=e.block_height::text THEN RETURN NEW;END IF;
  END IF;
 END IF;RAISE EXCEPTION 'NATIVE_REVIEW_RETAINED';
END $$;
REVOKE ALL ON FUNCTION public.gw_native_review_immutable() FROM PUBLIC;
