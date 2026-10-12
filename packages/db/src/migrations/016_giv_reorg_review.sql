CREATE TABLE IF NOT EXISTS public.simulation_reorg_reviews (
 id uuid PRIMARY KEY,source_allocation_id uuid NOT NULL REFERENCES public.receipt_allocations(id) ON DELETE RESTRICT,
 source_operation_key text NOT NULL REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT,revision integer NOT NULL CHECK(revision BETWEEN 1 AND 1000000),
 source_cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE RESTRICT,source_ticket bigint NOT NULL,
 partition_id uuid NOT NULL REFERENCES public.queue_partitions(id) ON DELETE RESTRICT,receiver_entry_id uuid REFERENCES public.queue_entries(id) ON DELETE RESTRICT,
 asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,payer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 affected_user_ids uuid[] NOT NULL CHECK(cardinality(affected_user_ids) BETWEEN 1 AND 3),environment text NOT NULL DEFAULT 'simulation' CHECK(environment='simulation'),
 amount_base_units numeric(78,0) NOT NULL CHECK(amount_base_units>0),settled_outgoing_exposure numeric(78,0) NOT NULL DEFAULT 0 CHECK(settled_outgoing_exposure>=0),
 loss_journal_id uuid NOT NULL UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 operation_key text NOT NULL UNIQUE REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT,reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 500),created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT reorg_source_revision_unique UNIQUE(source_allocation_id,revision)
);
CREATE INDEX IF NOT EXISTS reorg_partition_idx ON public.simulation_reorg_reviews(partition_id,created_at,id);
CREATE INDEX IF NOT EXISTS reorg_affected_users_idx ON public.simulation_reorg_reviews USING gin(affected_user_ids);
CREATE TABLE IF NOT EXISTS public.simulation_reorg_resolutions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),review_id uuid NOT NULL UNIQUE REFERENCES public.simulation_reorg_reviews(id) ON DELETE RESTRICT,
 environment text NOT NULL DEFAULT 'simulation' CHECK(environment='simulation'),journal_id uuid NOT NULL UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
 actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,operation_key text NOT NULL UNIQUE REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT,
 reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 500),created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE name text; BEGIN
 FOREACH name IN ARRAY ARRAY['simulation_reorg_reviews','simulation_reorg_resolutions','point_events'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS reorg_history_guard ON public.%I',name);
  EXECUTE format('CREATE TRIGGER reorg_history_guard BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation()',name);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.gw_reorg_leg_valid(journal uuid,item public.simulation_reorg_reviews,reconfirmed boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.ledger_journals j WHERE j.id=$1 AND j.ledger_type='REORG_COMPENSATE' AND j.business_key='reorg:'||($2).id||CASE WHEN $3 THEN ':reconfirm' ELSE ':invalidate' END AND j.metadata->>'review_id'=($2).id::text AND j.metadata->>'source_operation_key'=($2).source_operation_key AND j.metadata->>'action'=CASE WHEN $3 THEN 'reconfirm' ELSE 'invalidate' END)
 AND (SELECT count(*) FROM public.ledger_postings WHERE journal_id=$1)=2
 AND EXISTS(SELECT 1 FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=$1 AND p.direction=CASE WHEN $3 THEN 'debit' ELSE 'credit' END AND p.amount_base_units=($2).amount_base_units AND a.asset_id=($2).asset_id AND a.owner_type='user' AND a.owner_id=($2).payer_user_id AND a.purpose='available_payable')
 AND EXISTS(SELECT 1 FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=$1 AND p.direction=CASE WHEN $3 THEN 'credit' ELSE 'debit' END AND p.amount_base_units=($2).amount_base_units AND a.asset_id=($2).asset_id AND a.owner_type='system' AND a.owner_id IS NULL AND a.purpose='simulation_chain_loss')
$$;
REVOKE ALL ON FUNCTION public.gw_reorg_leg_valid(uuid,public.simulation_reorg_reviews,boolean) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.gw_reorg_review_integrity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE source public.receipt_allocations%ROWTYPE; source_entry public.queue_entries%ROWTYPE; expected_users uuid[]; actual_outflow numeric;
BEGIN
 SELECT * INTO source FROM public.receipt_allocations WHERE id=NEW.source_allocation_id;
 SELECT * INTO source_entry FROM public.queue_entries WHERE cycle_id=source.source_cycle_id;
 IF source.lineage_status<>'captured' OR ROW(NEW.source_operation_key,NEW.source_cycle_id,NEW.source_ticket,NEW.partition_id,NEW.receiver_entry_id,NEW.asset_id,NEW.payer_user_id)
  IS DISTINCT FROM ROW(source.source_operation_key,source.source_cycle_id,source_entry.ticket,source_entry.partition_id,source.receiver_entry_id,source.asset_id,source.payer_user_id)
  OR NOT EXISTS(SELECT 1 FROM public.assets WHERE id=NEW.asset_id AND environment='simulation' AND symbol='GIV' AND chain_id='giv')
  OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=NEW.actor_user_id AND role='admin' AND status='active')
  OR NEW.amount_base_units IS DISTINCT FROM (SELECT (result->>'amount_base_units')::numeric FROM public.operation_keys WHERE business_key=source.source_operation_key)
  OR NOT EXISTS(SELECT 1 FROM public.operation_keys WHERE business_key=NEW.operation_key AND result->>'review_id'=NEW.id::text AND result->>'revision'=NEW.revision::text AND result->>'amount_base_units'=NEW.amount_base_units::text AND result->>'state'='review')
  OR NOT public.gw_reorg_leg_valid(NEW.loss_journal_id,NEW,false) THEN RAISE EXCEPTION 'REORG_REVIEW_INVALID'; END IF;
 SELECT array_agg(user_id ORDER BY user_id) INTO expected_users FROM (
  SELECT source.payer_user_id AS user_id UNION
  SELECT a.owner_id FROM public.ledger_journals j JOIN public.ledger_postings p ON p.journal_id=j.id JOIN public.ledger_accounts a ON a.id=p.account_id
   WHERE j.business_key LIKE 'allocation:'||source.source_operation_key||':%' AND p.direction='credit' AND a.owner_type='user' UNION
  SELECT user_id FROM public.point_events WHERE source_key='gift:'||source.source_cycle_id
 ) affected;
 IF NEW.affected_user_ids IS DISTINCT FROM expected_users OR NEW.revision<>(SELECT coalesce(max(revision),0)+1 FROM public.simulation_reorg_reviews WHERE source_allocation_id=NEW.source_allocation_id AND revision<NEW.revision)
  OR EXISTS(SELECT 1 FROM public.simulation_reorg_reviews r LEFT JOIN public.simulation_reorg_resolutions resolved ON resolved.review_id=r.id WHERE r.source_allocation_id=NEW.source_allocation_id AND r.id<>NEW.id AND r.revision<NEW.revision AND resolved.id IS NULL) THEN RAISE EXCEPTION 'REORG_HISTORY_INVALID'; END IF;
 SELECT coalesce(sum(net_base_units),0) INTO actual_outflow FROM public.withdrawals WHERE user_id=ANY(NEW.affected_user_ids) AND asset_id=NEW.asset_id AND status='settled' AND settled_at>=(SELECT created_at FROM public.cycles WHERE id=source.source_cycle_id);
 IF NEW.settled_outgoing_exposure<>actual_outflow THEN RAISE EXCEPTION 'REORG_EXPOSURE_INVALID'; END IF;
 IF EXISTS(SELECT 1 FROM public.point_events original WHERE original.source_key='gift:'||source.source_cycle_id AND NOT EXISTS(
  SELECT 1 FROM public.point_events reversed WHERE reversed.user_id=original.user_id AND reversed.source_key='reorg:'||NEW.id||':invalidate' AND reversed.award_type='gift_reorg_'||original.award_type AND reversed.points=-original.points
 )) THEN RAISE EXCEPTION 'REORG_POINTS_INVALID'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_reorg_review_integrity() FROM PUBLIC;
