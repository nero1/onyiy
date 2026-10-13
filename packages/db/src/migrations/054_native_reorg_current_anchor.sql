ALTER TABLE public.crypto_reorg_reviews ADD COLUMN anchor_height numeric(78,0);
UPDATE public.crypto_reorg_reviews r SET anchor_height=e.block_height FROM public.crypto_events e WHERE e.id=r.event_id;
ALTER TABLE public.crypto_reorg_reviews ALTER COLUMN anchor_height SET NOT NULL;
ALTER TABLE public.crypto_reorg_reviews ADD CONSTRAINT native_review_anchor_height CHECK(anchor_height>=0);
ALTER TABLE public.crypto_reorg_resolutions ADD COLUMN block_height numeric(78,0) CHECK(block_height>=0);
-- Historic anchors can be inferred only when their hash equals the original
-- recorded block. A changed unrecorded anchor remains unknown and pauses review.
UPDATE public.crypto_reorg_resolutions s SET block_height=e.block_height FROM public.crypto_reorg_reviews r JOIN public.crypto_events e ON e.id=r.event_id WHERE r.id=s.review_id AND s.block_hash=e.block_hash;
CREATE OR REPLACE FUNCTION public.gw_native_review_anchor_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.crypto_reorg_reviews;s public.crypto_reorg_resolutions;e public.crypto_events;
BEGIN
 IF TG_TABLE_NAME='crypto_reorg_resolutions' THEN IF NEW.block_height IS NULL THEN RAISE EXCEPTION 'NATIVE_ANCHOR_REQUIRED';END IF;RETURN NEW;END IF;
 SELECT * INTO e FROM public.crypto_events WHERE id=NEW.event_id;
 SELECT * INTO r FROM public.crypto_reorg_reviews WHERE event_id=NEW.event_id ORDER BY revision DESC LIMIT 1;
 IF FOUND THEN
  SELECT * INTO s FROM public.crypto_reorg_resolutions WHERE review_id=r.id;
  IF NOT FOUND OR s.block_height IS NULL OR NEW.revision<>r.revision+1 OR NEW.original_block_hash IS DISTINCT FROM s.block_hash OR NEW.anchor_height IS DISTINCT FROM s.block_height THEN RAISE EXCEPTION 'NATIVE_ANCHOR_REQUIRED';END IF;
 ELSE
  IF NEW.revision<>1 OR NEW.original_block_hash IS DISTINCT FROM e.block_hash OR NEW.anchor_height IS DISTINCT FROM e.block_height THEN RAISE EXCEPTION 'NATIVE_ANCHOR_REQUIRED';END IF;
 END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_native_review_anchor_guard() FROM PUBLIC;
CREATE TRIGGER native_review_anchor_guard BEFORE INSERT ON public.crypto_reorg_reviews FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_anchor_guard();
CREATE TRIGGER native_resolution_anchor_guard BEFORE INSERT ON public.crypto_reorg_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_anchor_guard();
-- The original journal guard checks economics. The anchor guard above checks
-- the latest independently reconfirmed block, rather than a stale first block.
CREATE OR REPLACE FUNCTION public.gw_native_review_journal_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.crypto_events;r public.crypto_reorg_reviews;j public.ledger_journals;lines integer;valid integer;asset uuid;amount numeric;review uuid;cash_direction text;loss_direction text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('financial-policy',0));
 IF TG_TABLE_NAME='crypto_reorg_reviews' THEN
  SELECT * INTO e FROM public.crypto_events WHERE id=NEW.event_id;
  IF e.asset_id IS DISTINCT FROM NEW.asset_id OR e.amount_base_units IS DISTINCT FROM NEW.amount_base_units THEN RAISE EXCEPTION 'NATIVE_REVIEW_SOURCE_MISMATCH';END IF;
  asset:=NEW.asset_id;amount:=NEW.amount_base_units;review:=NEW.id;cash_direction:='credit';loss_direction:='debit';SELECT * INTO j FROM public.ledger_journals WHERE id=NEW.loss_journal_id;
  IF j.ledger_type IS DISTINCT FROM 'REORG_LOSS' THEN RAISE EXCEPTION 'NATIVE_REVIEW_JOURNAL_MISMATCH';END IF;
 ELSE
  SELECT * INTO r FROM public.crypto_reorg_reviews WHERE id=NEW.review_id;asset:=r.asset_id;amount:=r.amount_base_units;review:=r.id;cash_direction:='debit';loss_direction:='credit';SELECT * INTO j FROM public.ledger_journals WHERE id=NEW.journal_id;
  IF j.ledger_type IS DISTINCT FROM 'REORG_RECONFIRM' THEN RAISE EXCEPTION 'NATIVE_REVIEW_JOURNAL_MISMATCH';END IF;
 END IF;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=asset AND a.owner_type='system' AND a.owner_id IS NULL AND p.amount_base_units=amount AND ((a.purpose='treasury_asset' AND p.direction=cash_direction) OR (a.purpose='chain_loss_expense' AND p.direction=loss_direction))) INTO lines,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF lines<>2 OR valid<>2 OR j.metadata->>'review_id' IS DISTINCT FROM review::text THEN RAISE EXCEPTION 'NATIVE_REVIEW_JOURNAL_MISMATCH';END IF;RETURN NEW;
END $$;
