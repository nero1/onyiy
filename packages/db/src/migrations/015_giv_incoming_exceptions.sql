CREATE TABLE IF NOT EXISTS public.gift_invoices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 plan_version_id uuid NOT NULL REFERENCES public.plan_versions(id) ON DELETE RESTRICT,asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
 environment text NOT NULL DEFAULT 'simulation',chain_id text NOT NULL DEFAULT 'giv',request_key uuid NOT NULL,
 expected_base_units numeric(78,0) NOT NULL,actual_base_units numeric(78,0),refundable_base_units numeric(78,0) NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'quoted',quote_expires_at timestamptz NOT NULL,submitted_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT gift_invoice_request_key UNIQUE(user_id,request_key),CONSTRAINT gift_invoice_environment_check CHECK(environment='simulation' AND chain_id='giv'),
 CONSTRAINT gift_invoice_amount_check CHECK(expected_base_units>0 AND actual_base_units>=0 AND refundable_base_units>=0),
 CONSTRAINT gift_invoice_status_check CHECK(status IN ('quoted','submitted','credited','exception','failed','expired'))
);
CREATE UNIQUE INDEX IF NOT EXISTS gift_invoice_open_unique ON public.gift_invoices(user_id,plan_version_id) WHERE status IN ('quoted','submitted');
CREATE INDEX IF NOT EXISTS gift_invoice_history_idx ON public.gift_invoices(user_id,created_at,id);
CREATE TABLE IF NOT EXISTS public.simulation_incoming_controls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_id uuid NOT NULL UNIQUE REFERENCES public.gift_invoices(id) ON DELETE RESTRICT,
 environment text NOT NULL DEFAULT 'simulation' CHECK(environment='simulation'),outcome text NOT NULL CHECK(outcome IN ('reject','under','over','late','delay')),
 actual_base_units numeric(78,0) NOT NULL CHECK(actual_base_units>=0),actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 operation_key text NOT NULL UNIQUE REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT,reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 500),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.simulation_incoming_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_id uuid NOT NULL UNIQUE REFERENCES public.gift_invoices(id) ON DELETE RESTRICT,
 environment text NOT NULL DEFAULT 'simulation' CHECK(environment='simulation'),outcome text NOT NULL CHECK(outcome IN ('exact','reject','under','over','late','review_reject')),
 gift_operation_key text UNIQUE REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT,
 hold_journal_id uuid REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,accept_journal_id uuid REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
 refund_journal_id uuid REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.simulation_incoming_refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invoice_id uuid NOT NULL UNIQUE REFERENCES public.gift_invoices(id) ON DELETE RESTRICT,
 environment text NOT NULL DEFAULT 'simulation' CHECK(environment='simulation'),actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 operation_key text NOT NULL UNIQUE REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT,journal_id uuid NOT NULL UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
 amount_base_units numeric(78,0) NOT NULL CHECK(amount_base_units>0),reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 500),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.gw_invoice_snapshot_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
 IF ROW(NEW.id,NEW.user_id,NEW.plan_version_id,NEW.asset_id,NEW.environment,NEW.chain_id,NEW.request_key,NEW.expected_base_units,NEW.quote_expires_at,NEW.created_at)
  IS DISTINCT FROM ROW(OLD.id,OLD.user_id,OLD.plan_version_id,OLD.asset_id,OLD.environment,OLD.chain_id,OLD.request_key,OLD.expected_base_units,OLD.quote_expires_at,OLD.created_at)
  OR (OLD.status NOT IN ('quoted','submitted') AND NEW IS DISTINCT FROM OLD)
  OR (OLD.status='submitted' AND (NEW.status IN ('quoted','expired') OR ROW(NEW.actual_base_units,NEW.submitted_at) IS DISTINCT FROM ROW(OLD.actual_base_units,OLD.submitted_at))) THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_invoice_snapshot_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS invoice_snapshot_guard ON public.gift_invoices;