DROP TRIGGER IF EXISTS reorg_review_integrity ON public.simulation_reorg_reviews;
CREATE CONSTRAINT TRIGGER reorg_review_integrity AFTER INSERT ON public.simulation_reorg_reviews DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_reorg_review_integrity();
CREATE OR REPLACE FUNCTION public.gw_reorg_resolution_integrity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE review public.simulation_reorg_reviews%ROWTYPE;
BEGIN
 SELECT * INTO review FROM public.simulation_reorg_reviews WHERE id=NEW.review_id;
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=NEW.actor_user_id AND role='admin' AND status='active') OR NOT public.gw_reorg_leg_valid(NEW.journal_id,review,true)
  OR NOT EXISTS(SELECT 1 FROM public.operation_keys WHERE business_key=NEW.operation_key AND result->>'review_id'=review.id::text AND result->>'revision'=review.revision::text AND result->>'state'='reconfirmed')
  OR EXISTS(SELECT 1 FROM public.simulation_reorg_reviews WHERE source_allocation_id=review.source_allocation_id AND revision>review.revision)
  OR EXISTS(SELECT 1 FROM public.point_events reversed WHERE reversed.source_key='reorg:'||review.id||':invalidate' AND NOT EXISTS(
   SELECT 1 FROM public.point_events restored WHERE restored.user_id=reversed.user_id AND restored.source_key='reorg:'||review.id||':reconfirm' AND restored.award_type='gift_reorg_reconfirm' AND restored.points=-reversed.points
  )) THEN RAISE EXCEPTION 'REORG_RESOLUTION_INVALID'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_reorg_resolution_integrity() FROM PUBLIC;
