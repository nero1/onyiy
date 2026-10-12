ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
CREATE INDEX IF NOT EXISTS withdrawals_user_history_idx ON public.withdrawals(user_id,created_at,id);
CREATE UNIQUE INDEX IF NOT EXISTS operation_staff_uuid_nonce_unique ON public.operation_keys(lower(business_key))
  WHERE business_key ~ '^admin-(job-replay|sim-withdrawal|resolve-withdrawal):[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$';
CREATE TABLE IF NOT EXISTS public.simulation_withdrawal_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id uuid NOT NULL UNIQUE REFERENCES public.withdrawals(id) ON DELETE RESTRICT,
  environment text NOT NULL DEFAULT 'simulation' CHECK (environment='simulation'),
  outcome text NOT NULL CHECK (outcome IN ('hold','reject')),
  actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  operation_key text NOT NULL UNIQUE REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  reason text NOT NULL CHECK (length(reason) BETWEEN 5 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS simulation_withdrawal_controls_append ON public.simulation_withdrawal_controls;
CREATE TRIGGER simulation_withdrawal_controls_append BEFORE UPDATE OR DELETE ON public.simulation_withdrawal_controls FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();
CREATE OR REPLACE FUNCTION public.gw_giv_withdrawal_leg_valid(journal_id uuid,beneficiary uuid,asset uuid,amount numeric,debit_purpose text,credit_purpose text,credit_owner text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT (SELECT count(*) FROM public.ledger_postings WHERE journal_id=$1)=2
    AND EXISTS (SELECT 1 FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=$1 AND p.direction='debit' AND p.amount_base_units=$4 AND a.owner_type='user' AND a.owner_id=$2 AND a.asset_id=$3 AND a.purpose=$5)
    AND EXISTS (SELECT 1 FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=$1 AND p.direction='credit' AND p.amount_base_units=$4 AND a.owner_type=$7 AND (CASE WHEN $7='user' THEN a.owner_id=$2 ELSE a.owner_id IS NULL END) AND a.asset_id=$3 AND a.purpose=$6)
$$;
REVOKE ALL ON FUNCTION public.gw_giv_withdrawal_leg_valid(uuid,uuid,uuid,numeric,text,text,text) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.gw_giv_withdrawal_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item public.withdrawals%ROWTYPE; hold public.ledger_journals%ROWTYPE; settle public.ledger_journals%ROWTYPE; release public.ledger_journals%ROWTYPE;
BEGIN
  -- Deferred events inspect the final state, including multiple transitions in
  -- one transaction. This guard implements GIV only, not live payout evidence.
  SELECT * INTO item FROM public.withdrawals WHERE id=NEW.id;
  IF NOT EXISTS (SELECT 1 FROM public.assets WHERE id=item.asset_id AND environment='simulation' AND chain_id='giv' AND symbol='GIV') THEN RETURN NULL; END IF;
  IF item.gross_base_units<=0 OR item.net_base_units<>item.gross_base_units OR item.fee_base_units<>0 THEN RAISE EXCEPTION 'GIV_WITHDRAWAL_INVALID'; END IF;
  SELECT * INTO hold FROM public.ledger_journals WHERE business_key='payout-hold:'||item.id;
  SELECT * INTO settle FROM public.ledger_journals WHERE business_key='payout-settle:'||item.id;
  SELECT * INTO release FROM public.ledger_journals WHERE business_key='hold-release:'||item.id;
  IF hold.id IS NOT NULL AND (hold.ledger_type<>'PAYOUT_HOLD' OR hold.metadata->>'withdrawal_id' IS DISTINCT FROM item.id::text OR NOT public.gw_giv_withdrawal_leg_valid(hold.id,item.user_id,item.asset_id,item.gross_base_units,'available_payable','held_payable','user')) THEN RAISE EXCEPTION 'GIV_WITHDRAWAL_INVALID'; END IF;
  IF item.status='quoted' THEN
    IF hold.id IS NOT NULL OR settle.id IS NOT NULL OR release.id IS NOT NULL OR item.settled_at IS NOT NULL OR item.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'GIV_WITHDRAWAL_INVALID'; END IF;
  ELSIF item.status='held' THEN
    IF hold.id IS NULL OR settle.id IS NOT NULL OR release.id IS NOT NULL OR item.settled_at IS NOT NULL OR item.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'GIV_WITHDRAWAL_INVALID'; END IF;
  ELSIF item.status='settled' THEN
    IF hold.id IS NULL OR settle.id IS NULL OR settle.ledger_type<>'PAYOUT_SETTLE' OR settle.metadata->>'withdrawal_id' IS DISTINCT FROM item.id::text OR release.id IS NOT NULL OR item.cancelled_at IS NOT NULL OR item.settled_at IS DISTINCT FROM settle.created_at
      OR NOT public.gw_giv_withdrawal_leg_valid(settle.id,item.user_id,item.asset_id,item.gross_base_units,'held_payable','simulation_settlement_sink','system') THEN RAISE EXCEPTION 'GIV_WITHDRAWAL_INVALID'; END IF;
  ELSIF item.status='cancelled' THEN
    IF settle.id IS NOT NULL OR item.settled_at IS NOT NULL OR item.cancelled_at IS NULL OR (hold.id IS NULL AND release.id IS NOT NULL) THEN RAISE EXCEPTION 'GIV_WITHDRAWAL_INVALID'; END IF;
    IF hold.id IS NOT NULL AND (release.id IS NULL OR release.ledger_type<>'HOLD_RELEASE' OR release.metadata->>'withdrawal_id' IS DISTINCT FROM item.id::text OR item.cancelled_at IS DISTINCT FROM release.created_at
      OR NOT public.gw_giv_withdrawal_leg_valid(release.id,item.user_id,item.asset_id,item.gross_base_units,'held_payable','available_payable','user')) THEN RAISE EXCEPTION 'GIV_WITHDRAWAL_INVALID'; END IF;
  ELSE RAISE EXCEPTION 'GIV_WITHDRAWAL_STATE_UNSUPPORTED';
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_giv_withdrawal_integrity() FROM PUBLIC;
DROP TRIGGER IF EXISTS giv_withdrawal_integrity ON public.withdrawals;
CREATE CONSTRAINT TRIGGER giv_withdrawal_integrity AFTER INSERT OR UPDATE ON public.withdrawals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_giv_withdrawal_integrity();
CREATE OR REPLACE FUNCTION public.gw_cancelled_withdrawal_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF OLD.status='cancelled' AND ROW(NEW.status,NEW.cancelled_at,NEW.settled_at) IS DISTINCT FROM ROW(OLD.status,OLD.cancelled_at,OLD.settled_at) THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_cancelled_withdrawal_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS cancelled_withdrawal_guard ON public.withdrawals;
CREATE TRIGGER cancelled_withdrawal_guard BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.gw_cancelled_withdrawal_guard();

-- Supabase Data API grants: simulation financial controls remain server-only.
ALTER TABLE public.simulation_withdrawal_controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gw_simulation_withdrawal_service ON public.simulation_withdrawal_controls;
CREATE POLICY gw_simulation_withdrawal_service ON public.simulation_withdrawal_controls TO gw_service USING (environment=current_setting('gw.environment',true)) WITH CHECK (environment=current_setting('gw.environment',true));
REVOKE ALL ON public.simulation_withdrawal_controls FROM PUBLIC,gw_read,gw_service;
GRANT SELECT,INSERT ON public.simulation_withdrawal_controls TO gw_service;
DO $$
DECLARE browser text;
BEGIN
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
      EXECUTE format('REVOKE ALL ON public.simulation_withdrawal_controls FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_giv_withdrawal_leg_valid(uuid,uuid,uuid,numeric,text,text,text) FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_giv_withdrawal_integrity() FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_cancelled_withdrawal_guard() FROM %I',browser);
    END IF;
  END LOOP;
END $$;