CREATE TRIGGER invoice_snapshot_guard BEFORE UPDATE OR DELETE ON public.gift_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_invoice_snapshot_guard();
CREATE OR REPLACE FUNCTION public.gw_incoming_control_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item public.gift_invoices%ROWTYPE;
BEGIN
 SELECT * INTO item FROM public.gift_invoices WHERE id=NEW.invoice_id FOR UPDATE;
 IF item.status<>'quoted' OR item.quote_expires_at<=clock_timestamp() OR NOT EXISTS (SELECT 1 FROM public.users WHERE id=NEW.actor_user_id AND role='admin' AND status='active')
  OR (NEW.outcome='reject' AND NEW.actual_base_units<>0) OR (NEW.outcome='under' AND (NEW.actual_base_units<=0 OR NEW.actual_base_units>=item.expected_base_units))
  OR (NEW.outcome='over' AND NEW.actual_base_units<=item.expected_base_units) OR (NEW.outcome IN ('late','delay') AND NEW.actual_base_units<>item.expected_base_units) THEN RAISE EXCEPTION 'INCOMING_CONTROL_INVALID'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_incoming_control_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS incoming_control_guard ON public.simulation_incoming_controls;
CREATE TRIGGER incoming_control_guard BEFORE INSERT ON public.simulation_incoming_controls FOR EACH ROW EXECUTE FUNCTION public.gw_incoming_control_guard();
DO $$ DECLARE name text; BEGIN
 FOREACH name IN ARRAY ARRAY['simulation_incoming_controls','simulation_incoming_events','simulation_incoming_refunds'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS incoming_append_only ON public.%I',name);
  EXECUTE format('CREATE TRIGGER incoming_append_only BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation()',name);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.gw_incoming_leg_valid(journal uuid,item public.gift_invoices,kind text,amount numeric,from_purpose text,to_purpose text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS (SELECT 1 FROM public.ledger_journals j WHERE j.id=$1 AND j.ledger_type=$3 AND j.metadata->>'invoice_id'=($2).id::text)
 AND public.gw_giv_withdrawal_leg_valid($1,($2).user_id,($2).asset_id,$4,$5,$6,'user')
$$;
REVOKE ALL ON FUNCTION public.gw_incoming_leg_valid(uuid,public.gift_invoices,text,numeric,text,text) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.gw_incoming_integrity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item public.gift_invoices%ROWTYPE; event public.simulation_incoming_events%ROWTYPE; control public.simulation_incoming_controls%ROWTYPE; hold_id uuid;
BEGIN
 IF TG_TABLE_NAME='gift_invoices' THEN SELECT * INTO item FROM public.gift_invoices WHERE id=NEW.id; ELSE SELECT * INTO item FROM public.gift_invoices WHERE id=NEW.invoice_id; END IF;
 SELECT * INTO event FROM public.simulation_incoming_events WHERE invoice_id=item.id;
 SELECT * INTO control FROM public.simulation_incoming_controls WHERE invoice_id=item.id;
 SELECT id INTO hold_id FROM public.ledger_journals WHERE business_key='incoming-hold:'||item.id;
 IF NOT EXISTS(SELECT 1 FROM public.plan_versions v JOIN public.assets a ON a.id=v.asset_id WHERE v.id=item.plan_version_id AND a.id=item.asset_id AND a.symbol='GIV' AND a.environment='simulation' AND a.chain_id='giv' AND v.amount_base_units=item.expected_base_units)
  OR item.quote_expires_at<=item.created_at THEN RAISE EXCEPTION 'INCOMING_SNAPSHOT_INVALID'; END IF;
 IF item.status IN ('quoted','expired') THEN
  IF item.actual_base_units IS NOT NULL OR item.submitted_at IS NOT NULL OR item.refundable_base_units<>0 OR event.id IS NOT NULL OR hold_id IS NOT NULL THEN RAISE EXCEPTION 'INCOMING_STATE_INVALID'; END IF; RETURN NULL;
 END IF;
 IF item.actual_base_units IS NULL OR item.submitted_at IS NULL OR item.submitted_at<item.created_at OR item.submitted_at>clock_timestamp() THEN RAISE EXCEPTION 'INCOMING_SUBMISSION_INVALID'; END IF;
 IF item.actual_base_units IS DISTINCT FROM coalesce(control.actual_base_units,item.expected_base_units) THEN RAISE EXCEPTION 'INCOMING_AMOUNT_INVALID'; END IF;
 IF item.actual_base_units>0 THEN
  IF hold_id IS NULL OR NOT public.gw_incoming_leg_valid(hold_id,item,'GIV_INCOMING_HOLD',item.actual_base_units,'available_payable','incoming_payable') THEN RAISE EXCEPTION 'INCOMING_HOLD_INVALID'; END IF;
 ELSIF hold_id IS NOT NULL THEN RAISE EXCEPTION 'INCOMING_HOLD_INVALID'; END IF;
 IF item.status='submitted' THEN
  IF item.actual_base_units<>item.expected_base_units OR item.submitted_at>=item.quote_expires_at OR item.refundable_base_units<>0 OR event.id IS NOT NULL THEN RAISE EXCEPTION 'INCOMING_STATE_INVALID'; END IF; RETURN NULL;
 END IF;
 IF event.id IS NULL OR event.hold_journal_id IS DISTINCT FROM hold_id THEN RAISE EXCEPTION 'INCOMING_EVENT_INVALID'; END IF;
 IF item.status='failed' THEN
  IF control.outcome IS DISTINCT FROM 'reject' OR event.outcome<>'reject' OR item.actual_base_units<>0 OR item.refundable_base_units<>0 OR event.gift_operation_key IS NOT NULL OR event.accept_journal_id IS NOT NULL OR event.refund_journal_id IS NOT NULL THEN RAISE EXCEPTION 'INCOMING_REJECTION_INVALID'; END IF;
 ELSIF item.status='credited' THEN
  IF (event.outcome='exact' AND control.outcome IS NOT NULL AND control.outcome<>'delay') OR (event.outcome='over' AND control.outcome IS DISTINCT FROM 'over') OR event.outcome NOT IN ('exact','over') OR item.submitted_at>=item.quote_expires_at OR item.actual_base_units<item.expected_base_units OR item.refundable_base_units<>item.actual_base_units-item.expected_base_units
   OR (event.outcome='exact' AND item.actual_base_units<>item.expected_base_units) OR (event.outcome='over' AND item.actual_base_units<=item.expected_base_units)
   OR NOT public.gw_incoming_leg_valid(event.accept_journal_id,item,'GIV_INCOMING_ACCEPT',item.expected_base_units,'incoming_payable','available_payable')
   OR event.gift_operation_key IS DISTINCT FROM 'gift:'||item.user_id||':'||item.id
   OR NOT EXISTS (SELECT 1 FROM public.receipt_allocations r JOIN public.cycles c ON c.id=r.source_cycle_id WHERE r.source_operation_key=event.gift_operation_key AND r.payer_user_id=item.user_id AND c.plan_version_id=item.plan_version_id) THEN RAISE EXCEPTION 'INCOMING_ACCEPT_INVALID'; END IF;
 ELSIF item.status='exception' THEN
  IF event.outcome NOT IN ('under','late','review_reject') OR item.actual_base_units<=0 OR item.refundable_base_units<>item.actual_base_units OR event.gift_operation_key IS NOT NULL OR event.accept_journal_id IS NOT NULL
   OR (event.outcome='under' AND (item.actual_base_units>=item.expected_base_units OR control.outcome IS DISTINCT FROM 'under' OR item.submitted_at>=item.quote_expires_at))
   OR (event.outcome='late' AND item.submitted_at<item.quote_expires_at AND control.outcome IS DISTINCT FROM 'late')
   OR (event.outcome='review_reject' AND control.outcome IS DISTINCT FROM 'delay') THEN RAISE EXCEPTION 'INCOMING_EXCEPTION_INVALID'; END IF;
 ELSE RAISE EXCEPTION 'INCOMING_STATE_INVALID'; END IF;
 IF item.refundable_base_units>0 THEN
  IF NOT public.gw_incoming_leg_valid(event.refund_journal_id,item,'REFUND_HOLD',item.refundable_base_units,'incoming_payable','refund_payable') THEN RAISE EXCEPTION 'INCOMING_REFUND_HOLD_INVALID'; END IF;
 ELSIF event.refund_journal_id IS NOT NULL THEN RAISE EXCEPTION 'INCOMING_REFUND_HOLD_INVALID'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_incoming_integrity() FROM PUBLIC;
DROP TRIGGER IF EXISTS incoming_invoice_integrity ON public.gift_invoices;
CREATE CONSTRAINT TRIGGER incoming_invoice_integrity AFTER INSERT OR UPDATE ON public.gift_invoices DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_incoming_integrity();
DROP TRIGGER IF EXISTS incoming_event_integrity ON public.simulation_incoming_events;
CREATE CONSTRAINT TRIGGER incoming_event_integrity AFTER INSERT ON public.simulation_incoming_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_incoming_integrity();
CREATE OR REPLACE FUNCTION public.gw_incoming_refund_integrity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item public.gift_invoices%ROWTYPE;
BEGIN
 SELECT * INTO item FROM public.gift_invoices WHERE id=NEW.invoice_id;
 IF item.status NOT IN ('credited','exception') OR NEW.amount_base_units<>item.refundable_base_units OR NOT EXISTS (SELECT 1 FROM public.users WHERE id=NEW.actor_user_id AND role='admin' AND status='active')
  OR NOT public.gw_incoming_leg_valid(NEW.journal_id,item,'REFUND_SETTLE',NEW.amount_base_units,'refund_payable','available_payable') THEN RAISE EXCEPTION 'INCOMING_REFUND_INVALID'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_incoming_refund_integrity() FROM PUBLIC;
DROP TRIGGER IF EXISTS incoming_refund_integrity ON public.simulation_incoming_refunds;
CREATE CONSTRAINT TRIGGER incoming_refund_integrity AFTER INSERT ON public.simulation_incoming_refunds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_incoming_refund_integrity();
CREATE OR REPLACE FUNCTION public.gw_invoice_version_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.gift_invoices WHERE plan_version_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
  IF ROW(NEW.id,NEW.plan_id,NEW.asset_id,NEW.version,NEW.amount_base_units,NEW.usd_reference,NEW.receiver_bps,NEW.marketing_bps,NEW.referral_bps,NEW.developer_bps,NEW.reserve_bps,NEW.receipts_required)
   IS DISTINCT FROM ROW(OLD.id,OLD.plan_id,OLD.asset_id,OLD.version,OLD.amount_base_units,OLD.usd_reference,OLD.receiver_bps,OLD.marketing_bps,OLD.referral_bps,OLD.developer_bps,OLD.reserve_bps,OLD.receipts_required) THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_invoice_version_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS invoice_version_guard ON public.plan_versions;
CREATE TRIGGER invoice_version_guard BEFORE UPDATE OR DELETE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION public.gw_invoice_version_guard();
-- Supabase Data API grants: all incoming financial/control/history tables are server-only.
REVOKE ALL ON public.gift_invoices,public.simulation_incoming_controls,public.simulation_incoming_events,public.simulation_incoming_refunds FROM PUBLIC,gw_read,gw_service;
GRANT SELECT,INSERT,UPDATE ON public.gift_invoices TO gw_service;
GRANT SELECT,INSERT ON public.simulation_incoming_controls,public.simulation_incoming_events,public.simulation_incoming_refunds TO gw_service;
GRANT SELECT ON public.gift_invoices TO gw_read;
DO $$ DECLARE name text; browser text; BEGIN
 FOREACH name IN ARRAY ARRAY['gift_invoices','simulation_incoming_controls','simulation_incoming_events','simulation_incoming_refunds'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
  EXECUTE format('DROP POLICY IF EXISTS gw_incoming_service ON public.%I',name);
  EXECUTE format('CREATE POLICY gw_incoming_service ON public.%I TO gw_service USING(environment=current_setting(''gw.environment'',true)) WITH CHECK(environment=current_setting(''gw.environment'',true))',name);
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',name,browser); END IF;
  END LOOP;
 END LOOP;
END $$;
DROP POLICY IF EXISTS gw_invoice_owned ON public.gift_invoices;
CREATE POLICY gw_invoice_owned ON public.gift_invoices FOR SELECT TO gw_read USING(environment=current_setting('gw.environment',true) AND public.gw_owns(user_id));