DROP TRIGGER IF EXISTS reorg_resolution_integrity ON public.simulation_reorg_resolutions;
CREATE CONSTRAINT TRIGGER reorg_resolution_integrity AFTER INSERT ON public.simulation_reorg_resolutions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_reorg_resolution_integrity();

-- Scoped views overlay current review; no original rights/counters are rewritten.
CREATE OR REPLACE VIEW public.gw_user_financial_reviews WITH(security_barrier=true) AS
SELECT u.id AS user_id,r.asset_id,count(*)::int AS review_count
FROM public.simulation_reorg_reviews r JOIN public.users u ON u.id=ANY(r.affected_user_ids)
LEFT JOIN public.simulation_reorg_resolutions resolved ON resolved.review_id=r.id
WHERE resolved.id IS NULL AND r.environment=current_setting('gw.environment',true) AND u.id=public.gw_actor_id()
GROUP BY u.id,r.asset_id;
CREATE OR REPLACE VIEW public.gw_cycle_financial_reviews WITH(security_barrier=true) AS
SELECT c.id AS cycle_id,bool_or(e.ticket>=r.source_ticket OR coalesce(e.id=r.receiver_entry_id,false)) AS under_review,
 count(*) FILTER(WHERE e.id=r.receiver_entry_id)::int AS invalid_credit_count,true AS queue_paused
