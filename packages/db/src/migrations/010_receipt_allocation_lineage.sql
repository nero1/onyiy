CREATE TABLE IF NOT EXISTS public.receipt_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_operation_key text NOT NULL UNIQUE,
  source_cycle_id uuid NOT NULL REFERENCES public.cycles(id) ON DELETE RESTRICT,
  payer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  receiver_entry_id uuid REFERENCES public.queue_entries(id) ON DELETE RESTRICT,
  beneficiary_user_id uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  receiver_kind text NOT NULL CHECK (receiver_kind IN ('member','bootstrap','empty_queue_business')),
  recipient_role text,
  slot_index integer,
  receiver_account_id uuid NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
  credit_journal_id uuid NOT NULL UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  environment text NOT NULL CHECK (environment IN ('simulation','testnet','mainnet')),
  chain_id text NOT NULL,
  amount_base_units numeric(78,0) NOT NULL CHECK (amount_base_units>0),
  lineage_status text NOT NULL CHECK (lineage_status IN ('captured','legacy_linked')),
  credited_at timestamptz NOT NULL DEFAULT now(),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receipt_source_operation_fk FOREIGN KEY(source_operation_key) REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT receipt_slot_shape CHECK (
    (receiver_kind='empty_queue_business' AND receiver_entry_id IS NULL AND slot_index IS NULL)
    OR (receiver_kind IN ('member','bootstrap') AND receiver_entry_id IS NOT NULL AND
      ((lineage_status='captured' AND slot_index IS NOT NULL AND slot_index>0) OR (lineage_status='legacy_linked' AND slot_index IS NULL)))
  ),
  CONSTRAINT receipt_beneficiary_shape CHECK (
    (receiver_kind='member' AND beneficiary_user_id IS NOT NULL AND beneficiary_user_id<>payer_user_id AND recipient_role IS NULL)
    OR (receiver_kind IN ('bootstrap','empty_queue_business') AND beneficiary_user_id IS NULL AND recipient_role IS NOT NULL AND recipient_role IN ('developer','marketing','platform','custom_bootstrap'))
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS receipt_receiver_slot_unique ON public.receipt_allocations(receiver_entry_id,slot_index) WHERE slot_index IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS receipt_source_cycle_unique ON public.receipt_allocations(source_cycle_id);
CREATE INDEX IF NOT EXISTS receipt_beneficiary_history_idx ON public.receipt_allocations(beneficiary_user_id,credited_at,id);
-- UUID nonce case is one identity. Keep hashes/history untouched and retain
-- indexed lookup of legacy mixed-case keys; chain hashes are not case-folded.
CREATE INDEX IF NOT EXISTS operation_key_case_lookup ON public.operation_keys(lower(business_key));
CREATE UNIQUE INDEX IF NOT EXISTS operation_uuid_nonce_unique ON public.operation_keys(lower(business_key))
  WHERE business_key ~ '^(gift|admin-activate):[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$';
CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_uuid_quote_unique ON public.withdrawals(lower(request_key));
CREATE UNIQUE INDEX IF NOT EXISTS ledger_giv_uuid_nonce_unique ON public.ledger_journals(lower(business_key))
  WHERE business_key ~ '^gift-in:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$|^allocation:gift:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}:';
LOCK TABLE public.queue_entries,public.ledger_journals,public.operation_keys,public.receipt_allocations IN ACCESS EXCLUSIVE MODE;
DROP TRIGGER IF EXISTS receipt_allocation_valid ON public.receipt_allocations;

-- Link only evidence already present in GIV journals/operation results. Legacy
-- slot sequence is unknown: no timestamp-derived or invented slot is assigned.
WITH evidence AS (
  SELECT j.id AS journal_id,j.created_at,j.metadata,j.business_key,
    substring(j.business_key from '(?i)^allocation:(gift:[0-9a-f-]{36}:[0-9a-f-]{36}):receiver:') AS operation_key
  FROM public.ledger_journals j WHERE j.ledger_type='RECEIVER_ALLOCATE'
), verified AS (
  SELECT e.*,c.id AS source_cycle_id,c.user_id AS payer,p.id AS posting_id,p.amount_base_units,
    a.id AS account_id,a.owner_id,a.owner_type,a.purpose,asset.id AS asset_id,asset.environment,asset.chain_id,
    q.id AS entry_id,q.kind,q.beneficiary_user_id,q.platform_role,q.credited_count,
    e.metadata->>'receiver_kind' AS receiver_kind,e.metadata->>'receiver' AS receiver
  FROM evidence e JOIN public.operation_keys op ON op.business_key=e.operation_key
  JOIN public.cycles c ON c.id=CASE WHEN op.result->>'cycle_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (op.result->>'cycle_id')::uuid END
  JOIN public.plan_versions v ON v.id=c.plan_version_id
  JOIN public.ledger_postings p ON p.journal_id=e.journal_id AND p.direction='credit'
  JOIN public.ledger_accounts a ON a.id=p.account_id
  JOIN public.assets asset ON asset.id=a.asset_id AND asset.id=v.asset_id
  LEFT JOIN public.queue_entries q ON q.id=CASE WHEN e.metadata->>'queue_entry_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (e.metadata->>'queue_entry_id')::uuid END
  LEFT JOIN public.queue_partitions partition ON partition.id=q.partition_id
  WHERE asset.environment='simulation' AND asset.chain_id='giv' AND asset.symbol='GIV'
    AND lower(e.metadata->>'plan_id')=v.plan_id::text AND op.business_key LIKE 'gift:'||c.user_id::text||':%'
    AND p.amount_base_units=floor(v.amount_base_units*v.receiver_bps/10000)
    AND (SELECT count(*) FROM public.ledger_postings WHERE journal_id=e.journal_id AND direction='credit')=1
    AND (SELECT count(*) FROM public.ledger_postings WHERE journal_id=e.journal_id)=2
    AND EXISTS (SELECT 1 FROM public.ledger_postings d JOIN public.ledger_accounts clearing ON clearing.id=d.account_id WHERE d.journal_id=e.journal_id AND d.direction='debit' AND d.amount_base_units=p.amount_base_units AND clearing.asset_id=asset.id AND clearing.owner_type='system' AND clearing.purpose='gift_clearing')
    AND ((e.metadata->>'receiver_kind'='member' AND q.kind='member' AND partition.plan_version_id=c.plan_version_id AND q.credited_count>0 AND q.beneficiary_user_id=a.owner_id AND a.owner_type='user' AND a.purpose='available_payable' AND a.owner_id<>c.user_id AND e.metadata->>'receiver'=a.owner_id::text)
      OR (e.metadata->>'receiver_kind'='bootstrap' AND q.kind='bootstrap' AND partition.plan_version_id=c.plan_version_id AND q.credited_count>0 AND a.owner_type='platform' AND a.owner_id IS NULL AND e.metadata->>'receiver'=q.platform_role AND a.purpose='bootstrap_'||q.platform_role||'_payable')
      OR (e.metadata->>'receiver_kind'='empty_queue_business' AND e.metadata->'queue_entry_id'='null'::jsonb AND a.owner_type='platform' AND a.owner_id IS NULL AND e.metadata->>'receiver' IN ('developer','marketing') AND a.purpose=(e.metadata->>'receiver')||'_payable'))
)
INSERT INTO public.receipt_allocations(source_operation_key,source_cycle_id,payer_user_id,receiver_entry_id,beneficiary_user_id,receiver_kind,recipient_role,slot_index,receiver_account_id,credit_journal_id,asset_id,environment,chain_id,amount_base_units,lineage_status,credited_at)
SELECT operation_key,source_cycle_id,payer,entry_id,CASE WHEN receiver_kind='member' THEN owner_id END,receiver_kind,
  CASE WHEN receiver_kind<>'member' THEN receiver END,NULL,account_id,journal_id,asset_id,environment,chain_id,amount_base_units,'legacy_linked',created_at
FROM verified ON CONFLICT DO NOTHING;
-- Flush backfill FK events before installing triggers/RLS in this transaction.
SET CONSTRAINTS receipt_source_operation_fk IMMEDIATE;

CREATE OR REPLACE FUNCTION public.gw_validate_receipt_allocation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE journal public.ledger_journals%ROWTYPE; incoming public.ledger_journals%ROWTYPE; account public.ledger_accounts%ROWTYPE; item public.queue_entries%ROWTYPE; source public.cycles%ROWTYPE; version public.plan_versions%ROWTYPE; asset public.assets%ROWTYPE; result jsonb; credit_amount numeric; credit_count integer;
BEGIN
  IF NEW.lineage_status<>'captured' THEN RAISE EXCEPTION 'LEGACY_LINEAGE_REQUIRES_MIGRATION'; END IF;
  SELECT * INTO journal FROM public.ledger_journals WHERE id=NEW.credit_journal_id;
  SELECT * INTO account FROM public.ledger_accounts WHERE id=NEW.receiver_account_id;
  SELECT * INTO source FROM public.cycles WHERE id=NEW.source_cycle_id;
  SELECT * INTO version FROM public.plan_versions WHERE id=source.plan_version_id;
  SELECT * INTO asset FROM public.assets WHERE id=NEW.asset_id;
  SELECT * INTO incoming FROM public.ledger_journals WHERE business_key='gift-in:'||substring(NEW.source_operation_key from '^gift:(.+)$');
  SELECT op.result INTO result FROM public.operation_keys op WHERE business_key=NEW.source_operation_key;
  SELECT sum(amount_base_units),count(*) INTO credit_amount,credit_count FROM public.ledger_postings WHERE journal_id=journal.id AND direction='credit';
  IF journal.ledger_type<>'RECEIVER_ALLOCATE' OR account.asset_id<>NEW.asset_id OR source.user_id<>NEW.payer_user_id OR version.asset_id<>NEW.asset_id
    OR asset.environment<>NEW.environment OR asset.chain_id<>NEW.chain_id OR result->>'cycle_id' IS DISTINCT FROM NEW.source_cycle_id::text
    OR NEW.source_operation_key NOT LIKE 'gift:'||NEW.payer_user_id::text||':%'
    OR journal.business_key NOT LIKE 'allocation:'||NEW.source_operation_key||':receiver:%'
    OR journal.metadata->>'receiver_kind' IS DISTINCT FROM NEW.receiver_kind OR journal.metadata->>'queue_entry_id' IS DISTINCT FROM NEW.receiver_entry_id::text
    OR journal.metadata->>'slot_index' IS DISTINCT FROM NEW.slot_index::text
    OR credit_count<>1 OR credit_amount<>NEW.amount_base_units
    OR NOT EXISTS (SELECT 1 FROM public.ledger_postings WHERE journal_id=journal.id AND direction='credit' AND account_id=account.id AND amount_base_units=NEW.amount_base_units)
    OR NEW.amount_base_units<>floor(version.amount_base_units*version.receiver_bps/10000)
    OR journal.metadata->>'plan_id' IS DISTINCT FROM version.plan_id::text
    OR result->>'plan_id' IS DISTINCT FROM version.plan_id::text OR result->>'allocation_id' IS DISTINCT FROM NEW.id::text
    OR journal.created_txid<>txid_current() OR NEW.credited_at<>journal.created_at THEN RAISE EXCEPTION 'ALLOCATION_INVALID'; END IF;
  IF incoming.id IS NULL OR incoming.ledger_type<>'GIFT_IN' OR incoming.created_txid<>txid_current()
    OR NOT EXISTS (SELECT 1 FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=incoming.id AND p.direction='debit' AND p.amount_base_units=version.amount_base_units AND a.asset_id=NEW.asset_id AND a.owner_type='user' AND a.owner_id=NEW.payer_user_id AND a.purpose='available_payable')
    OR NOT EXISTS (SELECT 1 FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=incoming.id AND p.direction='credit' AND p.amount_base_units=version.amount_base_units AND a.asset_id=NEW.asset_id AND a.owner_type='system' AND a.purpose='gift_clearing')
    THEN RAISE EXCEPTION 'ALLOCATION_SOURCE_INVALID'; END IF;
  IF NEW.receiver_kind='member' OR NEW.receiver_kind='bootstrap' THEN
    SELECT * INTO item FROM public.queue_entries WHERE id=NEW.receiver_entry_id;
    IF item.kind<>NEW.receiver_kind OR item.credited_count<NEW.slot_index OR item.required_count<NEW.slot_index
      OR NOT EXISTS (SELECT 1 FROM public.queue_partitions WHERE id=item.partition_id AND plan_version_id=source.plan_version_id)
      THEN RAISE EXCEPTION 'ALLOCATION_INVALID'; END IF;
  END IF;
  IF NEW.receiver_kind='member' THEN
    IF account.owner_type<>'user' OR account.owner_id IS DISTINCT FROM NEW.beneficiary_user_id OR item.beneficiary_user_id IS DISTINCT FROM NEW.beneficiary_user_id OR account.purpose<>'available_payable' OR journal.metadata->>'receiver' IS DISTINCT FROM NEW.beneficiary_user_id::text THEN RAISE EXCEPTION 'ALLOCATION_INVALID'; END IF;
  ELSIF account.owner_type<>'platform' OR account.owner_id IS NOT NULL OR journal.metadata->>'receiver' IS DISTINCT FROM NEW.recipient_role
    OR (NEW.receiver_kind='bootstrap' AND (item.platform_role IS DISTINCT FROM NEW.recipient_role OR account.purpose<>'bootstrap_'||NEW.recipient_role||'_payable'))
    OR (NEW.receiver_kind='empty_queue_business' AND (NEW.recipient_role NOT IN ('developer','marketing') OR account.purpose<>NEW.recipient_role||'_payable'))
    THEN RAISE EXCEPTION 'ALLOCATION_INVALID';
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.gw_validate_receipt_allocation() FROM PUBLIC;
DROP TRIGGER IF EXISTS receipt_allocation_valid ON public.receipt_allocations;
CREATE CONSTRAINT TRIGGER receipt_allocation_valid AFTER INSERT ON public.receipt_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_validate_receipt_allocation();
DROP TRIGGER IF EXISTS receipt_allocation_append_only ON public.receipt_allocations;
CREATE TRIGGER receipt_allocation_append_only BEFORE UPDATE OR DELETE ON public.receipt_allocations FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();
DROP TRIGGER IF EXISTS operation_key_append_only ON public.operation_keys;
CREATE TRIGGER operation_key_append_only BEFORE UPDATE OR DELETE ON public.operation_keys FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();
CREATE OR REPLACE FUNCTION public.gw_withdrawal_snapshot_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
  IF ROW(NEW.user_id,NEW.asset_id,NEW.gross_base_units,NEW.fee_base_units,NEW.net_base_units,NEW.destination,NEW.quote_expires_at,NEW.request_key,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.user_id,OLD.asset_id,OLD.gross_base_units,OLD.fee_base_units,OLD.net_base_units,OLD.destination,OLD.quote_expires_at,OLD.request_key,OLD.created_at)
    THEN RAISE EXCEPTION 'WITHDRAWAL_QUOTE_IMMUTABLE'; END IF;
  IF OLD.status='settled' AND ROW(NEW.status,NEW.settled_at) IS DISTINCT FROM ROW(OLD.status,OLD.settled_at) THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_withdrawal_snapshot_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS withdrawal_snapshot_guard ON public.withdrawals;
CREATE TRIGGER withdrawal_snapshot_guard BEFORE UPDATE OR DELETE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.gw_withdrawal_snapshot_guard();

-- Supabase Data API grants: immutable financial records, native services only.
ALTER TABLE public.receipt_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gw_receipt_service ON public.receipt_allocations;
CREATE POLICY gw_receipt_service ON public.receipt_allocations TO gw_service USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS gw_receipt_owned ON public.receipt_allocations;
CREATE POLICY gw_receipt_owned ON public.receipt_allocations FOR SELECT TO gw_read USING (environment=current_setting('gw.environment',true) AND (public.gw_owns(beneficiary_user_id) OR payer_user_id=public.gw_actor_id()));
REVOKE ALL ON public.receipt_allocations FROM PUBLIC,gw_read,gw_service;
GRANT SELECT ON public.receipt_allocations TO gw_read;
GRANT SELECT,INSERT ON public.receipt_allocations TO gw_service;
DO $$
DECLARE browser text;
BEGIN
  FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser) THEN
      EXECUTE format('REVOKE ALL ON public.receipt_allocations FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_validate_receipt_allocation() FROM %I',browser);
      EXECUTE format('REVOKE ALL ON FUNCTION public.gw_withdrawal_snapshot_guard() FROM %I',browser);
    END IF;
  END LOOP;
END $$;
