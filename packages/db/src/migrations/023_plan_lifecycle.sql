ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
CREATE UNIQUE INDEX IF NOT EXISTS plan_asset_active_unique ON public.plan_versions(plan_id,asset_id) WHERE active;
CREATE INDEX IF NOT EXISTS ledger_user_page_idx ON public.ledger_accounts(owner_id,asset_id,id) WHERE owner_type='user';
CREATE INDEX IF NOT EXISTS ledger_account_page_idx ON public.ledger_postings(account_id,id);
CREATE INDEX IF NOT EXISTS point_user_page_idx ON public.point_events(user_id,id);
CREATE INDEX IF NOT EXISTS notification_user_page_idx ON public.notifications(user_id,id);
CREATE OR REPLACE FUNCTION public.gw_plan_snapshot_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_TABLE_NAME='plan_versions' AND (NEW.id,NEW.plan_id,NEW.asset_id,NEW.version,NEW.amount_base_units,NEW.usd_reference,NEW.receiver_bps,NEW.marketing_bps,NEW.referral_bps,NEW.developer_bps,NEW.reserve_bps,NEW.receipts_required,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.plan_id,OLD.asset_id,OLD.version,OLD.amount_base_units,OLD.usd_reference,OLD.receiver_bps,OLD.marketing_bps,OLD.referral_bps,OLD.developer_bps,OLD.reserve_bps,OLD.receipts_required,OLD.created_at) THEN RAISE EXCEPTION 'PLAN_SNAPSHOT_IMMUTABLE';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_plan_snapshot_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS plan_snapshot_guard ON public.plan_versions;
CREATE TRIGGER plan_snapshot_guard BEFORE UPDATE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION public.gw_plan_snapshot_guard();