FROM public.cycles c JOIN public.queue_entries e ON e.cycle_id=c.id JOIN public.simulation_reorg_reviews r ON r.partition_id=e.partition_id
LEFT JOIN public.simulation_reorg_resolutions resolved ON resolved.review_id=r.id
WHERE resolved.id IS NULL AND r.environment=current_setting('gw.environment',true) AND c.user_id=public.gw_actor_id()
GROUP BY c.id;
-- Supabase Data API grants: reorg financial history is server-only, views own-row only.
REVOKE ALL ON public.simulation_reorg_reviews,public.simulation_reorg_resolutions,public.gw_user_financial_reviews,public.gw_cycle_financial_reviews FROM PUBLIC,gw_read,gw_service;
GRANT SELECT,INSERT ON public.simulation_reorg_reviews,public.simulation_reorg_resolutions TO gw_service;
GRANT SELECT ON public.gw_user_financial_reviews,public.gw_cycle_financial_reviews TO gw_read,gw_service;
DO $$ DECLARE name text; browser text; BEGIN
 FOREACH name IN ARRAY ARRAY['simulation_reorg_reviews','simulation_reorg_resolutions'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
  EXECUTE format('DROP POLICY IF EXISTS gw_reorg_service ON public.%I',name);
  EXECUTE format('CREATE POLICY gw_reorg_service ON public.%I TO gw_service USING(environment=current_setting(''gw.environment'',true)) WITH CHECK(environment=current_setting(''gw.environment'',true))',name);
 END LOOP;
 FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.simulation_reorg_reviews,public.simulation_reorg_resolutions,public.gw_user_financial_reviews,public.gw_cycle_financial_reviews FROM %I',browser); END IF;
 END LOOP;
END $$;

-- Commit-time defence covers direct service writes as well as API guards.
CREATE OR REPLACE FUNCTION public.gw_frozen_spend_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE account public.ledger_accounts%ROWTYPE; journal public.ledger_journals%ROWTYPE;
BEGIN
 IF NEW.direction<>'debit' THEN RETURN NULL; END IF;
 SELECT * INTO account FROM public.ledger_accounts WHERE id=NEW.account_id;
 SELECT * INTO journal FROM public.ledger_journals WHERE id=NEW.journal_id;
 IF account.owner_type='user' AND (account.purpose='available_payable' OR (account.purpose='held_payable' AND journal.ledger_type='PAYOUT_SETTLE')) THEN
  IF journal.ledger_type='REORG_COMPENSATE' AND EXISTS(
   SELECT 1 FROM public.simulation_reorg_resolutions resolved JOIN public.simulation_reorg_reviews r ON r.id=resolved.review_id
   WHERE resolved.journal_id=journal.id AND r.payer_user_id=account.owner_id AND r.asset_id=account.asset_id AND r.amount_base_units=NEW.amount_base_units
  ) THEN RETURN NULL; END IF;
  IF EXISTS(SELECT 1 FROM public.simulation_reorg_reviews r LEFT JOIN public.simulation_reorg_resolutions resolved ON resolved.review_id=r.id WHERE r.asset_id=account.asset_id AND account.owner_id=ANY(r.affected_user_ids) AND resolved.id IS NULL) THEN RAISE EXCEPTION 'FINANCIAL_REVIEW_REQUIRED'; END IF;
 ELSIF account.owner_type='platform' AND journal.ledger_type IN ('BUSINESS_SETTLEMENT_HOLD','BUSINESS_SETTLEMENT_SETTLE','TREASURY_SWEEP') THEN
  IF EXISTS(SELECT 1 FROM public.simulation_reorg_reviews r LEFT JOIN public.simulation_reorg_resolutions resolved ON resolved.review_id=r.id WHERE r.asset_id=account.asset_id AND resolved.id IS NULL) THEN RAISE EXCEPTION 'FINANCIAL_REVIEW_REQUIRED'; END IF;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_frozen_spend_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS frozen_spend_guard ON public.ledger_postings;
CREATE CONSTRAINT TRIGGER frozen_spend_guard AFTER INSERT ON public.ledger_postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_frozen_spend_guard();
CREATE OR REPLACE FUNCTION public.gw_reorg_admission_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.queue_partitions p JOIN public.simulation_reorg_reviews r ON r.partition_id=p.id LEFT JOIN public.simulation_reorg_resolutions resolved ON resolved.review_id=r.id WHERE p.plan_version_id=NEW.plan_version_id AND resolved.id IS NULL) THEN RAISE EXCEPTION 'FINANCIAL_REVIEW_REQUIRED'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_reorg_admission_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS reorg_admission_guard ON public.cycles;
CREATE CONSTRAINT TRIGGER reorg_admission_guard AFTER INSERT ON public.cycles DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_reorg_admission_guard();
CREATE INDEX IF NOT EXISTS reorg_source_operation_idx ON public.simulation_reorg_reviews(source_operation_key);
CREATE INDEX IF NOT EXISTS ledger_business_prefix_idx ON public.ledger_journals(business_key text_pattern_ops);

CREATE INDEX IF NOT EXISTS point_source_idx ON public.point_events(source_key,user_id);
CREATE INDEX IF NOT EXISTS cycle_user_history_idx ON public.cycles(user_id,created_at,id);
