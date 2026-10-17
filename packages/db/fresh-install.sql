-- Gifters World: final-state schema for a new, empty database.
-- Run this file once with the schema owner; seed application content separately.
-- Creates current definitions directly. Historical migrations are not replayed.
-- Original migration receipts preserve compatibility with initialized databases.
-- Archive all application table schemas; exclude ephemeral proof data only.
BEGIN;
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='120s';
SET LOCAL search_path=pg_catalog,public;
SET LOCAL check_function_bodies=false;
SELECT pg_advisory_xact_lock(hashtextextended('gw-schema-migrations',0));
DO $empty_database$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f') AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e'))
 OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e'))
 THEN RAISE EXCEPTION 'INITIAL_SCHEMA_REQUIRES_EMPTY_DATABASE';END IF;
END $empty_database$;
DO $application_roles$
DECLARE name text;
BEGIN
 FOREACH name IN ARRAY ARRAY['gw_read','gw_service','gw_signer','gw_preview'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=name) THEN
   EXECUTE format('CREATE ROLE %I NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',name);
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=name AND (rolcanlogin OR rolinherit OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) THEN RAISE EXCEPTION 'UNSAFE_APPLICATION_ROLE';END IF;
 END LOOP;
END $application_roles$;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public VERSION '1.3';
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public VERSION '1.6';
DO $required_extensions$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto' AND e.extversion='1.3' AND n.nspname IN('public','extensions'))
 OR NOT EXISTS(SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pg_trgm' AND e.extversion='1.6' AND n.nspname='public') THEN RAISE EXCEPTION 'SCHEMA_EXTENSION_INCOMPATIBLE';END IF;
END $required_extensions$;

CREATE FUNCTION public.gw_account_balance(target uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE a public.ledger_accounts;value numeric;
BEGIN
 SELECT * INTO a FROM public.ledger_accounts WHERE id=target;
 IF NOT FOUND THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' AND NOT coalesce(a.owner_type='user' AND public.gw_owns(a.owner_id),false) THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.assets WHERE id=a.asset_id AND environment=current_setting('gw.environment',true)) THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 IF public.gw_counter_ready() THEN
  SELECT balance INTO value FROM public.ledger_account_totals WHERE account_id=target;
  IF NOT FOUND THEN
   IF EXISTS(SELECT 1 FROM public.ledger_postings WHERE account_id=target) THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;
   RETURN 0;
  END IF;
  RETURN value;
 END IF;
 SELECT coalesce(sum(CASE WHEN direction='credit' THEN amount_base_units ELSE -amount_base_units END),0) INTO value FROM public.ledger_postings WHERE account_id=target;
 RETURN value;
END $$;

CREATE FUNCTION public.gw_account_bucket(target uuid, bucket text) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $_$
DECLARE value numeric;
BEGIN
 IF bucket NOT IN('settled_payout_net','refund_held') OR bucket IS NULL THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 -- Applies exactly the same ownership/environment check, including on empty accounts.
 PERFORM public.gw_account_balance(target);
 IF public.gw_counter_ready() THEN SELECT amount INTO value FROM public.ledger_account_buckets WHERE account_id=target AND label=bucket;RETURN coalesce(value,0);END IF;
 SELECT coalesce(sum(CASE WHEN bucket='settled_payout_net' THEN CASE WHEN p.direction='debit' THEN p.amount_base_units ELSE -p.amount_base_units END ELSE CASE WHEN p.direction='credit' THEN p.amount_base_units ELSE -p.amount_base_units END END),0)
 INTO value FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id JOIN public.ledger_journals j ON j.id=p.journal_id
 LEFT JOIN public.crypto_obligations o ON o.id=CASE WHEN j.metadata->>'obligation_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.metadata->>'obligation_id')::uuid END AND o.asset_id=a.asset_id AND o.user_id=a.owner_id
 WHERE p.account_id=target AND a.owner_type='user' AND a.purpose='held_payable' AND ((bucket='settled_payout_net' AND j.ledger_type='PAYOUT_SETTLE') OR (bucket='refund_held' AND o.kind IN('refund','unallocated_refund')));
 RETURN value;
END $_$;

CREATE FUNCTION public.gw_account_tombstone_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF OLD.status='deleted' AND (NEW.status,NEW.username,NEW.email,NEW.role) IS DISTINCT FROM (OLD.status,OLD.username,OLD.email,OLD.role) THEN RAISE EXCEPTION 'ACCOUNT_TOMBSTONE_IMMUTABLE';END IF;
 IF NEW.account_revision<OLD.account_revision THEN RAISE EXCEPTION 'ACCOUNT_REVISION_INVALID';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_actor_id() RETURNS uuid
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog'
    AS $$
  SELECT nullif(current_setting('gw.actor_id',true),'')::uuid
$$;

CREATE FUNCTION public.gw_advance_monthly_archive(maximum integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    SET "TimeZone" TO 'UTC'
    AS $_$
DECLARE policy jsonb; item public.archive_months; source_name text; prefix text; default_name text; pending_month date; row_value record;
 actor uuid; environment text; count_value bigint; hash_value text; cursor_value uuid; revision_value integer; processed integer:=0; new_state text; query text; review_reason text;
BEGIN
 IF public.gw_runtime_environment_allowed() IS NOT TRUE THEN RAISE EXCEPTION 'FINANCIAL_ENVIRONMENT_DENIED'; END IF;
 actor:=nullif(current_setting('gw.actor_id',true),'')::uuid; environment:=current_setting('gw.environment',true);
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' OR environment IS NULL OR environment NOT IN ('simulation','testnet','mainnet') OR maximum IS NULL OR maximum NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF actor IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.users WHERE id=actor AND role='admin' AND status='active') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF current_setting('gw.operational_retention_hold',true)='true' THEN RETURN jsonb_build_object('state','held','more_possible',false); END IF;
 IF NOT pg_try_advisory_xact_lock(hashtextextended('gw-monthly-archive',0)) THEN RETURN jsonb_build_object('state','busy','more_possible',true); END IF;
 SELECT value INTO policy FROM public.x_manifest WHERE key='retention_policy' AND scope='staff' FOR SHARE;
 IF policy IS NULL OR policy->>'financial_archive_after_days' IS NULL OR policy->>'audit_hot_days' IS NULL OR (policy->>'financial_archive_after_days')::integer NOT BETWEEN 1 AND 1000000 OR (policy->>'audit_hot_days')::integer NOT BETWEEN 1 AND 1000000 THEN RAISE EXCEPTION 'CONFIGURATION_INVALID'; END IF;
 FOREACH source_name IN ARRAY ARRAY['ledger_postings','chain_scan_pages','audit_events'] LOOP
  prefix:=CASE source_name WHEN 'ledger_postings' THEN 'lp' WHEN 'chain_scan_pages' THEN 'cs' ELSE 'au' END;
  default_name:='gw_part_'||prefix||'_default';
  BEGIN
   EXECUTE format('SELECT date_trunc(''month'',created_at AT TIME ZONE ''UTC'')::date FROM %I.%I ORDER BY created_at LIMIT 1','public',default_name) INTO pending_month;
   IF pending_month IS NOT NULL THEN PERFORM public.gw_create_archive_month(source_name,pending_month); END IF;
   PERFORM public.gw_create_archive_month(source_name,date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')::date);
   PERFORM public.gw_create_archive_month(source_name,(date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')+interval '1 month')::date);
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'ARCHIVE_DEFAULT_BACKLOG_REVIEW' THEN RAISE; END IF;
   review_reason:='ARCHIVE_DEFAULT_BACKLOG_REVIEW';
  END;
 END LOOP;
 SELECT * INTO item FROM public.archive_months m WHERE m.state IN ('hashing','verifying') OR m.state='hot' AND (m.month_start+interval '1 month')::timestamptz<clock_timestamp()-(CASE WHEN m.source_table='audit_events' THEN policy->>'audit_hot_days' ELSE policy->>'financial_archive_after_days' END)::integer*interval '1 day'
 ORDER BY m.last_step_at,m.month_start,m.source_table LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN jsonb_build_object('state',CASE WHEN review_reason IS NULL THEN 'idle' ELSE 'review' END,'reason',review_reason,'more_possible',false); END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_inherits WHERE inhrelid=to_regclass(format('public.%I',item.child_name)) AND inhparent=to_regclass(format('public.%I',item.source_table))) THEN RAISE EXCEPTION 'ARCHIVE_SCHEMA_CONFLICT'; END IF;
 IF item.state='hot' THEN
  UPDATE public.archive_months SET state='hashing',frozen_at=clock_timestamp(),last_step_at=clock_timestamp() WHERE source_table=item.source_table AND month_start=item.month_start RETURNING * INTO item;
 END IF;
 count_value:=item.walk_count;hash_value:=item.walk_hash;cursor_value:=item.cursor_id;revision_value:=item.cursor_revision;
 IF item.source_table='chain_scan_pages' THEN
  query:=format('SELECT to_jsonb(r) AS body,r.run_id AS id,r.revision FROM %I.%I r WHERE $1::uuid IS NULL OR (r.run_id,r.revision)>($1::uuid,$2::integer) ORDER BY r.run_id,r.revision LIMIT $3','public',item.child_name);
 ELSE query:=format('SELECT to_jsonb(r) AS body,r.id,0 AS revision FROM %I.%I r WHERE $1::uuid IS NULL OR r.id>$1::uuid ORDER BY r.id LIMIT $3','public',item.child_name); END IF;
 FOR row_value IN EXECUTE query USING cursor_value,revision_value,maximum LOOP
  hash_value:=encode(sha256(convert_to(hash_value||encode(sha256(convert_to(row_value.body::text,'UTF8')),'hex'),'UTF8')),'hex');
  count_value:=count_value+1;cursor_value:=row_value.id;revision_value:=row_value.revision;processed:=processed+1;
 END LOOP;
 new_state:=item.state;
 IF processed<maximum THEN
  IF item.state='hashing' THEN
   UPDATE public.archive_months SET state='verifying',expected_count=count_value,expected_hash=hash_value,walk_count=0,walk_hash=encode(sha256(''::bytea),'hex'),cursor_id=NULL,cursor_revision=NULL,last_step_at=clock_timestamp() WHERE source_table=item.source_table AND month_start=item.month_start;
   new_state:='verifying';
  ELSE
   new_state:=CASE WHEN count_value=item.expected_count AND hash_value=item.expected_hash THEN 'archived' ELSE 'review' END;
   IF new_state='review' THEN review_reason:='ARCHIVE_CHECKSUM_MISMATCH'; END IF;
   UPDATE public.archive_months SET state=new_state,walk_count=count_value,walk_hash=hash_value,cursor_id=cursor_value,cursor_revision=revision_value,archived_at=CASE WHEN new_state='archived' THEN clock_timestamp() ELSE NULL END,last_step_at=clock_timestamp() WHERE source_table=item.source_table AND month_start=item.month_start;
   INSERT INTO public.audit_events(actor_user_id,action,target_type,target_id,reason,after_state) VALUES(actor,'retention.month.'||new_state,'archive_month',item.source_table||':'||item.month_start::text,CASE WHEN new_state='archived' THEN 'Online archive checksum verified without deleting financial evidence' ELSE 'Archive checksum mismatch requires review; financial evidence retained' END,jsonb_build_object('source_table',item.source_table,'month',item.month_start,'rows',count_value::text,'state',new_state));
  END IF;
 ELSE
  UPDATE public.archive_months SET walk_count=count_value,walk_hash=hash_value,cursor_id=cursor_value,cursor_revision=revision_value,last_step_at=clock_timestamp() WHERE source_table=item.source_table AND month_start=item.month_start;
 END IF;
 RETURN jsonb_build_object('state',new_state,'source_table',item.source_table,'month',item.month_start,'processed',processed,'rows',count_value::text,'reason',review_reason,'more_possible',true);
END $_$;

CREATE FUNCTION public.gw_alert_delivery_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
DECLARE body jsonb;a public.operational_alerts;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ALERT_DELIVERY_RETAINED';END IF;
 IF TG_OP='UPDATE' THEN
  IF (NEW.id,NEW.alert_id,NEW.business_key,NEW.occurrence,NEW.payload_text,NEW.payload_hash,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.alert_id,OLD.business_key,OLD.occurrence,OLD.payload_text,OLD.payload_hash,OLD.created_at) OR NEW.attempts<OLD.attempts OR NEW.lease_generation<OLD.lease_generation THEN RAISE EXCEPTION 'ALERT_DELIVERY_IMMUTABLE';END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO a FROM public.operational_alerts WHERE id=NEW.alert_id;
 IF NEW.payload_text IS NULL OR NEW.payload_hash IS DISTINCT FROM encode(sha256(convert_to(NEW.payload_text,'UTF8')),'hex') OR NEW.occurrence<>a.occurrence THEN RAISE EXCEPTION 'ALERT_PAYLOAD_REQUIRED';END IF;
 body:=NEW.payload_text::jsonb;
 IF body IS DISTINCT FROM jsonb_build_object('version',1,'environment',a.environment,'delivery_key',NEW.business_key,'severity',a.severity,'category',a.category,'details',a.safe_details) THEN RAISE EXCEPTION 'ALERT_PAYLOAD_REQUIRED';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_archive_month_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ARCHIVE_EVIDENCE_RETAINED'; END IF;
 IF (NEW.source_table,NEW.month_start,NEW.child_name) IS DISTINCT FROM (OLD.source_table,OLD.month_start,OLD.child_name)
  OR OLD.state IN ('archived','review') OR NOT ((OLD.state='hot' AND NEW.state='hashing') OR (OLD.state='hashing' AND NEW.state IN ('hashing','verifying','review')) OR (OLD.state='verifying' AND NEW.state IN ('verifying','archived','review')))
  OR (OLD.frozen_at IS NOT NULL AND NEW.frozen_at IS DISTINCT FROM OLD.frozen_at)
  OR (OLD.state=NEW.state AND NEW.walk_count<OLD.walk_count) THEN RAISE EXCEPTION 'ARCHIVE_EVIDENCE_RETAINED'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_archive_record_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    SET "TimeZone" TO 'UTC'
    AS $$
DECLARE source_name text; identity_value text; frozen boolean;
BEGIN
 source_name:=TG_ARGV[0];
 IF source_name NOT IN ('ledger_postings','chain_scan_pages','audit_events') OR source_name IS NULL THEN RAISE EXCEPTION 'ARCHIVE_SCOPE_INVALID'; END IF;
 SELECT state<>'hot' INTO frozen FROM public.archive_months WHERE source_table=source_name AND month_start=date_trunc('month',NEW.created_at AT TIME ZONE 'UTC')::date FOR SHARE;
 IF coalesce(frozen,false) THEN RAISE EXCEPTION 'ARCHIVE_MONTH_FROZEN'; END IF;
 IF source_name='chain_scan_pages' THEN identity_value:=NEW.run_id::text||':'||NEW.revision::text; ELSE identity_value:=NEW.id::text; END IF;
 INSERT INTO public.archive_record_keys(source_table,record_key,created_at) VALUES(source_name,identity_value,NEW.created_at);
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_asset_balance(target uuid, purposes text[]) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE value numeric;
BEGIN
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' OR NOT EXISTS(SELECT 1 FROM public.assets WHERE id=target AND environment=current_setting('gw.environment',true)) THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 IF public.gw_counter_ready() THEN SELECT coalesce(sum(balance),0) INTO value FROM public.ledger_asset_totals WHERE asset_id=target AND purpose=ANY(purposes);
 ELSE SELECT coalesce(sum(CASE WHEN p.direction='credit' THEN p.amount_base_units ELSE -p.amount_base_units END),0) INTO value FROM public.ledger_accounts a JOIN public.ledger_postings p ON p.account_id=a.id WHERE a.asset_id=target AND a.purpose=ANY(purposes);END IF;
 RETURN value;
END $$;

CREATE FUNCTION public.gw_attempt_lineage_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE previous public.signed_attempts;
BEGIN
 IF TG_OP='UPDATE' AND OLD.status IN ('confirmed','failed','expired') AND (NEW.status,NEW.actual_native_fee,NEW.confirmed_at) IS DISTINCT FROM (OLD.status,OLD.actual_native_fee,OLD.confirmed_at) THEN RAISE EXCEPTION 'ATTEMPT_OUTCOME_IMMUTABLE';END IF;
 IF TG_OP='INSERT' AND NEW.previous_attempt_id IS NOT NULL THEN
  SELECT * INTO previous FROM public.signed_attempts WHERE id=NEW.previous_attempt_id;
  IF previous.obligation_id<>NEW.obligation_id OR previous.environment<>NEW.environment OR previous.chain<>NEW.chain OR previous.configuration_hash<>NEW.configuration_hash OR previous.attempt+1<>NEW.attempt THEN RAISE EXCEPTION 'ATTEMPT_LINEAGE_INVALID';END IF;
  IF NEW.chain IN ('eth','bnb') AND previous.nonce IS DISTINCT FROM NEW.nonce THEN RAISE EXCEPTION 'REPLACEMENT_NONCE_CHANGED';END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_bot_history_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF current_setting('gw.operational_retention_hold',true)='true' OR (TG_TABLE_NAME='abuse_signals' AND OLD.created_at>clock_timestamp()-interval '7 days') OR (TG_TABLE_NAME<>'abuse_signals' AND OLD.expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'BOT_HISTORY_RETAINED';END IF;RETURN OLD;
 END IF;
 IF TG_TABLE_NAME<>'bot_challenges' OR (to_jsonb(NEW)-'consumed_at') IS DISTINCT FROM (to_jsonb(OLD)-'consumed_at') OR OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL OR NEW.consumed_at>clock_timestamp() OR OLD.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'BOT_CHALLENGE_IMMUTABLE';END IF;RETURN NEW;
END $$;

CREATE FUNCTION public.gw_cancelled_withdrawal_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
  IF OLD.status='cancelled' AND ROW(NEW.status,NEW.cancelled_at,NEW.settled_at) IS DISTINCT FROM ROW(OLD.status,OLD.cancelled_at,OLD.settled_at) THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.gw_capture_treasury_address() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE address text;
BEGIN
 IF TG_TABLE_NAME='crypto_invoices' THEN address:=NEW.treasury;
 ELSIF TG_TABLE_NAME IN ('crypto_obligations','chain_checkpoints') THEN address:=NEW.treasury_sender;
 ELSE address:=NEW.destination; END IF;
 IF address IS NOT NULL AND EXISTS(SELECT 1 FROM public.assets a WHERE a.id=NEW.asset_id AND a.environment IN ('testnet','mainnet')) THEN
  INSERT INTO public.treasury_addresses(asset_id,address) VALUES(NEW.asset_id,address) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_case_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_TABLE_NAME='reports' THEN
  IF (NEW.id,NEW.actor_id,NEW.target_id,NEW.reason_hash,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.actor_id,OLD.target_id,OLD.reason_hash,OLD.created_at) THEN RAISE EXCEPTION 'CASE_HISTORY_INVALID';END IF;
 ELSE
  IF (NEW.id,NEW.report_id,NEW.actor_id,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.report_id,OLD.actor_id,OLD.created_at) THEN RAISE EXCEPTION 'CASE_HISTORY_INVALID';END IF;
 END IF;
 IF NEW.body IS DISTINCT FROM OLD.body AND NEW.body<>'[redacted]' THEN RAISE EXCEPTION 'CASE_HISTORY_INVALID';END IF;
 IF NEW.revision<OLD.revision THEN RAISE EXCEPTION 'CASE_REVISION_INVALID';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_chain_fee_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
DECLARE a public.assets;j public.ledger_journals;cost numeric;journal uuid;target_purpose text;component text;total integer;valid integer;
BEGIN
 SELECT * INTO a FROM public.assets WHERE id=NEW.native_asset_id;
 IF a.environment IS DISTINCT FROM NEW.environment OR a.environment NOT IN ('testnet','mainnet') OR a.chain_id<>NEW.network OR a.symbol<>(CASE NEW.chain WHEN 'eth' THEN 'ETH' WHEN 'bnb' THEN 'BNB' WHEN 'sol' THEN 'SOL' WHEN 'tron' THEN 'TRX' END) THEN RAISE EXCEPTION 'CHAIN_FEE_ASSET_INVALID';END IF;
 FOR component,cost,journal,target_purpose IN SELECT * FROM (VALUES
  ('network',NEW.network_fee_base_units,NEW.gas_journal_id,'network_fee_expense'),
  ('setup',NEW.account_setup_base_units,NEW.setup_journal_id,'recipient_account_setup_expense')) v LOOP
  IF cost=0 THEN IF journal IS NOT NULL THEN RAISE EXCEPTION 'CHAIN_FEE_JOURNAL_INVALID';END IF;CONTINUE;END IF;
  SELECT * INTO j FROM public.ledger_journals WHERE id=journal;
  SELECT count(*),count(*) FILTER(WHERE ac.asset_id=NEW.native_asset_id AND ac.owner_id IS NULL AND p.amount_base_units=cost AND ((ac.owner_type='system' AND ac.purpose='treasury_asset' AND p.direction='credit') OR (ac.owner_type='platform' AND ac.purpose=target_purpose AND p.direction='debit')))
   INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts ac ON ac.id=p.account_id WHERE p.journal_id=journal;
  IF total<>2 OR valid<>2 OR j.id IS NULL THEN RAISE EXCEPTION 'CHAIN_FEE_JOURNAL_INVALID';END IF;
  IF j.business_key='chain-fee:'||NEW.environment||':'||NEW.chain||':'||NEW.network||':'||NEW.tx_hash||':'||component THEN
   IF j.metadata->>'tx_hash' IS DISTINCT FROM NEW.tx_hash OR j.metadata->>'network' IS DISTINCT FROM NEW.network OR j.metadata->>'chain' IS DISTINCT FROM NEW.chain THEN RAISE EXCEPTION 'CHAIN_FEE_JOURNAL_INVALID';END IF;
  ELSIF j.business_key=(CASE component WHEN 'network' THEN 'gas:'||NEW.environment||':'||NEW.chain||':'||NEW.tx_hash ELSE 'account-setup:'||NEW.chain||':'||NEW.tx_hash END) THEN
   NULL; -- Retained legacy key; exact native-asset postings checked above.
  ELSIF NOT EXISTS(SELECT 1 FROM public.recovery_outflow_resolutions r WHERE r.native_asset_id=NEW.native_asset_id AND r.tx_hash=NEW.tx_hash AND (CASE component WHEN 'network' THEN r.gas_journal_id ELSE r.setup_journal_id END)=journal) THEN
   RAISE EXCEPTION 'CHAIN_FEE_JOURNAL_INVALID';
  END IF;
 END LOOP;
 RETURN NULL;
END $$;

CREATE FUNCTION public.gw_check_treasury_sweep(target uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $_$
DECLARE o public.crypto_obligations;j public.ledger_journals;component text;expected_type text;p1 text;p2 text;owner1 text;owner2 text;d1 text;d2 text;total integer;valid integer;held boolean:=false;settled boolean:=false;moved boolean:=false;released boolean:=false;attempts integer;proof jsonb;
BEGIN
 SELECT * INTO o FROM public.crypto_obligations WHERE id=target;IF NOT FOUND OR o.kind<>'sweep' THEN RETURN;END IF;
 IF o.user_id IS NOT NULL OR o.environment NOT IN ('testnet','mainnet') OR o.source_purpose<>'treasury_sweep_clearing' OR o.gross_base_units<>o.net_base_units OR o.charge_base_units<>0 OR coalesce(o.fee_snapshot->>'nativeFloor','')!~'^(0|[1-9][0-9]{0,77})$' THEN RAISE EXCEPTION 'SWEEP_INTENT_INVALID';END IF;
 FOREACH component IN ARRAY ARRAY['hold','settle','move','release'] LOOP
  SELECT * INTO j FROM public.ledger_journals WHERE business_key=CASE WHEN component='settle' THEN 'crypto-settle:'||o.id ELSE 'treasury-sweep-'||component||':'||o.id END;
  IF NOT FOUND THEN CONTINUE;END IF;
  IF component='hold' THEN held:=true;expected_type:='TREASURY_SWEEP_HOLD';p1:='treasury_sweep_clearing';owner1:='system';d1:='debit';p2:='held_payable';owner2:='platform';d2:='credit';
  ELSIF component='settle' THEN settled:=true;expected_type:='TREASURY_SWEEP_SETTLE';p1:='held_payable';owner1:='platform';d1:='debit';p2:='treasury_asset';owner2:='system';d2:='credit';
  ELSIF component='move' THEN moved:=true;expected_type:='TREASURY_SWEEP_MOVE';p1:='reserve_treasury_asset';owner1:='system';d1:='debit';p2:='treasury_sweep_clearing';owner2:='system';d2:='credit';
  ELSE released:=true;expected_type:='TREASURY_SWEEP_RELEASE';p1:='held_payable';owner1:='platform';d1:='debit';p2:='treasury_sweep_clearing';owner2:='system';d2:='credit';END IF;
  SELECT count(*),count(*) FILTER(WHERE a.asset_id=o.asset_id AND a.owner_id IS NULL AND p.amount_base_units=o.gross_base_units AND ((a.purpose=p1 AND a.owner_type=owner1 AND p.direction=d1) OR (a.purpose=p2 AND a.owner_type=owner2 AND p.direction=d2))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
  IF j.ledger_type<>expected_type OR j.metadata->>'obligation_id' IS DISTINCT FROM o.id::text OR total<>2 OR valid<>2 THEN RAISE EXCEPTION 'SWEEP_JOURNAL_MISMATCH';END IF;
 END LOOP;
 SELECT count(*) INTO attempts FROM public.signed_attempts WHERE obligation_id=o.id;
 IF o.status='quoted' THEN IF held OR settled OR moved OR released THEN RAISE EXCEPTION 'SWEEP_STATE_INVALID';END IF;
 ELSIF o.status='cancelled' THEN IF attempts<>0 OR settled OR moved OR held<>released THEN RAISE EXCEPTION 'SWEEP_STATE_INVALID';END IF;
 ELSIF o.status='settled' THEN IF NOT held OR NOT settled OR NOT moved OR released OR o.completed_at IS NULL THEN RAISE EXCEPTION 'SWEEP_STATE_INVALID';END IF;
 ELSIF o.status='exception' AND o.completed_at IS NOT NULL THEN
  SELECT result->'attempts' INTO proof FROM public.operation_keys WHERE business_key='treasury-sweep-recovery:'||o.id;
  IF NOT held OR NOT released OR settled OR moved OR jsonb_typeof(proof) IS DISTINCT FROM 'array' OR jsonb_array_length(proof)<>attempts OR EXISTS(SELECT 1 FROM public.signed_attempts a WHERE a.obligation_id=o.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(proof) e WHERE e->>'id'=a.id::text AND e->>'state' IN ('failed','expired','superseded') AND e->>'hash'~'^[0-9a-f]{64}$')) THEN RAISE EXCEPTION 'SWEEP_RECOVERY_UNPROVEN';END IF;
 ELSE IF NOT held OR settled OR moved OR released THEN RAISE EXCEPTION 'SWEEP_STATE_INVALID';END IF;END IF;
END $_$;

CREATE FUNCTION public.gw_check_user_payable() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE a public.ledger_accounts;net numeric;BEGIN SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='user' AND a.purpose IN ('available_payable','held_payable','refund_payable','incoming_payable') THEN
  net:=public.gw_counter_account_total(a.id);IF net<0 THEN RAISE EXCEPTION 'USER_PAYABLE_NEGATIVE';END IF;
 END IF;RETURN NULL;
END $$;

CREATE FUNCTION public.gw_counter_account_total(target uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE value numeric;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.ledger_accounts WHERE id=target) THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;
 IF public.gw_counter_ready() THEN
  SELECT balance INTO value FROM public.ledger_account_totals WHERE account_id=target;
  IF NOT FOUND THEN
   IF EXISTS(SELECT 1 FROM public.ledger_postings WHERE account_id=target) THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;
   RETURN 0;
  END IF;
 ELSE
  SELECT coalesce(sum(CASE WHEN direction='credit' THEN amount_base_units ELSE -amount_base_units END),0) INTO value FROM public.ledger_postings WHERE account_id=target;
 END IF;
 RETURN value;
END $$;

CREATE FUNCTION public.gw_counter_advance(batch_size integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE state public.ledger_counter_state;ids uuid[];fresh uuid[];last_id uuid;target uuid;removed integer:=0;more boolean;
BEGIN
 IF public.gw_runtime_environment_allowed() IS NOT TRUE THEN RAISE EXCEPTION 'FINANCIAL_ENVIRONMENT_DENIED'; END IF;
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' OR coalesce(current_setting('gw.environment',true),'') NOT IN('simulation','testnet','mainnet') OR batch_size IS NULL OR batch_size NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 SELECT * INTO state FROM public.ledger_counter_state WHERE id='global' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;
 IF state.reason_code IS NOT NULL THEN RETURN jsonb_build_object('state','review','reason',state.reason_code,'more_possible',false);END IF;
 IF NOT state.postings_complete THEN
  SELECT coalesce(array_agg(id ORDER BY id),'{}'::uuid[]) INTO ids FROM (SELECT id FROM public.ledger_postings WHERE (state.posting_cursor IS NULL OR id>state.posting_cursor) AND id<=state.posting_ceiling ORDER BY id LIMIT batch_size) page;
  IF cardinality(ids)=0 THEN UPDATE public.ledger_counter_state SET postings_complete=true WHERE id='global';
  ELSE
   WITH inserted AS (INSERT INTO public.ledger_counter_markers(posting_id) SELECT unnest(ids) ON CONFLICT DO NOTHING RETURNING posting_id) SELECT coalesce(array_agg(posting_id),'{}'::uuid[]) INTO fresh FROM inserted;
   PERFORM public.gw_counter_apply_postings(fresh);
   UPDATE public.ledger_counter_state SET posting_cursor=ids[cardinality(ids)] WHERE id='global';
  END IF;
 ELSIF NOT state.journals_complete THEN
  SELECT coalesce(array_agg(id ORDER BY id),'{}'::uuid[]) INTO ids FROM (SELECT id FROM public.ledger_journals WHERE (state.journal_cursor IS NULL OR id>state.journal_cursor) AND id<=state.journal_ceiling ORDER BY id LIMIT batch_size) page;
  IF cardinality(ids)=0 THEN UPDATE public.ledger_counter_state SET journals_complete=true WHERE id='global';
  ELSE FOR target IN SELECT unnest(ids) LOOP PERFORM public.gw_counter_refresh_journal(target);END LOOP;
   UPDATE public.ledger_counter_state SET journal_cursor=ids[cardinality(ids)] WHERE id='global';
  END IF;
 END IF;
 SELECT * INTO state FROM public.ledger_counter_state WHERE id='global';
 IF state.postings_complete AND state.journals_complete AND NOT state.complete THEN
  IF EXISTS(SELECT 1 FROM public.ledger_journal_audits WHERE NOT valid) THEN UPDATE public.ledger_counter_state SET reason_code='LEDGER_SOURCE_INVALID' WHERE id='global';
  ELSE UPDATE public.ledger_counter_state SET complete=true,sealed_at=clock_timestamp() WHERE id='global';END IF;
 END IF;
 SELECT * INTO state FROM public.ledger_counter_state WHERE id='global';
 IF state.complete THEN
  WITH picked AS (SELECT posting_id FROM public.ledger_counter_markers ORDER BY posting_id LIMIT batch_size),deleted AS (DELETE FROM public.ledger_counter_markers m USING picked p WHERE m.posting_id=p.posting_id RETURNING m.posting_id) SELECT count(*)::int INTO removed FROM deleted;
 END IF;
 more:=state.reason_code IS NULL AND (NOT state.complete OR EXISTS(SELECT 1 FROM public.ledger_counter_markers));
 RETURN jsonb_build_object('state',CASE WHEN state.reason_code IS NOT NULL THEN 'review' WHEN state.complete THEN 'sealed' ELSE 'backfilling' END,'more_possible',more,'markers_deleted',removed);
END $$;

CREATE FUNCTION public.gw_counter_apply_postings(targets uuid[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $_$
DECLARE row record;
BEGIN
 -- Asset/purpose, account and bucket updates each use a deterministic order.
 FOR row IN SELECT a.asset_id,a.purpose,coalesce(sum(p.amount_base_units) FILTER(WHERE p.direction='credit'),0) AS credits,
  coalesce(sum(p.amount_base_units) FILTER(WHERE p.direction='debit'),0) AS debits
  FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.id=ANY(targets)
  GROUP BY a.asset_id,a.purpose ORDER BY a.asset_id,a.purpose LOOP
  INSERT INTO public.ledger_asset_totals(asset_id,purpose,credits,debits,balance) VALUES(row.asset_id,row.purpose,row.credits,row.debits,row.credits-row.debits)
  ON CONFLICT(asset_id,purpose) DO UPDATE SET credits=ledger_asset_totals.credits+excluded.credits,debits=ledger_asset_totals.debits+excluded.debits,balance=ledger_asset_totals.balance+excluded.balance;
 END LOOP;
 FOR row IN SELECT a.id,a.asset_id,a.owner_type,a.owner_id,a.purpose,coalesce(sum(p.amount_base_units) FILTER(WHERE p.direction='credit'),0) AS credits,
  coalesce(sum(p.amount_base_units) FILTER(WHERE p.direction='debit'),0) AS debits
  FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.id=ANY(targets)
  GROUP BY a.id,a.asset_id,a.owner_type,a.owner_id,a.purpose ORDER BY a.id LOOP
  INSERT INTO public.ledger_account_totals(account_id,asset_id,owner_type,owner_id,purpose,credits,debits,balance)
  VALUES(row.id,row.asset_id,row.owner_type,row.owner_id,row.purpose,row.credits,row.debits,row.credits-row.debits)
  ON CONFLICT(account_id) DO UPDATE SET credits=ledger_account_totals.credits+excluded.credits,debits=ledger_account_totals.debits+excluded.debits,balance=ledger_account_totals.balance+excluded.balance,updated_at=clock_timestamp();
 END LOOP;
 FOR row IN WITH posted AS (
  SELECT p.*,a.asset_id,a.owner_id,a.owner_type,a.purpose,j.ledger_type,o.kind
  FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id JOIN public.ledger_journals j ON j.id=p.journal_id
  LEFT JOIN public.crypto_obligations o ON o.id=CASE WHEN j.metadata->>'obligation_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.metadata->>'obligation_id')::uuid END AND o.asset_id=a.asset_id AND o.user_id=a.owner_id
  WHERE p.id=ANY(targets) AND a.owner_type='user' AND a.purpose='held_payable'
 ), buckets AS (
  SELECT account_id,'settled_payout_net'::text AS label,CASE WHEN direction='debit' THEN amount_base_units ELSE -amount_base_units END AS amount FROM posted WHERE ledger_type='PAYOUT_SETTLE'
  UNION ALL SELECT account_id,'refund_held',CASE WHEN direction='credit' THEN amount_base_units ELSE -amount_base_units END FROM posted WHERE kind IN('refund','unallocated_refund')
 ) SELECT account_id,label,sum(amount) AS amount FROM buckets GROUP BY account_id,label ORDER BY account_id,label LOOP
  INSERT INTO public.ledger_account_buckets(account_id,label,amount) VALUES(row.account_id,row.label,row.amount)
  ON CONFLICT(account_id,label) DO UPDATE SET amount=ledger_account_buckets.amount+excluded.amount;
 END LOOP;
END $_$;

CREATE FUNCTION public.gw_counter_new_journal() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN PERFORM public.gw_counter_refresh_journal(NEW.id);RETURN NEW;END $$;

CREATE FUNCTION public.gw_counter_new_postings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE ready boolean;ids uuid[];target uuid;
BEGIN
 SELECT complete INTO ready FROM public.ledger_counter_state WHERE id='global' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;
 SELECT coalesce(array_agg(id ORDER BY id),'{}'::uuid[]) INTO ids FROM counter_posting_rows;
 IF cardinality(ids)=0 THEN RETURN NULL;END IF;
 IF NOT ready THEN INSERT INTO public.ledger_counter_markers(posting_id) SELECT unnest(ids);END IF;
 PERFORM public.gw_counter_apply_postings(ids);
 FOR target IN SELECT DISTINCT journal_id FROM counter_posting_rows ORDER BY journal_id LOOP PERFORM public.gw_counter_refresh_journal(target);END LOOP;
 RETURN NULL;
END $$;

CREATE FUNCTION public.gw_counter_ready() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE state public.ledger_counter_state;
BEGIN
 SELECT * INTO state FROM public.ledger_counter_state WHERE id='global';
 IF NOT FOUND OR state.reason_code IS NOT NULL THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;
 RETURN state.complete;
END $$;

CREATE FUNCTION public.gw_counter_refresh_journal(target uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE debit numeric;credit numeric;lines bigint;ids uuid[];proof text;
BEGIN
 SELECT coalesce(sum(p.amount_base_units) FILTER(WHERE p.direction='debit'),0),coalesce(sum(p.amount_base_units) FILTER(WHERE p.direction='credit'),0),count(*),
  coalesce(array_agg(DISTINCT a.asset_id ORDER BY a.asset_id),'{}'::uuid[]),
  encode(sha256(convert_to(coalesce(string_agg(p.id::text||':'||p.account_id::text||':'||p.direction||':'||p.amount_base_units::text,E'\n' ORDER BY p.id),''),'UTF8')),'hex')
 INTO debit,credit,lines,ids,proof FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=target;
 INSERT INTO public.ledger_journal_audits(journal_id,debit_total,credit_total,line_count,asset_ids,valid,proof_hash)
 VALUES(target,debit,credit,lines,ids,debit>0 AND debit=credit AND lines>=2 AND cardinality(ids)=1,proof)
 ON CONFLICT(journal_id) DO UPDATE SET debit_total=excluded.debit_total,credit_total=excluded.credit_total,line_count=excluded.line_count,asset_ids=excluded.asset_ids,valid=excluded.valid,proof_hash=excluded.proof_hash,checked_at=clock_timestamp();
END $$;

CREATE FUNCTION public.gw_create_archive_month(source_name text, month_value date, maximum_transfer integer DEFAULT 10000) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    SET "TimeZone" TO 'UTC'
    AS $_$
DECLARE child text; prefix text; existing regclass; ending date; default_child text; waiting integer; difference boolean;
BEGIN
 prefix:=CASE source_name WHEN 'ledger_postings' THEN 'lp' WHEN 'chain_scan_pages' THEN 'cs' WHEN 'audit_events' THEN 'au' END;
 IF prefix IS NULL OR month_value IS NULL OR extract(day FROM month_value)<>1 OR extract(year FROM month_value) NOT BETWEEN 2000 AND 9999 OR maximum_transfer IS NULL OR maximum_transfer NOT BETWEEN 1 AND 1000000 THEN RAISE EXCEPTION 'ARCHIVE_SCOPE_INVALID'; END IF;
 ending:=(month_value+interval '1 month')::date;
 child:='gw_part_'||prefix||'_'||to_char(month_value,'YYYYMM');
 default_child:='gw_part_'||prefix||'_default';
 existing:=to_regclass(format('public.%I',child));
 IF existing IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM pg_inherits WHERE inhrelid=existing AND inhparent=to_regclass(format('public.%I',source_name))) THEN RAISE EXCEPTION 'ARCHIVE_SCHEMA_CONFLICT'; END IF;
 ELSE
  EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE','public',source_name);
  IF to_regclass(format('public.%I',default_child)) IS NOT NULL THEN
   EXECUTE format('SELECT count(*)::integer FROM (SELECT 1 FROM %I.%I WHERE created_at>=$1 AND created_at<$2 LIMIT $3) bounded','public',default_child) INTO waiting USING month_value::timestamptz,ending::timestamptz,maximum_transfer+1;
  ELSE waiting:=0; END IF;
  IF waiting>maximum_transfer THEN RAISE EXCEPTION 'ARCHIVE_DEFAULT_BACKLOG_REVIEW'; END IF;
  IF waiting=0 THEN
   EXECUTE format('CREATE TABLE %I.%I PARTITION OF %I.%I FOR VALUES FROM (%L) TO (%L)','public',child,'public',source_name,month_value::timestamptz,ending::timestamptz);
  ELSE
   -- Standalone copy has no parent triggers yet: no counter replay or new keys.
   EXECUTE format('CREATE TABLE %I.%I (LIKE %I.%I INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING STORAGE INCLUDING CONSTRAINTS INCLUDING INDEXES)','public',child,'public',source_name);
   EXECUTE format('INSERT INTO %I.%I SELECT * FROM %I.%I WHERE created_at>=$1 AND created_at<$2','public',child,'public',default_child) USING month_value::timestamptz,ending::timestamptz;
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM ((SELECT * FROM %I.%I WHERE created_at>=$1 AND created_at<$2 EXCEPT ALL TABLE %I.%I) UNION ALL (TABLE %I.%I EXCEPT ALL SELECT * FROM %I.%I WHERE created_at>=$1 AND created_at<$2)) delta LIMIT 1)','public',default_child,'public',child,'public',child,'public',default_child) INTO difference USING month_value::timestamptz,ending::timestamptz;
   IF difference THEN RAISE EXCEPTION 'ARCHIVE_COPY_MISMATCH'; END IF;
   PERFORM set_config('gw.partition_transfer',source_name,true);
   EXECUTE format('DELETE FROM %I.%I WHERE created_at>=$1 AND created_at<$2','public',default_child) USING month_value::timestamptz,ending::timestamptz;
   PERFORM set_config('gw.partition_transfer','',true);
   EXECUTE format('ALTER TABLE %I.%I ATTACH PARTITION %I.%I FOR VALUES FROM (%L) TO (%L)','public',source_name,'public',child,month_value::timestamptz,ending::timestamptz);
  END IF;
  PERFORM public.gw_partition_private_acl(to_regclass(format('public.%I',child)));
 END IF;
 INSERT INTO public.archive_months(source_table,month_start,child_name) VALUES(source_name,month_value,child) ON CONFLICT(source_table,month_start) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.archive_months WHERE source_table=source_name AND month_start=month_value AND child_name=child) THEN RAISE EXCEPTION 'ARCHIVE_SCHEMA_CONFLICT'; END IF;
END $_$;

CREATE FUNCTION public.gw_database_binding() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
DECLARE identity uuid;
BEGIN
 SELECT nonce INTO identity FROM public.database_binding_nonce WHERE singleton;
 IF identity IS NULL THEN
  INSERT INTO public.database_binding_nonce(singleton) VALUES(true) ON CONFLICT DO NOTHING;
  SELECT nonce INTO identity FROM public.database_binding_nonce WHERE singleton;
 END IF;
 RETURN identity::text||':'||current_database()||':'||(SELECT oid::text FROM pg_database WHERE datname=current_database());
END $$;

CREATE FUNCTION public.gw_expire_profile_previews(maximum integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE amount integer;
BEGIN
 IF maximum IS NULL OR maximum NOT BETWEEN 1 AND 100 OR current_setting('gw.access',true) IS DISTINCT FROM 'service' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF current_setting('gw.operational_retention_hold',true)='true' THEN RETURN 0; END IF;
 WITH candidates AS(SELECT id FROM public.profile_previews WHERE committed_at IS NULL AND expires_at<clock_timestamp() ORDER BY expires_at,id LIMIT maximum FOR UPDATE SKIP LOCKED)
 DELETE FROM public.profile_previews p USING candidates c WHERE p.id=c.id;
 GET DIAGNOSTICS amount=ROW_COUNT;RETURN amount;
END $$;

CREATE FUNCTION public.gw_expired_identity_delete_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
BEGIN
 IF TG_TABLE_NAME='auth_flows' THEN
  IF OLD.expires_at>=clock_timestamp()-interval '60 seconds' THEN RAISE EXCEPTION 'ACTIVE_IDENTITY_RECORD_RETAINED';END IF;
 ELSIF TG_TABLE_NAME='rate_limits' THEN
  IF OLD.expires_at>=clock_timestamp()-OLD.window_seconds*interval '1 second' THEN RAISE EXCEPTION 'ACTIVE_IDENTITY_RECORD_RETAINED';END IF;
 ELSE RAISE EXCEPTION 'IDENTITY_CLEANUP_SCOPE_DENIED';
 END IF;
 RETURN OLD;
END $$;

CREATE FUNCTION public.gw_export_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_TABLE_NAME='export_chunks' THEN
  IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'EXPORT_CHUNK_IMMUTABLE';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.data_exports e JOIN public.users u ON u.id=e.user_id WHERE e.id=OLD.export_id AND (e.expires_at<=clock_timestamp() OR u.status='deleted')) THEN RAISE EXCEPTION 'EXPORT_NOT_EXPIRED';END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'EXPORT_REQUEST_RETAINED';END IF;
 IF (NEW.id,NEW.user_id,NEW.created_at,NEW.expires_at) IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.created_at,OLD.expires_at) OR NEW.page<OLD.page OR NEW.section<OLD.section OR NEW.total_bytes<OLD.total_bytes THEN RAISE EXCEPTION 'EXPORT_HISTORY_INVALID';END IF;
 IF OLD.status<>'building' AND NEW.status<>OLD.status AND NOT (OLD.status IN ('ready','failed') AND NEW.status='expired') THEN RAISE EXCEPTION 'EXPORT_STATE_INVALID';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_failed_closure_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
 IF OLD.completed_at IS NOT NULL AND (NEW.status,NEW.completed_at) IS DISTINCT FROM (OLD.status,OLD.completed_at) THEN RAISE EXCEPTION 'COMPLETED_OBLIGATION_IMMUTABLE';END IF;
 IF NEW.kind NOT IN ('sweep','business','refund','unallocated_refund') AND NEW.status='exception' AND NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
  IF OLD.status<>'exception' OR NOT EXISTS(SELECT 1 FROM public.gw_signed_attempt_status WHERE obligation_id=NEW.id AND status IN ('failed','expired')) OR EXISTS(SELECT 1 FROM public.gw_signed_attempt_status WHERE obligation_id=NEW.id AND status NOT IN ('failed','superseded','expired')) OR NOT EXISTS(SELECT 1 FROM public.operation_keys WHERE business_key='crypto-failed-close:'||NEW.id::text AND result->>'obligation_id'=NEW.id::text AND result->>'status'='failed_closed') THEN RAISE EXCEPTION 'FAILED_CLOSURE_PROOF_REQUIRED';END IF;
 END IF;
 IF TG_OP='INSERT' AND NEW.previous_obligation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.crypto_obligations p WHERE p.id=NEW.previous_obligation_id AND p.user_id IS NOT DISTINCT FROM NEW.user_id AND p.asset_id=NEW.asset_id AND p.kind=NEW.kind AND p.source_purpose=NEW.source_purpose AND (p.status='cancelled' OR p.status='exception' AND p.completed_at IS NOT NULL)) THEN RAISE EXCEPTION 'PREVIOUS_OBLIGATION_NOT_CLOSED';END IF;RETURN NEW;
END $$;

CREATE FUNCTION public.gw_financial_adapter_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE ignored text[];
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_RETAINED';END IF;
 IF TG_TABLE_NAME IN ('crypto_invoices','crypto_submissions','crypto_events') THEN
  IF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN RAISE EXCEPTION 'INVOICE_SNAPSHOT_IMMUTABLE';END IF;
 ELSIF TG_TABLE_NAME='crypto_obligations' THEN
  ignored:=ARRAY['status','approved_at','completed_at'];
  IF OLD.treasury_sender IS NULL AND NEW.treasury_sender IS NOT NULL THEN
   IF encode(pg_catalog.sha256(pg_catalog.convert_to(NEW.environment||'|'||NEW.chain||'|'||(NEW.registry_snapshot->>'network')||'|'||NEW.treasury_sender,'UTF8')),'hex')<>NEW.treasury_fingerprint THEN RAISE EXCEPTION 'TREASURY_SENDER_MISMATCH';END IF;
   ignored:=array_append(ignored,'treasury_sender');
  END IF;
  IF (to_jsonb(NEW)-ignored) IS DISTINCT FROM (to_jsonb(OLD)-ignored) THEN RAISE EXCEPTION 'OBLIGATION_SNAPSHOT_IMMUTABLE';END IF;
 ELSIF TG_TABLE_NAME='signed_attempts' THEN
  ignored:=ARRAY['status','actual_native_fee','broadcast_at','confirmed_at'];
  IF current_user='gw_signer' AND OLD.expires_at IS NULL AND NEW.expires_at IS NOT NULL THEN ignored:=array_append(ignored,'expires_at');END IF;
  IF (to_jsonb(NEW)-ignored) IS DISTINCT FROM (to_jsonb(OLD)-ignored) THEN RAISE EXCEPTION 'SIGNED_ATTEMPT_IMMUTABLE';END IF;
 ELSE RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_financial_ephemeral_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.expires_at>clock_timestamp() OR current_setting('gw.operational_retention_hold',true)='true' THEN RAISE EXCEPTION 'FINANCIAL_EPHEMERAL_RETAINED';END IF;
  RETURN OLD;
 END IF;
 IF TG_TABLE_NAME='worker_requests' OR (to_jsonb(NEW)-'used_at') IS DISTINCT FROM (to_jsonb(OLD)-'used_at') OR OLD.used_at IS NOT NULL OR NEW.used_at IS NULL OR NEW.used_at>clock_timestamp() OR OLD.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'FINANCIAL_EPHEMERAL_IMMUTABLE';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_financial_state_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
 IF TG_TABLE_NAME='crypto_obligations' THEN
  IF OLD.status<>NEW.status AND NOT (
   OLD.status='quoted' AND NEW.status IN ('held','approved','cancelled') OR
   OLD.status='held' AND NEW.status IN ('approved','cancelled') OR
   OLD.status='approved' AND NEW.status IN ('signing','cancelled','awaiting_requote','exception') OR
   OLD.status='signing' AND NEW.status IN ('broadcast','settled','exception','awaiting_requote') OR
   OLD.status='broadcast' AND NEW.status IN ('settled','exception') OR
   OLD.status='awaiting_requote' AND NEW.status IN ('cancelled','exception') OR
   OLD.status='exception' AND NEW.status='settled'
  ) THEN RAISE EXCEPTION 'OBLIGATION_TRANSITION_DENIED';END IF;
  IF NEW.status='cancelled' AND EXISTS(SELECT 1 FROM public.signed_attempts WHERE obligation_id=OLD.id) THEN RAISE EXCEPTION 'SIGNED_HOLD_RELEASE_DENIED';END IF;
 ELSIF TG_TABLE_NAME='signed_attempts' THEN
  IF OLD.status<>NEW.status AND NOT (OLD.status IN ('signed','broadcast') AND NEW.status IN ('broadcast','confirmed','failed','superseded','expired')) THEN RAISE EXCEPTION 'SIGNED_ATTEMPT_TRANSITION_DENIED';END IF;
  IF NEW.status='expired' AND (NEW.chain NOT IN ('sol','tron') OR NEW.actual_native_fee<>0 OR NOT EXISTS(SELECT 1 FROM public.operation_keys WHERE business_key='crypto-expiry:'||NEW.id::text AND result->>'status'='expiry_verified')) THEN RAISE EXCEPTION 'EXPIRY_PROOF_REQUIRED';END IF;
  IF NEW.status='superseded' AND (NEW.chain NOT IN ('eth','bnb') OR NEW.actual_native_fee<>0 OR NOT EXISTS(SELECT 1 FROM public.signed_attempts winner WHERE winner.obligation_id=NEW.obligation_id AND winner.id<>NEW.id AND winner.nonce=NEW.nonce AND winner.status IN ('confirmed','failed'))) THEN RAISE EXCEPTION 'NONCE_WINNER_REQUIRED';END IF;
  IF OLD.status IN ('confirmed','failed','expired','superseded') AND (NEW.status,NEW.actual_native_fee,NEW.confirmed_at) IS DISTINCT FROM (OLD.status,OLD.actual_native_fee,OLD.confirmed_at) THEN RAISE EXCEPTION 'ATTEMPT_OUTCOME_IMMUTABLE';END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_frozen_spend_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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

CREATE FUNCTION public.gw_giv_withdrawal_integrity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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

CREATE FUNCTION public.gw_giv_withdrawal_leg_valid(journal_id uuid, beneficiary uuid, asset uuid, amount numeric, debit_purpose text, credit_purpose text, credit_owner text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $_$
  SELECT (SELECT count(*) FROM public.ledger_postings WHERE journal_id=$1)=2
    AND EXISTS (SELECT 1 FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=$1 AND p.direction='debit' AND p.amount_base_units=$4 AND a.owner_type='user' AND a.owner_id=$2 AND a.asset_id=$3 AND a.purpose=$5)
    AND EXISTS (SELECT 1 FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=$1 AND p.direction='credit' AND p.amount_base_units=$4 AND a.owner_type=$7 AND (CASE WHEN $7='user' THEN a.owner_id=$2 ELSE a.owner_id IS NULL END) AND a.asset_id=$3 AND a.purpose=$6)
$_$;

CREATE FUNCTION public.gw_identity_revocation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status OR NEW.role IS DISTINCT FROM OLD.role THEN
  NEW.session_version:=OLD.session_version+1;
  UPDATE public.auth_sessions SET revoked_at=coalesce(revoked_at,clock_timestamp()) WHERE user_id=OLD.id;
 ELSIF NEW.session_version<OLD.session_version THEN RAISE EXCEPTION 'SESSION_VERSION_INVALID';
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_incoming_control_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE item public.gift_invoices%ROWTYPE;
BEGIN
 SELECT * INTO item FROM public.gift_invoices WHERE id=NEW.invoice_id FOR UPDATE;
 IF item.status<>'quoted' OR item.quote_expires_at<=clock_timestamp() OR NOT EXISTS (SELECT 1 FROM public.users WHERE id=NEW.actor_user_id AND role='admin' AND status='active')
  OR (NEW.outcome='reject' AND NEW.actual_base_units<>0) OR (NEW.outcome='under' AND (NEW.actual_base_units<=0 OR NEW.actual_base_units>=item.expected_base_units))
  OR (NEW.outcome='over' AND NEW.actual_base_units<=item.expected_base_units) OR (NEW.outcome IN ('late','delay') AND NEW.actual_base_units<>item.expected_base_units) THEN RAISE EXCEPTION 'INCOMING_CONTROL_INVALID'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_incoming_integrity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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

CREATE TABLE public.gift_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_version_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    environment text DEFAULT 'simulation'::text NOT NULL,
    chain_id text DEFAULT 'giv'::text NOT NULL,
    request_key uuid NOT NULL,
    expected_base_units numeric(78,0) NOT NULL,
    actual_base_units numeric(78,0),
    refundable_base_units numeric(78,0) DEFAULT 0 NOT NULL,
    status text DEFAULT 'quoted'::text NOT NULL,
    quote_expires_at timestamp with time zone NOT NULL,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    profile_revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT gift_invoice_amount_check CHECK (((expected_base_units > (0)::numeric) AND (actual_base_units >= (0)::numeric) AND (refundable_base_units >= (0)::numeric))),
    CONSTRAINT gift_invoice_environment_check CHECK (((environment = 'simulation'::text) AND (chain_id = 'giv'::text))),
    CONSTRAINT gift_invoice_status_check CHECK ((status = ANY (ARRAY['quoted'::text, 'submitted'::text, 'credited'::text, 'exception'::text, 'failed'::text, 'expired'::text]))),
    CONSTRAINT gift_invoices_profile_revision_check CHECK ((profile_revision > 0))
);

CREATE FUNCTION public.gw_incoming_leg_valid(journal uuid, item public.gift_invoices, kind text, amount numeric, from_purpose text, to_purpose text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $_$
 SELECT EXISTS (SELECT 1 FROM public.ledger_journals j WHERE j.id=$1 AND j.ledger_type=$3 AND j.metadata->>'invoice_id'=($2).id::text)
 AND public.gw_giv_withdrawal_leg_valid($1,($2).user_id,($2).asset_id,$4,$5,$6,'user')
$_$;

CREATE FUNCTION public.gw_incoming_refund_integrity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE item public.gift_invoices%ROWTYPE;
BEGIN
 SELECT * INTO item FROM public.gift_invoices WHERE id=NEW.invoice_id;
 IF item.status NOT IN ('credited','exception') OR NEW.amount_base_units<>item.refundable_base_units OR NOT EXISTS (SELECT 1 FROM public.users WHERE id=NEW.actor_user_id AND role='admin' AND status='active')
  OR NOT public.gw_incoming_leg_valid(NEW.journal_id,item,'REFUND_SETTLE',NEW.amount_base_units,'refund_payable','available_payable') THEN RAISE EXCEPTION 'INCOMING_REFUND_INVALID'; END IF;
 RETURN NULL;
END $$;

CREATE FUNCTION public.gw_invoice_profile_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE revision integer;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.profile_revision<>OLD.profile_revision THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;
 ELSE
  PERFORM pg_advisory_xact_lock_shared(hashtextextended('gw-release-profile',0));
  SELECT (value#>>'{}')::integer INTO revision FROM public.x_manifest WHERE key='profile_revision';
  IF NEW.profile_revision IS DISTINCT FROM revision THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_invoice_snapshot_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
 IF ROW(NEW.id,NEW.user_id,NEW.plan_version_id,NEW.asset_id,NEW.environment,NEW.chain_id,NEW.request_key,NEW.expected_base_units,NEW.quote_expires_at,NEW.created_at)
  IS DISTINCT FROM ROW(OLD.id,OLD.user_id,OLD.plan_version_id,OLD.asset_id,OLD.environment,OLD.chain_id,OLD.request_key,OLD.expected_base_units,OLD.quote_expires_at,OLD.created_at)
  OR (OLD.status NOT IN ('quoted','submitted') AND NEW IS DISTINCT FROM OLD)
  OR (OLD.status='submitted' AND (NEW.status IN ('quoted','expired') OR ROW(NEW.actual_base_units,NEW.submitted_at) IS DISTINCT FROM ROW(OLD.actual_base_units,OLD.submitted_at))) THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_invoice_version_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.gift_invoices WHERE plan_version_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
  IF ROW(NEW.id,NEW.plan_id,NEW.asset_id,NEW.version,NEW.amount_base_units,NEW.usd_reference,NEW.receiver_bps,NEW.marketing_bps,NEW.referral_bps,NEW.developer_bps,NEW.reserve_bps,NEW.receipts_required)
   IS DISTINCT FROM ROW(OLD.id,OLD.plan_id,OLD.asset_id,OLD.version,OLD.amount_base_units,OLD.usd_reference,OLD.receiver_bps,OLD.marketing_bps,OLD.referral_bps,OLD.developer_bps,OLD.reserve_bps,OLD.receipts_required) THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;

CREATE FUNCTION public.gw_job_identity_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'DURABLE_WORK_RETAINED'; END IF;

  IF OLD.retired_at IS NULL AND NEW.retired_at IS NOT NULL THEN
   IF NEW.payload<>'{}'::jsonb OR NEW.retired_payload_hash IS DISTINCT FROM encode(sha256(convert_to(OLD.payload::text,'UTF8')),'hex')
    OR OLD.kind NOT IN ('notification','own_export','operational_cleanup','privacy_redaction')
    OR (to_jsonb(NEW)-ARRAY['payload','retired_at','retired_payload_hash']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['payload','retired_at','retired_payload_hash'])
    OR current_setting('gw.operational_retention_hold',true)='true' THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;
   IF TG_TABLE_NAME='jobs' THEN
    IF OLD.status<>'done' OR OLD.completed_at IS NULL OR OLD.completed_at>=clock_timestamp()-((SELECT value->>'job_terminal_days' FROM public.x_manifest WHERE key='retention_policy')::integer)*interval '1 day'
      OR OLD.lease_token IS NOT NULL OR OLD.lease_until IS NOT NULL THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;
   ELSE
    IF OLD.dispatched_at IS NULL OR NOT EXISTS(SELECT 1 FROM public.jobs j WHERE j.outbox_id=OLD.id AND j.status='done' AND j.retired_at IS NOT NULL) THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;
   END IF;
   RETURN NEW;
  END IF;
  IF (NEW.retired_at,NEW.retired_payload_hash) IS DISTINCT FROM (OLD.retired_at,OLD.retired_payload_hash) THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;
  IF OLD.kind='notification' AND OLD.payload->>'title_key'='admin_message' AND OLD.redacted_at IS NULL AND NEW.redacted_at IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=(OLD.payload->>'user_id')::uuid AND u.status='deleted') OR NEW.payload IS DISTINCT FROM jsonb_set(OLD.payload,'{body}','"[redacted]"'::jsonb) OR NEW.redacted_payload_hash IS DISTINCT FROM encode(sha256(convert_to(OLD.payload::text,'UTF8')),'hex') OR (to_jsonb(NEW)-ARRAY['payload','redacted_at','redacted_payload_hash']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['payload','redacted_at','redacted_payload_hash']) THEN RAISE EXCEPTION 'REDACTION_SCOPE_DENIED';END IF;
   RETURN NEW;
  END IF;
  IF (NEW.redacted_at,NEW.redacted_payload_hash) IS DISTINCT FROM (OLD.redacted_at,OLD.redacted_payload_hash) THEN RAISE EXCEPTION 'JOB_IDENTITY_IMMUTABLE';END IF;
  IF NEW.request_id IS DISTINCT FROM OLD.request_id THEN RAISE EXCEPTION 'JOB_IDENTITY_IMMUTABLE';END IF;
  IF TG_TABLE_NAME='outbox' THEN
    IF ROW(NEW.id,NEW.business_key,NEW.environment,NEW.kind,NEW.payload,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.business_key,OLD.environment,OLD.kind,OLD.payload,OLD.created_at)
      OR (OLD.dispatched_at IS NOT NULL AND NEW.dispatched_at IS DISTINCT FROM OLD.dispatched_at) THEN RAISE EXCEPTION 'JOB_IDENTITY_IMMUTABLE'; END IF;
  ELSE
    IF ROW(NEW.id,NEW.outbox_id,NEW.business_key,NEW.environment,NEW.kind,NEW.payload,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.outbox_id,OLD.business_key,OLD.environment,OLD.kind,OLD.payload,OLD.created_at)
      OR NEW.attempts<OLD.attempts OR NEW.lease_generation<OLD.lease_generation OR (OLD.status='done' AND NEW IS DISTINCT FROM OLD) THEN RAISE EXCEPTION 'JOB_IDENTITY_IMMUTABLE'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.gw_job_source_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.outbox o WHERE o.id=NEW.outbox_id AND ROW(o.business_key,o.environment,o.kind,o.payload,date_trunc('milliseconds',o.redacted_at),o.redacted_payload_hash,o.request_id) IS NOT DISTINCT FROM ROW(NEW.business_key,NEW.environment,NEW.kind,NEW.payload,date_trunc('milliseconds',NEW.redacted_at),NEW.redacted_payload_hash,NEW.request_id))
    THEN RAISE EXCEPTION 'JOB_SOURCE_INVALID'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.gw_liability_recovery_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LIABILITY_RECOVERY_RETAINED';END IF;
 IF (to_jsonb(NEW)-ARRAY['signature_hash','confirmation_hash','confirmed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['signature_hash','confirmation_hash','confirmed_at']) OR OLD.confirmed_at IS NOT NULL OR NEW.confirmed_at IS NULL OR NEW.signature_hash IS NULL OR NEW.confirmation_hash IS NULL OR OLD.expires_at<=clock_timestamp() OR NEW.confirmed_at>clock_timestamp() THEN RAISE EXCEPTION 'LIABILITY_RECOVERY_IMMUTABLE';END IF;RETURN NEW;
END $$;

CREATE FUNCTION public.gw_lock_user_payable() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE a public.ledger_accounts;BEGIN SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='user' AND a.purpose IN ('available_payable','held_payable','refund_payable','incoming_payable') THEN PERFORM pg_advisory_xact_lock(hashtextextended('user-payable:'||a.owner_id||':'||a.asset_id,0));END IF;RETURN NEW;
END $$;

CREATE FUNCTION public.gw_maintenance_result_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE id=NEW.source_job_id AND kind='operational_cleanup'
    AND environment=NEW.environment AND payload->>'anchor'=NEW.run_date::text AND (payload->>'page')::integer=NEW.page_number AND status='running'
    AND lease_generation=NEW.lease_generation AND lease_until>clock_timestamp()) THEN
    RAISE EXCEPTION 'MAINTENANCE_RESULT_INVALID';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.gw_native_asset_fence(asset uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE binding text; cutoff numeric; anchor text;
BEGIN
 PERFORM pg_advisory_xact_lock_shared(hashtextextended('financial-policy',0));
 IF EXISTS(SELECT 1 FROM public.crypto_reorg_reviews r LEFT JOIN public.crypto_reorg_resolutions s ON s.review_id=r.id WHERE r.asset_id=asset AND s.review_id IS NULL) THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.chain_checkpoints c WHERE c.asset_id=asset) THEN
   -- Initial single-address operation is unchanged. Rotation without any
   -- recovery checkpoints cannot clear the historical-address inventory.
   RETURN (SELECT count(*)<=1 FROM public.treasury_addresses WHERE asset_id=asset);
 END IF;
 binding:=current_setting('gw.database_binding',true);
 IF binding IS NULL OR length(binding)<>64 THEN RETURN false; END IF;
 SELECT r.through_height,r.scan_progress->'custodyWitness'->>'block_hash' INTO cutoff,anchor
 FROM public.chain_checkpoints c JOIN public.chain_recovery_runs r ON r.checkpoint_id=c.id
 WHERE c.asset_id=asset ORDER BY c.created_at DESC,c.id DESC,r.created_at DESC,r.id DESC LIMIT 1;
 IF cutoff IS NULL OR anchor IS NULL THEN RETURN false; END IF;
 RETURN NOT EXISTS(
   SELECT 1 FROM public.treasury_addresses addresses
   LEFT JOIN LATERAL (SELECT c.* FROM public.chain_checkpoints c WHERE c.asset_id=asset AND c.treasury_sender=addresses.address ORDER BY c.created_at DESC,c.id DESC LIMIT 1) checkpoint ON true
   LEFT JOIN LATERAL (SELECT r.* FROM public.chain_recovery_runs r WHERE r.checkpoint_id=checkpoint.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1) run ON true
   WHERE addresses.asset_id=asset AND (checkpoint.id IS NULL OR checkpoint.binding_fingerprint<>binding OR run.id IS NULL
     OR run.binding_fingerprint<>binding OR run.state<>'reconciled' OR run.through_height<>cutoff
     OR run.scan_progress->>'stage' IS DISTINCT FROM 'balance'
     OR run.scan_progress->'custodyWitness'->>'format' IS DISTINCT FROM 'gw-address-custody-v1'
     OR run.scan_progress->'custodyWitness'->>'asset_id' IS DISTINCT FROM asset::text
     OR run.scan_progress->'custodyWitness'->>'binding_fingerprint' IS DISTINCT FROM binding
     OR run.scan_progress->'custodyWitness'->>'address' IS DISTINCT FROM addresses.address
     OR run.scan_progress->'custodyWitness'->>'height' IS DISTINCT FROM cutoff::text
     OR run.scan_progress->'custodyWitness'->>'block_hash' IS DISTINCT FROM anchor)
 );
END $$;

CREATE FUNCTION public.gw_native_attempt_review_fence() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE asset uuid;BEGIN SELECT asset_id INTO asset FROM public.crypto_obligations WHERE id=NEW.obligation_id;IF NOT public.gw_native_asset_fence(asset) THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;RETURN NEW;END $$;

CREATE FUNCTION public.gw_native_intake_fence() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
 IF TG_TABLE_NAME='crypto_obligations' AND TG_OP='UPDATE' AND NEW.status NOT IN ('approved','signing') THEN RETURN NEW;END IF;
 IF TG_TABLE_NAME='crypto_obligations' AND TG_OP='UPDATE' AND NEW.status=OLD.status THEN RETURN NEW;END IF;
 IF NOT public.gw_native_asset_fence(NEW.asset_id) THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;RETURN NEW;
END $$;

CREATE FUNCTION public.gw_native_review_anchor_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
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

CREATE FUNCTION public.gw_native_review_immutable() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
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

CREATE FUNCTION public.gw_native_review_journal_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
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

CREATE FUNCTION public.gw_next_treasury_monitor(target uuid, current_address text) RETURNS TABLE(address text, historical_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE selected text; total bigint;
BEGIN
 IF public.gw_runtime_environment_allowed() IS NOT TRUE THEN RAISE EXCEPTION 'FINANCIAL_ENVIRONMENT_DENIED'; END IF;
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' OR coalesce(current_setting('gw.environment',true),'') NOT IN ('testnet','mainnet') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.assets WHERE id=target AND environment=current_setting('gw.environment',true)) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT count(*) INTO total FROM public.treasury_addresses t WHERE t.asset_id=target AND t.address<>current_address;
 SELECT t.address INTO selected FROM public.treasury_addresses t WHERE t.asset_id=target AND t.address<>current_address
  ORDER BY t.last_monitor_at,t.address LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF selected IS NOT NULL THEN UPDATE public.treasury_addresses t SET last_monitor_at=clock_timestamp() WHERE t.asset_id=target AND t.address=selected; END IF;
 RETURN QUERY SELECT selected,total;
END $$;

CREATE FUNCTION public.gw_notification_view_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
BEGIN
 IF TG_TABLE_NAME='notification_views' THEN
  IF TG_OP='UPDATE' AND (NEW.user_id<>OLD.user_id OR (NEW.seen_at,NEW.seen_id)<(OLD.seen_at,OLD.seen_id)) THEN RAISE EXCEPTION 'NOTIFICATION_SEEN_INVALID';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.notifications WHERE id=NEW.seen_id AND user_id=NEW.user_id AND created_at=NEW.seen_at) THEN RAISE EXCEPTION 'NOTIFICATION_SEEN_INVALID';END IF;
 ELSE
  IF OLD.retired_at IS NULL AND NEW.retired_at IS NOT NULL THEN
   IF NEW.body<>'[expired]' OR NEW.retired_body_hash IS DISTINCT FROM encode(sha256(convert_to(OLD.body,'UTF8')),'hex')
    OR OLD.created_at>=clock_timestamp()-((SELECT value->>'notification_days' FROM public.x_manifest WHERE key='retention_policy')::integer)*interval '1 day'
    OR (to_jsonb(NEW)-ARRAY['body','retired_at','retired_body_hash']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['body','retired_at','retired_body_hash'])
    OR current_setting('gw.operational_retention_hold',true)='true' THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;
   RETURN NEW;
  END IF;
  IF (NEW.retired_at,NEW.retired_body_hash) IS DISTINCT FROM (OLD.retired_at,OLD.retired_body_hash) THEN RAISE EXCEPTION 'RETENTION_SCOPE_DENIED'; END IF;

  IF OLD.title_key='admin_message' AND OLD.redacted_at IS NULL AND NEW.redacted_at IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=OLD.user_id AND u.status='deleted') OR NEW.body<>'[redacted]' OR NEW.redacted_body_hash IS DISTINCT FROM encode(sha256(convert_to(OLD.body,'UTF8')),'hex') OR (to_jsonb(NEW)-ARRAY['body','redacted_at','redacted_body_hash']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['body','redacted_at','redacted_body_hash']) THEN RAISE EXCEPTION 'REDACTION_SCOPE_DENIED';END IF;
   RETURN NEW;
  END IF;
  IF (NEW.redacted_at,NEW.redacted_body_hash) IS DISTINCT FROM (OLD.redacted_at,OLD.redacted_body_hash) THEN RAISE EXCEPTION 'NOTIFICATION_HISTORY_INVALID';END IF;
  IF (NEW.id,NEW.user_id,NEW.title_key,NEW.body,NEW.created_at,NEW.delivery_key) IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.title_key,OLD.body,OLD.created_at,OLD.delivery_key)
   OR (OLD.read_at IS NOT NULL AND NEW.read_at IS DISTINCT FROM OLD.read_at) THEN RAISE EXCEPTION 'NOTIFICATION_HISTORY_INVALID';END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_observation_identity_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'OBSERVATION_IDENTITY_RETAINED';END IF;
 IF (to_jsonb(NEW)-ARRAY['source_job_id','rounds','status','next_observation_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['source_job_id','rounds','status','next_observation_at']) OR NEW.rounds<OLD.rounds OR (OLD.source_job_id IS NOT NULL AND NEW.source_job_id IS DISTINCT FROM OLD.source_job_id) OR (OLD.status<>'pending' AND NEW.status<>OLD.status) THEN RAISE EXCEPTION 'OBSERVATION_IDENTITY_IMMUTABLE';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_operational_recovery_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $_$
DECLARE o public.crypto_obligations;j public.ledger_journals;total integer;valid integer;attempts integer;proof jsonb;expected_owner_type text;source_owner_type text;
BEGIN
 SELECT * INTO o FROM public.crypto_obligations WHERE id=NEW.id;IF o.kind NOT IN ('business','refund','unallocated_refund') OR o.completed_at IS NULL OR o.status NOT IN ('cancelled','exception') THEN RETURN NULL;END IF;
 SELECT * INTO j FROM public.ledger_journals WHERE business_key='crypto-operational-release:'||o.id;IF NOT FOUND THEN RAISE EXCEPTION 'OPERATIONAL_RELEASE_REQUIRED';END IF;
 expected_owner_type:=CASE WHEN o.user_id IS NULL THEN 'platform' ELSE 'user' END;
 source_owner_type:=CASE WHEN o.kind='unallocated_refund' THEN 'system' ELSE expected_owner_type END;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=o.asset_id AND a.owner_id IS NOT DISTINCT FROM o.user_id AND p.amount_base_units=o.gross_base_units AND ((a.owner_type=expected_owner_type AND a.purpose='held_payable' AND p.direction='debit') OR (a.owner_type=source_owner_type AND a.purpose=o.source_purpose AND p.direction='credit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 OR j.ledger_type<>'OPERATIONAL_HOLD_RELEASE' OR j.metadata->>'obligation_id' IS DISTINCT FROM o.id::text OR o.charge_base_units<>0 OR o.gross_base_units<>o.net_base_units THEN RAISE EXCEPTION 'OPERATIONAL_RELEASE_MISMATCH';END IF;
 SELECT count(*) INTO attempts FROM public.signed_attempts WHERE obligation_id=o.id;SELECT result->'attempts' INTO proof FROM public.operation_keys WHERE business_key='crypto-operational-recovery:'||o.id;
 IF jsonb_typeof(proof) IS DISTINCT FROM 'array' OR jsonb_array_length(proof)<>attempts OR (o.status='cancelled' AND attempts>0) OR EXISTS(SELECT 1 FROM public.signed_attempts a WHERE a.obligation_id=o.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(proof) e WHERE e->>'id'=a.id::text AND e->>'state' IN ('failed','expired','superseded') AND e->>'hash'~'^[0-9a-f]{64}$')) THEN RAISE EXCEPTION 'OPERATIONAL_RECOVERY_UNPROVEN';END IF;RETURN NULL;
END $_$;

CREATE FUNCTION public.gw_owns(target uuid) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog'
    AS $$
  SELECT target=public.gw_actor_id() OR public.gw_staff_reader()
$$;

CREATE FUNCTION public.gw_partition_private_acl(target regclass) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE recipient text;
BEGIN
 FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=target AND a.grantee<>c.relowner
 LOOP EXECUTE 'REVOKE ALL ON TABLE '||target||' FROM '||recipient; END LOOP;
 EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',target);
END $$;

CREATE FUNCTION public.gw_partition_transfer_allowed(target regclass, operation text) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE source_name text; prefix text;
BEGIN
 IF operation<>'DELETE' OR current_user::regrole<>(SELECT relowner FROM pg_class WHERE oid=target) THEN RETURN false; END IF;
 source_name:=current_setting('gw.partition_transfer',true);
 prefix:=CASE source_name WHEN 'ledger_postings' THEN 'lp' WHEN 'chain_scan_pages' THEN 'cs' WHEN 'audit_events' THEN 'au' END;
 RETURN prefix IS NOT NULL AND target=to_regclass(format('public.%I','gw_part_'||prefix||'_default'))
  AND EXISTS(SELECT 1 FROM pg_inherits WHERE inhrelid=target AND inhparent=to_regclass(format('public.%I',source_name)));
END $$;

CREATE FUNCTION public.gw_plan_pricing_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.pricing_mode,NEW.activation_price_id) IS DISTINCT FROM (OLD.pricing_mode,OLD.activation_price_id) THEN RAISE EXCEPTION 'PLAN_PRICING_IMMUTABLE'; END IF;
 IF NEW.activation_price_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.price_quotes WHERE id=NEW.activation_price_id AND asset_id=NEW.asset_id) THEN RAISE EXCEPTION 'PRICE_ASSET_MISMATCH'; END IF;
 IF NEW.pricing_mode='fixed_token' AND NEW.activation_price_id IS NULL THEN RAISE EXCEPTION 'PRICE_REQUIRED'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_plan_snapshot_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_TABLE_NAME='plan_versions' AND (NEW.id,NEW.plan_id,NEW.asset_id,NEW.version,NEW.amount_base_units,NEW.usd_reference,NEW.receiver_bps,NEW.marketing_bps,NEW.referral_bps,NEW.developer_bps,NEW.reserve_bps,NEW.receipts_required,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.plan_id,OLD.asset_id,OLD.version,OLD.amount_base_units,OLD.usd_reference,OLD.receiver_bps,OLD.marketing_bps,OLD.referral_bps,OLD.developer_bps,OLD.reserve_bps,OLD.receipts_required,OLD.created_at) THEN RAISE EXCEPTION 'PLAN_SNAPSHOT_IMMUTABLE';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_production_write_fence() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF current_setting('role',true) IN ('gw_read','gw_service','gw_signer') AND public.gw_runtime_environment_allowed() IS NOT TRUE THEN RAISE EXCEPTION 'FINANCIAL_ENVIRONMENT_DENIED'; END IF;
 RETURN NULL;
END $$;

CREATE FUNCTION public.gw_profile_preview_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.committed_at IS NOT NULL OR OLD.expires_at>=clock_timestamp() THEN RAISE EXCEPTION 'PROFILE_PREVIEW_RETAINED'; END IF;RETURN OLD;
 END IF;
 IF (to_jsonb(NEW)-'committed_at') IS DISTINCT FROM (to_jsonb(OLD)-'committed_at') OR OLD.committed_at IS NOT NULL OR NEW.committed_at IS NULL OR OLD.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'PROFILE_PREVIEW_RETAINED'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_profile_setting_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE controlled boolean;
BEGIN
 IF TG_OP='UPDATE' AND NEW.key<>OLD.key THEN RAISE EXCEPTION 'CONFIGURATION_INVALID'; END IF;
 IF TG_OP='UPDATE' AND to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN RETURN NEW; END IF;
 IF OLD.key='activity_epoch' THEN
  IF current_user::regrole<>(SELECT relowner FROM pg_class WHERE oid=TG_RELID) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;RETURN NEW;
 END IF;
 controlled:=OLD.key IN ('deployment_profile','feature_transparency','profile_revision','bootstrap_presentation','priority_presentation','activity_presentation','transparency_content','verified_activity_policy','queue_disclosure_policy','public_receipt_policy','transparency_snapshot_policy','financial_readiness_record')
  OR OLD.key IN ('feature_bootstrap','feature_priority','terms_content','public_stats_policy') AND EXISTS(SELECT 1 FROM public.x_manifest WHERE key='deployment_profile' AND value='"transparent"'::jsonb);
 IF controlled AND (TG_OP='DELETE' OR current_setting('gw.profile_switch',true) IS DISTINCT FROM 'true' OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=nullif(current_setting('gw.actor_id',true),'')::uuid AND role='admin' AND status='active')) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;RETURN NEW;
END $$;

CREATE FUNCTION public.gw_public_queue_disclosure(version uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE partition uuid; total bigint; slots bigint; revision bigint; priority_enabled boolean;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.x_manifest WHERE key='deployment_profile' AND value='"transparent"'::jsonb) OR NOT EXISTS(SELECT 1 FROM public.x_manifest WHERE key='feature_transparency' AND value='true'::jsonb) THEN RETURN NULL; END IF;
 SELECT q.id,q.revision INTO partition,revision FROM public.queue_partitions q JOIN public.plan_versions v ON v.id=q.plan_version_id JOIN public.assets a ON a.id=v.asset_id WHERE v.id=$1 AND a.environment=current_setting('gw.environment',true);
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT count(*),coalesce(sum(required_count-credited_count),0) INTO total,slots FROM public.queue_entries WHERE partition_id=partition AND kind='bootstrap' AND status='waiting';
 SELECT value='true'::jsonb INTO priority_enabled FROM public.x_manifest WHERE key='feature_priority';
 RETURN jsonb_build_object('system_positions',total::text,'system_remaining_slots',slots::text,'priority_positions',CASE WHEN priority_enabled THEN public.gw_rank_prefix(partition,'priority',1099511627776) ELSE 0 END::text,'queue_revision',revision::text,'snapshot_at',statement_timestamp());
END $$;

CREATE FUNCTION public.gw_public_statistics_reorg() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 UPDATE public.public_statistics SET expires_at=clock_timestamp() WHERE verified_only;
 UPDATE public.x_manifest SET value=to_jsonb((value#>>'{}')::bigint+1),version=version+1,updated_at=clock_timestamp() WHERE key='activity_epoch';
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_publication_cache_epoch() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE relevant boolean;
BEGIN
 IF TG_OP='INSERT' THEN relevant:=NEW.publication_classification='real';
 ELSE relevant:=(OLD.publication_classification='real' OR NEW.publication_classification='real') AND (NEW.publication_classification,NEW.activity_opt_in,NEW.status,NEW.role,NEW.consent_version) IS DISTINCT FROM (OLD.publication_classification,OLD.activity_opt_in,OLD.status,OLD.role,OLD.consent_version); END IF;
 IF relevant THEN
  UPDATE public.x_manifest SET value=to_jsonb((value#>>'{}')::bigint+1),version=version+1,updated_at=clock_timestamp() WHERE key='activity_epoch';
  UPDATE public.public_statistics SET expires_at=clock_timestamp() WHERE verified_only;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_publication_consent_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF NEW.publication_classification IS DISTINCT FROM OLD.publication_classification AND current_user::regrole<>(SELECT relowner FROM pg_class WHERE oid=TG_RELID) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF NEW.activity_opt_in IS DISTINCT FROM OLD.activity_opt_in THEN
  IF current_setting('gw.actor_id',true) IS DISTINCT FROM OLD.id::text OR NEW.activity_revision<>OLD.activity_revision+1
   OR NEW.activity_opt_in AND (NEW.status<>'active' OR NEW.role<>'member' OR NEW.consented_at IS NULL OR NEW.age_confirmed_at IS NULL OR NOT EXISTS(SELECT 1 FROM public.x_manifest WHERE key='terms_content' AND value->>'version'=NEW.consent_version)) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 ELSIF NEW.activity_revision<>OLD.activity_revision THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_queue_disclosure(entry uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE item public.queue_entries; priority_enabled boolean; priority_ahead bigint; ahead bigint; slots bigint; total bigint; revision bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.x_manifest WHERE key='deployment_profile' AND value='"transparent"'::jsonb) THEN RETURN NULL; END IF;
 SELECT e.* INTO item FROM public.queue_entries e JOIN public.queue_partitions p ON p.id=e.partition_id JOIN public.plan_versions v ON v.id=p.plan_version_id JOIN public.assets a ON a.id=v.asset_id
 WHERE e.id=entry AND a.environment=current_setting('gw.environment',true);
 IF NOT FOUND OR public.gw_owns(item.beneficiary_user_id) IS NOT TRUE OR item.status<>'waiting' THEN RETURN NULL; END IF;
 SELECT value='true'::jsonb INTO priority_enabled FROM public.x_manifest WHERE key='feature_priority';
 IF priority_enabled IS NULL THEN RAISE EXCEPTION 'CONFIGURATION_INVALID'; END IF;
 SELECT count(*),coalesce(sum(required_count-credited_count),0),count(*) FILTER(WHERE
  CASE WHEN NOT priority_enabled THEN ticket<item.ticket
   WHEN item.priority_ticket IS NOT NULL THEN priority_ticket IS NOT NULL AND (priority_ticket,ticket)<(item.priority_ticket,item.ticket)
   ELSE priority_ticket IS NOT NULL OR priority_ticket IS NULL AND ticket<item.ticket END)
 INTO total,slots,ahead FROM public.queue_entries WHERE partition_id=item.partition_id AND kind='bootstrap' AND status='waiting';
 priority_ahead:=CASE WHEN NOT priority_enabled THEN 0 WHEN item.priority_ticket IS NOT NULL THEN public.gw_rank_prefix(item.partition_id,'priority',item.priority_ticket-1) ELSE public.gw_rank_prefix(item.partition_id,'priority',1099511627776) END;
 SELECT p.revision INTO revision FROM public.queue_partitions p WHERE p.id=item.partition_id;
 RETURN jsonb_build_object('joining_number',item.ticket::text,'serving_position',public.gw_queue_rank(entry,'public_serving')::text,'system_ahead',ahead::text,'system_positions',total::text,'system_remaining_slots',slots::text,'priority_ahead',priority_ahead::text,'queue_revision',revision::text,'snapshot_at',statement_timestamp());
END $$;

CREATE FUNCTION public.gw_queue_identity_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'QUEUE_HISTORY_IMMUTABLE'; END IF;
 IF (NEW.partition_id,NEW.ticket,NEW.kind,NEW.cycle_id,NEW.beneficiary_user_id,NEW.platform_role,NEW.required_count) IS DISTINCT FROM (OLD.partition_id,OLD.ticket,OLD.kind,OLD.cycle_id,OLD.beneficiary_user_id,OLD.platform_role,OLD.required_count) THEN RAISE EXCEPTION 'QUEUE_TICKET_IMMUTABLE'; END IF;
 IF NEW.cancelled_count IS DISTINCT FROM OLD.cancelled_count THEN
  IF OLD.cancelled_count<>0 OR OLD.kind<>'bootstrap' OR OLD.status<>'waiting' OR NEW.status<>'removed' OR NEW.cancelled_count<>OLD.required_count-OLD.credited_count OR NEW.credited_count<>OLD.credited_count
   OR current_setting('gw.profile_switch',true) IS DISTINCT FROM 'true'
   OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=nullif(current_setting('gw.actor_id',true),'')::uuid AND role='admin' AND status='active') THEN RAISE EXCEPTION 'QUEUE_HISTORY_IMMUTABLE'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_queue_profile_revision() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW IS DISTINCT FROM OLD THEN UPDATE public.queue_partitions SET revision=revision+1 WHERE id=NEW.partition_id; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_queue_rank(entry uuid, mode text) RETURNS bigint
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE item public.queue_entries%ROWTYPE; priority_enabled boolean;
BEGIN
  SELECT e.* INTO item FROM public.queue_entries e
  JOIN public.queue_partitions q ON q.id=e.partition_id JOIN public.plan_versions v ON v.id=q.plan_version_id JOIN public.assets a ON a.id=v.asset_id
  WHERE e.id=entry AND a.environment=current_setting('gw.environment',true);
  IF NOT FOUND OR public.gw_owns(item.beneficiary_user_id) IS NOT TRUE OR item.status<>'waiting' THEN RETURN NULL; END IF;
  IF mode='display' THEN RETURN public.gw_rank_prefix(item.partition_id,'display',item.ticket-1)+1; END IF;
  IF mode='public_serving' THEN
    IF NOT EXISTS(SELECT 1 FROM public.x_manifest WHERE key='deployment_profile' AND value='"transparent"'::jsonb) THEN RETURN NULL; END IF;
  ELSIF mode<>'serving' OR NOT public.gw_staff_reader() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT value='true'::jsonb INTO priority_enabled FROM public.x_manifest WHERE key='feature_priority';
  IF priority_enabled IS NULL THEN RAISE EXCEPTION 'CONFIGURATION_INVALID'; END IF;
  IF NOT priority_enabled THEN RETURN public.gw_rank_prefix(item.partition_id,'display',item.ticket-1)+1; END IF;
  IF item.priority_ticket IS NOT NULL THEN RETURN public.gw_rank_prefix(item.partition_id,'priority',item.priority_ticket-1)+1; END IF;
  RETURN public.gw_rank_prefix(item.partition_id,'priority',1099511627776)+public.gw_rank_prefix(item.partition_id,'fifo',item.ticket-1)+1;
END $$;

CREATE FUNCTION public.gw_queue_rank_maintain() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.status=NEW.status AND OLD.priority_ticket IS NOT DISTINCT FROM NEW.priority_ticket THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.queue_partitions WHERE id=NEW.partition_id FOR UPDATE;
  IF TG_OP='UPDATE' AND OLD.status='waiting' THEN
    PERFORM public.gw_rank_delta(OLD.partition_id,'display',OLD.ticket,-1);
    PERFORM public.gw_rank_delta(OLD.partition_id,CASE WHEN OLD.priority_ticket IS NULL THEN 'fifo' ELSE 'priority' END,coalesce(OLD.priority_ticket,OLD.ticket),-1);
  END IF;
  IF NEW.status='waiting' THEN
    PERFORM public.gw_rank_delta(NEW.partition_id,'display',NEW.ticket,1);
    PERFORM public.gw_rank_delta(NEW.partition_id,CASE WHEN NEW.priority_ticket IS NULL THEN 'fifo' ELSE 'priority' END,coalesce(NEW.priority_ticket,NEW.ticket),1);
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.gw_queue_sequence_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
  IF NEW.next_ticket<OLD.next_ticket OR NEW.next_priority_ticket<OLD.next_priority_ticket THEN RAISE EXCEPTION 'QUEUE_SEQUENCE_CANNOT_REWIND'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.gw_rank_delta(partition uuid, lane_name text, ticket bigint, delta integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE node bigint:=ticket;
BEGIN
  IF ticket<1 OR ticket>=1099511627776 OR delta NOT IN (-1,1) THEN RAISE EXCEPTION 'QUEUE_INDEX_INVALID'; END IF;
  WHILE node<=1099511627776 LOOP
    IF delta=-1 THEN
      UPDATE public.queue_rank_nodes SET waiting_count=waiting_count-1 WHERE partition_id=partition AND lane=lane_name AND node_index=node;
      IF NOT FOUND THEN RAISE EXCEPTION 'QUEUE_INDEX_INVALID'; END IF;
    ELSE
      INSERT INTO public.queue_rank_nodes(partition_id,lane,node_index,waiting_count) VALUES(partition,lane_name,node,1)
      ON CONFLICT(partition_id,lane,node_index) DO UPDATE SET waiting_count=queue_rank_nodes.waiting_count+1;
    END IF;
    node:=node+(node & -node);
  END LOOP;
END $$;

CREATE FUNCTION public.gw_rank_prefix(partition uuid, lane_name text, ticket bigint) RETURNS bigint
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE node bigint:=ticket; total bigint:=0; amount bigint;
BEGIN
  IF ticket<0 OR ticket>1099511627776 THEN RAISE EXCEPTION 'QUEUE_INDEX_INVALID'; END IF;
  WHILE node>0 LOOP
    SELECT waiting_count INTO amount FROM public.queue_rank_nodes WHERE partition_id=partition AND lane=lane_name AND node_index=node;
    total:=total+coalesce(amount,0); node:=node-(node & -node);
  END LOOP;
  RETURN total;
END $$;

CREATE FUNCTION public.gw_reconciliation_result_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE id=NEW.source_job_id AND kind='financial_reconciliation' AND environment=NEW.environment AND payload->>'anchor'=NEW.run_date::text AND status='running' AND lease_until>clock_timestamp())
    OR (NEW.result->>'balanced')::boolean IS DISTINCT FROM NEW.balanced OR (NEW.result->>'consistent')::boolean IS DISTINCT FROM NEW.consistent OR (NEW.result->>'lineage_complete')::boolean IS DISTINCT FROM NEW.lineage_complete
    THEN RAISE EXCEPTION 'RECONCILIATION_RESULT_INVALID'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.gw_record_verified_expiry(attempt uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $_$
DECLARE a public.signed_attempts;
BEGIN
 IF public.gw_runtime_environment_allowed() IS NOT TRUE THEN RAISE EXCEPTION 'FINANCIAL_ENVIRONMENT_DENIED'; END IF;
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' THEN RAISE EXCEPTION 'EXPIRY_SCOPE_DENIED';END IF;
 SELECT * INTO a FROM public.signed_attempts WHERE id=$1 FOR UPDATE;
 IF a.id IS NULL OR a.environment IS DISTINCT FROM current_setting('gw.environment',true) OR a.chain NOT IN ('sol','tron') OR NOT EXISTS(
  SELECT 1 FROM public.operation_keys k WHERE k.business_key='crypto-expiry:'||a.id::text
  AND k.result->>'status'='expiry_verified' AND k.result->>'attempt_id'=a.id::text
  AND k.result->>'obligation_id'=a.obligation_id::text
 ) THEN RAISE EXCEPTION 'EXPIRY_PROOF_REQUIRED';END IF;
 IF a.status='expired' THEN RETURN true;END IF;
 IF a.status NOT IN ('signed','broadcast') THEN RETURN false;END IF;
 UPDATE public.signed_attempts SET status='expired',actual_native_fee=0,confirmed_at=clock_timestamp() WHERE id=a.id;
 RETURN true;
END $_$;

CREATE FUNCTION public.gw_recovery_evidence_retained() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF public.gw_partition_transfer_allowed(TG_RELID,TG_OP) THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'CHAIN_RECOVERY_EVIDENCE_RETAINED';
END $$;

CREATE FUNCTION public.gw_recovery_loss_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE r public.recovery_outflow_resolutions;o public.recovery_outflows;j public.ledger_journals;total integer;valid integer;claim public.chain_fee_claims;registry jsonb;
BEGIN
 SELECT * INTO r FROM public.recovery_outflow_resolutions WHERE id=NEW.id;SELECT * INTO o FROM public.recovery_outflows WHERE id=r.outflow_id;
 IF o.status<>'review' OR (o.asset_id,o.tx_hash,o.event_index,o.amount_base_units) IS DISTINCT FROM (r.asset_id,r.tx_hash,r.event_index,r.principal_base_units) THEN RAISE EXCEPTION 'RECOVERY_LOSS_EVIDENCE_INVALID';END IF;
 IF r.principal_base_units>0 THEN
 SELECT * INTO j FROM public.ledger_journals WHERE id=r.principal_journal_id;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=r.asset_id AND a.owner_id IS NULL AND p.amount_base_units=r.principal_base_units AND ((a.owner_type='system' AND a.purpose='treasury_asset' AND p.direction='credit') OR (a.owner_type='platform' AND a.purpose='chain_loss_expense' AND p.direction='debit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 OR j.ledger_type<>'RECOVERY_OUTFLOW_LOSS' OR j.metadata->>'resolution_id' IS DISTINCT FROM r.id::text THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 ELSIF r.principal_journal_id IS NOT NULL THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 SELECT c.registry_snapshot INTO registry FROM public.recovery_outflows o2 JOIN public.chain_recovery_runs run ON run.id=o2.run_id JOIN public.chain_checkpoints c ON c.id=run.checkpoint_id WHERE o2.id=r.outflow_id;
 SELECT * INTO claim FROM public.chain_fee_claims WHERE environment=(SELECT environment FROM public.assets WHERE id=r.asset_id) AND chain=registry->>'chain' AND network=registry->>'network' AND tx_hash=r.tx_hash;
 IF claim.id IS NULL OR (claim.native_asset_id,claim.network_fee_base_units+claim.account_setup_base_units,claim.account_setup_base_units,claim.gas_journal_id,claim.setup_journal_id) IS DISTINCT FROM (r.native_asset_id,r.native_fee_base_units,r.account_setup_base_units,r.gas_journal_id,r.setup_journal_id) THEN RAISE EXCEPTION 'RECOVERY_LOSS_JOURNAL_INVALID';END IF;
 RETURN NULL;
END $$;

CREATE FUNCTION public.gw_recovery_run_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'CHAIN_RECOVERY_EVIDENCE_RETAINED';END IF;
 IF (to_jsonb(NEW)-ARRAY['cursor_height','state','revision','incoming_count','outgoing_count','reason_code','completed_at','known_attempt_cursor','scan_progress']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['cursor_height','state','revision','incoming_count','outgoing_count','reason_code','completed_at','known_attempt_cursor','scan_progress']) OR OLD.state='reconciled' OR NEW.cursor_height<OLD.cursor_height OR NEW.revision<>OLD.revision+1 OR NEW.incoming_count<OLD.incoming_count OR NEW.outgoing_count<OLD.outgoing_count OR (OLD.known_attempt_cursor IS NOT NULL AND (NEW.known_attempt_cursor IS NULL OR NEW.known_attempt_cursor<OLD.known_attempt_cursor)) THEN RAISE EXCEPTION 'RECOVERY_RUN_IMMUTABLE';END IF;
 IF OLD.scan_progress IS NOT NULL AND OLD.scan_progress->'cursor' IS NOT NULL AND NEW.scan_progress->'cursor' IS NOT NULL AND
   ROW((NEW.scan_progress->'cursor'->>'height')::numeric,(NEW.scan_progress->'cursor'->>'transaction')::integer,(NEW.scan_progress->'cursor'->>'event')::integer)<ROW((OLD.scan_progress->'cursor'->>'height')::numeric,(OLD.scan_progress->'cursor'->>'transaction')::integer,(OLD.scan_progress->'cursor'->>'event')::integer) THEN RAISE EXCEPTION 'SCAN_CURSOR_REGRESSION';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_recovery_view_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='UPDATE' OR OLD.expires_at>clock_timestamp() OR current_setting('gw.operational_retention_hold',true)='true' THEN RAISE EXCEPTION 'RECOVERY_VIEW_RETAINED';END IF;RETURN OLD;
END $$;

CREATE FUNCTION public.gw_refund_hold_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE o public.crypto_obligations;j public.ledger_journals;journals integer;total integer;valid integer;
BEGIN
 SELECT * INTO o FROM public.crypto_obligations WHERE id=NEW.id;IF o.kind<>'refund' THEN RETURN NULL;END IF;
 IF o.user_id IS NULL OR o.source_purpose<>'refund_payable' OR o.charge_base_units<>0 OR o.net_base_units<>o.gross_base_units THEN RAISE EXCEPTION 'REFUND_INTENT_INVALID';END IF;
 SELECT count(*) INTO journals FROM public.ledger_journals WHERE ledger_type='PAYOUT_HOLD' AND metadata->>'obligation_id'=o.id::text;
 IF journals<>1 THEN RAISE EXCEPTION 'REFUND_HOLD_REQUIRED';END IF;
 SELECT * INTO j FROM public.ledger_journals WHERE ledger_type='PAYOUT_HOLD' AND metadata->>'obligation_id'=o.id::text;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=o.asset_id AND a.owner_type='user' AND a.owner_id=o.user_id AND p.amount_base_units=o.gross_base_units AND ((a.purpose='refund_payable' AND p.direction='debit') OR (a.purpose='held_payable' AND p.direction='credit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 THEN RAISE EXCEPTION 'REFUND_HOLD_MISMATCH';END IF;RETURN NULL;
END $$;

CREATE FUNCTION public.gw_registry_binding_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF OLD.registry_binding IS NOT NULL AND NEW.registry_binding IS DISTINCT FROM OLD.registry_binding THEN RAISE EXCEPTION 'ASSET_REGISTRY_IMMUTABLE';END IF;
 IF NEW.registry_binding IS NOT NULL AND (NEW.environment NOT IN ('testnet','mainnet') OR NEW.registry_binding->>'network'<>NEW.chain_id OR (NEW.registry_binding->>'decimals')::integer<>NEW.decimals) THEN RAISE EXCEPTION 'ASSET_REGISTRY_INVALID';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_registry_first_binding_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
 IF OLD.registry_binding IS NULL AND NEW.registry_binding IS NOT NULL AND (EXISTS(SELECT 1 FROM public.ledger_accounts WHERE asset_id=OLD.id) OR EXISTS(SELECT 1 FROM public.plan_versions WHERE asset_id=OLD.id)) THEN RAISE EXCEPTION 'USED_ASSET_BINDING_REQUIRED';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_reject_account_reassignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ledger_postings WHERE account_id=OLD.id) THEN
    RAISE EXCEPTION 'LEDGER_ACCOUNT_IMMUTABLE';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE FUNCTION public.gw_reject_ledger_mutation() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF public.gw_partition_transfer_allowed(TG_RELID,TG_OP) THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'LEDGER_APPEND_ONLY';
END $$;

CREATE FUNCTION public.gw_reorg_admission_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.queue_partitions p JOIN public.simulation_reorg_reviews r ON r.partition_id=p.id LEFT JOIN public.simulation_reorg_resolutions resolved ON resolved.review_id=r.id WHERE p.plan_version_id=NEW.plan_version_id AND resolved.id IS NULL) THEN RAISE EXCEPTION 'FINANCIAL_REVIEW_REQUIRED'; END IF;
 RETURN NULL;
END $$;

CREATE TABLE public.simulation_reorg_reviews (
    id uuid NOT NULL,
    source_allocation_id uuid NOT NULL,
    source_operation_key text NOT NULL,
    revision integer NOT NULL,
    source_cycle_id uuid NOT NULL,
    source_ticket bigint NOT NULL,
    partition_id uuid NOT NULL,
    receiver_entry_id uuid,
    asset_id uuid NOT NULL,
    payer_user_id uuid NOT NULL,
    affected_user_ids uuid[] NOT NULL,
    environment text DEFAULT 'simulation'::text NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    settled_outgoing_exposure numeric(78,0) DEFAULT 0 NOT NULL,
    loss_journal_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    operation_key text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT simulation_reorg_reviews_affected_user_ids_check CHECK (((cardinality(affected_user_ids) >= 1) AND (cardinality(affected_user_ids) <= 3))),
    CONSTRAINT simulation_reorg_reviews_amount_base_units_check CHECK ((amount_base_units > (0)::numeric)),
    CONSTRAINT simulation_reorg_reviews_environment_check CHECK ((environment = 'simulation'::text)),
    CONSTRAINT simulation_reorg_reviews_reason_check CHECK (((length(reason) >= 5) AND (length(reason) <= 500))),
    CONSTRAINT simulation_reorg_reviews_revision_check CHECK (((revision >= 1) AND (revision <= 1000000))),
    CONSTRAINT simulation_reorg_reviews_settled_outgoing_exposure_check CHECK ((settled_outgoing_exposure >= (0)::numeric))
);

CREATE FUNCTION public.gw_reorg_leg_valid(journal uuid, item public.simulation_reorg_reviews, reconfirmed boolean) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $_$
 SELECT EXISTS(SELECT 1 FROM public.ledger_journals j WHERE j.id=$1 AND j.ledger_type='REORG_COMPENSATE' AND j.business_key='reorg:'||($2).id||CASE WHEN $3 THEN ':reconfirm' ELSE ':invalidate' END AND j.metadata->>'review_id'=($2).id::text AND j.metadata->>'source_operation_key'=($2).source_operation_key AND j.metadata->>'action'=CASE WHEN $3 THEN 'reconfirm' ELSE 'invalidate' END)
 AND (SELECT count(*) FROM public.ledger_postings WHERE journal_id=$1)=2
 AND EXISTS(SELECT 1 FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=$1 AND p.direction=CASE WHEN $3 THEN 'debit' ELSE 'credit' END AND p.amount_base_units=($2).amount_base_units AND a.asset_id=($2).asset_id AND a.owner_type='user' AND a.owner_id=($2).payer_user_id AND a.purpose='available_payable')
 AND EXISTS(SELECT 1 FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=$1 AND p.direction=CASE WHEN $3 THEN 'credit' ELSE 'debit' END AND p.amount_base_units=($2).amount_base_units AND a.asset_id=($2).asset_id AND a.owner_type='system' AND a.owner_id IS NULL AND a.purpose='simulation_chain_loss')
$_$;

CREATE FUNCTION public.gw_reorg_resolution_integrity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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

CREATE FUNCTION public.gw_reorg_review_integrity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
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

CREATE FUNCTION public.gw_retire_ephemeral_batch(maximum integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE policy jsonb; selected_environment text; notices integer; work integer; dispatch integer; more boolean;
BEGIN
 IF public.gw_runtime_environment_allowed() IS NOT TRUE THEN RAISE EXCEPTION 'FINANCIAL_ENVIRONMENT_DENIED'; END IF;
 selected_environment:=current_setting('gw.environment',true);
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' OR selected_environment NOT IN ('simulation','testnet','mainnet') OR selected_environment IS NULL OR maximum<1 OR maximum>100 OR maximum IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF current_setting('gw.operational_retention_hold',true)='true' THEN RETURN jsonb_build_object('notifications',0,'jobs',0,'outbox',0,'held',true,'more_possible',false); END IF;
 SELECT value INTO policy FROM public.x_manifest WHERE key='retention_policy' AND scope='staff' FOR SHARE;
 IF policy IS NULL OR policy->>'notification_days' IS NULL OR policy->>'job_terminal_days' IS NULL OR (policy->>'notification_days')::integer NOT BETWEEN 1 AND 1000000 OR (policy->>'job_terminal_days')::integer NOT BETWEEN 1 AND 1000000 THEN RAISE EXCEPTION 'CONFIGURATION_INVALID'; END IF;
 WITH candidates AS (SELECT n.id FROM public.notifications n WHERE n.retired_at IS NULL AND n.created_at<clock_timestamp()-(policy->>'notification_days')::integer*interval '1 day' ORDER BY n.created_at,n.id LIMIT maximum FOR UPDATE SKIP LOCKED)
 UPDATE public.notifications n SET body='[expired]',retired_at=clock_timestamp(),retired_body_hash=encode(sha256(convert_to(n.body,'UTF8')),'hex') FROM candidates c WHERE n.id=c.id;
 GET DIAGNOSTICS notices=ROW_COUNT;
 WITH candidates AS (SELECT j.id FROM public.jobs j WHERE j.environment=selected_environment AND j.status='done' AND j.retired_at IS NULL AND j.completed_at<clock_timestamp()-(policy->>'job_terminal_days')::integer*interval '1 day'
  AND j.kind IN ('notification','own_export','operational_cleanup','privacy_redaction') AND j.lease_token IS NULL AND j.lease_until IS NULL
  ORDER BY j.completed_at,j.id LIMIT maximum FOR UPDATE SKIP LOCKED)
 UPDATE public.jobs j SET payload='{}'::jsonb,retired_at=clock_timestamp(),retired_payload_hash=encode(sha256(convert_to(j.payload::text,'UTF8')),'hex') FROM candidates c WHERE j.id=c.id;
 GET DIAGNOSTICS work=ROW_COUNT;
 WITH candidates AS (SELECT o.id FROM public.outbox o JOIN public.jobs j ON j.outbox_id=o.id WHERE o.environment=selected_environment AND o.retired_at IS NULL AND o.dispatched_at IS NOT NULL AND j.status='done' AND j.retired_at IS NOT NULL
  AND o.kind IN ('notification','own_export','operational_cleanup','privacy_redaction') ORDER BY o.created_at,o.id LIMIT maximum FOR UPDATE OF o SKIP LOCKED)
 UPDATE public.outbox o SET payload='{}'::jsonb,retired_at=clock_timestamp(),retired_payload_hash=encode(sha256(convert_to(o.payload::text,'UTF8')),'hex') FROM candidates c WHERE o.id=c.id;
 GET DIAGNOSTICS dispatch=ROW_COUNT;
 SELECT EXISTS(SELECT 1 FROM public.notifications n WHERE n.retired_at IS NULL AND n.created_at<clock_timestamp()-(policy->>'notification_days')::integer*interval '1 day')
  OR EXISTS(SELECT 1 FROM public.jobs j WHERE j.environment=selected_environment AND j.status='done' AND j.retired_at IS NULL AND j.completed_at<clock_timestamp()-(policy->>'job_terminal_days')::integer*interval '1 day' AND j.kind IN ('notification','own_export','operational_cleanup','privacy_redaction') AND j.lease_token IS NULL AND j.lease_until IS NULL)
  OR EXISTS(SELECT 1 FROM public.outbox o JOIN public.jobs j ON j.outbox_id=o.id WHERE o.environment=selected_environment AND o.retired_at IS NULL AND o.dispatched_at IS NOT NULL AND j.status='done' AND j.retired_at IS NOT NULL AND o.kind IN ('notification','own_export','operational_cleanup','privacy_redaction')) INTO more;
 RETURN jsonb_build_object('notifications',notices,'jobs',work,'outbox',dispatch,'held',false,'more_possible',more);
END $$;

CREATE FUNCTION public.gw_runtime_environment_allowed() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
 SELECT CASE
 WHEN EXISTS(SELECT 1 FROM public.environment_instances WHERE environment='mainnet') THEN current_setting('gw.environment',true)='mainnet'
 WHEN EXISTS(SELECT 1 FROM public.environment_instances WHERE environment='testnet') THEN current_setting('gw.environment',true)='testnet'
 ELSE current_setting('gw.environment',true)='simulation' END
$$;

CREATE FUNCTION public.gw_scheduler_retention_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $_$
DECLARE days numeric; cutoff timestamptz;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF TG_TABLE_NAME='scheduler_nonces' THEN RAISE EXCEPTION 'SCHEDULER_IDENTITY_IMMUTABLE'; END IF;
    IF ROW(NEW.id,NEW.environment,NEW.run_key,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.environment,OLD.run_key,OLD.created_at)
      OR NEW.lease_generation<OLD.lease_generation OR (OLD.completed_at IS NOT NULL AND NEW IS DISTINCT FROM OLD) THEN
      RAISE EXCEPTION 'SCHEDULER_IDENTITY_IMMUTABLE';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME='scheduler_nonces' THEN
    -- Future signed timestamps can remain acceptable for two skew windows.
    IF OLD.expires_at>=clock_timestamp() OR OLD.created_at+interval '600 seconds'>=clock_timestamp() THEN
      RAISE EXCEPTION 'SCHEDULER_RECORD_RETAINED';
    END IF;
  ELSE
    SELECT (value->>'http_replay_days')::numeric INTO days FROM public.x_manifest WHERE key='retention_policy' AND scope='staff';
    IF days IS NULL OR days<1 OR days>2147483647 OR days<>trunc(days) THEN RAISE EXCEPTION 'CONFIGURATION_INVALID'; END IF;
    cutoff:=clock_timestamp()-days*interval '1 day';
    IF OLD.completed_at IS NULL OR OLD.completed_at>=cutoff OR OLD.created_at>=cutoff OR OLD.lease_until>=clock_timestamp()
      OR OLD.run_key !~ '^[0-9]{1,12}$' THEN RAISE EXCEPTION 'SCHEDULER_RECORD_RETAINED'; END IF;
    IF OLD.run_key::numeric*300>=extract(epoch FROM cutoff) THEN RAISE EXCEPTION 'SCHEDULER_RECORD_RETAINED'; END IF;
  END IF;
  RETURN OLD;
END $_$;

CREATE FUNCTION public.gw_seal_ledger_posting() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE creator bigint;
BEGIN
  SELECT created_txid INTO creator FROM public.ledger_journals WHERE id = NEW.journal_id;
  IF creator IS NULL OR creator <> txid_current() THEN
    RAISE EXCEPTION 'LEDGER_JOURNAL_SEALED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.gw_session_history_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_TABLE_NAME='auth_sessions' THEN
  IF (NEW.id,NEW.user_id,NEW.generation,NEW.session_version,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.generation,OLD.session_version,OLD.created_at)
   OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) THEN RAISE EXCEPTION 'SESSION_HISTORY_INVALID';END IF;
 ELSIF TG_TABLE_NAME='auth_refresh_tokens' THEN
  IF (NEW.token_hash,NEW.session_id,NEW.created_at,NEW.expires_at) IS DISTINCT FROM (OLD.token_hash,OLD.session_id,OLD.created_at,OLD.expires_at)
   OR (OLD.used_at IS NOT NULL AND NEW.used_at IS DISTINCT FROM OLD.used_at) THEN RAISE EXCEPTION 'SESSION_HISTORY_INVALID';END IF;
 ELSIF TG_TABLE_NAME='auth_recovery_codes' THEN
  IF (NEW.id,NEW.factor_id,NEW.code_hash,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.factor_id,OLD.code_hash,OLD.created_at)
   OR (OLD.used_at IS NOT NULL AND NEW.used_at IS DISTINCT FROM OLD.used_at) THEN RAISE EXCEPTION 'SESSION_HISTORY_INVALID';END IF;
 ELSIF TG_TABLE_NAME='auth_factors' THEN
  IF (NEW.user_id,NEW.id) IS DISTINCT FROM (OLD.user_id,OLD.id) OR NEW.last_step<OLD.last_step
   OR (OLD.active AND (NOT NEW.active OR NEW.secret_cipher IS DISTINCT FROM OLD.secret_cipher)) THEN RAISE EXCEPTION 'FACTOR_HISTORY_INVALID';END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_signer_asset_balance(target uuid, purposes text[]) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE value numeric;
BEGIN
 IF public.gw_runtime_environment_allowed() IS NOT TRUE THEN RAISE EXCEPTION 'FINANCIAL_ENVIRONMENT_DENIED'; END IF;
 IF current_setting('role',true) IS DISTINCT FROM 'gw_signer' OR coalesce(current_setting('gw.environment',true),'') NOT IN ('testnet','mainnet')
  OR NOT EXISTS(SELECT 1 FROM public.assets WHERE id=target AND environment=current_setting('gw.environment',true))
  OR purposes IS NULL OR cardinality(purposes) NOT BETWEEN 1 AND 20 OR array_position(purposes,NULL) IS NOT NULL
  OR NOT purposes <@ ARRAY['available_payable','held_payable','refund_payable','incoming_payable','unallocated_payable','marketing_payable','developer_payable','bootstrap_developer_payable','bootstrap_marketing_payable','bootstrap_platform_payable','bootstrap_custom_bootstrap_payable']::text[] THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 IF public.gw_counter_ready() THEN SELECT coalesce(sum(balance),0) INTO value FROM public.ledger_asset_totals WHERE asset_id=target AND purpose=ANY(purposes);
 ELSE SELECT coalesce(sum(CASE WHEN p.direction='credit' THEN p.amount_base_units ELSE -p.amount_base_units END),0) INTO value FROM public.ledger_accounts a JOIN public.ledger_postings p ON p.account_id=a.id WHERE a.asset_id=target AND a.purpose=ANY(purposes);END IF;
 RETURN value;
END $$;

CREATE FUNCTION public.gw_signer_identity_fence(obligation uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE o public.crypto_obligations;u public.users;w public.wallet_links;
BEGIN
 IF public.gw_runtime_environment_allowed() IS NOT TRUE THEN RAISE EXCEPTION 'FINANCIAL_ENVIRONMENT_DENIED'; END IF;
 IF coalesce(current_setting('gw.environment',true),'') NOT IN ('testnet','mainnet') THEN RAISE EXCEPTION 'SIGNER_SCOPE_DENIED';END IF;
 SELECT * INTO o FROM public.crypto_obligations WHERE id=obligation AND environment=current_setting('gw.environment',true);IF NOT FOUND THEN RETURN false;END IF;
 IF o.user_id IS NULL THEN
  IF o.kind='unallocated_refund' THEN RETURN EXISTS(SELECT 1 FROM public.unallocated_inflows i JOIN public.unallocated_refund_claims c ON c.inflow_id=i.id WHERE i.id=(o.fee_snapshot->>'inflow_id')::uuid AND i.asset_id=o.asset_id AND i.sender=o.destination AND i.amount_base_units=o.gross_base_units);END IF;
  RETURN o.kind IN ('business','sweep');
 END IF;
 SELECT * INTO u FROM public.users WHERE id=o.user_id FOR SHARE;
 IF o.kind='refund' THEN RETURN true;END IF;
 IF o.kind='recovery' THEN RETURN EXISTS(SELECT 1 FROM public.liability_recoveries r WHERE r.obligation_id=o.id AND r.user_id=o.user_id AND r.asset_id=o.asset_id AND r.confirmed_at IS NOT NULL);END IF;
 IF u.status NOT IN ('active','deactivated') OR u.consented_at IS NULL THEN RETURN false;END IF;
 SELECT * INTO w FROM public.wallet_links WHERE user_id=o.user_id AND environment=current_setting('gw.environment',true) AND chain_id=o.registry_snapshot->>'network';
 RETURN w.address=o.destination AND w.revision=o.wallet_revision AND coalesce(w.cooling_until<=clock_timestamp(),true);
END $$;

CREATE FUNCTION public.gw_signer_owner_fence(obligation uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE asset uuid;BEGIN
 IF NOT public.gw_signer_identity_fence(obligation) THEN RETURN false;END IF;
 SELECT asset_id INTO asset FROM public.crypto_obligations WHERE id=obligation;
 RETURN public.gw_native_asset_fence(asset);
END $$;

CREATE FUNCTION public.gw_staff_reader() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
  SELECT coalesce(current_setting('gw.access',true)='staff' AND EXISTS (
    SELECT 1 FROM public.users WHERE id=public.gw_actor_id() AND role='admin' AND status='active'
  ),false)
$$;

CREATE FUNCTION public.gw_treasury_inventory_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.asset_id,NEW.address,NEW.created_at) IS NOT DISTINCT FROM (OLD.asset_id,OLD.address,OLD.created_at)
   AND NEW.last_monitor_at>=OLD.last_monitor_at THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'CHAIN_RECOVERY_EVIDENCE_RETAINED';
END $$;

CREATE FUNCTION public.gw_treasury_sweep_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE target uuid;j public.ledger_journals;BEGIN
 IF TG_TABLE_NAME='crypto_obligations' THEN target:=NEW.id;
 ELSIF TG_TABLE_NAME='ledger_journals' THEN target:=NULLIF(NEW.metadata->>'obligation_id','')::uuid;
 ELSE SELECT * INTO j FROM public.ledger_journals WHERE id=NEW.journal_id;target:=NULLIF(j.metadata->>'obligation_id','')::uuid;END IF;
 IF target IS NOT NULL THEN PERFORM public.gw_check_treasury_sweep(target);END IF;RETURN NULL;
END $$;

CREATE FUNCTION public.gw_unallocated_custody_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE i public.unallocated_inflows;j public.ledger_journals;total integer;valid integer;
BEGIN
 SELECT * INTO i FROM public.unallocated_inflows WHERE id=NEW.id;
 SELECT * INTO j FROM public.ledger_journals WHERE id=i.journal_id;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=i.asset_id AND a.owner_id IS NULL AND a.owner_type='system' AND p.amount_base_units=i.amount_base_units AND ((a.purpose='treasury_asset' AND p.direction='debit') OR (a.purpose='unallocated_payable' AND p.direction='credit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=i.journal_id;
 IF total<>2 OR valid<>2 OR j.ledger_type<>'CHAIN_UNALLOCATED' OR j.business_key<>'unallocated:'||i.id OR j.metadata->>'unallocated_id' IS DISTINCT FROM i.id::text OR NOT EXISTS(SELECT 1 FROM public.operation_keys WHERE business_key='chain-event:'||i.environment||':'||i.chain||':'||i.network||':'||i.tx_hash||':'||i.event_index||':'||i.asset_id AND result->>'purpose'='unallocated') THEN RAISE EXCEPTION 'UNALLOCATED_CUSTODY_INVALID';END IF;
 RETURN NULL;
END $$;

CREATE FUNCTION public.gw_unallocated_refund_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE o public.crypto_obligations;i public.unallocated_inflows;j public.ledger_journals;total integer;valid integer;
BEGIN
 SELECT * INTO o FROM public.crypto_obligations WHERE id=NEW.id;IF o.kind<>'unallocated_refund' THEN RETURN NULL;END IF;
 SELECT * INTO i FROM public.unallocated_inflows WHERE id=(o.fee_snapshot->>'inflow_id')::uuid;
 IF i.id IS NULL OR i.asset_id<>o.asset_id OR i.sender<>o.destination OR i.amount_base_units<>o.gross_base_units OR o.net_base_units<>o.gross_base_units OR o.charge_base_units<>0 OR o.user_id IS NOT NULL OR o.source_purpose<>'unallocated_payable' OR NOT EXISTS(SELECT 1 FROM public.unallocated_refund_claims WHERE inflow_id=i.id) THEN RAISE EXCEPTION 'UNALLOCATED_REFUND_INVALID';END IF;
 SELECT * INTO j FROM public.ledger_journals WHERE business_key='unallocated-hold:'||o.id;
 SELECT count(*),count(*) FILTER(WHERE a.asset_id=o.asset_id AND a.owner_id IS NULL AND p.amount_base_units=o.gross_base_units AND ((a.owner_type='system' AND a.purpose='unallocated_payable' AND p.direction='debit') OR (a.owner_type='platform' AND a.purpose='held_payable' AND p.direction='credit'))) INTO total,valid FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id WHERE p.journal_id=j.id;
 IF total<>2 OR valid<>2 OR j.metadata->>'obligation_id' IS DISTINCT FROM o.id::text THEN RAISE EXCEPTION 'UNALLOCATED_HOLD_REQUIRED';END IF;RETURN NULL;
END $$;

CREATE FUNCTION public.gw_unallocated_source_guard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE a public.ledger_accounts;balance numeric;BEGIN SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='system' AND a.purpose='unallocated_payable' THEN balance:=public.gw_counter_account_total(a.id);IF balance<0 THEN RAISE EXCEPTION 'UNALLOCATED_SOURCE_NEGATIVE';END IF;END IF;RETURN NULL;
END $$;

CREATE FUNCTION public.gw_unallocated_source_lock() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE a public.ledger_accounts;BEGIN
 SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='system' AND a.purpose='unallocated_payable' THEN PERFORM pg_advisory_xact_lock(hashtextextended('unallocated-source:'||a.asset_id,0));END IF;RETURN NEW;
END $$;

CREATE FUNCTION public.gw_validate_ledger_balance() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE target uuid; debit numeric; credit numeric; asset_count integer; line_count integer;
BEGIN
  IF TG_TABLE_NAME = 'ledger_journals' THEN target := NEW.id; ELSE target := NEW.journal_id; END IF;
  SELECT coalesce(sum(p.amount_base_units) FILTER (WHERE p.direction = 'debit'),0),
         coalesce(sum(p.amount_base_units) FILTER (WHERE p.direction = 'credit'),0),
         count(DISTINCT a.asset_id), count(*)
  INTO debit, credit, asset_count, line_count
  FROM public.ledger_postings p JOIN public.ledger_accounts a ON a.id=p.account_id
  WHERE p.journal_id=target;
  IF debit <= 0 OR debit <> credit OR asset_count <> 1 OR line_count < 2 THEN
    RAISE EXCEPTION 'LEDGER_UNBALANCED';
  END IF;
  RETURN NULL;
END;
$$;

CREATE FUNCTION public.gw_validate_receipt_allocation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $_$
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
END $_$;

CREATE FUNCTION public.gw_wallet_revision_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
 IF (to_jsonb(NEW)-ARRAY['address','verified_at','revision','cooling_until']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['address','verified_at','revision','cooling_until']) THEN RAISE EXCEPTION 'WALLET_IDENTITY_IMMUTABLE';END IF;
 IF NEW.address IS DISTINCT FROM OLD.address THEN
  IF OLD.environment NOT IN ('testnet','mainnet') OR NEW.revision<>OLD.revision+1 OR NEW.verified_at<=OLD.verified_at OR NEW.cooling_until<NEW.verified_at THEN RAISE EXCEPTION 'WALLET_REVISION_REQUIRED';END IF;
 ELSIF NEW.revision<>OLD.revision THEN RAISE EXCEPTION 'WALLET_REVISION_REQUIRED';END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.gw_withdrawal_snapshot_guard() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
  IF ROW(NEW.user_id,NEW.asset_id,NEW.gross_base_units,NEW.fee_base_units,NEW.net_base_units,NEW.destination,NEW.quote_expires_at,NEW.request_key,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.user_id,OLD.asset_id,OLD.gross_base_units,OLD.fee_base_units,OLD.net_base_units,OLD.destination,OLD.quote_expires_at,OLD.request_key,OLD.created_at)
    THEN RAISE EXCEPTION 'WITHDRAWAL_QUOTE_IMMUTABLE'; END IF;
  IF OLD.status='settled' AND ROW(NEW.status,NEW.settled_at) IS DISTINCT FROM ROW(OLD.status,OLD.settled_at) THEN RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;

CREATE TABLE public.abuse_signals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    source_key text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT abuse_signals_category_check CHECK ((category = 'payment_proof_failure'::text)),
    CONSTRAINT abuse_signals_source_key_check CHECK ((length(source_key) = 64))
);

CREATE TABLE public.alert_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_id uuid NOT NULL,
    business_key text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    lease_token uuid,
    lease_generation integer DEFAULT 0 NOT NULL,
    lease_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    delivered_at timestamp with time zone,
    occurrence integer DEFAULT 1 NOT NULL,
    payload_text text,
    payload_hash text,
    CONSTRAINT alert_deliveries_occurrence_check CHECK ((occurrence > 0)),
    CONSTRAINT alert_deliveries_payload_hash_check CHECK (((payload_hash IS NULL) OR (length(payload_hash) = 64))),
    CONSTRAINT alert_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'delivered'::text, 'failed'::text, 'cancelled'::text])))
);

CREATE TABLE public.appeals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT appeals_body_check CHECK (((length(body) >= 1) AND (length(body) <= 2000))),
    CONSTRAINT appeals_revision_check CHECK ((revision > 0)),
    CONSTRAINT appeals_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'dismissed'::text])))
);

CREATE TABLE public.archive_months (
    source_table text NOT NULL,
    month_start date NOT NULL,
    child_name text NOT NULL,
    state text DEFAULT 'hot'::text NOT NULL,
    cursor_id uuid,
    cursor_revision integer,
    walk_count bigint DEFAULT 0 NOT NULL,
    walk_hash text DEFAULT encode(sha256('\x'::bytea), 'hex'::text) NOT NULL,
    expected_count bigint,
    expected_hash text,
    frozen_at timestamp with time zone,
    archived_at timestamp with time zone,
    last_step_at timestamp with time zone DEFAULT '1970-01-01 00:00:00+00'::timestamp with time zone NOT NULL,
    CONSTRAINT archive_months_child_name_check CHECK ((child_name ~ '^gw_part_(lp|cs|au)_[0-9]{6}$'::text)),
    CONSTRAINT archive_months_expected_count_check CHECK ((expected_count >= 0)),
    CONSTRAINT archive_months_expected_hash_check CHECK (((expected_hash IS NULL) OR (length(expected_hash) = 64))),
    CONSTRAINT archive_months_month_start_check CHECK ((EXTRACT(day FROM month_start) = (1)::numeric)),
    CONSTRAINT archive_months_source_table_check CHECK ((source_table = ANY (ARRAY['ledger_postings'::text, 'chain_scan_pages'::text, 'audit_events'::text]))),
    CONSTRAINT archive_months_state_check CHECK ((state = ANY (ARRAY['hot'::text, 'hashing'::text, 'verifying'::text, 'archived'::text, 'review'::text]))),
    CONSTRAINT archive_months_walk_count_check CHECK ((walk_count >= 0)),
    CONSTRAINT archive_months_walk_hash_check CHECK ((length(walk_hash) = 64))
);

CREATE TABLE public.archive_record_keys (
    source_table text NOT NULL,
    record_key text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    CONSTRAINT archive_record_keys_record_key_check CHECK (((length(record_key) >= 1) AND (length(record_key) <= 100))),
    CONSTRAINT archive_record_keys_source_table_check CHECK ((source_table = ANY (ARRAY['ledger_postings'::text, 'chain_scan_pages'::text, 'audit_events'::text])))
);

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    symbol text NOT NULL,
    environment text NOT NULL,
    chain_id text NOT NULL,
    decimals integer NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    registry_binding jsonb,
    CONSTRAINT assets_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])))
);

CREATE TABLE public.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    reason text,
    before_state jsonb,
    after_state jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id uuid DEFAULT (NULLIF(current_setting('gw.request_id'::text, true), ''::text))::uuid
)
PARTITION BY RANGE (created_at);

CREATE TABLE public.auth_factors (
    user_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    secret_cipher text NOT NULL,
    active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    setup_expires_at timestamp with time zone NOT NULL,
    last_step bigint DEFAULT '-1'::integer NOT NULL,
    CONSTRAINT auth_factors_last_step_check CHECK ((last_step >= '-1'::integer)),
    CONSTRAINT auth_factors_secret_cipher_check CHECK (((length(secret_cipher) >= 60) AND (length(secret_cipher) <= 512)))
);

CREATE TABLE public.auth_flows (
    state_hash text NOT NULL,
    nonce_hash text NOT NULL,
    verifier_cipher text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    CONSTRAINT auth_flows_check CHECK ((expires_at > created_at)),
    CONSTRAINT auth_flows_nonce_hash_check CHECK ((length(nonce_hash) = 64)),
    CONSTRAINT auth_flows_state_hash_check CHECK ((length(state_hash) = 64)),
    CONSTRAINT auth_flows_verifier_cipher_check CHECK (((length(verifier_cipher) >= 60) AND (length(verifier_cipher) <= 512)))
);

CREATE TABLE public.auth_recovery_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    factor_id uuid NOT NULL,
    code_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    used_at timestamp with time zone,
    CONSTRAINT auth_recovery_codes_code_hash_check CHECK ((length(code_hash) = 64))
);

CREATE TABLE public.auth_refresh_tokens (
    token_hash text NOT NULL,
    session_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    CONSTRAINT auth_refresh_tokens_check CHECK ((expires_at > created_at)),
    CONSTRAINT auth_refresh_tokens_token_hash_check CHECK ((length(token_hash) = 64))
);

CREATE TABLE public.auth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    generation uuid DEFAULT gen_random_uuid() NOT NULL,
    session_version integer NOT NULL,
    access_hash text NOT NULL,
    csrf_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    access_expires_at timestamp with time zone NOT NULL,
    idle_expires_at timestamp with time zone NOT NULL,
    absolute_expires_at timestamp with time zone NOT NULL,
    pre_auth boolean DEFAULT false NOT NULL,
    revoked_at timestamp with time zone,
    step_up_at timestamp with time zone,
    CONSTRAINT auth_sessions_access_hash_check CHECK ((length(access_hash) = 64)),
    CONSTRAINT auth_sessions_check CHECK (((access_expires_at > created_at) AND (idle_expires_at > created_at) AND (absolute_expires_at > created_at))),
    CONSTRAINT auth_sessions_csrf_hash_check CHECK ((length(csrf_hash) = 64)),
    CONSTRAINT auth_sessions_session_version_check CHECK ((session_version > 0))
);

CREATE TABLE public.auth_totp_replays (
    factor_id uuid NOT NULL,
    time_step bigint NOT NULL,
    accepted_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT auth_totp_replays_time_step_check CHECK ((time_step >= 0))
);

CREATE TABLE public.bot_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_generation uuid NOT NULL,
    environment text NOT NULL,
    surface text NOT NULL,
    provider text NOT NULL,
    dummy_hash text,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT bot_challenges_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT bot_challenges_provider_check CHECK ((provider = ANY (ARRAY['dummy'::text, 'turnstile'::text]))),
    CONSTRAINT bot_challenges_surface_check CHECK ((surface = ANY (ARRAY['consent'::text, 'suspicious_checkout'::text])))
);

CREATE TABLE public.bot_token_uses (
    token_hash text NOT NULL,
    challenge_id uuid NOT NULL,
    request_key text NOT NULL,
    environment text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT bot_token_uses_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT bot_token_uses_token_hash_check CHECK ((length(token_hash) = 64))
);

CREATE TABLE public.chain_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    binding_fingerprint text NOT NULL,
    treasury_fingerprint text NOT NULL,
    treasury_sender text NOT NULL,
    registry_snapshot jsonb NOT NULL,
    configuration_hash text NOT NULL,
    height numeric(78,0) NOT NULL,
    block_hash text NOT NULL,
    actor_user_id uuid NOT NULL,
    proof_reference text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT chain_checkpoints_binding_fingerprint_check CHECK ((length(binding_fingerprint) = 64)),
    CONSTRAINT chain_checkpoints_configuration_hash_check CHECK ((length(configuration_hash) = 64)),
    CONSTRAINT chain_checkpoints_height_check CHECK ((height >= (0)::numeric)),
    CONSTRAINT chain_checkpoints_proof_reference_check CHECK (((length(proof_reference) >= 5) AND (length(proof_reference) <= 200))),
    CONSTRAINT chain_checkpoints_treasury_fingerprint_check CHECK ((length(treasury_fingerprint) = 64))
);

CREATE TABLE public.chain_fee_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    environment text NOT NULL,
    chain text NOT NULL,
    network text NOT NULL,
    tx_hash text NOT NULL,
    native_asset_id uuid NOT NULL,
    network_fee_base_units numeric(78,0) NOT NULL,
    account_setup_base_units numeric(78,0) NOT NULL,
    gas_journal_id uuid,
    setup_journal_id uuid,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT chain_fee_claims_account_setup_base_units_check CHECK ((account_setup_base_units >= (0)::numeric)),
    CONSTRAINT chain_fee_claims_chain_check CHECK ((chain = ANY (ARRAY['eth'::text, 'bnb'::text, 'sol'::text, 'tron'::text]))),
    CONSTRAINT chain_fee_claims_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text]))),
    CONSTRAINT chain_fee_claims_network_fee_base_units_check CHECK ((network_fee_base_units >= (0)::numeric))
);

CREATE TABLE public.chain_observations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_key text NOT NULL,
    user_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    tx_hash text NOT NULL,
    event_index integer NOT NULL,
    source_job_id uuid,
    rounds integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    next_observation_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT chain_observations_event_index_check CHECK (((event_index >= '-1'::integer) AND (event_index <= 1000))),
    CONSTRAINT chain_observations_rounds_check CHECK (((rounds >= 0) AND (rounds <= 2880))),
    CONSTRAINT chain_observations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'done'::text, 'review'::text])))
);

CREATE TABLE public.chain_recovery_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checkpoint_id uuid NOT NULL,
    binding_fingerprint text NOT NULL,
    through_height numeric(78,0) NOT NULL,
    cursor_height numeric(78,0) NOT NULL,
    state text DEFAULT 'scanning'::text NOT NULL,
    revision integer DEFAULT 0 NOT NULL,
    incoming_count integer DEFAULT 0 NOT NULL,
    outgoing_count integer DEFAULT 0 NOT NULL,
    reason_code text,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    completed_at timestamp with time zone,
    known_attempt_cursor uuid,
    scan_progress jsonb,
    balance_witness jsonb,
    CONSTRAINT chain_recovery_runs_binding_fingerprint_check CHECK ((length(binding_fingerprint) = 64)),
    CONSTRAINT chain_recovery_runs_check CHECK ((cursor_height <= through_height)),
    CONSTRAINT chain_recovery_runs_incoming_count_check CHECK ((incoming_count >= 0)),
    CONSTRAINT chain_recovery_runs_outgoing_count_check CHECK ((outgoing_count >= 0)),
    CONSTRAINT chain_recovery_runs_revision_check CHECK ((revision >= 0)),
    CONSTRAINT chain_recovery_runs_state_check CHECK ((state = ANY (ARRAY['scanning'::text, 'review'::text, 'reconciled'::text]))),
    CONSTRAINT recovery_balance_witness_check CHECK (((balance_witness IS NULL) OR (((jsonb_typeof(balance_witness) = 'object'::text) AND ((balance_witness ->> 'format'::text) = 'gw-finalized-balance-v1'::text) AND ((balance_witness ->> 'checkpoint_id'::text) = (checkpoint_id)::text) AND ((balance_witness ->> 'binding_fingerprint'::text) = binding_fingerprint) AND ((balance_witness ->> 'height'::text) = (through_height)::text) AND ((length((balance_witness ->> 'asset_key'::text)) >= 1) AND (length((balance_witness ->> 'asset_key'::text)) <= 30)) AND ((length((balance_witness ->> 'address'::text)) >= 1) AND (length((balance_witness ->> 'address'::text)) <= 128)) AND ((length((balance_witness ->> 'block_hash'::text)) >= 1) AND (length((balance_witness ->> 'block_hash'::text)) <= 100)) AND ((balance_witness ->> 'amount_base_units'::text) ~ '^(0|[1-9][0-9]{0,77})$'::text) AND ((balance_witness - ARRAY['format'::text, 'asset_key'::text, 'checkpoint_id'::text, 'binding_fingerprint'::text, 'address'::text, 'height'::text, 'block_hash'::text, 'amount_base_units'::text]) = '{}'::jsonb)) IS TRUE))),
    CONSTRAINT recovery_progress_shape CHECK (((scan_progress IS NULL) OR ((jsonb_typeof(scan_progress) = 'object'::text) AND (octet_length((scan_progress)::text) <= 16384) AND (scan_progress ?& ARRAY['stage'::text, 'cursor'::text]) AND (jsonb_typeof((scan_progress -> 'stage'::text)) = 'string'::text) AND ((scan_progress ->> 'stage'::text) = ANY (ARRAY['discover'::text, 'verify'::text, 'book'::text, 'known_next'::text, 'known_index'::text, 'known_settle'::text, 'known_expiry'::text, 'balance'::text])) AND (jsonb_typeof((scan_progress -> 'cursor'::text)) = 'object'::text) AND ((scan_progress -> 'cursor'::text) ?& ARRAY['height'::text, 'transaction'::text, 'event'::text]) AND (jsonb_typeof(((scan_progress -> 'cursor'::text) -> 'height'::text)) = 'string'::text) AND (((scan_progress -> 'cursor'::text) ->> 'height'::text) ~ '^(0|[1-9][0-9]{0,77})$'::text) AND ((((scan_progress -> 'cursor'::text) ->> 'height'::text))::numeric = (cursor_height + (1)::numeric)) AND (jsonb_typeof(((scan_progress -> 'cursor'::text) -> 'transaction'::text)) = 'number'::text) AND (((scan_progress -> 'cursor'::text) ->> 'transaction'::text) ~ '^(0|[1-9][0-9]{0,5})$'::text) AND ((((scan_progress -> 'cursor'::text) ->> 'transaction'::text))::integer <= 100000) AND (jsonb_typeof(((scan_progress -> 'cursor'::text) -> 'event'::text)) = 'number'::text) AND (((scan_progress -> 'cursor'::text) ->> 'event'::text) ~ '^(0|[1-9][0-9]{0,5})$'::text) AND ((((scan_progress -> 'cursor'::text) ->> 'event'::text))::integer <= 100000))))
);

CREATE TABLE public.chain_scan_pages (
    run_id uuid NOT NULL,
    revision integer NOT NULL,
    from_height numeric(78,0) NOT NULL,
    through_height numeric(78,0) NOT NULL,
    evidence_hash text NOT NULL,
    incoming_count integer NOT NULL,
    outgoing_count integer NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    progress_before jsonb,
    progress_after jsonb,
    CONSTRAINT chain_scan_pages_check1 CHECK (((incoming_count >= 0) AND (outgoing_count >= 0))),
    CONSTRAINT chain_scan_pages_evidence_hash_check CHECK ((length(evidence_hash) = 64)),
    CONSTRAINT scan_page_height_order CHECK ((from_height <= through_height))
)
PARTITION BY RANGE (created_at);

CREATE TABLE public.crypto_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    environment text NOT NULL,
    chain text NOT NULL,
    tx_hash text NOT NULL,
    event_index integer NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    sender text NOT NULL,
    destination text NOT NULL,
    block_hash text NOT NULL,
    block_height numeric(78,0) NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT crypto_events_amount_base_units_check CHECK ((amount_base_units >= (0)::numeric)),
    CONSTRAINT crypto_events_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text]))),
    CONSTRAINT crypto_events_event_index_check CHECK ((event_index >= 0)),
    CONSTRAINT crypto_events_status_check CHECK ((status = ANY (ARRAY['confirmed'::text, 'credited'::text, 'exception'::text, 'reorged'::text])))
);

CREATE TABLE public.crypto_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_version_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    request_key uuid NOT NULL,
    session_generation uuid NOT NULL,
    wallet_id uuid NOT NULL,
    wallet_revision integer NOT NULL,
    environment text NOT NULL,
    chain text NOT NULL,
    registry_hash text NOT NULL,
    treasury text NOT NULL,
    sender text NOT NULL,
    expected_base_units numeric(78,0) NOT NULL,
    usd_reference numeric(38,18) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    status text DEFAULT 'quoted'::text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    registry_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    profile_revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT crypto_invoices_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text]))),
    CONSTRAINT crypto_invoices_expected_base_units_check CHECK ((expected_base_units > (0)::numeric)),
    CONSTRAINT crypto_invoices_profile_revision_check CHECK ((profile_revision > 0)),
    CONSTRAINT crypto_invoices_registry_hash_check CHECK ((length(registry_hash) = 64)),
    CONSTRAINT crypto_invoices_status_check CHECK ((status = ANY (ARRAY['quoted'::text, 'submitted'::text, 'credited'::text, 'exception'::text, 'expired'::text, 'cancelled'::text]))),
    CONSTRAINT crypto_invoices_usd_reference_check CHECK ((usd_reference > (0)::numeric))
);

CREATE TABLE public.crypto_obligations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    asset_id uuid NOT NULL,
    kind text NOT NULL,
    business_key text NOT NULL,
    request_hash text NOT NULL,
    environment text NOT NULL,
    chain text NOT NULL,
    treasury_fingerprint text NOT NULL,
    configuration_hash text NOT NULL,
    registry_hash text NOT NULL,
    destination text NOT NULL,
    source_purpose text NOT NULL,
    wallet_revision integer,
    session_generation uuid,
    gross_base_units numeric(78,0) NOT NULL,
    charge_base_units numeric(78,0) NOT NULL,
    net_base_units numeric(78,0) NOT NULL,
    native_fee_quote numeric(78,0) NOT NULL,
    rate_snapshot jsonb NOT NULL,
    fee_snapshot jsonb NOT NULL,
    status text DEFAULT 'quoted'::text NOT NULL,
    quote_expires_at timestamp with time zone NOT NULL,
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    registry_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    previous_obligation_id uuid,
    treasury_sender text,
    CONSTRAINT crypto_obligations_charge_base_units_check CHECK ((charge_base_units >= (0)::numeric)),
    CONSTRAINT crypto_obligations_check CHECK (((net_base_units + charge_base_units) = gross_base_units)),
    CONSTRAINT crypto_obligations_configuration_hash_check CHECK ((length(configuration_hash) = 64)),
    CONSTRAINT crypto_obligations_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text]))),
    CONSTRAINT crypto_obligations_gross_base_units_check CHECK ((gross_base_units > (0)::numeric)),
    CONSTRAINT crypto_obligations_kind_check CHECK ((kind = ANY (ARRAY['withdrawal'::text, 'business'::text, 'refund'::text, 'sweep'::text, 'recovery'::text, 'unallocated_refund'::text]))),
    CONSTRAINT crypto_obligations_native_fee_quote_check CHECK ((native_fee_quote >= (0)::numeric)),
    CONSTRAINT crypto_obligations_net_base_units_check CHECK ((net_base_units > (0)::numeric)),
    CONSTRAINT crypto_obligations_registry_hash_check CHECK ((length(registry_hash) = 64)),
    CONSTRAINT crypto_obligations_request_hash_check CHECK ((length(request_hash) = 64)),
    CONSTRAINT crypto_obligations_status_check CHECK ((status = ANY (ARRAY['quoted'::text, 'held'::text, 'approved'::text, 'signing'::text, 'broadcast'::text, 'settled'::text, 'awaiting_requote'::text, 'exception'::text, 'cancelled'::text]))),
    CONSTRAINT crypto_obligations_treasury_fingerprint_check CHECK ((length(treasury_fingerprint) = 64))
);

CREATE TABLE public.crypto_reorg_resolutions (
    review_id uuid NOT NULL,
    journal_id uuid NOT NULL,
    block_hash text NOT NULL,
    evidence_hash text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    block_height numeric(78,0),
    CONSTRAINT crypto_reorg_resolutions_block_height_check CHECK ((block_height >= (0)::numeric)),
    CONSTRAINT crypto_reorg_resolutions_evidence_hash_check CHECK ((length(evidence_hash) = 64)),
    CONSTRAINT crypto_reorg_resolutions_reason_check CHECK (((length(reason) >= 10) AND (length(reason) <= 500)))
);

CREATE TABLE public.crypto_reorg_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    revision integer NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    original_block_hash text NOT NULL,
    evidence_hash text NOT NULL,
    loss_journal_id uuid NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    anchor_height numeric(78,0) NOT NULL,
    CONSTRAINT crypto_reorg_reviews_amount_base_units_check CHECK ((amount_base_units > (0)::numeric)),
    CONSTRAINT crypto_reorg_reviews_evidence_hash_check CHECK ((length(evidence_hash) = 64)),
    CONSTRAINT crypto_reorg_reviews_reason_check CHECK (((length(reason) >= 10) AND (length(reason) <= 500))),
    CONSTRAINT crypto_reorg_reviews_revision_check CHECK (((revision >= 1) AND (revision <= 1000000))),
    CONSTRAINT native_review_anchor_height CHECK ((anchor_height >= (0)::numeric))
);

CREATE TABLE public.crypto_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    tx_hash text NOT NULL,
    event_index integer NOT NULL,
    first_seen_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT crypto_submissions_event_index_check CHECK (((event_index >= '-1'::integer) AND (event_index <= 1000)))
);

CREATE TABLE public.cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_version_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    credited_count integer DEFAULT 0 NOT NULL,
    receipts_required integer NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cycles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'exception'::text])))
);

CREATE TABLE public.data_exports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'building'::text NOT NULL,
    section integer DEFAULT 0 NOT NULL,
    page integer DEFAULT 0 NOT NULL,
    after_id uuid,
    total_bytes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    error_code text,
    CONSTRAINT data_exports_check CHECK ((expires_at > created_at)),
    CONSTRAINT data_exports_check1 CHECK ((((status = 'building'::text) AND (completed_at IS NULL)) OR ((status <> 'building'::text) AND (completed_at IS NOT NULL)))),
    CONSTRAINT data_exports_error_code_check CHECK ((error_code = ANY (ARRAY['LIMIT_EXCEEDED'::text, 'ACCOUNT_RESTRICTED'::text, 'BUILD_FAILED'::text]))),
    CONSTRAINT data_exports_page_check CHECK (((page >= 0) AND (page <= 10000))),
    CONSTRAINT data_exports_section_check CHECK (((section >= 0) AND (section <= 12))),
    CONSTRAINT data_exports_status_check CHECK ((status = ANY (ARRAY['building'::text, 'ready'::text, 'failed'::text, 'expired'::text]))),
    CONSTRAINT data_exports_total_bytes_check CHECK (((total_bytes >= 0) AND (total_bytes <= 52428800)))
);

CREATE TABLE public.database_binding_nonce (
    singleton boolean DEFAULT true NOT NULL,
    nonce uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT database_binding_nonce_singleton_check CHECK (singleton)
);

CREATE TABLE public.deployment_binding_challenges (
    id uuid NOT NULL,
    environment text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deployment_binding_challenges_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])))
);

CREATE TABLE public.environment_instances (
    environment text NOT NULL,
    instance_id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT environment_instances_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])))
);

CREATE TABLE public.export_chunks (
    export_id uuid NOT NULL,
    part integer NOT NULL,
    section text NOT NULL,
    cipher text NOT NULL,
    sha256 text NOT NULL,
    row_count integer NOT NULL,
    byte_count integer NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT export_chunks_byte_count_check CHECK (((byte_count >= 0) AND (byte_count <= 1048576))),
    CONSTRAINT export_chunks_cipher_check CHECK ((octet_length(cipher) <= 1400000)),
    CONSTRAINT export_chunks_part_check CHECK (((part >= 0) AND (part <= 10000))),
    CONSTRAINT export_chunks_row_count_check CHECK (((row_count >= 0) AND (row_count <= 100))),
    CONSTRAINT export_chunks_sha256_check CHECK ((length(sha256) = 64))
);

CREATE TABLE public.financial_reconciliation_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_job_id uuid NOT NULL,
    environment text NOT NULL,
    run_date date NOT NULL,
    balanced boolean NOT NULL,
    consistent boolean NOT NULL,
    lineage_complete boolean NOT NULL,
    result jsonb NOT NULL,
    snapshot_started_at timestamp with time zone DEFAULT now() NOT NULL,
    checked_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT financial_reconciliation_results_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT financial_reconciliation_results_result_check CHECK (((jsonb_typeof(result) = 'object'::text) AND (octet_length((result)::text) <= 131072)))
);

CREATE TABLE public.queue_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partition_id uuid NOT NULL,
    ticket bigint NOT NULL,
    kind text NOT NULL,
    cycle_id uuid,
    beneficiary_user_id uuid,
    platform_role text,
    priority_ticket bigint,
    required_count integer NOT NULL,
    credited_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'waiting'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    priority_revision integer DEFAULT 1 NOT NULL,
    cancelled_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT queue_entries_cancelled_count_check CHECK (((cancelled_count >= 0) AND (cancelled_count <= (required_count - credited_count)) AND ((cancelled_count = 0) OR ((kind = 'bootstrap'::text) AND (status = 'removed'::text))))),
    CONSTRAINT queue_entries_kind_check CHECK ((kind = ANY (ARRAY['member'::text, 'bootstrap'::text]))),
    CONSTRAINT queue_entries_priority_revision_check CHECK ((priority_revision > 0)),
    CONSTRAINT queue_entries_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'fully_allocated'::text, 'fulfilled'::text, 'removed'::text]))),
    CONSTRAINT queue_entry_ticket_bounds CHECK (((ticket >= 1) AND (ticket <= '1099511627775'::bigint) AND ((priority_ticket IS NULL) OR ((priority_ticket >= 1) AND (priority_ticket <= '1099511627775'::bigint)))))
);

CREATE TABLE public.simulation_reorg_resolutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    environment text DEFAULT 'simulation'::text NOT NULL,
    journal_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    operation_key text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT simulation_reorg_resolutions_environment_check CHECK ((environment = 'simulation'::text)),
    CONSTRAINT simulation_reorg_resolutions_reason_check CHECK (((length(reason) >= 5) AND (length(reason) <= 500)))
);

CREATE VIEW public.gw_cycle_financial_reviews WITH (security_barrier='true') AS
 SELECT c.id AS cycle_id,
    bool_or(((e.ticket >= r.source_ticket) OR COALESCE((e.id = r.receiver_entry_id), false))) AS under_review,
    (count(*) FILTER (WHERE (e.id = r.receiver_entry_id)))::integer AS invalid_credit_count,
    true AS queue_paused
   FROM (((public.cycles c
     JOIN public.queue_entries e ON ((e.cycle_id = c.id)))
     JOIN public.simulation_reorg_reviews r ON ((r.partition_id = e.partition_id)))
     LEFT JOIN public.simulation_reorg_resolutions resolved ON ((resolved.review_id = r.id)))
  WHERE ((resolved.id IS NULL) AND (r.environment = current_setting('gw.environment'::text, true)) AND (c.user_id = public.gw_actor_id()))
  GROUP BY c.id;

CREATE TABLE public.gw_part_au_default (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    reason text,
    before_state jsonb,
    after_state jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id uuid DEFAULT (NULLIF(current_setting('gw.request_id'::text, true), ''::text))::uuid
);

CREATE TABLE public.gw_part_cs_default (
    run_id uuid NOT NULL,
    revision integer NOT NULL,
    from_height numeric(78,0) NOT NULL,
    through_height numeric(78,0) NOT NULL,
    evidence_hash text NOT NULL,
    incoming_count integer NOT NULL,
    outgoing_count integer NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    progress_before jsonb,
    progress_after jsonb,
    CONSTRAINT chain_scan_pages_check1 CHECK (((incoming_count >= 0) AND (outgoing_count >= 0))),
    CONSTRAINT chain_scan_pages_evidence_hash_check CHECK ((length(evidence_hash) = 64)),
    CONSTRAINT scan_page_height_order CHECK ((from_height <= through_height))
);

CREATE TABLE public.ledger_postings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_id uuid NOT NULL,
    account_id uuid NOT NULL,
    direction text NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ledger_postings_amount_base_units_check CHECK ((amount_base_units > (0)::numeric)),
    CONSTRAINT ledger_postings_direction_check CHECK ((direction = ANY (ARRAY['debit'::text, 'credit'::text])))
)
PARTITION BY RANGE (created_at);

CREATE TABLE public.gw_part_lp_default (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_id uuid NOT NULL,
    account_id uuid NOT NULL,
    direction text NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ledger_postings_amount_base_units_check CHECK ((amount_base_units > (0)::numeric)),
    CONSTRAINT ledger_postings_direction_check CHECK ((direction = ANY (ARRAY['debit'::text, 'credit'::text])))
);

CREATE VIEW public.gw_queue_positions WITH (security_barrier='true') AS
 SELECT id AS entry_id,
    public.gw_queue_rank(id, 'display'::text) AS display_position
   FROM public.queue_entries e
  WHERE (public.gw_owns(beneficiary_user_id) AND (status = 'waiting'::text));

CREATE TABLE public.signed_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    obligation_id uuid NOT NULL,
    attempt integer NOT NULL,
    environment text NOT NULL,
    chain text NOT NULL,
    tx_hash text NOT NULL,
    nonce numeric(78,0),
    valid_until_height numeric(78,0),
    signed_cipher text NOT NULL,
    native_fee_cap numeric(78,0) NOT NULL,
    intent_hash text NOT NULL,
    configuration_hash text NOT NULL,
    status text DEFAULT 'signed'::text NOT NULL,
    actual_native_fee numeric(78,0),
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    broadcast_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    previous_attempt_id uuid,
    signed_at_height numeric(78,0),
    expires_at timestamp with time zone,
    CONSTRAINT signed_attempt_actual_fee_check CHECK (((actual_native_fee IS NULL) OR (actual_native_fee >= (0)::numeric))),
    CONSTRAINT signed_attempt_no_execution_fee CHECK (((status <> ALL (ARRAY['expired'::text, 'superseded'::text])) OR (actual_native_fee = (0)::numeric))),
    CONSTRAINT signed_attempt_terminal_shape CHECK (((status <> ALL (ARRAY['confirmed'::text, 'failed'::text, 'expired'::text, 'superseded'::text])) OR ((actual_native_fee IS NOT NULL) AND (confirmed_at IS NOT NULL)))),
    CONSTRAINT signed_attempts_attempt_check CHECK ((attempt > 0)),
    CONSTRAINT signed_attempts_configuration_hash_check CHECK ((length(configuration_hash) = 64)),
    CONSTRAINT signed_attempts_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text]))),
    CONSTRAINT signed_attempts_intent_hash_check CHECK ((length(intent_hash) = 64)),
    CONSTRAINT signed_attempts_native_fee_cap_check CHECK ((native_fee_cap >= (0)::numeric)),
    CONSTRAINT signed_attempts_signed_at_height_check CHECK ((signed_at_height >= (0)::numeric)),
    CONSTRAINT signed_attempts_status_check CHECK ((status = ANY (ARRAY['signed'::text, 'broadcast'::text, 'confirmed'::text, 'failed'::text, 'expired'::text, 'unknown'::text, 'superseded'::text])))
);

CREATE VIEW public.gw_signed_attempt_status WITH (security_barrier='true') AS
 SELECT id,
    obligation_id,
    tx_hash,
    nonce,
    native_fee_cap,
    status,
    actual_native_fee,
    intent_hash,
    configuration_hash,
    valid_until_height,
    expires_at,
    previous_attempt_id,
    signed_at_height,
    created_at
   FROM public.signed_attempts;

CREATE TABLE public.signer_heartbeats (
    treasury_fingerprint text NOT NULL,
    environment text NOT NULL,
    chain text NOT NULL,
    configuration_hash text NOT NULL,
    heartbeat_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT signer_heartbeats_chain_check CHECK ((chain = ANY (ARRAY['eth'::text, 'bnb'::text, 'sol'::text, 'tron'::text]))),
    CONSTRAINT signer_heartbeats_configuration_hash_check CHECK ((length(configuration_hash) = 64)),
    CONSTRAINT signer_heartbeats_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text]))),
    CONSTRAINT signer_heartbeats_treasury_fingerprint_check CHECK ((length(treasury_fingerprint) = 64))
);

CREATE TABLE public.signer_reservations (
    obligation_id uuid NOT NULL,
    treasury_fingerprint text NOT NULL,
    asset_id uuid NOT NULL,
    signing_day date NOT NULL,
    principal_usd_micros numeric(78,0) NOT NULL,
    native_fee_reserved numeric(78,0) NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT signer_reservations_native_fee_reserved_check CHECK ((native_fee_reserved >= (0)::numeric)),
    CONSTRAINT signer_reservations_principal_usd_micros_check CHECK ((principal_usd_micros >= (0)::numeric))
);

CREATE TABLE public.signer_states (
    treasury_fingerprint text NOT NULL,
    environment text NOT NULL,
    chain text NOT NULL,
    next_nonce numeric(78,0) DEFAULT 0 NOT NULL,
    lease_token uuid,
    lease_generation integer DEFAULT 0 NOT NULL,
    lease_until timestamp with time zone,
    heartbeat_at timestamp with time zone,
    configuration_hash text,
    CONSTRAINT signer_states_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text]))),
    CONSTRAINT signer_states_next_nonce_check CHECK ((next_nonce >= (0)::numeric)),
    CONSTRAINT signer_states_treasury_fingerprint_check CHECK ((length(treasury_fingerprint) = 64))
);

CREATE VIEW public.gw_signer_health WITH (security_barrier='true') AS
 SELECT h.treasury_fingerprint,
    h.chain,
    GREATEST(h.heartbeat_at, s.heartbeat_at) AS heartbeat_at,
    (COALESCE(( SELECT sum(r.native_fee_reserved) AS sum
           FROM (public.signer_reservations r
             JOIN public.crypto_obligations o ON ((o.id = r.obligation_id)))
          WHERE ((r.treasury_fingerprint = h.treasury_fingerprint) AND (o.completed_at IS NULL) AND (o.status = ANY (ARRAY['approved'::text, 'signing'::text, 'broadcast'::text, 'exception'::text, 'awaiting_requote'::text])))), (0)::numeric))::numeric(78,0) AS native_reserved
   FROM (( SELECT signer_heartbeats.treasury_fingerprint,
            signer_heartbeats.chain,
            signer_heartbeats.heartbeat_at
           FROM public.signer_heartbeats
          WHERE (signer_heartbeats.environment = 'testnet'::text)
        UNION ALL
         SELECT s0.treasury_fingerprint,
            s0.chain,
            s0.heartbeat_at
           FROM public.signer_states s0
          WHERE ((s0.environment = 'testnet'::text) AND (NOT (EXISTS ( SELECT 1
                   FROM public.signer_heartbeats h0
                  WHERE (h0.treasury_fingerprint = s0.treasury_fingerprint)))))) h
     LEFT JOIN public.signer_states s ON ((s.treasury_fingerprint = h.treasury_fingerprint)));

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    email text,
    role text DEFAULT 'member'::text NOT NULL,
    status text DEFAULT 'pending_consent'::text NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    consent_version text,
    consented_at timestamp with time zone,
    referrer_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    session_version integer DEFAULT 1 NOT NULL,
    age_confirmed_at timestamp with time zone,
    age_minimum_accepted integer,
    account_revision integer DEFAULT 1 NOT NULL,
    suspension_until timestamp with time zone,
    suspension_previous_status text,
    publication_classification text DEFAULT 'unreviewed'::text NOT NULL,
    activity_opt_in boolean DEFAULT false NOT NULL,
    activity_revision integer DEFAULT 1 NOT NULL,
    time_zone text DEFAULT 'Africa/Lagos'::text NOT NULL,
    preferences_revision integer DEFAULT 1 NOT NULL,
    age_dob_verified_at timestamp with time zone,
    CONSTRAINT users_account_revision_check CHECK ((account_revision > 0)),
    CONSTRAINT users_activity_revision_check CHECK ((activity_revision > 0)),
    CONSTRAINT users_age_minimum_accepted_check CHECK (((age_minimum_accepted >= 1) AND (age_minimum_accepted <= 120))),
    CONSTRAINT users_dob_verification_check CHECK (((age_dob_verified_at IS NULL) OR ((age_confirmed_at IS NOT NULL) AND (age_minimum_accepted IS NOT NULL)))),
    CONSTRAINT users_preferences_revision_check CHECK ((preferences_revision > 0)),
    CONSTRAINT users_publication_classification_check CHECK ((publication_classification = ANY (ARRAY['unreviewed'::text, 'test'::text, 'real'::text]))),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['member'::text, 'moderator'::text, 'admin'::text]))),
    CONSTRAINT users_session_version_check CHECK ((session_version > 0)),
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['pending_consent'::text, 'active'::text, 'suspended'::text, 'banned'::text, 'deactivated'::text, 'deleted'::text]))),
    CONSTRAINT users_suspension_previous_status_check CHECK ((suspension_previous_status = ANY (ARRAY['active'::text, 'deactivated'::text])))
);

CREATE VIEW public.gw_sim_accounts WITH (security_barrier='true') AS
 SELECT id,
    username,
    role,
    status,
    locale
   FROM public.users
  WHERE (current_setting('gw.environment'::text, true) = 'simulation'::text);

CREATE TABLE public.ledger_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    owner_type text NOT NULL,
    owner_id uuid,
    purpose text NOT NULL,
    normal_side text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ledger_accounts_normal_side_check CHECK ((normal_side = ANY (ARRAY['debit'::text, 'credit'::text]))),
    CONSTRAINT ledger_accounts_owner_type_check CHECK ((owner_type = ANY (ARRAY['user'::text, 'platform'::text, 'system'::text])))
);

CREATE VIEW public.gw_user_account_balances WITH (security_barrier='true') AS
 SELECT a.owner_id AS user_id,
    a.asset_id,
    a.purpose,
    (public.gw_account_balance(a.id))::numeric(78,0) AS balance
   FROM (public.ledger_accounts a
     JOIN public.assets x ON ((x.id = a.asset_id)))
  WHERE ((a.owner_type = 'user'::text) AND public.gw_owns(a.owner_id) AND (x.environment = current_setting('gw.environment'::text, true)));

CREATE VIEW public.gw_user_financial_reviews WITH (security_barrier='true') AS
 SELECT u.id AS user_id,
    r.asset_id,
    (count(*))::integer AS review_count
   FROM ((public.simulation_reorg_reviews r
     JOIN public.users u ON ((u.id = ANY (r.affected_user_ids))))
     LEFT JOIN public.simulation_reorg_resolutions resolved ON ((resolved.review_id = r.id)))
  WHERE ((resolved.id IS NULL) AND (r.environment = current_setting('gw.environment'::text, true)) AND (u.id = public.gw_actor_id()))
  GROUP BY u.id, r.asset_id;

CREATE TABLE public.help_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    locale text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    published boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_by uuid,
    CONSTRAINT help_articles_body_check CHECK (((length(body) >= 1) AND (length(body) <= 20000))),
    CONSTRAINT help_articles_locale_check CHECK ((locale = ANY (ARRAY['en'::text, 'fr'::text]))),
    CONSTRAINT help_articles_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'::text)),
    CONSTRAINT help_articles_title_check CHECK (((length(title) >= 1) AND (length(title) <= 200))),
    CONSTRAINT help_articles_version_check CHECK ((version > 0))
);

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    outbox_id uuid NOT NULL,
    business_key text NOT NULL,
    environment text NOT NULL,
    kind text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    retry_limit integer NOT NULL,
    due_at timestamp with time zone DEFAULT now() NOT NULL,
    lease_generation integer DEFAULT 0 NOT NULL,
    lease_token uuid,
    lease_until timestamp with time zone,
    last_error_code text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    redacted_at timestamp with time zone,
    redacted_payload_hash text,
    request_id uuid DEFAULT (NULLIF(current_setting('gw.request_id'::text, true), ''::text))::uuid,
    retired_at timestamp with time zone,
    retired_payload_hash text,
    CONSTRAINT jobs_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT jobs_completion_shape CHECK ((((status = ANY (ARRAY['done'::text, 'dead_letter'::text])) AND (completed_at IS NOT NULL)) OR ((status <> ALL (ARRAY['done'::text, 'dead_letter'::text])) AND (completed_at IS NULL)))),
    CONSTRAINT jobs_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT jobs_kind_check CHECK ((kind = ANY (ARRAY['notification'::text, 'financial_reconciliation'::text, 'operational_cleanup'::text, 'own_export'::text, 'chain_observation'::text, 'privacy_redaction'::text]))),
    CONSTRAINT jobs_last_error_code_check CHECK ((last_error_code = ANY (ARRAY['TRANSIENT_FAILURE'::text, 'INVALID_JOB'::text, 'LEASE_EXPIRED'::text, 'PERMANENT_FAILURE'::text]))),
    CONSTRAINT jobs_lease_generation_check CHECK (((lease_generation >= 0) AND (lease_generation <= 1000000))),
    CONSTRAINT jobs_lease_shape CHECK ((((status = 'running'::text) AND (lease_token IS NOT NULL) AND (lease_until IS NOT NULL)) OR ((status <> 'running'::text) AND (lease_token IS NULL) AND (lease_until IS NULL)))),
    CONSTRAINT jobs_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND (octet_length((payload)::text) <= 8192))),
    CONSTRAINT jobs_redacted_payload_hash_check CHECK (((redacted_payload_hash IS NULL) OR (length(redacted_payload_hash) = 64))),
    CONSTRAINT jobs_retirement_check CHECK ((((retired_at IS NULL) AND (retired_payload_hash IS NULL)) OR ((retired_at IS NOT NULL) AND (retired_payload_hash IS NOT NULL) AND (retired_payload_hash ~ '^[a-f0-9]{64}$'::text)))),
    CONSTRAINT jobs_retry_limit_check CHECK (((retry_limit >= 1) AND (retry_limit <= 1000000))),
    CONSTRAINT jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'done'::text, 'retry_wait'::text, 'dead_letter'::text])))
);

CREATE TABLE public.ledger_account_buckets (
    account_id uuid NOT NULL,
    label text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    CONSTRAINT ledger_account_buckets_label_check CHECK ((label = ANY (ARRAY['settled_payout_net'::text, 'refund_held'::text])))
);

CREATE TABLE public.ledger_account_totals (
    account_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    owner_type text NOT NULL,
    owner_id uuid,
    purpose text NOT NULL,
    credits numeric DEFAULT 0 NOT NULL,
    debits numeric DEFAULT 0 NOT NULL,
    balance numeric DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT ledger_account_totals_check CHECK ((balance = (credits - debits))),
    CONSTRAINT ledger_account_totals_credits_check CHECK ((credits >= (0)::numeric)),
    CONSTRAINT ledger_account_totals_debits_check CHECK ((debits >= (0)::numeric))
);

CREATE TABLE public.ledger_asset_totals (
    asset_id uuid NOT NULL,
    purpose text NOT NULL,
    credits numeric DEFAULT 0 NOT NULL,
    debits numeric DEFAULT 0 NOT NULL,
    balance numeric DEFAULT 0 NOT NULL,
    CONSTRAINT ledger_asset_totals_check CHECK ((balance = (credits - debits))),
    CONSTRAINT ledger_asset_totals_credits_check CHECK ((credits >= (0)::numeric)),
    CONSTRAINT ledger_asset_totals_debits_check CHECK ((debits >= (0)::numeric))
);

CREATE TABLE public.ledger_counter_markers (
    posting_id uuid NOT NULL
);

CREATE TABLE public.ledger_counter_state (
    id text NOT NULL,
    posting_ceiling uuid,
    posting_cursor uuid,
    journal_ceiling uuid,
    journal_cursor uuid,
    postings_complete boolean DEFAULT false NOT NULL,
    journals_complete boolean DEFAULT false NOT NULL,
    complete boolean DEFAULT false NOT NULL,
    reason_code text,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    sealed_at timestamp with time zone,
    CONSTRAINT ledger_counter_state_check CHECK (((NOT complete) OR (postings_complete AND journals_complete AND (reason_code IS NULL)))),
    CONSTRAINT ledger_counter_state_id_check CHECK ((id = 'global'::text)),
    CONSTRAINT ledger_counter_state_reason_code_check CHECK (((reason_code IS NULL) OR (reason_code = 'LEDGER_SOURCE_INVALID'::text)))
);

CREATE TABLE public.ledger_journal_audits (
    journal_id uuid NOT NULL,
    debit_total numeric NOT NULL,
    credit_total numeric NOT NULL,
    line_count bigint NOT NULL,
    asset_ids uuid[] NOT NULL,
    valid boolean NOT NULL,
    proof_hash text NOT NULL,
    checked_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT ledger_journal_audits_line_count_check CHECK ((line_count >= 0)),
    CONSTRAINT ledger_journal_audits_proof_hash_check CHECK ((length(proof_hash) = 64))
);

CREATE TABLE public.ledger_journals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ledger_type text NOT NULL,
    business_key text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_txid bigint DEFAULT txid_current() NOT NULL
);

CREATE TABLE public.liability_recoveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    obligation_id uuid NOT NULL,
    proof_reference text NOT NULL,
    statement text NOT NULL,
    statement_hash text NOT NULL,
    signature_hash text,
    expires_at timestamp with time zone NOT NULL,
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    confirmation_hash text,
    CONSTRAINT liability_recoveries_confirmation_hash_check CHECK (((confirmation_hash IS NULL) OR (length(confirmation_hash) = 64))),
    CONSTRAINT liability_recoveries_statement_hash_check CHECK ((length(statement_hash) = 64))
);

CREATE TABLE public.maintenance_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_job_id uuid NOT NULL,
    environment text NOT NULL,
    run_date date NOT NULL,
    page_number integer NOT NULL,
    lease_generation integer NOT NULL,
    nonces_deleted integer NOT NULL,
    runs_deleted integer NOT NULL,
    batch_limit integer NOT NULL,
    held boolean NOT NULL,
    more_possible boolean NOT NULL,
    checked_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT maintenance_result_bounds CHECK (((nonces_deleted <= batch_limit) AND (runs_deleted <= batch_limit) AND ((NOT held) OR ((nonces_deleted = 0) AND (runs_deleted = 0) AND (NOT more_possible))))),
    CONSTRAINT maintenance_results_batch_limit_check CHECK (((batch_limit >= 1) AND (batch_limit <= 100))),
    CONSTRAINT maintenance_results_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT maintenance_results_lease_generation_check CHECK (((lease_generation >= 1) AND (lease_generation <= 1000000))),
    CONSTRAINT maintenance_results_nonces_deleted_check CHECK (((nonces_deleted >= 0) AND (nonces_deleted <= 100))),
    CONSTRAINT maintenance_results_page_number_check CHECK (((page_number >= 0) AND (page_number <= 1000000))),
    CONSTRAINT maintenance_results_runs_deleted_check CHECK (((runs_deleted >= 0) AND (runs_deleted <= 100)))
);

CREATE TABLE public.native_reserve_inflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    environment text NOT NULL,
    chain text NOT NULL,
    network text NOT NULL,
    tx_hash text NOT NULL,
    event_index integer NOT NULL,
    sender text NOT NULL,
    destination text NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    block_hash text NOT NULL,
    block_height numeric(78,0) NOT NULL,
    statement_hash text NOT NULL,
    request_hash text NOT NULL,
    journal_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT native_reserve_inflows_amount_base_units_check CHECK ((amount_base_units > (0)::numeric)),
    CONSTRAINT native_reserve_inflows_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text]))),
    CONSTRAINT native_reserve_inflows_event_index_check CHECK ((event_index >= 0)),
    CONSTRAINT native_reserve_inflows_request_hash_check CHECK ((length(request_hash) = 64)),
    CONSTRAINT native_reserve_inflows_statement_hash_check CHECK ((length(statement_hash) = 64))
);

CREATE TABLE public.notification_views (
    user_id uuid NOT NULL,
    seen_at timestamp with time zone NOT NULL,
    seen_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title_key text NOT NULL,
    body text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    delivery_key text,
    redacted_at timestamp with time zone,
    redacted_body_hash text,
    retired_at timestamp with time zone,
    retired_body_hash text,
    CONSTRAINT notifications_redacted_body_hash_check CHECK (((redacted_body_hash IS NULL) OR (length(redacted_body_hash) = 64))),
    CONSTRAINT notifications_retirement_check CHECK ((((retired_at IS NULL) AND (retired_body_hash IS NULL)) OR ((retired_at IS NOT NULL) AND (retired_body_hash IS NOT NULL) AND (retired_body_hash ~ '^[a-f0-9]{64}$'::text))))
);

CREATE TABLE public.operation_keys (
    business_key text NOT NULL,
    request_hash text NOT NULL,
    result jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.operational_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    environment text NOT NULL,
    asset_id uuid,
    condition_key text NOT NULL,
    severity text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    safe_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    next_reminder_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    reminders integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    occurrence integer DEFAULT 1 NOT NULL,
    escalation_step integer DEFAULT 0 NOT NULL,
    occurrence_started_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT operational_alerts_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT operational_alerts_escalation_step_check CHECK ((escalation_step >= 0)),
    CONSTRAINT operational_alerts_occurrence_check CHECK ((occurrence > 0)),
    CONSTRAINT operational_alerts_severity_check CHECK ((severity = ANY (ARRAY['P1'::text, 'P2'::text, 'P3'::text, 'INFO'::text]))),
    CONSTRAINT operational_alerts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text])))
);

CREATE TABLE public.operational_diagnostics (
    environment text NOT NULL,
    snapshot jsonb NOT NULL,
    observed_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT operational_diagnostics_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT operational_diagnostics_snapshot_check CHECK ((octet_length((snapshot)::text) <= 8192))
);

CREATE TABLE public.outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_key text NOT NULL,
    environment text NOT NULL,
    kind text NOT NULL,
    payload jsonb NOT NULL,
    dispatched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    redacted_at timestamp with time zone,
    redacted_payload_hash text,
    request_id uuid DEFAULT (NULLIF(current_setting('gw.request_id'::text, true), ''::text))::uuid,
    retired_at timestamp with time zone,
    retired_payload_hash text,
    CONSTRAINT outbox_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT outbox_kind_check CHECK ((kind = ANY (ARRAY['notification'::text, 'financial_reconciliation'::text, 'operational_cleanup'::text, 'own_export'::text, 'chain_observation'::text, 'privacy_redaction'::text]))),
    CONSTRAINT outbox_payload_check CHECK (((jsonb_typeof(payload) = 'object'::text) AND (octet_length((payload)::text) <= 8192))),
    CONSTRAINT outbox_redacted_payload_hash_check CHECK (((redacted_payload_hash IS NULL) OR (length(redacted_payload_hash) = 64))),
    CONSTRAINT outbox_retirement_check CHECK ((((retired_at IS NULL) AND (retired_payload_hash IS NULL)) OR ((retired_at IS NOT NULL) AND (retired_payload_hash IS NOT NULL) AND (retired_payload_hash ~ '^[a-f0-9]{64}$'::text))))
);

CREATE TABLE public.plan_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    version integer NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    receiver_bps integer NOT NULL,
    marketing_bps integer NOT NULL,
    referral_bps integer NOT NULL,
    developer_bps integer NOT NULL,
    reserve_bps integer NOT NULL,
    receipts_required integer NOT NULL,
    active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    usd_reference numeric(20,2) NOT NULL,
    pricing_mode text DEFAULT 'usd_at_activation'::text NOT NULL,
    activation_price_id uuid,
    CONSTRAINT plan_versions_pricing_mode_check CHECK ((pricing_mode = ANY (ARRAY['usd_at_activation'::text, 'fixed_token'::text])))
);

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    usd_reference numeric(18,2) NOT NULL,
    receipts_required integer DEFAULT 2 NOT NULL,
    status text DEFAULT 'disabled'::text NOT NULL,
    bootstrap_enabled boolean DEFAULT true NOT NULL,
    bootstrap_count integer DEFAULT 10 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT plans_revision_check CHECK ((revision > 0)),
    CONSTRAINT plans_status_check CHECK ((status = ANY (ARRAY['disabled'::text, 'scheduled'::text, 'active'::text, 'paused'::text, 'retired'::text])))
);

CREATE TABLE public.point_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    source_key text NOT NULL,
    award_type text NOT NULL,
    points integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.price_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    asset_usd text NOT NULL,
    native_usd text NOT NULL,
    observed_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    source text NOT NULL,
    fingerprint text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT price_quotes_fingerprint_check CHECK ((length(fingerprint) = 64))
);

CREATE TABLE public.profile_previews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid NOT NULL,
    expected_revision integer NOT NULL,
    manifest_version text NOT NULL,
    proposal jsonb NOT NULL,
    impact jsonb NOT NULL,
    partition_versions jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    committed_at timestamp with time zone,
    CONSTRAINT profile_previews_expiry_check CHECK ((expires_at > created_at)),
    CONSTRAINT profile_previews_revision_check CHECK ((expected_revision > 0)),
    CONSTRAINT profile_previews_version_check CHECK ((manifest_version ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE public.provider_quota_reports (
    environment text NOT NULL,
    provider text NOT NULL,
    used numeric(18,0) NOT NULL,
    capacity numeric(18,0) NOT NULL,
    observed_at timestamp with time zone NOT NULL,
    revision integer NOT NULL,
    binding_fingerprint text NOT NULL,
    actor_user_id uuid NOT NULL,
    proof_reference text NOT NULL,
    CONSTRAINT provider_quota_reports_binding_fingerprint_check CHECK ((length(binding_fingerprint) = 64)),
    CONSTRAINT provider_quota_reports_capacity_check CHECK ((capacity > (0)::numeric)),
    CONSTRAINT provider_quota_reports_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT provider_quota_reports_proof_reference_check CHECK (((length(proof_reference) >= 5) AND (length(proof_reference) <= 200))),
    CONSTRAINT provider_quota_reports_provider_check CHECK ((provider = ANY (ARRAY['postgres'::text, 'vercel'::text, 'cache'::text, 'rpc'::text]))),
    CONSTRAINT provider_quota_reports_revision_check CHECK ((revision > 0)),
    CONSTRAINT provider_quota_reports_used_check CHECK ((used >= (0)::numeric))
);

CREATE TABLE public.public_statistics (
    environment text NOT NULL,
    members bigint NOT NULL,
    pending_registrations bigint NOT NULL,
    settled_member_usd numeric(78,18) NOT NULL,
    observed_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    profile_revision integer DEFAULT 1 NOT NULL,
    verified_only boolean DEFAULT false NOT NULL,
    CONSTRAINT public_statistics_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT public_statistics_members_check CHECK ((members >= 0)),
    CONSTRAINT public_statistics_pending_registrations_check CHECK ((pending_registrations >= 0)),
    CONSTRAINT public_statistics_profile_revision_check CHECK ((profile_revision > 0)),
    CONSTRAINT public_statistics_settled_member_usd_check CHECK ((settled_member_usd >= (0)::numeric))
);

CREATE TABLE public.queue_partitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_version_id uuid NOT NULL,
    next_ticket bigint DEFAULT 1 NOT NULL,
    revision bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    next_priority_ticket bigint DEFAULT 1 NOT NULL,
    CONSTRAINT queue_partition_ticket_bounds CHECK (((next_ticket >= 1) AND (next_ticket <= '1099511627776'::bigint) AND ((next_priority_ticket >= 1) AND (next_priority_ticket <= '1099511627776'::bigint)))),
    CONSTRAINT queue_partitions_revision_bounds CHECK (((revision >= 0) AND (revision <= '9007199254740991'::bigint)))
);

CREATE TABLE public.queue_rank_nodes (
    partition_id uuid NOT NULL,
    lane text NOT NULL,
    node_index bigint NOT NULL,
    waiting_count bigint NOT NULL,
    CONSTRAINT queue_rank_nodes_lane_check CHECK ((lane = ANY (ARRAY['display'::text, 'fifo'::text, 'priority'::text]))),
    CONSTRAINT queue_rank_nodes_node_index_check CHECK (((node_index >= 1) AND (node_index <= '1099511627776'::bigint))),
    CONSTRAINT queue_rank_nodes_waiting_count_check CHECK (((waiting_count >= 0) AND (waiting_count <= '1099511627775'::bigint)))
);

CREATE TABLE public.rate_limits (
    key_hash text NOT NULL,
    environment text NOT NULL,
    window_start timestamp with time zone NOT NULL,
    window_seconds integer NOT NULL,
    used integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT rate_limits_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT rate_limits_key_hash_check CHECK ((length(key_hash) = 64)),
    CONSTRAINT rate_limits_used_check CHECK ((used > 0)),
    CONSTRAINT rate_limits_window_seconds_check CHECK (((window_seconds >= 1) AND (window_seconds <= 1000000)))
);

CREATE TABLE public.receipt_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_operation_key text NOT NULL,
    source_cycle_id uuid NOT NULL,
    payer_user_id uuid NOT NULL,
    receiver_entry_id uuid,
    beneficiary_user_id uuid,
    receiver_kind text NOT NULL,
    recipient_role text,
    slot_index integer,
    receiver_account_id uuid NOT NULL,
    credit_journal_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    environment text NOT NULL,
    chain_id text NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    lineage_status text NOT NULL,
    credited_at timestamp with time zone DEFAULT now() NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT receipt_allocations_amount_base_units_check CHECK ((amount_base_units > (0)::numeric)),
    CONSTRAINT receipt_allocations_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT receipt_allocations_lineage_status_check CHECK ((lineage_status = ANY (ARRAY['captured'::text, 'legacy_linked'::text]))),
    CONSTRAINT receipt_allocations_receiver_kind_check CHECK ((receiver_kind = ANY (ARRAY['member'::text, 'bootstrap'::text, 'empty_queue_business'::text]))),
    CONSTRAINT receipt_beneficiary_shape CHECK ((((receiver_kind = 'member'::text) AND (beneficiary_user_id IS NOT NULL) AND (beneficiary_user_id <> payer_user_id) AND (recipient_role IS NULL)) OR ((receiver_kind = ANY (ARRAY['bootstrap'::text, 'empty_queue_business'::text])) AND (beneficiary_user_id IS NULL) AND (recipient_role IS NOT NULL) AND (recipient_role = ANY (ARRAY['developer'::text, 'marketing'::text, 'platform'::text, 'custom_bootstrap'::text]))))),
    CONSTRAINT receipt_slot_shape CHECK ((((receiver_kind = 'empty_queue_business'::text) AND (receiver_entry_id IS NULL) AND (slot_index IS NULL)) OR ((receiver_kind = ANY (ARRAY['member'::text, 'bootstrap'::text])) AND (receiver_entry_id IS NOT NULL) AND (((lineage_status = 'captured'::text) AND (slot_index IS NOT NULL) AND (slot_index > 0)) OR ((lineage_status = 'legacy_linked'::text) AND (slot_index IS NULL))))))
);

CREATE TABLE public.recovery_outflow_resolutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    outflow_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    tx_hash text NOT NULL,
    event_index integer NOT NULL,
    principal_base_units numeric(78,0) NOT NULL,
    native_asset_id uuid NOT NULL,
    native_fee_base_units numeric(78,0) NOT NULL,
    account_setup_base_units numeric(78,0) NOT NULL,
    setup_journal_id uuid,
    principal_journal_id uuid,
    gas_journal_id uuid,
    actor_user_id uuid NOT NULL,
    proof_reference text NOT NULL,
    reason text NOT NULL,
    evidence_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT recovery_outflow_resolutions_check CHECK (((account_setup_base_units >= (0)::numeric) AND (account_setup_base_units <= native_fee_base_units))),
    CONSTRAINT recovery_outflow_resolutions_evidence_hash_check CHECK ((length(evidence_hash) = 64)),
    CONSTRAINT recovery_outflow_resolutions_native_fee_base_units_check CHECK ((native_fee_base_units >= (0)::numeric)),
    CONSTRAINT recovery_outflow_resolutions_principal_base_units_check CHECK ((principal_base_units >= (0)::numeric))
);

CREATE TABLE public.recovery_outflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    tx_hash text NOT NULL,
    event_index integer NOT NULL,
    sender text NOT NULL,
    destination text NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    block_height numeric(78,0) NOT NULL,
    status text NOT NULL,
    obligation_id uuid,
    evidence_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT recovery_outflows_amount_base_units_check CHECK ((amount_base_units >= (0)::numeric)),
    CONSTRAINT recovery_outflows_evidence_hash_check CHECK ((length(evidence_hash) = 64)),
    CONSTRAINT recovery_outflows_status_check CHECK ((status = ANY (ARRAY['matched'::text, 'review'::text])))
);

CREATE TABLE public.recovery_view_caps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recovery_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT recovery_view_caps_token_hash_check CHECK ((length(token_hash) = 64))
);

CREATE TABLE public.referral_codes (
    user_id uuid NOT NULL,
    code uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid NOT NULL,
    target_id uuid NOT NULL,
    reason_hash text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    case_token_hash text,
    case_token_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reports_body_check CHECK (((length(body) >= 1) AND (length(body) <= 2000))),
    CONSTRAINT reports_reason_hash_check CHECK ((length(reason_hash) = 64)),
    CONSTRAINT reports_revision_check CHECK ((revision > 0)),
    CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text, 'appealed'::text])))
);

CREATE TABLE public.scheduler_nonces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    environment text NOT NULL,
    nonce uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT scheduler_nonces_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])))
);

CREATE TABLE public.scheduler_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    environment text NOT NULL,
    run_key text NOT NULL,
    lease_generation integer DEFAULT 1 NOT NULL,
    lease_token uuid NOT NULL,
    lease_until timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT scheduler_runs_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text]))),
    CONSTRAINT scheduler_runs_lease_generation_check CHECK (((lease_generation >= 1) AND (lease_generation <= 1000000)))
);

CREATE TABLE public.schema_migrations (
    name text NOT NULL,
    sha256 text NOT NULL,
    applied_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT schema_migrations_sha256_check CHECK ((length(sha256) = 64))
);

CREATE TABLE public.signer_dispatch_cursor (
    singleton boolean DEFAULT true NOT NULL,
    last_created_at timestamp with time zone,
    last_id uuid,
    CONSTRAINT signer_dispatch_cursor_check CHECK (((last_created_at IS NULL) = (last_id IS NULL))),
    CONSTRAINT signer_dispatch_cursor_singleton_check CHECK (singleton)
);

CREATE TABLE public.simulation_incoming_controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    environment text DEFAULT 'simulation'::text NOT NULL,
    outcome text NOT NULL,
    actual_base_units numeric(78,0) NOT NULL,
    actor_user_id uuid NOT NULL,
    operation_key text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT simulation_incoming_controls_actual_base_units_check CHECK ((actual_base_units >= (0)::numeric)),
    CONSTRAINT simulation_incoming_controls_environment_check CHECK ((environment = 'simulation'::text)),
    CONSTRAINT simulation_incoming_controls_outcome_check CHECK ((outcome = ANY (ARRAY['reject'::text, 'under'::text, 'over'::text, 'late'::text, 'delay'::text]))),
    CONSTRAINT simulation_incoming_controls_reason_check CHECK (((length(reason) >= 5) AND (length(reason) <= 500)))
);

CREATE TABLE public.simulation_incoming_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    environment text DEFAULT 'simulation'::text NOT NULL,
    outcome text NOT NULL,
    gift_operation_key text,
    hold_journal_id uuid,
    accept_journal_id uuid,
    refund_journal_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT simulation_incoming_events_environment_check CHECK ((environment = 'simulation'::text)),
    CONSTRAINT simulation_incoming_events_outcome_check CHECK ((outcome = ANY (ARRAY['exact'::text, 'reject'::text, 'under'::text, 'over'::text, 'late'::text, 'review_reject'::text])))
);

CREATE TABLE public.simulation_incoming_refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    environment text DEFAULT 'simulation'::text NOT NULL,
    actor_user_id uuid NOT NULL,
    operation_key text NOT NULL,
    journal_id uuid NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT simulation_incoming_refunds_amount_base_units_check CHECK ((amount_base_units > (0)::numeric)),
    CONSTRAINT simulation_incoming_refunds_environment_check CHECK ((environment = 'simulation'::text)),
    CONSTRAINT simulation_incoming_refunds_reason_check CHECK (((length(reason) >= 5) AND (length(reason) <= 500)))
);

CREATE TABLE public.simulation_withdrawal_controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    withdrawal_id uuid NOT NULL,
    environment text DEFAULT 'simulation'::text NOT NULL,
    outcome text NOT NULL,
    actor_user_id uuid NOT NULL,
    operation_key text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT simulation_withdrawal_controls_environment_check CHECK ((environment = 'simulation'::text)),
    CONSTRAINT simulation_withdrawal_controls_outcome_check CHECK ((outcome = ANY (ARRAY['hold'::text, 'reject'::text]))),
    CONSTRAINT simulation_withdrawal_controls_reason_check CHECK (((length(reason) >= 5) AND (length(reason) <= 500)))
);

CREATE TABLE public.slug_redirects (
    locale text NOT NULL,
    old_slug text NOT NULL,
    article_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT slug_redirects_locale_check CHECK ((locale = ANY (ARRAY['en'::text, 'fr'::text]))),
    CONSTRAINT slug_redirects_old_slug_check CHECK ((old_slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'::text))
);

CREATE TABLE public.treasury_addresses (
    asset_id uuid NOT NULL,
    address text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_monitor_at timestamp with time zone DEFAULT '1970-01-01 00:00:00+00'::timestamp with time zone NOT NULL,
    CONSTRAINT treasury_addresses_address_check CHECK (((length(address) >= 1) AND (length(address) <= 128)))
);

CREATE TABLE public.unallocated_inflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    environment text NOT NULL,
    chain text NOT NULL,
    network text NOT NULL,
    tx_hash text NOT NULL,
    event_index integer NOT NULL,
    sender text NOT NULL,
    destination text NOT NULL,
    amount_base_units numeric(78,0) NOT NULL,
    block_hash text NOT NULL,
    block_height numeric(78,0) NOT NULL,
    registry_snapshot jsonb NOT NULL,
    treasury_fingerprint text NOT NULL,
    journal_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT unallocated_inflows_amount_base_units_check CHECK ((amount_base_units > (0)::numeric)),
    CONSTRAINT unallocated_inflows_block_height_check CHECK ((block_height >= (0)::numeric)),
    CONSTRAINT unallocated_inflows_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text]))),
    CONSTRAINT unallocated_inflows_event_index_check CHECK ((event_index >= 0)),
    CONSTRAINT unallocated_inflows_treasury_fingerprint_check CHECK ((length(treasury_fingerprint) = 64))
);

CREATE TABLE public.unallocated_refund_claims (
    inflow_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    statement_hash text NOT NULL,
    signature_hash text NOT NULL,
    proof_reference text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT unallocated_refund_claims_proof_reference_check CHECK (((length(proof_reference) >= 5) AND (length(proof_reference) <= 200))),
    CONSTRAINT unallocated_refund_claims_signature_hash_check CHECK ((length(signature_hash) = 64)),
    CONSTRAINT unallocated_refund_claims_statement_hash_check CHECK ((length(statement_hash) = 64))
);

CREATE TABLE public.user_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    subject text NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT user_identities_provider_check CHECK ((provider = ANY (ARRAY['google'::text, 'simulation'::text]))),
    CONSTRAINT user_identities_subject_check CHECK (((length(subject) >= 1) AND (length(subject) <= 255)))
);

CREATE TABLE public.wallet_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    environment text NOT NULL,
    chain text NOT NULL,
    asset_key text NOT NULL,
    address text NOT NULL,
    message text NOT NULL,
    session_generation uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT wallet_challenges_chain_check CHECK ((chain = ANY (ARRAY['eth'::text, 'bnb'::text, 'sol'::text, 'tron'::text]))),
    CONSTRAINT wallet_challenges_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])))
);

CREATE TABLE public.wallet_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    environment text NOT NULL,
    chain_id text NOT NULL,
    address text NOT NULL,
    verified_at timestamp with time zone DEFAULT now() NOT NULL,
    cooling_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    CONSTRAINT wallet_links_revision_check CHECK ((revision > 0))
);

CREATE TABLE public.withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    gross_base_units numeric(78,0) NOT NULL,
    fee_base_units numeric(78,0) DEFAULT 0 NOT NULL,
    net_base_units numeric(78,0) NOT NULL,
    destination text NOT NULL,
    status text NOT NULL,
    quote_expires_at timestamp with time zone NOT NULL,
    settled_at timestamp with time zone,
    request_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cancelled_at timestamp with time zone,
    CONSTRAINT withdrawals_status_check CHECK ((status = ANY (ARRAY['quoted'::text, 'held'::text, 'awaiting_requote'::text, 'approved'::text, 'sending'::text, 'settled'::text, 'cancelled'::text, 'exception'::text])))
);

CREATE TABLE public.worker_requests (
    nonce uuid NOT NULL,
    environment text NOT NULL,
    purpose text NOT NULL,
    body_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT worker_requests_body_hash_check CHECK ((length(body_hash) = 64)),
    CONSTRAINT worker_requests_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])))
);

CREATE TABLE public.x_manifest (
    key text NOT NULL,
    value jsonb NOT NULL,
    type text NOT NULL,
    scope text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    deprecated_at timestamp with time zone,
    CONSTRAINT x_manifest_scope_check CHECK ((scope = ANY (ARRAY['public'::text, 'private'::text, 'staff'::text])))
);

ALTER TABLE ONLY public.audit_events ATTACH PARTITION public.gw_part_au_default DEFAULT;

ALTER TABLE ONLY public.chain_scan_pages ATTACH PARTITION public.gw_part_cs_default DEFAULT;

ALTER TABLE ONLY public.ledger_postings ATTACH PARTITION public.gw_part_lp_default DEFAULT;

ALTER TABLE ONLY public.abuse_signals
    ADD CONSTRAINT abuse_signals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.abuse_signals
    ADD CONSTRAINT abuse_signals_source_key_key UNIQUE (source_key);

ALTER TABLE ONLY public.alert_deliveries
    ADD CONSTRAINT alert_deliveries_business_key_key UNIQUE (business_key);

ALTER TABLE ONLY public.alert_deliveries
    ADD CONSTRAINT alert_deliveries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.appeals
    ADD CONSTRAINT appeals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.archive_months
    ADD CONSTRAINT archive_months_child_name_key UNIQUE (child_name);

ALTER TABLE ONLY public.archive_months
    ADD CONSTRAINT archive_months_pkey PRIMARY KEY (source_table, month_start);

ALTER TABLE ONLY public.archive_record_keys
    ADD CONSTRAINT archive_record_keys_pkey PRIMARY KEY (source_table, record_key);

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_symbol_environment_chain_id_key UNIQUE (symbol, environment, chain_id);

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id, created_at);

ALTER TABLE ONLY public.auth_factors
    ADD CONSTRAINT auth_factors_id_key UNIQUE (id);

ALTER TABLE ONLY public.auth_factors
    ADD CONSTRAINT auth_factors_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.auth_flows
    ADD CONSTRAINT auth_flows_pkey PRIMARY KEY (state_hash);

ALTER TABLE ONLY public.auth_recovery_codes
    ADD CONSTRAINT auth_recovery_codes_code_hash_key UNIQUE (code_hash);

ALTER TABLE ONLY public.auth_recovery_codes
    ADD CONSTRAINT auth_recovery_codes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_refresh_tokens
    ADD CONSTRAINT auth_refresh_tokens_pkey PRIMARY KEY (token_hash);

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_access_hash_key UNIQUE (access_hash);

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_totp_replays
    ADD CONSTRAINT auth_totp_replays_pkey PRIMARY KEY (factor_id, time_step);

ALTER TABLE ONLY public.bot_challenges
    ADD CONSTRAINT bot_challenges_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.bot_token_uses
    ADD CONSTRAINT bot_token_uses_challenge_id_key UNIQUE (challenge_id);

ALTER TABLE ONLY public.bot_token_uses
    ADD CONSTRAINT bot_token_uses_pkey PRIMARY KEY (token_hash);

ALTER TABLE ONLY public.chain_checkpoints
    ADD CONSTRAINT chain_checkpoints_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chain_fee_claims
    ADD CONSTRAINT chain_fee_claims_gas_journal_id_key UNIQUE (gas_journal_id);

ALTER TABLE ONLY public.chain_fee_claims
    ADD CONSTRAINT chain_fee_claims_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chain_fee_claims
    ADD CONSTRAINT chain_fee_claims_setup_journal_id_key UNIQUE (setup_journal_id);

ALTER TABLE ONLY public.chain_observations
    ADD CONSTRAINT chain_observations_business_key_key UNIQUE (business_key);

ALTER TABLE ONLY public.chain_observations
    ADD CONSTRAINT chain_observations_invoice_id_tx_hash_event_index_key UNIQUE (invoice_id, tx_hash, event_index);

ALTER TABLE ONLY public.chain_observations
    ADD CONSTRAINT chain_observations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chain_observations
    ADD CONSTRAINT chain_observations_source_job_id_key UNIQUE (source_job_id);

ALTER TABLE ONLY public.chain_recovery_runs
    ADD CONSTRAINT chain_recovery_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chain_scan_pages
    ADD CONSTRAINT chain_scan_pages_pkey PRIMARY KEY (run_id, revision, created_at);

ALTER TABLE ONLY public.crypto_events
    ADD CONSTRAINT crypto_events_environment_chain_tx_hash_event_index_asset_i_key UNIQUE (environment, chain, tx_hash, event_index, asset_id);

ALTER TABLE ONLY public.crypto_events
    ADD CONSTRAINT crypto_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.crypto_invoices
    ADD CONSTRAINT crypto_invoices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.crypto_invoices
    ADD CONSTRAINT crypto_invoices_user_id_request_key_key UNIQUE (user_id, request_key);

ALTER TABLE ONLY public.crypto_obligations
    ADD CONSTRAINT crypto_obligations_business_key_key UNIQUE (business_key);

ALTER TABLE ONLY public.crypto_obligations
    ADD CONSTRAINT crypto_obligations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.crypto_reorg_resolutions
    ADD CONSTRAINT crypto_reorg_resolutions_journal_id_key UNIQUE (journal_id);

ALTER TABLE ONLY public.crypto_reorg_resolutions
    ADD CONSTRAINT crypto_reorg_resolutions_pkey PRIMARY KEY (review_id);

ALTER TABLE ONLY public.crypto_reorg_reviews
    ADD CONSTRAINT crypto_reorg_reviews_event_id_revision_key UNIQUE (event_id, revision);

ALTER TABLE ONLY public.crypto_reorg_reviews
    ADD CONSTRAINT crypto_reorg_reviews_loss_journal_id_key UNIQUE (loss_journal_id);

ALTER TABLE ONLY public.crypto_reorg_reviews
    ADD CONSTRAINT crypto_reorg_reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.crypto_submissions
    ADD CONSTRAINT crypto_submissions_invoice_id_tx_hash_event_index_key UNIQUE (invoice_id, tx_hash, event_index);

ALTER TABLE ONLY public.crypto_submissions
    ADD CONSTRAINT crypto_submissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT data_exports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.database_binding_nonce
    ADD CONSTRAINT database_binding_nonce_pkey PRIMARY KEY (singleton);

ALTER TABLE ONLY public.deployment_binding_challenges
    ADD CONSTRAINT deployment_binding_challenges_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.environment_instances
    ADD CONSTRAINT environment_instances_instance_id_key UNIQUE (instance_id);

ALTER TABLE ONLY public.environment_instances
    ADD CONSTRAINT environment_instances_pkey PRIMARY KEY (environment);

ALTER TABLE ONLY public.export_chunks
    ADD CONSTRAINT export_chunks_pkey PRIMARY KEY (export_id, part);

ALTER TABLE ONLY public.financial_reconciliation_results
    ADD CONSTRAINT financial_reconciliation_results_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.financial_reconciliation_results
    ADD CONSTRAINT financial_reconciliation_results_source_job_id_key UNIQUE (source_job_id);

ALTER TABLE ONLY public.gift_invoices
    ADD CONSTRAINT gift_invoice_request_key UNIQUE (user_id, request_key);

ALTER TABLE ONLY public.gift_invoices
    ADD CONSTRAINT gift_invoices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.gw_part_au_default
    ADD CONSTRAINT gw_part_au_default_pkey PRIMARY KEY (id, created_at);

ALTER TABLE ONLY public.gw_part_cs_default
    ADD CONSTRAINT gw_part_cs_default_pkey PRIMARY KEY (run_id, revision, created_at);

ALTER TABLE ONLY public.ledger_postings
    ADD CONSTRAINT ledger_postings_pkey PRIMARY KEY (id, created_at);

ALTER TABLE ONLY public.gw_part_lp_default
    ADD CONSTRAINT gw_part_lp_default_pkey PRIMARY KEY (id, created_at);

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_locale_slug_key UNIQUE (locale, slug);

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_business_key_key UNIQUE (business_key);

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_outbox_id_key UNIQUE (outbox_id);

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ledger_account_buckets
    ADD CONSTRAINT ledger_account_buckets_pkey PRIMARY KEY (account_id, label);

ALTER TABLE ONLY public.ledger_account_totals
    ADD CONSTRAINT ledger_account_totals_pkey PRIMARY KEY (account_id);

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_asset_id_owner_type_owner_id_purpose_key UNIQUE (asset_id, owner_type, owner_id, purpose);

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ledger_asset_totals
    ADD CONSTRAINT ledger_asset_totals_pkey PRIMARY KEY (asset_id, purpose);

ALTER TABLE ONLY public.ledger_counter_markers
    ADD CONSTRAINT ledger_counter_markers_pkey PRIMARY KEY (posting_id);

ALTER TABLE ONLY public.ledger_counter_state
    ADD CONSTRAINT ledger_counter_state_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ledger_journal_audits
    ADD CONSTRAINT ledger_journal_audits_pkey PRIMARY KEY (journal_id);

ALTER TABLE ONLY public.ledger_journals
    ADD CONSTRAINT ledger_journals_business_key_key UNIQUE (business_key);

ALTER TABLE ONLY public.ledger_journals
    ADD CONSTRAINT ledger_journals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.liability_recoveries
    ADD CONSTRAINT liability_recoveries_obligation_id_key UNIQUE (obligation_id);

ALTER TABLE ONLY public.liability_recoveries
    ADD CONSTRAINT liability_recoveries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.maintenance_results
    ADD CONSTRAINT maintenance_results_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.maintenance_results
    ADD CONSTRAINT maintenance_results_source_job_id_key UNIQUE (source_job_id);

ALTER TABLE ONLY public.native_reserve_inflows
    ADD CONSTRAINT native_reserve_inflows_environment_chain_network_tx_hash_ev_key UNIQUE (environment, chain, network, tx_hash, event_index, asset_id);

ALTER TABLE ONLY public.native_reserve_inflows
    ADD CONSTRAINT native_reserve_inflows_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_views
    ADD CONSTRAINT notification_views_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.operation_keys
    ADD CONSTRAINT operation_keys_pkey PRIMARY KEY (business_key);

ALTER TABLE ONLY public.operational_alerts
    ADD CONSTRAINT operational_alerts_condition_key_key UNIQUE (condition_key);

ALTER TABLE ONLY public.operational_alerts
    ADD CONSTRAINT operational_alerts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.operational_diagnostics
    ADD CONSTRAINT operational_diagnostics_pkey PRIMARY KEY (environment);

ALTER TABLE ONLY public.outbox
    ADD CONSTRAINT outbox_business_key_key UNIQUE (business_key);

ALTER TABLE ONLY public.outbox
    ADD CONSTRAINT outbox_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_plan_id_asset_id_version_key UNIQUE (plan_id, asset_id, version);

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.point_events
    ADD CONSTRAINT point_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.point_events
    ADD CONSTRAINT point_events_user_id_source_key_award_type_key UNIQUE (user_id, source_key, award_type);

ALTER TABLE ONLY public.price_quotes
    ADD CONSTRAINT price_quotes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profile_previews
    ADD CONSTRAINT profile_previews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provider_quota_reports
    ADD CONSTRAINT provider_quota_reports_pkey PRIMARY KEY (environment, provider);

ALTER TABLE ONLY public.public_statistics
    ADD CONSTRAINT public_statistics_pkey PRIMARY KEY (environment);

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_partition_id_ticket_key UNIQUE (partition_id, ticket);

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.queue_partitions
    ADD CONSTRAINT queue_partitions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.queue_partitions
    ADD CONSTRAINT queue_partitions_plan_version_id_key UNIQUE (plan_version_id);

ALTER TABLE ONLY public.queue_rank_nodes
    ADD CONSTRAINT queue_rank_nodes_pkey PRIMARY KEY (partition_id, lane, node_index);

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (key_hash);

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_allocations_credit_journal_id_key UNIQUE (credit_journal_id);

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_allocations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_allocations_source_operation_key_key UNIQUE (source_operation_key);

ALTER TABLE ONLY public.recovery_outflow_resolutions
    ADD CONSTRAINT recovery_outflow_resolutions_asset_id_tx_hash_event_index_key UNIQUE (asset_id, tx_hash, event_index);

ALTER TABLE ONLY public.recovery_outflow_resolutions
    ADD CONSTRAINT recovery_outflow_resolutions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.recovery_outflows
    ADD CONSTRAINT recovery_outflows_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.recovery_outflows
    ADD CONSTRAINT recovery_outflows_run_id_tx_hash_event_index_key UNIQUE (run_id, tx_hash, event_index);

ALTER TABLE ONLY public.recovery_view_caps
    ADD CONSTRAINT recovery_view_caps_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.recovery_view_caps
    ADD CONSTRAINT recovery_view_caps_token_hash_key UNIQUE (token_hash);

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT reorg_source_revision_unique UNIQUE (source_allocation_id, revision);

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.scheduler_nonces
    ADD CONSTRAINT scheduler_nonces_environment_nonce_key UNIQUE (environment, nonce);

ALTER TABLE ONLY public.scheduler_nonces
    ADD CONSTRAINT scheduler_nonces_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.scheduler_runs
    ADD CONSTRAINT scheduler_runs_environment_run_key_key UNIQUE (environment, run_key);

ALTER TABLE ONLY public.scheduler_runs
    ADD CONSTRAINT scheduler_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (name);

ALTER TABLE ONLY public.signed_attempts
    ADD CONSTRAINT signed_attempts_obligation_id_attempt_key UNIQUE (obligation_id, attempt);

ALTER TABLE ONLY public.signed_attempts
    ADD CONSTRAINT signed_attempts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.signed_attempts
    ADD CONSTRAINT signed_attempts_tx_hash_key UNIQUE (tx_hash);

ALTER TABLE ONLY public.signer_dispatch_cursor
    ADD CONSTRAINT signer_dispatch_cursor_pkey PRIMARY KEY (singleton);

ALTER TABLE ONLY public.signer_heartbeats
    ADD CONSTRAINT signer_heartbeats_pkey PRIMARY KEY (treasury_fingerprint);

ALTER TABLE ONLY public.signer_reservations
    ADD CONSTRAINT signer_reservations_pkey PRIMARY KEY (obligation_id, signing_day);

ALTER TABLE ONLY public.signer_states
    ADD CONSTRAINT signer_states_pkey PRIMARY KEY (treasury_fingerprint);

ALTER TABLE ONLY public.simulation_incoming_controls
    ADD CONSTRAINT simulation_incoming_controls_invoice_id_key UNIQUE (invoice_id);

ALTER TABLE ONLY public.simulation_incoming_controls
    ADD CONSTRAINT simulation_incoming_controls_operation_key_key UNIQUE (operation_key);

ALTER TABLE ONLY public.simulation_incoming_controls
    ADD CONSTRAINT simulation_incoming_controls_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.simulation_incoming_events
    ADD CONSTRAINT simulation_incoming_events_gift_operation_key_key UNIQUE (gift_operation_key);

ALTER TABLE ONLY public.simulation_incoming_events
    ADD CONSTRAINT simulation_incoming_events_invoice_id_key UNIQUE (invoice_id);

ALTER TABLE ONLY public.simulation_incoming_events
    ADD CONSTRAINT simulation_incoming_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.simulation_incoming_refunds
    ADD CONSTRAINT simulation_incoming_refunds_invoice_id_key UNIQUE (invoice_id);

ALTER TABLE ONLY public.simulation_incoming_refunds
    ADD CONSTRAINT simulation_incoming_refunds_journal_id_key UNIQUE (journal_id);

ALTER TABLE ONLY public.simulation_incoming_refunds
    ADD CONSTRAINT simulation_incoming_refunds_operation_key_key UNIQUE (operation_key);

ALTER TABLE ONLY public.simulation_incoming_refunds
    ADD CONSTRAINT simulation_incoming_refunds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.simulation_reorg_resolutions
    ADD CONSTRAINT simulation_reorg_resolutions_journal_id_key UNIQUE (journal_id);

ALTER TABLE ONLY public.simulation_reorg_resolutions
    ADD CONSTRAINT simulation_reorg_resolutions_operation_key_key UNIQUE (operation_key);

ALTER TABLE ONLY public.simulation_reorg_resolutions
    ADD CONSTRAINT simulation_reorg_resolutions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.simulation_reorg_resolutions
    ADD CONSTRAINT simulation_reorg_resolutions_review_id_key UNIQUE (review_id);

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_loss_journal_id_key UNIQUE (loss_journal_id);

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_operation_key_key UNIQUE (operation_key);

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.simulation_withdrawal_controls
    ADD CONSTRAINT simulation_withdrawal_controls_operation_key_key UNIQUE (operation_key);

ALTER TABLE ONLY public.simulation_withdrawal_controls
    ADD CONSTRAINT simulation_withdrawal_controls_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.simulation_withdrawal_controls
    ADD CONSTRAINT simulation_withdrawal_controls_withdrawal_id_key UNIQUE (withdrawal_id);

ALTER TABLE ONLY public.slug_redirects
    ADD CONSTRAINT slug_redirects_pkey PRIMARY KEY (locale, old_slug);

ALTER TABLE ONLY public.treasury_addresses
    ADD CONSTRAINT treasury_addresses_pkey PRIMARY KEY (asset_id, address);

ALTER TABLE ONLY public.unallocated_inflows
    ADD CONSTRAINT unallocated_inflows_asset_id_environment_chain_network_tx_h_key UNIQUE (asset_id, environment, chain, network, tx_hash, event_index);

ALTER TABLE ONLY public.unallocated_inflows
    ADD CONSTRAINT unallocated_inflows_journal_id_key UNIQUE (journal_id);

ALTER TABLE ONLY public.unallocated_inflows
    ADD CONSTRAINT unallocated_inflows_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.unallocated_refund_claims
    ADD CONSTRAINT unallocated_refund_claims_pkey PRIMARY KEY (inflow_id);

ALTER TABLE ONLY public.user_identities
    ADD CONSTRAINT user_identities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_identities
    ADD CONSTRAINT user_identities_provider_subject_key UNIQUE (provider, subject);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);

ALTER TABLE ONLY public.wallet_challenges
    ADD CONSTRAINT wallet_challenges_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wallet_links
    ADD CONSTRAINT wallet_links_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wallet_links
    ADD CONSTRAINT wallet_links_user_id_environment_chain_id_key UNIQUE (user_id, environment, chain_id);

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_request_key_key UNIQUE (request_key);

ALTER TABLE ONLY public.worker_requests
    ADD CONSTRAINT worker_requests_pkey PRIMARY KEY (nonce);

ALTER TABLE ONLY public.x_manifest
    ADD CONSTRAINT x_manifest_pkey PRIMARY KEY (key);

CREATE INDEX abuse_user_time_idx ON public.abuse_signals USING btree (user_id, created_at, id);

CREATE INDEX alert_claim_priority_idx ON public.operational_alerts USING btree (severity, status, occurrence, id);

CREATE UNIQUE INDEX appeal_open_case_unique ON public.appeals USING btree (report_id) WHERE (status = 'open'::text);

CREATE INDEX archive_months_pending_idx ON public.archive_months USING btree (state, last_step_at, month_start, source_table);

CREATE INDEX audit_events_archive_time_idx ON ONLY public.audit_events USING btree (created_at, id);

CREATE INDEX audit_request_correlation_idx ON ONLY public.audit_events USING btree (request_id, id) WHERE (request_id IS NOT NULL);

CREATE INDEX auth_flow_expiry_cleanup_idx ON public.auth_flows USING btree (expires_at, state_hash);

CREATE INDEX auth_refresh_expiry_cleanup_idx ON public.auth_refresh_tokens USING btree (expires_at, token_hash);

CREATE INDEX auth_refresh_session_idx ON public.auth_refresh_tokens USING btree (session_id);

CREATE INDEX auth_session_expiry_cleanup_idx ON public.auth_sessions USING btree (absolute_expires_at, id);

CREATE INDEX auth_sessions_user_idx ON public.auth_sessions USING btree (user_id, id);

CREATE INDEX auth_totp_cleanup_idx ON public.auth_totp_replays USING btree (accepted_at, factor_id, time_step);

CREATE INDEX binding_challenge_expiry_idx ON public.deployment_binding_challenges USING btree (expires_at, id);

CREATE INDEX bot_challenge_expiry_idx ON public.bot_challenges USING btree (expires_at, id);

CREATE INDEX bot_token_expiry_idx ON public.bot_token_uses USING btree (expires_at, token_hash);

CREATE INDEX chain_checkpoint_latest_idx ON public.chain_checkpoints USING btree (asset_id, created_at DESC, id DESC);

CREATE INDEX chain_checkpoints_address_latest_idx ON public.chain_checkpoints USING btree (asset_id, treasury_sender, created_at DESC NULLS LAST, id DESC NULLS LAST);

CREATE UNIQUE INDEX chain_fee_identity_idx ON public.chain_fee_claims USING btree (environment, chain, network, tx_hash);

CREATE INDEX chain_observation_due_idx ON public.chain_observations USING btree (status, next_observation_at, id);

CREATE INDEX chain_recovery_latest_idx ON public.chain_recovery_runs USING btree (checkpoint_id, created_at DESC, id DESC);

CREATE INDEX chain_scan_pages_archive_time_idx ON ONLY public.chain_scan_pages USING btree (created_at, run_id, revision);

CREATE INDEX checkpoint_treasury_idx ON public.chain_checkpoints USING btree (treasury_fingerprint, asset_id, created_at, id);

CREATE INDEX crypto_event_invoice_cursor_idx ON public.crypto_events USING btree (invoice_id, id);

CREATE UNIQUE INDEX crypto_invoice_open_idx ON public.crypto_invoices USING btree (user_id, plan_version_id) WHERE (status = ANY (ARRAY['quoted'::text, 'submitted'::text]));

CREATE INDEX crypto_invoice_owned_cursor_idx ON public.crypto_invoices USING btree (user_id, id);

CREATE INDEX crypto_obligation_owned_cursor_idx ON public.crypto_obligations USING btree (user_id, id);

CREATE INDEX crypto_obligation_treasury_lineage_idx ON public.crypto_obligations USING btree (asset_id, treasury_sender, id);

CREATE INDEX crypto_reorg_asset_idx ON public.crypto_reorg_reviews USING btree (asset_id, event_id, revision);

CREATE INDEX cycle_owned_cursor_idx ON public.cycles USING btree (user_id, id);

CREATE INDEX cycle_user_history_idx ON public.cycles USING btree (user_id, created_at, id);

CREATE INDEX data_export_expiry_idx ON public.data_exports USING btree (expires_at, id);

CREATE INDEX data_export_owned_idx ON public.data_exports USING btree (user_id, created_at, id);

CREATE INDEX gift_invoice_history_idx ON public.gift_invoices USING btree (user_id, created_at, id);

CREATE UNIQUE INDEX gift_invoice_open_unique ON public.gift_invoices USING btree (user_id, plan_version_id) WHERE (status = ANY (ARRAY['quoted'::text, 'submitted'::text]));

CREATE INDEX gift_invoice_owned_cursor_idx ON public.gift_invoices USING btree (user_id, id);

CREATE INDEX gw_part_au_default_created_at_id_idx ON public.gw_part_au_default USING btree (created_at, id);

CREATE INDEX gw_part_au_default_request_id_id_idx ON public.gw_part_au_default USING btree (request_id, id) WHERE (request_id IS NOT NULL);

CREATE INDEX gw_part_cs_default_created_at_run_id_revision_idx ON public.gw_part_cs_default USING btree (created_at, run_id, revision);

CREATE INDEX ledger_account_page_idx ON ONLY public.ledger_postings USING btree (account_id, id);

CREATE INDEX gw_part_lp_default_account_id_id_idx ON public.gw_part_lp_default USING btree (account_id, id);

CREATE INDEX ledger_postings_archive_time_idx ON ONLY public.ledger_postings USING btree (created_at, id);

CREATE INDEX gw_part_lp_default_created_at_id_idx ON public.gw_part_lp_default USING btree (created_at, id);

CREATE INDEX help_public_locale_idx ON public.help_articles USING btree (locale, published, slug);

CREATE INDEX help_published_en_search_idx ON public.help_articles USING gin (((setweight(to_tsvector('english'::regconfig, title), 'A'::"char") || setweight(to_tsvector('english'::regconfig, body), 'B'::"char")))) WHERE (published AND (locale = 'en'::text));

CREATE INDEX help_published_fr_search_idx ON public.help_articles USING gin (((setweight(to_tsvector('french'::regconfig, title), 'A'::"char") || setweight(to_tsvector('french'::regconfig, body), 'B'::"char")))) WHERE (published AND (locale = 'fr'::text));

CREATE INDEX help_published_title_trigram_idx ON public.help_articles USING gin (lower(title) public.gin_trgm_ops) WHERE published;

CREATE INDEX job_redaction_idx ON public.jobs USING btree (((payload ->> 'user_id'::text)), id) WHERE ((kind = 'notification'::text) AND (redacted_at IS NULL));

CREATE INDEX job_request_correlation_idx ON public.jobs USING btree (request_id, id) WHERE (request_id IS NOT NULL);

CREATE INDEX jobs_due_idx ON public.jobs USING btree (environment, status, due_at, id);

CREATE INDEX jobs_expired_lease_idx ON public.jobs USING btree (environment, lease_until, id) WHERE (status = 'running'::text);

CREATE INDEX jobs_retention_idx ON public.jobs USING btree (environment, completed_at, id) WHERE ((status = 'done'::text) AND (retired_at IS NULL));

CREATE UNIQUE INDEX ledger_accounts_owner_unique ON public.ledger_accounts USING btree (asset_id, owner_type, COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), purpose);

CREATE INDEX ledger_business_prefix_idx ON public.ledger_journals USING btree (business_key text_pattern_ops);

CREATE INDEX ledger_counter_negative_idx ON public.ledger_account_totals USING btree (account_id) WHERE (balance < (0)::numeric);

CREATE INDEX ledger_counter_nonzero_idx ON public.ledger_account_totals USING btree (purpose, asset_id, owner_id, account_id) WHERE (balance <> (0)::numeric);

CREATE UNIQUE INDEX ledger_giv_uuid_nonce_unique ON public.ledger_journals USING btree (lower(business_key)) WHERE (business_key ~ '^gift-in:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$|^allocation:gift:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}:'::text);

CREATE INDEX ledger_journal_audit_invalid_idx ON public.ledger_journal_audits USING btree (journal_id) WHERE (NOT valid);

CREATE INDEX ledger_user_page_idx ON public.ledger_accounts USING btree (owner_id, asset_id, id) WHERE (owner_type = 'user'::text);

CREATE INDEX maintenance_history_idx ON public.maintenance_results USING btree (environment, checked_at, id);

CREATE INDEX native_hold_obligation_idx ON public.ledger_journals USING btree (((metadata ->> 'obligation_id'::text))) WHERE (ledger_type = 'PAYOUT_HOLD'::text);

CREATE INDEX native_receipt_owned_cursor_idx ON public.crypto_obligations USING btree (user_id, kind, status, id);

CREATE INDEX notification_redaction_idx ON public.notifications USING btree (user_id, title_key, id) WHERE (redacted_at IS NULL);

CREATE INDEX notification_user_page_idx ON public.notifications USING btree (user_id, id);

CREATE UNIQUE INDEX notifications_delivery_key_unique ON public.notifications USING btree (delivery_key);

CREATE INDEX notifications_retention_idx ON public.notifications USING btree (created_at, id) WHERE (retired_at IS NULL);

CREATE INDEX obligation_pending_idx ON public.crypto_obligations USING btree (status, created_at, id);

CREATE INDEX operation_key_case_lookup ON public.operation_keys USING btree (lower(business_key));

CREATE UNIQUE INDEX operation_staff_uuid_nonce_unique ON public.operation_keys USING btree (lower(business_key)) WHERE (business_key ~ '^admin-(job-replay|sim-withdrawal|resolve-withdrawal):[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'::text);

CREATE UNIQUE INDEX operation_uuid_nonce_unique ON public.operation_keys USING btree (lower(business_key)) WHERE (business_key ~ '^(gift|admin-activate):[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$'::text);

CREATE INDEX outbox_pending_idx ON public.outbox USING btree (environment, created_at, id) WHERE (dispatched_at IS NULL);

CREATE INDEX outbox_redaction_idx ON public.outbox USING btree (((payload ->> 'user_id'::text)), id) WHERE ((kind = 'notification'::text) AND (redacted_at IS NULL));

CREATE INDEX outbox_retention_idx ON public.outbox USING btree (environment, created_at, id) WHERE (retired_at IS NULL);

CREATE UNIQUE INDEX plan_asset_active_unique ON public.plan_versions USING btree (plan_id, asset_id) WHERE active;

CREATE INDEX point_source_idx ON public.point_events USING btree (source_key, user_id);

CREATE INDEX point_user_page_idx ON public.point_events USING btree (user_id, id);

CREATE UNIQUE INDEX price_quote_fingerprint_idx ON public.price_quotes USING btree (fingerprint);

CREATE INDEX price_quote_fresh_idx ON public.price_quotes USING btree (asset_id, observed_at DESC, expires_at);

CREATE INDEX profile_previews_actor_expiry_idx ON public.profile_previews USING btree (actor_user_id, expires_at);

CREATE INDEX profile_previews_cleanup_idx ON public.profile_previews USING btree (expires_at, id) WHERE (committed_at IS NULL);

CREATE UNIQUE INDEX queue_cycle_entry_unique ON public.queue_entries USING btree (cycle_id) WHERE (cycle_id IS NOT NULL);

CREATE INDEX queue_entries_bootstrap_disclosure_idx ON public.queue_entries USING btree (partition_id, priority_ticket, ticket) WHERE ((kind = 'bootstrap'::text) AND (status = 'waiting'::text));

CREATE UNIQUE INDEX queue_priority_ticket_unique ON public.queue_entries USING btree (partition_id, priority_ticket) WHERE ((priority_ticket IS NOT NULL) AND (status = 'waiting'::text));

CREATE INDEX queue_waiting_display_idx ON public.queue_entries USING btree (partition_id, ticket) WHERE (status = 'waiting'::text);

CREATE INDEX queue_waiting_fifo_idx ON public.queue_entries USING btree (partition_id, ticket) WHERE ((status = 'waiting'::text) AND (priority_ticket IS NULL));

CREATE INDEX queue_waiting_order_idx ON public.queue_entries USING btree (partition_id, priority_ticket, ticket) WHERE (status = 'waiting'::text);

CREATE INDEX queue_waiting_priority_idx ON public.queue_entries USING btree (partition_id, priority_ticket, ticket) WHERE ((status = 'waiting'::text) AND (priority_ticket IS NOT NULL));

CREATE INDEX rate_limit_expiry_idx ON public.rate_limits USING btree (environment, expires_at, key_hash);

CREATE INDEX receipt_beneficiary_history_idx ON public.receipt_allocations USING btree (beneficiary_user_id, credited_at, id);

CREATE UNIQUE INDEX receipt_receiver_slot_unique ON public.receipt_allocations USING btree (receiver_entry_id, slot_index) WHERE (slot_index IS NOT NULL);

CREATE UNIQUE INDEX receipt_source_cycle_unique ON public.receipt_allocations USING btree (source_cycle_id);

CREATE INDEX reconciliation_history_idx ON public.financial_reconciliation_results USING btree (environment, checked_at, id);

CREATE INDEX recovery_known_attempt_order ON public.signed_attempts USING btree (obligation_id, id);

CREATE INDEX recovery_outflow_event_idx ON public.recovery_outflows USING btree (asset_id, tx_hash, event_index);

CREATE INDEX recovery_view_expiry_idx ON public.recovery_view_caps USING btree (expires_at, id);

CREATE INDEX reorg_affected_users_idx ON public.simulation_reorg_reviews USING gin (affected_user_ids);

CREATE INDEX reorg_partition_idx ON public.simulation_reorg_reviews USING btree (partition_id, created_at, id);

CREATE INDEX reorg_source_operation_idx ON public.simulation_reorg_reviews USING btree (source_operation_key);

CREATE INDEX reports_dedupe_idx ON public.reports USING btree (actor_id, target_id, reason_hash, created_at);

CREATE INDEX reports_status_idx ON public.reports USING btree (status, created_at, id);

CREATE INDEX scheduler_nonce_environment_expiry_idx ON public.scheduler_nonces USING btree (environment, expires_at, id);

CREATE INDEX scheduler_nonce_expiry_idx ON public.scheduler_nonces USING btree (expires_at, id);

CREATE INDEX scheduler_runs_completed_idx ON public.scheduler_runs USING btree (environment, completed_at, id) WHERE (completed_at IS NOT NULL);

CREATE INDEX scheduler_runs_lease_idx ON public.scheduler_runs USING btree (environment, lease_until, id) WHERE (completed_at IS NULL);

CREATE INDEX staff_alert_current_cursor_idx ON public.operational_alerts USING btree (id) WHERE (status <> 'resolved'::text);

CREATE INDEX staff_appeal_status_cursor_idx ON public.appeals USING btree (status, id);

CREATE INDEX staff_job_current_cursor_idx ON public.jobs USING btree (environment, id) WHERE (status <> 'done'::text);

CREATE INDEX staff_job_history_cursor_idx ON public.jobs USING btree (environment, id);

CREATE INDEX staff_job_status_cursor_idx ON public.jobs USING btree (environment, status, id);

CREATE INDEX staff_outflow_review_cursor_idx ON public.recovery_outflows USING btree (id) WHERE (status = 'review'::text);

CREATE INDEX staff_recovery_current_cursor_idx ON public.chain_recovery_runs USING btree (id) WHERE (state <> 'reconciled'::text);

CREATE INDEX staff_report_status_cursor_idx ON public.reports USING btree (status, id);

CREATE INDEX staff_user_status_cursor_idx ON public.users USING btree (status, id);

CREATE INDEX treasury_addresses_monitor_idx ON public.treasury_addresses USING btree (asset_id, last_monitor_at, address);

CREATE INDEX unallocated_refund_source_status_idx ON public.crypto_obligations USING btree (asset_id, status, split_part(business_key, ':'::text, 2)) WHERE ((kind = 'unallocated_refund'::text) AND (split_part(business_key, ':'::text, 1) = 'unallocated-refund'::text));

CREATE UNIQUE INDEX uniq_active_cycle_per_user_plan ON public.cycles USING btree (user_id, plan_version_id) WHERE (status = ANY (ARRAY['active'::text, 'exception'::text]));

CREATE INDEX unmatched_sender_idx ON public.unallocated_inflows USING btree (asset_id, sender, created_at, id);

CREATE INDEX users_public_activity_idx ON public.users USING btree (created_at, id) WHERE ((publication_classification = 'real'::text) AND activity_opt_in AND (role = 'member'::text) AND (status = 'active'::text));

CREATE INDEX users_publication_review_idx ON public.users USING btree (publication_classification, id);

CREATE INDEX wallet_challenge_expiry_idx ON public.wallet_challenges USING btree (expires_at, id);

CREATE INDEX wallet_reuse_lookup_idx ON public.wallet_links USING btree (environment, chain_id, address, user_id);

CREATE INDEX withdrawal_owned_cursor_idx ON public.withdrawals USING btree (user_id, id);

CREATE UNIQUE INDEX withdrawal_uuid_quote_unique ON public.withdrawals USING btree (lower(request_key));

CREATE INDEX withdrawals_user_history_idx ON public.withdrawals USING btree (user_id, created_at, id);

CREATE INDEX worker_request_expiry_idx ON public.worker_requests USING btree (expires_at, nonce);

ALTER INDEX public.audit_events_archive_time_idx ATTACH PARTITION public.gw_part_au_default_created_at_id_idx;

ALTER INDEX public.audit_events_pkey ATTACH PARTITION public.gw_part_au_default_pkey;

ALTER INDEX public.audit_request_correlation_idx ATTACH PARTITION public.gw_part_au_default_request_id_id_idx;

ALTER INDEX public.chain_scan_pages_archive_time_idx ATTACH PARTITION public.gw_part_cs_default_created_at_run_id_revision_idx;

ALTER INDEX public.chain_scan_pages_pkey ATTACH PARTITION public.gw_part_cs_default_pkey;

ALTER INDEX public.ledger_account_page_idx ATTACH PARTITION public.gw_part_lp_default_account_id_id_idx;

ALTER INDEX public.ledger_postings_archive_time_idx ATTACH PARTITION public.gw_part_lp_default_created_at_id_idx;

ALTER INDEX public.ledger_postings_pkey ATTACH PARTITION public.gw_part_lp_default_pkey;

CREATE TRIGGER account_tombstone_guard BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.gw_account_tombstone_guard();

CREATE TRIGGER alert_delivery_guard BEFORE INSERT OR DELETE OR UPDATE ON public.alert_deliveries FOR EACH ROW EXECUTE FUNCTION public.gw_alert_delivery_guard();

CREATE TRIGGER appeal_history_guard BEFORE UPDATE ON public.appeals FOR EACH ROW EXECUTE FUNCTION public.gw_case_guard();

CREATE TRIGGER archive_keys_retained BEFORE DELETE OR UPDATE ON public.archive_record_keys FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();

CREATE TRIGGER archive_months_retained BEFORE DELETE OR UPDATE ON public.archive_months FOR EACH ROW EXECUTE FUNCTION public.gw_archive_month_guard();

CREATE TRIGGER archive_record_identity BEFORE INSERT ON public.audit_events FOR EACH ROW EXECUTE FUNCTION public.gw_archive_record_guard('audit_events');

CREATE TRIGGER archive_record_identity BEFORE INSERT ON public.chain_scan_pages FOR EACH ROW EXECUTE FUNCTION public.gw_archive_record_guard('chain_scan_pages');

CREATE TRIGGER archive_record_identity BEFORE INSERT ON public.ledger_postings FOR EACH ROW EXECUTE FUNCTION public.gw_archive_record_guard('ledger_postings');

CREATE TRIGGER attempt_lineage_guard BEFORE INSERT OR UPDATE ON public.signed_attempts FOR EACH ROW EXECUTE FUNCTION public.gw_attempt_lineage_guard();

CREATE TRIGGER audit_events_append_only BEFORE DELETE OR UPDATE ON public.audit_events FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE TRIGGER bot_history_guard BEFORE DELETE OR UPDATE ON public.abuse_signals FOR EACH ROW EXECUTE FUNCTION public.gw_bot_history_guard();

CREATE TRIGGER bot_history_guard BEFORE DELETE OR UPDATE ON public.bot_challenges FOR EACH ROW EXECUTE FUNCTION public.gw_bot_history_guard();

CREATE TRIGGER bot_history_guard BEFORE DELETE OR UPDATE ON public.bot_token_uses FOR EACH ROW EXECUTE FUNCTION public.gw_bot_history_guard();

CREATE TRIGGER cancelled_withdrawal_guard BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.gw_cancelled_withdrawal_guard();

CREATE TRIGGER capture_treasury_address AFTER INSERT ON public.chain_checkpoints FOR EACH ROW EXECUTE FUNCTION public.gw_capture_treasury_address();

CREATE TRIGGER capture_treasury_address AFTER INSERT ON public.crypto_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_capture_treasury_address();

CREATE TRIGGER capture_treasury_address AFTER INSERT ON public.crypto_obligations FOR EACH ROW EXECUTE FUNCTION public.gw_capture_treasury_address();

CREATE TRIGGER capture_treasury_address AFTER INSERT ON public.unallocated_inflows FOR EACH ROW EXECUTE FUNCTION public.gw_capture_treasury_address();

CREATE CONSTRAINT TRIGGER chain_fee_guard AFTER INSERT ON public.chain_fee_claims DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_chain_fee_guard();

CREATE TRIGGER chain_fee_retained BEFORE DELETE OR UPDATE ON public.chain_fee_claims FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();

CREATE TRIGGER checkpoint_retained BEFORE DELETE OR UPDATE ON public.chain_checkpoints FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();

CREATE TRIGGER crypto_invoices_profile_guard BEFORE INSERT OR UPDATE ON public.crypto_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_invoice_profile_guard();

CREATE TRIGGER crypto_reconfirm_public_statistics AFTER INSERT ON public.crypto_reorg_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_public_statistics_reorg();

CREATE TRIGGER crypto_reorg_public_statistics AFTER INSERT ON public.crypto_reorg_reviews FOR EACH ROW EXECUTE FUNCTION public.gw_public_statistics_reorg();

CREATE TRIGGER database_binding_retained BEFORE DELETE OR UPDATE ON public.database_binding_nonce FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();

CREATE TRIGGER expired_flow_delete_guard BEFORE DELETE ON public.auth_flows FOR EACH ROW EXECUTE FUNCTION public.gw_expired_identity_delete_guard();

CREATE TRIGGER expired_rate_delete_guard BEFORE DELETE ON public.rate_limits FOR EACH ROW EXECUTE FUNCTION public.gw_expired_identity_delete_guard();

CREATE TRIGGER export_chunk_guard BEFORE DELETE OR UPDATE ON public.export_chunks FOR EACH ROW EXECUTE FUNCTION public.gw_export_guard();

CREATE TRIGGER export_request_guard BEFORE DELETE OR UPDATE ON public.data_exports FOR EACH ROW EXECUTE FUNCTION public.gw_export_guard();

CREATE TRIGGER factor_history_guard BEFORE UPDATE ON public.auth_factors FOR EACH ROW EXECUTE FUNCTION public.gw_session_history_guard();

CREATE TRIGGER failed_closure_guard BEFORE INSERT OR UPDATE ON public.crypto_obligations FOR EACH ROW EXECUTE FUNCTION public.gw_failed_closure_guard();

CREATE TRIGGER financial_adapter_guard BEFORE DELETE OR UPDATE ON public.crypto_events FOR EACH ROW EXECUTE FUNCTION public.gw_financial_adapter_guard();

CREATE TRIGGER financial_adapter_guard BEFORE DELETE OR UPDATE ON public.crypto_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_financial_adapter_guard();

CREATE TRIGGER financial_adapter_guard BEFORE DELETE OR UPDATE ON public.crypto_obligations FOR EACH ROW EXECUTE FUNCTION public.gw_financial_adapter_guard();

CREATE TRIGGER financial_adapter_guard BEFORE DELETE OR UPDATE ON public.crypto_submissions FOR EACH ROW EXECUTE FUNCTION public.gw_financial_adapter_guard();

CREATE TRIGGER financial_adapter_guard BEFORE DELETE OR UPDATE ON public.price_quotes FOR EACH ROW EXECUTE FUNCTION public.gw_financial_adapter_guard();

CREATE TRIGGER financial_adapter_guard BEFORE DELETE OR UPDATE ON public.signed_attempts FOR EACH ROW EXECUTE FUNCTION public.gw_financial_adapter_guard();

CREATE TRIGGER financial_adapter_guard BEFORE DELETE OR UPDATE ON public.signer_reservations FOR EACH ROW EXECUTE FUNCTION public.gw_financial_adapter_guard();

CREATE TRIGGER financial_state_guard BEFORE UPDATE ON public.crypto_obligations FOR EACH ROW EXECUTE FUNCTION public.gw_financial_state_guard();

CREATE CONSTRAINT TRIGGER frozen_spend_guard AFTER INSERT ON public.ledger_postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_frozen_spend_guard();

CREATE TRIGGER gift_invoices_profile_guard BEFORE INSERT OR UPDATE ON public.gift_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_invoice_profile_guard();

CREATE CONSTRAINT TRIGGER giv_withdrawal_integrity AFTER INSERT OR UPDATE ON public.withdrawals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_giv_withdrawal_integrity();

CREATE TRIGGER identity_revocation BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.gw_identity_revocation();

CREATE TRIGGER immutable_reserve_inflow BEFORE DELETE OR UPDATE ON public.native_reserve_inflows FOR EACH ROW EXECUTE FUNCTION public.gw_financial_adapter_guard();

CREATE TRIGGER incoming_append_only BEFORE DELETE OR UPDATE ON public.simulation_incoming_controls FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE TRIGGER incoming_append_only BEFORE DELETE OR UPDATE ON public.simulation_incoming_events FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE TRIGGER incoming_append_only BEFORE DELETE OR UPDATE ON public.simulation_incoming_refunds FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE TRIGGER incoming_control_guard BEFORE INSERT ON public.simulation_incoming_controls FOR EACH ROW EXECUTE FUNCTION public.gw_incoming_control_guard();

CREATE CONSTRAINT TRIGGER incoming_event_integrity AFTER INSERT ON public.simulation_incoming_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_incoming_integrity();

CREATE CONSTRAINT TRIGGER incoming_invoice_integrity AFTER INSERT OR UPDATE ON public.gift_invoices DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_incoming_integrity();

CREATE CONSTRAINT TRIGGER incoming_refund_integrity AFTER INSERT ON public.simulation_incoming_refunds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_incoming_refund_integrity();

CREATE TRIGGER invoice_snapshot_guard BEFORE DELETE OR UPDATE ON public.gift_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_invoice_snapshot_guard();

CREATE TRIGGER invoice_version_guard BEFORE DELETE OR UPDATE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION public.gw_invoice_version_guard();

CREATE TRIGGER jobs_identity_guard BEFORE DELETE OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.gw_job_identity_guard();

CREATE TRIGGER jobs_source_guard BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.gw_job_source_guard();

CREATE TRIGGER ledger_account_identity BEFORE DELETE OR UPDATE ON public.ledger_accounts FOR EACH ROW EXECUTE FUNCTION public.gw_reject_account_reassignment();

CREATE TRIGGER ledger_counter_journal_write AFTER INSERT ON public.ledger_journals FOR EACH ROW EXECUTE FUNCTION public.gw_counter_new_journal();

CREATE TRIGGER ledger_counter_posting_write AFTER INSERT ON public.ledger_postings REFERENCING NEW TABLE AS counter_posting_rows FOR EACH STATEMENT EXECUTE FUNCTION public.gw_counter_new_postings();

CREATE CONSTRAINT TRIGGER ledger_journal_balanced AFTER INSERT ON public.ledger_journals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_validate_ledger_balance();

CREATE TRIGGER ledger_journals_append_only BEFORE DELETE OR UPDATE ON public.ledger_journals FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE CONSTRAINT TRIGGER ledger_posting_balanced AFTER INSERT ON public.ledger_postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_validate_ledger_balance();

CREATE TRIGGER ledger_posting_sealed BEFORE INSERT ON public.ledger_postings FOR EACH ROW EXECUTE FUNCTION public.gw_seal_ledger_posting();

CREATE TRIGGER ledger_postings_append_only BEFORE DELETE OR UPDATE ON public.ledger_postings FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE TRIGGER liability_recovery_guard BEFORE DELETE OR UPDATE ON public.liability_recoveries FOR EACH ROW EXECUTE FUNCTION public.gw_liability_recovery_guard();

CREATE TRIGGER maintenance_result_guard BEFORE INSERT ON public.maintenance_results FOR EACH ROW EXECUTE FUNCTION public.gw_maintenance_result_guard();

CREATE TRIGGER maintenance_results_append_only BEFORE DELETE OR UPDATE ON public.maintenance_results FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE TRIGGER native_attempt_review_fence BEFORE INSERT ON public.signed_attempts FOR EACH ROW EXECUTE FUNCTION public.gw_native_attempt_review_fence();

CREATE TRIGGER native_invoice_review_fence BEFORE INSERT ON public.crypto_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_native_intake_fence();

CREATE TRIGGER native_obligation_review_fence BEFORE INSERT OR UPDATE ON public.crypto_obligations FOR EACH ROW EXECUTE FUNCTION public.gw_native_intake_fence();

CREATE TRIGGER native_resolution_anchor_guard BEFORE INSERT ON public.crypto_reorg_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_anchor_guard();

CREATE TRIGGER native_resolution_immutable BEFORE DELETE OR UPDATE ON public.crypto_reorg_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_immutable();

CREATE TRIGGER native_resolution_journal_guard BEFORE INSERT ON public.crypto_reorg_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_journal_guard();

CREATE TRIGGER native_review_anchor_guard BEFORE INSERT ON public.crypto_reorg_reviews FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_anchor_guard();

CREATE TRIGGER native_review_immutable BEFORE DELETE OR UPDATE ON public.crypto_reorg_reviews FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_immutable();

CREATE TRIGGER native_review_journal_guard BEFORE INSERT ON public.crypto_reorg_reviews FOR EACH ROW EXECUTE FUNCTION public.gw_native_review_journal_guard();

CREATE TRIGGER notification_read_guard BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.gw_notification_view_guard();

CREATE TRIGGER notification_seen_guard BEFORE INSERT OR UPDATE ON public.notification_views FOR EACH ROW EXECUTE FUNCTION public.gw_notification_view_guard();

CREATE TRIGGER observation_identity_guard BEFORE DELETE OR UPDATE ON public.chain_observations FOR EACH ROW EXECUTE FUNCTION public.gw_observation_identity_guard();

CREATE TRIGGER operation_key_append_only BEFORE DELETE OR UPDATE ON public.operation_keys FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE CONSTRAINT TRIGGER operational_recovery_guard AFTER UPDATE ON public.crypto_obligations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_operational_recovery_guard();

CREATE TRIGGER outbox_identity_guard BEFORE DELETE OR UPDATE ON public.outbox FOR EACH ROW EXECUTE FUNCTION public.gw_job_identity_guard();

CREATE TRIGGER plan_snapshot_guard BEFORE UPDATE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION public.gw_plan_snapshot_guard();

CREATE TRIGGER plan_versions_pricing_guard BEFORE INSERT OR UPDATE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION public.gw_plan_pricing_guard();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.abuse_signals FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.alert_deliveries FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.appeals FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.archive_months FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.archive_record_keys FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.assets FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.audit_events FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.auth_factors FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.auth_flows FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.auth_recovery_codes FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.auth_refresh_tokens FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.auth_sessions FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.auth_totp_replays FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.bot_challenges FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.bot_token_uses FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.chain_checkpoints FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.chain_fee_claims FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.chain_observations FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.chain_recovery_runs FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.chain_scan_pages FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.crypto_events FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.crypto_invoices FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.crypto_obligations FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.crypto_reorg_resolutions FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.crypto_reorg_reviews FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.crypto_submissions FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.cycles FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.data_exports FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.database_binding_nonce FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.deployment_binding_challenges FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.environment_instances FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.export_chunks FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.financial_reconciliation_results FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.gift_invoices FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.help_articles FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.jobs FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.ledger_account_buckets FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.ledger_account_totals FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.ledger_accounts FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.ledger_asset_totals FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.ledger_counter_markers FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.ledger_counter_state FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.ledger_journal_audits FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.ledger_journals FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.ledger_postings FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.liability_recoveries FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.maintenance_results FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.native_reserve_inflows FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.notification_views FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.notifications FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.operation_keys FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.operational_alerts FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.operational_diagnostics FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.outbox FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.plan_versions FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.plans FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.point_events FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.price_quotes FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.profile_previews FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.provider_quota_reports FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.public_statistics FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.queue_entries FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.queue_partitions FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.queue_rank_nodes FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.rate_limits FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.receipt_allocations FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.recovery_outflow_resolutions FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.recovery_outflows FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.recovery_view_caps FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.referral_codes FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.reports FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.scheduler_nonces FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.scheduler_runs FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.schema_migrations FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.signed_attempts FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.signer_dispatch_cursor FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.signer_heartbeats FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.signer_reservations FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.signer_states FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.simulation_incoming_controls FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.simulation_incoming_events FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.simulation_incoming_refunds FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.simulation_reorg_resolutions FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.simulation_reorg_reviews FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.simulation_withdrawal_controls FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.slug_redirects FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.treasury_addresses FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.unallocated_inflows FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.unallocated_refund_claims FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.user_identities FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.users FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.wallet_challenges FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.wallet_links FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.withdrawals FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.worker_requests FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER production_write_fence BEFORE INSERT OR DELETE OR UPDATE ON public.x_manifest FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence();

CREATE TRIGGER profile_previews_retained BEFORE DELETE OR UPDATE ON public.profile_previews FOR EACH ROW EXECUTE FUNCTION public.gw_profile_preview_guard();

CREATE TRIGGER queue_entries_profile_revision AFTER INSERT OR UPDATE ON public.queue_entries FOR EACH ROW EXECUTE FUNCTION public.gw_queue_profile_revision();

CREATE TRIGGER queue_identity_guard BEFORE DELETE OR UPDATE ON public.queue_entries FOR EACH ROW EXECUTE FUNCTION public.gw_queue_identity_guard();

CREATE TRIGGER queue_rank_maintain AFTER INSERT OR UPDATE OF status, priority_ticket ON public.queue_entries FOR EACH ROW EXECUTE FUNCTION public.gw_queue_rank_maintain();

CREATE TRIGGER queue_sequence_guard BEFORE UPDATE ON public.queue_partitions FOR EACH ROW EXECUTE FUNCTION public.gw_queue_sequence_guard();

CREATE TRIGGER receipt_allocation_append_only BEFORE DELETE OR UPDATE ON public.receipt_allocations FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE CONSTRAINT TRIGGER receipt_allocation_valid AFTER INSERT ON public.receipt_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_validate_receipt_allocation();

CREATE TRIGGER reconciliation_result_guard BEFORE INSERT ON public.financial_reconciliation_results FOR EACH ROW EXECUTE FUNCTION public.gw_reconciliation_result_guard();

CREATE TRIGGER reconciliation_results_append_only BEFORE DELETE OR UPDATE ON public.financial_reconciliation_results FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE TRIGGER recovery_history_guard BEFORE UPDATE ON public.auth_recovery_codes FOR EACH ROW EXECUTE FUNCTION public.gw_session_history_guard();

CREATE CONSTRAINT TRIGGER recovery_loss_guard AFTER INSERT ON public.recovery_outflow_resolutions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_loss_guard();

CREATE TRIGGER recovery_outflow_resolution_retained BEFORE DELETE OR UPDATE ON public.recovery_outflow_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();

CREATE TRIGGER recovery_outflow_retained BEFORE DELETE OR UPDATE ON public.recovery_outflows FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();

CREATE TRIGGER recovery_run_guard BEFORE DELETE OR UPDATE ON public.chain_recovery_runs FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_run_guard();

CREATE TRIGGER recovery_view_guard BEFORE DELETE OR UPDATE ON public.recovery_view_caps FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_view_guard();

CREATE TRIGGER refresh_history_guard BEFORE UPDATE ON public.auth_refresh_tokens FOR EACH ROW EXECUTE FUNCTION public.gw_session_history_guard();

CREATE CONSTRAINT TRIGGER refund_hold_obligation_guard AFTER INSERT OR UPDATE ON public.crypto_obligations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_refund_hold_guard();

CREATE TRIGGER registry_binding_guard BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.gw_registry_binding_guard();

CREATE TRIGGER registry_first_binding_guard BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.gw_registry_first_binding_guard();

CREATE CONSTRAINT TRIGGER reorg_admission_guard AFTER INSERT ON public.cycles DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_reorg_admission_guard();

CREATE TRIGGER reorg_history_guard BEFORE DELETE OR UPDATE ON public.point_events FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE TRIGGER reorg_history_guard BEFORE DELETE OR UPDATE ON public.simulation_reorg_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE TRIGGER reorg_history_guard BEFORE DELETE OR UPDATE ON public.simulation_reorg_reviews FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE CONSTRAINT TRIGGER reorg_resolution_integrity AFTER INSERT ON public.simulation_reorg_resolutions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_reorg_resolution_integrity();

CREATE CONSTRAINT TRIGGER reorg_review_integrity AFTER INSERT ON public.simulation_reorg_reviews DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_reorg_review_integrity();

CREATE TRIGGER report_history_guard BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.gw_case_guard();

CREATE TRIGGER scan_page_retained BEFORE DELETE OR UPDATE ON public.chain_scan_pages FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();

CREATE TRIGGER scheduler_nonce_retention_guard BEFORE DELETE OR UPDATE ON public.scheduler_nonces FOR EACH ROW EXECUTE FUNCTION public.gw_scheduler_retention_guard();

CREATE TRIGGER scheduler_run_retention_guard BEFORE DELETE OR UPDATE ON public.scheduler_runs FOR EACH ROW EXECUTE FUNCTION public.gw_scheduler_retention_guard();

CREATE TRIGGER session_history_guard BEFORE UPDATE ON public.auth_sessions FOR EACH ROW EXECUTE FUNCTION public.gw_session_history_guard();

CREATE TRIGGER signed_state_guard BEFORE UPDATE ON public.signed_attempts FOR EACH ROW EXECUTE FUNCTION public.gw_financial_state_guard();

CREATE TRIGGER simulation_withdrawal_controls_append BEFORE DELETE OR UPDATE ON public.simulation_withdrawal_controls FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation();

CREATE TRIGGER treasury_addresses_retained BEFORE DELETE OR UPDATE ON public.treasury_addresses FOR EACH ROW EXECUTE FUNCTION public.gw_treasury_inventory_guard();

CREATE CONSTRAINT TRIGGER treasury_sweep_journal_guard AFTER INSERT ON public.ledger_journals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_treasury_sweep_guard();

CREATE CONSTRAINT TRIGGER treasury_sweep_obligation_guard AFTER INSERT OR UPDATE ON public.crypto_obligations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_treasury_sweep_guard();

CREATE CONSTRAINT TRIGGER treasury_sweep_posting_guard AFTER INSERT ON public.ledger_postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_treasury_sweep_guard();

CREATE CONSTRAINT TRIGGER unallocated_refund_guard AFTER INSERT OR UPDATE ON public.crypto_obligations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_unallocated_refund_guard();

CREATE TRIGGER unmatched_claim_retained BEFORE DELETE OR UPDATE ON public.unallocated_refund_claims FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();

CREATE CONSTRAINT TRIGGER unmatched_custody_guard AFTER INSERT ON public.unallocated_inflows DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_unallocated_custody_guard();

CREATE TRIGGER unmatched_retained BEFORE DELETE OR UPDATE ON public.unallocated_inflows FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();

CREATE CONSTRAINT TRIGGER unmatched_source_guard AFTER INSERT ON public.ledger_postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_unallocated_source_guard();

CREATE TRIGGER unmatched_source_lock BEFORE INSERT ON public.ledger_postings FOR EACH ROW EXECUTE FUNCTION public.gw_unallocated_source_lock();

CREATE TRIGGER user_payable_lock BEFORE INSERT ON public.ledger_postings FOR EACH ROW EXECUTE FUNCTION public.gw_lock_user_payable();

CREATE CONSTRAINT TRIGGER user_payable_nonnegative AFTER INSERT ON public.ledger_postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.gw_check_user_payable();

CREATE TRIGGER users_publication_cache_epoch AFTER INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.gw_publication_cache_epoch();

CREATE TRIGGER users_publication_consent_guard BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.gw_publication_consent_guard();

CREATE TRIGGER wallet_challenge_guard BEFORE DELETE OR UPDATE ON public.wallet_challenges FOR EACH ROW EXECUTE FUNCTION public.gw_financial_ephemeral_guard();

CREATE TRIGGER wallet_revision_guard BEFORE UPDATE ON public.wallet_links FOR EACH ROW EXECUTE FUNCTION public.gw_wallet_revision_guard();

CREATE TRIGGER withdrawal_snapshot_guard BEFORE DELETE OR UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.gw_withdrawal_snapshot_guard();

CREATE TRIGGER worker_nonce_guard BEFORE DELETE OR UPDATE ON public.worker_requests FOR EACH ROW EXECUTE FUNCTION public.gw_financial_ephemeral_guard();

CREATE TRIGGER x_manifest_profile_guard BEFORE DELETE OR UPDATE ON public.x_manifest FOR EACH ROW EXECUTE FUNCTION public.gw_profile_setting_guard();

ALTER TABLE ONLY public.abuse_signals
    ADD CONSTRAINT abuse_signals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.alert_deliveries
    ADD CONSTRAINT alert_deliveries_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.operational_alerts(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.appeals
    ADD CONSTRAINT appeals_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.appeals
    ADD CONSTRAINT appeals_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE RESTRICT;

ALTER TABLE public.audit_events
    ADD CONSTRAINT audit_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.auth_factors
    ADD CONSTRAINT auth_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.auth_recovery_codes
    ADD CONSTRAINT auth_recovery_codes_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES public.auth_factors(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.auth_refresh_tokens
    ADD CONSTRAINT auth_refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.auth_sessions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.auth_totp_replays
    ADD CONSTRAINT auth_totp_replays_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES public.auth_factors(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.bot_challenges
    ADD CONSTRAINT bot_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.bot_token_uses
    ADD CONSTRAINT bot_token_uses_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.bot_challenges(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chain_checkpoints
    ADD CONSTRAINT chain_checkpoints_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chain_checkpoints
    ADD CONSTRAINT chain_checkpoints_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chain_fee_claims
    ADD CONSTRAINT chain_fee_claims_gas_journal_id_fkey FOREIGN KEY (gas_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chain_fee_claims
    ADD CONSTRAINT chain_fee_claims_native_asset_id_fkey FOREIGN KEY (native_asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chain_fee_claims
    ADD CONSTRAINT chain_fee_claims_setup_journal_id_fkey FOREIGN KEY (setup_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chain_observations
    ADD CONSTRAINT chain_observations_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.crypto_invoices(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chain_observations
    ADD CONSTRAINT chain_observations_source_job_id_fkey FOREIGN KEY (source_job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chain_observations
    ADD CONSTRAINT chain_observations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chain_recovery_runs
    ADD CONSTRAINT chain_recovery_runs_checkpoint_id_fkey FOREIGN KEY (checkpoint_id) REFERENCES public.chain_checkpoints(id) ON DELETE RESTRICT;

ALTER TABLE public.chain_scan_pages
    ADD CONSTRAINT chain_scan_pages_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.chain_recovery_runs(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_events
    ADD CONSTRAINT crypto_events_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_events
    ADD CONSTRAINT crypto_events_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.crypto_invoices(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_invoices
    ADD CONSTRAINT crypto_invoices_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_invoices
    ADD CONSTRAINT crypto_invoices_plan_version_id_fkey FOREIGN KEY (plan_version_id) REFERENCES public.plan_versions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_invoices
    ADD CONSTRAINT crypto_invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_invoices
    ADD CONSTRAINT crypto_invoices_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallet_links(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_obligations
    ADD CONSTRAINT crypto_obligations_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_obligations
    ADD CONSTRAINT crypto_obligations_previous_obligation_id_fkey FOREIGN KEY (previous_obligation_id) REFERENCES public.crypto_obligations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_obligations
    ADD CONSTRAINT crypto_obligations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_reorg_resolutions
    ADD CONSTRAINT crypto_reorg_resolutions_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_reorg_resolutions
    ADD CONSTRAINT crypto_reorg_resolutions_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.crypto_reorg_reviews(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_reorg_reviews
    ADD CONSTRAINT crypto_reorg_reviews_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_reorg_reviews
    ADD CONSTRAINT crypto_reorg_reviews_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.crypto_events(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_reorg_reviews
    ADD CONSTRAINT crypto_reorg_reviews_loss_journal_id_fkey FOREIGN KEY (loss_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.crypto_submissions
    ADD CONSTRAINT crypto_submissions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.crypto_invoices(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_plan_version_id_fkey FOREIGN KEY (plan_version_id) REFERENCES public.plan_versions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT data_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.export_chunks
    ADD CONSTRAINT export_chunks_export_id_fkey FOREIGN KEY (export_id) REFERENCES public.data_exports(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.financial_reconciliation_results
    ADD CONSTRAINT financial_reconciliation_results_source_job_id_fkey FOREIGN KEY (source_job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.gift_invoices
    ADD CONSTRAINT gift_invoices_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.gift_invoices
    ADD CONSTRAINT gift_invoices_plan_version_id_fkey FOREIGN KEY (plan_version_id) REFERENCES public.plan_versions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.gift_invoices
    ADD CONSTRAINT gift_invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_outbox_id_fkey FOREIGN KEY (outbox_id) REFERENCES public.outbox(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ledger_account_buckets
    ADD CONSTRAINT ledger_account_buckets_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ledger_account_totals
    ADD CONSTRAINT ledger_account_totals_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ledger_account_totals
    ADD CONSTRAINT ledger_account_totals_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ledger_accounts
    ADD CONSTRAINT ledger_accounts_owner_user_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ledger_asset_totals
    ADD CONSTRAINT ledger_asset_totals_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.ledger_journal_audits
    ADD CONSTRAINT ledger_journal_audits_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE public.ledger_postings
    ADD CONSTRAINT ledger_postings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT;

ALTER TABLE public.ledger_postings
    ADD CONSTRAINT ledger_postings_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.liability_recoveries
    ADD CONSTRAINT liability_recoveries_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.liability_recoveries
    ADD CONSTRAINT liability_recoveries_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.liability_recoveries
    ADD CONSTRAINT liability_recoveries_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES public.crypto_obligations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.liability_recoveries
    ADD CONSTRAINT liability_recoveries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.maintenance_results
    ADD CONSTRAINT maintenance_results_source_job_id_fkey FOREIGN KEY (source_job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.native_reserve_inflows
    ADD CONSTRAINT native_reserve_inflows_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.native_reserve_inflows
    ADD CONSTRAINT native_reserve_inflows_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.native_reserve_inflows
    ADD CONSTRAINT native_reserve_inflows_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.notification_views
    ADD CONSTRAINT notification_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.operational_alerts
    ADD CONSTRAINT operational_alerts_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_activation_price_id_fkey FOREIGN KEY (activation_price_id) REFERENCES public.price_quotes(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.point_events
    ADD CONSTRAINT point_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.price_quotes
    ADD CONSTRAINT price_quotes_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.profile_previews
    ADD CONSTRAINT profile_previews_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.provider_quota_reports
    ADD CONSTRAINT provider_quota_reports_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_beneficiary_user_id_fkey FOREIGN KEY (beneficiary_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.queue_entries
    ADD CONSTRAINT queue_entries_partition_id_fkey FOREIGN KEY (partition_id) REFERENCES public.queue_partitions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.queue_partitions
    ADD CONSTRAINT queue_partitions_plan_version_id_fkey FOREIGN KEY (plan_version_id) REFERENCES public.plan_versions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.queue_rank_nodes
    ADD CONSTRAINT queue_rank_nodes_partition_id_fkey FOREIGN KEY (partition_id) REFERENCES public.queue_partitions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_allocations_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_allocations_beneficiary_user_id_fkey FOREIGN KEY (beneficiary_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_allocations_credit_journal_id_fkey FOREIGN KEY (credit_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_allocations_payer_user_id_fkey FOREIGN KEY (payer_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_allocations_receiver_account_id_fkey FOREIGN KEY (receiver_account_id) REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_allocations_receiver_entry_id_fkey FOREIGN KEY (receiver_entry_id) REFERENCES public.queue_entries(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_allocations_source_cycle_id_fkey FOREIGN KEY (source_cycle_id) REFERENCES public.cycles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.receipt_allocations
    ADD CONSTRAINT receipt_source_operation_fk FOREIGN KEY (source_operation_key) REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY public.recovery_outflow_resolutions
    ADD CONSTRAINT recovery_outflow_resolutions_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.recovery_outflow_resolutions
    ADD CONSTRAINT recovery_outflow_resolutions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.recovery_outflow_resolutions
    ADD CONSTRAINT recovery_outflow_resolutions_gas_journal_id_fkey FOREIGN KEY (gas_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.recovery_outflow_resolutions
    ADD CONSTRAINT recovery_outflow_resolutions_native_asset_id_fkey FOREIGN KEY (native_asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.recovery_outflow_resolutions
    ADD CONSTRAINT recovery_outflow_resolutions_outflow_id_fkey FOREIGN KEY (outflow_id) REFERENCES public.recovery_outflows(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.recovery_outflow_resolutions
    ADD CONSTRAINT recovery_outflow_resolutions_principal_journal_id_fkey FOREIGN KEY (principal_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.recovery_outflow_resolutions
    ADD CONSTRAINT recovery_outflow_resolutions_setup_journal_id_fkey FOREIGN KEY (setup_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.recovery_outflows
    ADD CONSTRAINT recovery_outflows_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.recovery_outflows
    ADD CONSTRAINT recovery_outflows_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES public.crypto_obligations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.recovery_outflows
    ADD CONSTRAINT recovery_outflows_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.chain_recovery_runs(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.recovery_view_caps
    ADD CONSTRAINT recovery_view_caps_recovery_id_fkey FOREIGN KEY (recovery_id) REFERENCES public.liability_recoveries(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.signed_attempts
    ADD CONSTRAINT signed_attempts_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES public.crypto_obligations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.signed_attempts
    ADD CONSTRAINT signed_attempts_previous_attempt_id_fkey FOREIGN KEY (previous_attempt_id) REFERENCES public.signed_attempts(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.signer_reservations
    ADD CONSTRAINT signer_reservations_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.signer_reservations
    ADD CONSTRAINT signer_reservations_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES public.crypto_obligations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_controls
    ADD CONSTRAINT simulation_incoming_controls_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_controls
    ADD CONSTRAINT simulation_incoming_controls_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.gift_invoices(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_controls
    ADD CONSTRAINT simulation_incoming_controls_operation_key_fkey FOREIGN KEY (operation_key) REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_events
    ADD CONSTRAINT simulation_incoming_events_accept_journal_id_fkey FOREIGN KEY (accept_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_events
    ADD CONSTRAINT simulation_incoming_events_gift_operation_key_fkey FOREIGN KEY (gift_operation_key) REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_events
    ADD CONSTRAINT simulation_incoming_events_hold_journal_id_fkey FOREIGN KEY (hold_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_events
    ADD CONSTRAINT simulation_incoming_events_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.gift_invoices(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_events
    ADD CONSTRAINT simulation_incoming_events_refund_journal_id_fkey FOREIGN KEY (refund_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_refunds
    ADD CONSTRAINT simulation_incoming_refunds_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_refunds
    ADD CONSTRAINT simulation_incoming_refunds_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.gift_invoices(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_refunds
    ADD CONSTRAINT simulation_incoming_refunds_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_incoming_refunds
    ADD CONSTRAINT simulation_incoming_refunds_operation_key_fkey FOREIGN KEY (operation_key) REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_resolutions
    ADD CONSTRAINT simulation_reorg_resolutions_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_resolutions
    ADD CONSTRAINT simulation_reorg_resolutions_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_resolutions
    ADD CONSTRAINT simulation_reorg_resolutions_operation_key_fkey FOREIGN KEY (operation_key) REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_resolutions
    ADD CONSTRAINT simulation_reorg_resolutions_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.simulation_reorg_reviews(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_loss_journal_id_fkey FOREIGN KEY (loss_journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_operation_key_fkey FOREIGN KEY (operation_key) REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_partition_id_fkey FOREIGN KEY (partition_id) REFERENCES public.queue_partitions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_payer_user_id_fkey FOREIGN KEY (payer_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_receiver_entry_id_fkey FOREIGN KEY (receiver_entry_id) REFERENCES public.queue_entries(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_source_allocation_id_fkey FOREIGN KEY (source_allocation_id) REFERENCES public.receipt_allocations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_source_cycle_id_fkey FOREIGN KEY (source_cycle_id) REFERENCES public.cycles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_reorg_reviews
    ADD CONSTRAINT simulation_reorg_reviews_source_operation_key_fkey FOREIGN KEY (source_operation_key) REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_withdrawal_controls
    ADD CONSTRAINT simulation_withdrawal_controls_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.simulation_withdrawal_controls
    ADD CONSTRAINT simulation_withdrawal_controls_operation_key_fkey FOREIGN KEY (operation_key) REFERENCES public.operation_keys(business_key) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY public.simulation_withdrawal_controls
    ADD CONSTRAINT simulation_withdrawal_controls_withdrawal_id_fkey FOREIGN KEY (withdrawal_id) REFERENCES public.withdrawals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.slug_redirects
    ADD CONSTRAINT slug_redirects_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.help_articles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.treasury_addresses
    ADD CONSTRAINT treasury_addresses_asset_id_assets_id_fk FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.unallocated_inflows
    ADD CONSTRAINT unallocated_inflows_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.unallocated_inflows
    ADD CONSTRAINT unallocated_inflows_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.ledger_journals(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.unallocated_refund_claims
    ADD CONSTRAINT unallocated_refund_claims_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.unallocated_refund_claims
    ADD CONSTRAINT unallocated_refund_claims_inflow_id_fkey FOREIGN KEY (inflow_id) REFERENCES public.unallocated_inflows(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.user_identities
    ADD CONSTRAINT user_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.wallet_challenges
    ADD CONSTRAINT wallet_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.wallet_links
    ADD CONSTRAINT wallet_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.x_manifest
    ADD CONSTRAINT x_manifest_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.abuse_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY active_payment_environment ON public.abuse_signals AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.alert_deliveries AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.appeals AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.archive_months AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.archive_record_keys AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.assets AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.audit_events AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.auth_factors AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.auth_flows AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.auth_recovery_codes AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.auth_refresh_tokens AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.auth_sessions AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.auth_totp_replays AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.bot_challenges AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.bot_token_uses AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.chain_checkpoints AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = chain_checkpoints.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = chain_checkpoints.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.chain_fee_claims AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.chain_observations AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.chain_recovery_runs AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.chain_scan_pages AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.crypto_events AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.crypto_invoices AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.crypto_obligations AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.crypto_reorg_resolutions AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.crypto_reorg_reviews AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = crypto_reorg_reviews.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = crypto_reorg_reviews.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.crypto_submissions AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.cycles AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.data_exports AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.database_binding_nonce AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.deployment_binding_challenges AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.environment_instances AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.export_chunks AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.financial_reconciliation_results AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.gift_invoices AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.help_articles AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.jobs AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.ledger_account_buckets AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.ledger_account_totals AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = ledger_account_totals.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = ledger_account_totals.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.ledger_accounts AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = ledger_accounts.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = ledger_accounts.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.ledger_asset_totals AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = ledger_asset_totals.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = ledger_asset_totals.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.ledger_counter_markers AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.ledger_counter_state AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.ledger_journal_audits AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.ledger_journals AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.ledger_postings AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.liability_recoveries AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = liability_recoveries.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = liability_recoveries.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.maintenance_results AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.native_reserve_inflows AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.notification_views AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.notifications AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.operation_keys AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.operational_alerts AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.operational_diagnostics AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.outbox AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.plan_versions AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = plan_versions.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = plan_versions.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.plans AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.point_events AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.price_quotes AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = price_quotes.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = price_quotes.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.profile_previews AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.provider_quota_reports AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.public_statistics AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.queue_entries AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.queue_partitions AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.queue_rank_nodes AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.rate_limits AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.receipt_allocations AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.recovery_outflow_resolutions AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = recovery_outflow_resolutions.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = recovery_outflow_resolutions.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.recovery_outflows AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = recovery_outflows.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = recovery_outflows.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.recovery_view_caps AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.referral_codes AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.reports AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.scheduler_nonces AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.scheduler_runs AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.schema_migrations AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.signed_attempts AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.signer_dispatch_cursor AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.signer_heartbeats AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.signer_reservations AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = signer_reservations.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = signer_reservations.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.signer_states AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.simulation_incoming_controls AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.simulation_incoming_events AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.simulation_incoming_refunds AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.simulation_reorg_resolutions AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.simulation_reorg_reviews AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.simulation_withdrawal_controls AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.slug_redirects AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.treasury_addresses AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = treasury_addresses.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = treasury_addresses.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.unallocated_inflows AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.unallocated_refund_claims AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.user_identities AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.users AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY active_payment_environment ON public.wallet_challenges AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.wallet_links AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.withdrawals AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = withdrawals.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = withdrawals.asset_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY active_payment_environment ON public.worker_requests AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true)))) WITH CHECK ((public.gw_runtime_environment_allowed() AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY active_payment_environment ON public.x_manifest AS RESTRICTIVE TO gw_read, gw_service, gw_signer USING (public.gw_runtime_environment_allowed()) WITH CHECK (public.gw_runtime_environment_allowed());

CREATE POLICY adapter_service ON public.alert_deliveries TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.crypto_events TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.crypto_invoices TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.crypto_obligations TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.crypto_submissions TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.operational_alerts TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.price_quotes TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.signed_attempts TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.signer_reservations TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.signer_states TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.wallet_challenges TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY adapter_service ON public.worker_requests TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY appeal_reader ON public.appeals FOR SELECT TO gw_read USING ((public.gw_owns(actor_id) OR public.gw_staff_reader()));

CREATE POLICY appeal_service ON public.appeals TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.archive_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY archive_months_service ON public.archive_months FOR SELECT TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.archive_record_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_factors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_flows ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_recovery_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_refresh_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_totp_replays ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bot_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY bot_service ON public.abuse_signals TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY bot_service ON public.bot_challenges TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY bot_service ON public.bot_token_uses TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.bot_token_uses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chain_checkpoints ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chain_fee_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY chain_fee_service ON public.chain_fee_claims TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.chain_observations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chain_recovery_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chain_scan_pages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crypto_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crypto_invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crypto_obligations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crypto_reorg_resolutions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crypto_reorg_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crypto_submissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_export_reader ON public.data_exports FOR SELECT TO gw_read USING (public.gw_owns(user_id));

CREATE POLICY data_export_service ON public.data_exports TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.database_binding_nonce ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.deployment_binding_challenges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.environment_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY export_chunk_service ON public.export_chunks TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.export_chunks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.financial_reconciliation_results ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.gift_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY gw_assets_read ON public.assets FOR SELECT TO gw_read USING ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_audit_read ON public.audit_events FOR SELECT TO gw_read USING (public.gw_staff_reader());

CREATE POLICY gw_binding_read ON public.deployment_binding_challenges FOR SELECT TO gw_service USING (((environment = current_setting('gw.environment'::text, true)) AND (expires_at > clock_timestamp())));

CREATE POLICY gw_counter_service_read ON public.ledger_account_buckets FOR SELECT TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY gw_counter_service_read ON public.ledger_account_totals FOR SELECT TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY gw_counter_service_read ON public.ledger_asset_totals FOR SELECT TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY gw_counter_service_read ON public.ledger_counter_markers FOR SELECT TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY gw_counter_service_read ON public.ledger_counter_state FOR SELECT TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY gw_counter_service_read ON public.ledger_journal_audits FOR SELECT TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY gw_identity_service ON public.auth_factors TO gw_service USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));

CREATE POLICY gw_identity_service ON public.auth_flows TO gw_service USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));

CREATE POLICY gw_identity_service ON public.auth_recovery_codes TO gw_service USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));

CREATE POLICY gw_identity_service ON public.auth_refresh_tokens TO gw_service USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));

CREATE POLICY gw_identity_service ON public.auth_sessions TO gw_service USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));

CREATE POLICY gw_identity_service ON public.auth_totp_replays TO gw_service USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));

CREATE POLICY gw_identity_service ON public.rate_limits TO gw_service USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));

CREATE POLICY gw_identity_service ON public.user_identities TO gw_service USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));

CREATE POLICY gw_incoming_service ON public.gift_invoices TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_incoming_service ON public.simulation_incoming_controls TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_incoming_service ON public.simulation_incoming_events TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_incoming_service ON public.simulation_incoming_refunds TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_instance_read ON public.environment_instances FOR SELECT TO gw_service USING ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_invoice_owned ON public.gift_invoices FOR SELECT TO gw_read USING (((environment = current_setting('gw.environment'::text, true)) AND public.gw_owns(user_id)));

CREATE POLICY gw_maintenance_service ON public.maintenance_results TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_owned_read ON public.cycles FOR SELECT TO gw_read USING ((public.gw_owns(user_id) AND (EXISTS ( SELECT 1
   FROM (public.plan_versions v
     JOIN public.assets a ON ((a.id = v.asset_id)))
  WHERE ((v.id = cycles.plan_version_id) AND (a.environment = current_setting('gw.environment'::text, true)))))));

CREATE POLICY gw_owned_read ON public.notifications FOR SELECT TO gw_read USING (public.gw_owns(user_id));

CREATE POLICY gw_owned_read ON public.point_events FOR SELECT TO gw_read USING (public.gw_owns(user_id));

CREATE POLICY gw_owned_read ON public.queue_entries FOR SELECT TO gw_read USING ((public.gw_owns(beneficiary_user_id) AND (EXISTS ( SELECT 1
   FROM public.queue_partitions
  WHERE (queue_partitions.id = queue_entries.partition_id)))));

CREATE POLICY gw_owned_read ON public.referral_codes FOR SELECT TO gw_read USING (public.gw_owns(user_id));

CREATE POLICY gw_owned_read ON public.users FOR SELECT TO gw_read USING (public.gw_owns(id));

CREATE POLICY gw_owned_read ON public.wallet_links FOR SELECT TO gw_read USING ((public.gw_owns(user_id) AND (environment = current_setting('gw.environment'::text, true))));

CREATE POLICY gw_owned_read ON public.withdrawals FOR SELECT TO gw_read USING ((public.gw_owns(user_id) AND (EXISTS ( SELECT 1
   FROM public.assets
  WHERE ((assets.id = withdrawals.asset_id) AND (assets.environment = current_setting('gw.environment'::text, true)))))));

ALTER TABLE public.gw_part_au_default ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.gw_part_cs_default ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.gw_part_lp_default ENABLE ROW LEVEL SECURITY;

CREATE POLICY gw_partitions_read ON public.queue_partitions FOR SELECT TO gw_read USING ((EXISTS ( SELECT 1
   FROM public.plan_versions
  WHERE (plan_versions.id = queue_partitions.plan_version_id))));

CREATE POLICY gw_plans_read ON public.plans FOR SELECT TO gw_read USING (true);

CREATE POLICY gw_rank_service_read ON public.queue_rank_nodes FOR SELECT TO gw_service USING (true);

CREATE POLICY gw_receipt_owned ON public.receipt_allocations FOR SELECT TO gw_read USING (((environment = current_setting('gw.environment'::text, true)) AND (public.gw_owns(beneficiary_user_id) OR (payer_user_id = public.gw_actor_id()))));

CREATE POLICY gw_receipt_service ON public.receipt_allocations TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_reconciliation_service ON public.financial_reconciliation_results TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_reorg_service ON public.simulation_reorg_resolutions TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_reorg_service ON public.simulation_reorg_reviews TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_service_access ON public.assets TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.audit_events TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.cycles TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.ledger_accounts TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.ledger_journals TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.ledger_postings TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.notifications TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.operation_keys TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.plan_versions TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.plans TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.point_events TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.queue_entries TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.queue_partitions TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.referral_codes TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.users TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.wallet_links TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.withdrawals TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_service_access ON public.x_manifest TO gw_service USING (true) WITH CHECK (true);

CREATE POLICY gw_simulation_withdrawal_service ON public.simulation_withdrawal_controls TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_versions_read ON public.plan_versions FOR SELECT TO gw_read USING ((EXISTS ( SELECT 1
   FROM public.assets
  WHERE (assets.id = plan_versions.asset_id))));

CREATE POLICY gw_work_service ON public.jobs TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_work_service ON public.outbox TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_work_service ON public.scheduler_nonces TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY gw_work_service ON public.scheduler_runs TO gw_service USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY help_read ON public.help_articles FOR SELECT TO gw_read USING ((published OR public.gw_staff_reader()));

CREATE POLICY help_redirect_read ON public.slug_redirects FOR SELECT TO gw_read USING ((EXISTS ( SELECT 1
   FROM public.help_articles
  WHERE ((help_articles.id = slug_redirects.article_id) AND help_articles.published))));

CREATE POLICY help_redirect_service ON public.slug_redirects TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY help_service ON public.help_articles TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY isolated_signer ON public.signed_attempts TO gw_signer USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY isolated_signer ON public.signer_reservations TO gw_signer USING ((EXISTS ( SELECT 1
   FROM public.crypto_obligations o
  WHERE ((o.id = signer_reservations.obligation_id) AND (o.environment = current_setting('gw.environment'::text, true)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.crypto_obligations o
  WHERE ((o.id = signer_reservations.obligation_id) AND (o.environment = current_setting('gw.environment'::text, true))))));

CREATE POLICY isolated_signer ON public.signer_states TO gw_signer USING ((environment = current_setting('gw.environment'::text, true))) WITH CHECK ((environment = current_setting('gw.environment'::text, true)));

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_account_buckets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_account_totals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_asset_totals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_counter_markers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_counter_state ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_journal_audits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_journals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_postings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.liability_recoveries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.maintenance_results ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.native_reserve_inflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY native_resolution_service ON public.crypto_reorg_resolutions TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY native_review_service ON public.crypto_reorg_reviews TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.notification_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_views_owned ON public.notification_views TO gw_read USING (public.gw_owns(user_id));

CREATE POLICY notification_views_service ON public.notification_views TO gw_service USING ((user_id = public.gw_actor_id())) WITH CHECK ((user_id = public.gw_actor_id()));

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY observation_service ON public.chain_observations TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.operation_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.operational_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY operational_service ON public.operational_diagnostics TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY operational_service ON public.provider_quota_reports TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY outflow_resolution_service ON public.recovery_outflow_resolutions TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY preview_assets ON public.assets FOR SELECT TO gw_preview USING ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY preview_help ON public.help_articles FOR SELECT TO gw_preview USING (published);

CREATE POLICY preview_plans ON public.plans FOR SELECT TO gw_preview USING (true);

CREATE POLICY preview_public_manifest ON public.x_manifest FOR SELECT TO gw_preview USING ((scope = 'public'::text));

CREATE POLICY preview_redirects ON public.slug_redirects FOR SELECT TO gw_preview USING ((EXISTS ( SELECT 1
   FROM public.help_articles h
  WHERE ((h.id = slug_redirects.article_id) AND h.published))));

CREATE POLICY preview_versions ON public.plan_versions FOR SELECT TO gw_preview USING ((EXISTS ( SELECT 1
   FROM public.assets a
  WHERE ((a.id = plan_versions.asset_id) AND (a.environment = current_setting('gw.environment'::text, true))))));

ALTER TABLE public.price_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_preview_admin ON public.profile_previews TO gw_service USING (((actor_user_id = (NULLIF(current_setting('gw.actor_id'::text, true), ''::text))::uuid) AND (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = profile_previews.actor_user_id) AND (users.role = 'admin'::text) AND (users.status = 'active'::text)))))) WITH CHECK (((actor_user_id = (NULLIF(current_setting('gw.actor_id'::text, true), ''::text))::uuid) AND (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = profile_previews.actor_user_id) AND (users.role = 'admin'::text) AND (users.status = 'active'::text))))));

ALTER TABLE public.profile_previews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.provider_quota_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.public_statistics ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.queue_partitions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.queue_rank_nodes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.receipt_allocations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.recovery_outflow_resolutions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.recovery_outflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY recovery_service ON public.chain_checkpoints TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY recovery_service ON public.chain_recovery_runs TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY recovery_service ON public.chain_scan_pages TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY recovery_service ON public.liability_recoveries TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY recovery_service ON public.recovery_outflows TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

CREATE POLICY recovery_service ON public.unallocated_inflows TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.recovery_view_caps ENABLE ROW LEVEL SECURITY;

CREATE POLICY recovery_view_service ON public.recovery_view_caps TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_reader ON public.reports FOR SELECT TO gw_read USING ((public.gw_owns(actor_id) OR public.gw_owns(target_id) OR public.gw_staff_reader()));

CREATE POLICY report_service ON public.reports TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY reserve_inflow_service ON public.native_reserve_inflows TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.scheduler_nonces ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.scheduler_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.signed_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY signer_account_read ON public.ledger_accounts FOR SELECT TO gw_signer USING ((asset_id IN ( SELECT assets.id
   FROM public.assets
  WHERE (assets.environment = current_setting('gw.environment'::text, true)))));

CREATE POLICY signer_alert_read ON public.operational_alerts FOR SELECT TO gw_signer USING ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY signer_assets ON public.assets FOR SELECT TO gw_signer USING ((environment = current_setting('gw.environment'::text, true)));

CREATE POLICY signer_delivery_read ON public.alert_deliveries FOR SELECT TO gw_signer USING ((alert_id IN ( SELECT operational_alerts.id
   FROM public.operational_alerts
  WHERE (operational_alerts.environment = current_setting('gw.environment'::text, true)))));

ALTER TABLE public.signer_dispatch_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY signer_dispatch_scope ON public.signer_dispatch_cursor TO gw_signer USING ((current_setting('gw.environment'::text, true) = ANY (ARRAY['testnet'::text, 'mainnet'::text]))) WITH CHECK ((current_setting('gw.environment'::text, true) = ANY (ARRAY['testnet'::text, 'mainnet'::text])));

CREATE POLICY signer_heartbeat_worker ON public.signer_heartbeats TO gw_signer USING (((environment = current_setting('gw.environment'::text, true)) AND (current_setting('gw.environment'::text, true) = ANY (ARRAY['testnet'::text, 'mainnet'::text])))) WITH CHECK (((environment = current_setting('gw.environment'::text, true)) AND (current_setting('gw.environment'::text, true) = ANY (ARRAY['testnet'::text, 'mainnet'::text]))));

ALTER TABLE public.signer_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY signer_manifest_read ON public.x_manifest FOR SELECT TO gw_signer USING ((current_setting('gw.environment'::text, true) = ANY (ARRAY['testnet'::text, 'mainnet'::text])));

CREATE POLICY signer_obligation_transition ON public.crypto_obligations FOR UPDATE TO gw_signer USING (((environment = current_setting('gw.environment'::text, true)) AND (status = ANY (ARRAY['approved'::text, 'signing'::text, 'broadcast'::text])))) WITH CHECK (((environment = current_setting('gw.environment'::text, true)) AND (status = ANY (ARRAY['signing'::text, 'broadcast'::text, 'exception'::text, 'awaiting_requote'::text]))));

CREATE POLICY signer_obligations ON public.crypto_obligations FOR SELECT TO gw_signer USING (((environment = current_setting('gw.environment'::text, true)) AND (status = ANY (ARRAY['approved'::text, 'signing'::text, 'broadcast'::text, 'awaiting_requote'::text, 'exception'::text, 'settled'::text]))));

CREATE POLICY signer_posting_read ON public.ledger_postings FOR SELECT TO gw_signer USING ((account_id IN ( SELECT ledger_accounts.id
   FROM public.ledger_accounts)));

CREATE POLICY signer_prices ON public.price_quotes FOR SELECT TO gw_signer USING (true);

ALTER TABLE public.signer_reservations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.signer_states ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.simulation_incoming_controls ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.simulation_incoming_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.simulation_incoming_refunds ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.simulation_reorg_resolutions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.simulation_reorg_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.simulation_withdrawal_controls ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY stats_service ON public.public_statistics TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.treasury_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY treasury_addresses_service ON public.treasury_addresses TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.unallocated_inflows ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.unallocated_refund_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY unmatched_claim_service ON public.unallocated_refund_claims TO gw_service USING ((current_setting('gw.access'::text, true) = 'service'::text)) WITH CHECK ((current_setting('gw.access'::text, true) = 'service'::text));

ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallet_challenges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallet_links ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.worker_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.x_manifest ENABLE ROW LEVEL SECURITY;


-- Supabase Data API grants: exact final role/column/function permissions.
-- New objects must not inherit broad target-owner default grants. Extension
-- objects and unrelated provider schemas are excluded from this normalization.
DO $normalize_new_acl$
DECLARE object record;permission record;recipient text;
BEGIN
 FOR object IN SELECT c.oid,c.relowner AS owner,'TABLE public.'||quote_ident(c.relname) AS target FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','p','v') AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e') LOOP
  FOR permission IN SELECT DISTINCT a.grantee FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=object.oid AND a.grantee<>object.owner LOOP
   recipient:=CASE WHEN permission.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(permission.grantee)) END;
   EXECUTE 'REVOKE ALL ON '||object.target||' FROM '||recipient;
  END LOOP;
 END LOOP;
 FOR object IN SELECT p.oid,p.proowner AS owner,'FUNCTION public.'||quote_ident(p.proname)||'('||pg_get_function_identity_arguments(p.oid)||')' AS target FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') LOOP
  FOR permission IN SELECT DISTINCT a.grantee FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=object.oid AND a.grantee<>object.owner LOOP
   recipient:=CASE WHEN permission.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(permission.grantee)) END;
   EXECUTE 'REVOKE ALL ON '||object.target||' FROM '||recipient;
  END LOOP;
 END LOOP;
 FOR permission IN SELECT DISTINCT a.grantee FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='public' AND a.grantee<>n.nspowner LOOP
  recipient:=CASE WHEN permission.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(permission.grantee)) END;
  EXECUTE 'REVOKE ALL ON SCHEMA public FROM '||recipient;
 END LOOP;
END $normalize_new_acl$;
GRANT EXECUTE ON FUNCTION public.gw_account_balance(target uuid) TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_account_balance(target uuid) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_account_bucket(target uuid, bucket text) TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_account_bucket(target uuid, bucket text) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_actor_id() TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_actor_id() TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_advance_monthly_archive(maximum integer) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_asset_balance(target uuid, purposes text[]) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_counter_advance(batch_size integer) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_counter_ready() TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_database_binding() TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_database_binding() TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_database_binding() TO "gw_signer";
GRANT EXECUTE ON FUNCTION public.gw_expire_profile_previews(maximum integer) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_native_asset_fence(asset uuid) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_native_asset_fence(asset uuid) TO "gw_signer";
GRANT EXECUTE ON FUNCTION public.gw_next_treasury_monitor(target uuid, current_address text) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_owns(target uuid) TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_owns(target uuid) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_partition_transfer_allowed(target regclass, operation text) TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_partition_transfer_allowed(target regclass, operation text) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_partition_transfer_allowed(target regclass, operation text) TO "gw_signer";
GRANT EXECUTE ON FUNCTION public.gw_public_queue_disclosure(version uuid) TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_public_queue_disclosure(version uuid) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_queue_disclosure(entry uuid) TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_queue_disclosure(entry uuid) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_queue_rank(entry uuid, mode text) TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_queue_rank(entry uuid, mode text) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_record_verified_expiry(attempt uuid) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_retire_ephemeral_batch(maximum integer) TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_runtime_environment_allowed() TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_runtime_environment_allowed() TO "gw_service";
GRANT EXECUTE ON FUNCTION public.gw_runtime_environment_allowed() TO "gw_signer";
GRANT EXECUTE ON FUNCTION public.gw_signer_asset_balance(target uuid, purposes text[]) TO "gw_signer";
GRANT EXECUTE ON FUNCTION public.gw_signer_owner_fence(obligation uuid) TO "gw_signer";
GRANT EXECUTE ON FUNCTION public.gw_staff_reader() TO "gw_read";
GRANT EXECUTE ON FUNCTION public.gw_staff_reader() TO "gw_service";
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT USAGE ON SCHEMA public TO "gw_preview";
GRANT USAGE ON SCHEMA public TO "gw_read";
GRANT USAGE ON SCHEMA public TO "gw_service";
GRANT USAGE ON SCHEMA public TO "gw_signer";
GRANT DELETE ON TABLE public.abuse_signals TO "gw_service";
GRANT INSERT ON TABLE public.abuse_signals TO "gw_service";
GRANT SELECT ON TABLE public.abuse_signals TO "gw_service";
GRANT INSERT ON TABLE public.alert_deliveries TO "gw_service";
GRANT SELECT ON TABLE public.alert_deliveries TO "gw_service";
GRANT UPDATE ON TABLE public.alert_deliveries TO "gw_service";
GRANT SELECT ON TABLE public.alert_deliveries TO "gw_signer";
GRANT SELECT ON TABLE public.appeals TO "gw_read";
GRANT INSERT ON TABLE public.appeals TO "gw_service";
GRANT SELECT ON TABLE public.appeals TO "gw_service";
GRANT UPDATE ON TABLE public.appeals TO "gw_service";
GRANT SELECT ON TABLE public.archive_months TO "gw_service";
GRANT SELECT ON TABLE public.assets TO "gw_preview";
GRANT SELECT ON TABLE public.assets TO "gw_read";
GRANT INSERT ON TABLE public.assets TO "gw_service";
GRANT SELECT ON TABLE public.assets TO "gw_service";
GRANT SELECT ON TABLE public.assets TO "gw_signer";
GRANT SELECT ON TABLE public.audit_events TO "gw_read";
GRANT INSERT ON TABLE public.audit_events TO "gw_service";
GRANT SELECT ON TABLE public.audit_events TO "gw_service";
GRANT DELETE ON TABLE public.auth_factors TO "gw_service";
GRANT INSERT ON TABLE public.auth_factors TO "gw_service";
GRANT SELECT ON TABLE public.auth_factors TO "gw_service";
GRANT UPDATE ON TABLE public.auth_factors TO "gw_service";
GRANT DELETE ON TABLE public.auth_flows TO "gw_service";
GRANT INSERT ON TABLE public.auth_flows TO "gw_service";
GRANT SELECT ON TABLE public.auth_flows TO "gw_service";
GRANT UPDATE ON TABLE public.auth_flows TO "gw_service";
GRANT DELETE ON TABLE public.auth_recovery_codes TO "gw_service";
GRANT INSERT ON TABLE public.auth_recovery_codes TO "gw_service";
GRANT SELECT ON TABLE public.auth_recovery_codes TO "gw_service";
GRANT UPDATE ON TABLE public.auth_recovery_codes TO "gw_service";
GRANT DELETE ON TABLE public.auth_refresh_tokens TO "gw_service";
GRANT INSERT ON TABLE public.auth_refresh_tokens TO "gw_service";
GRANT SELECT ON TABLE public.auth_refresh_tokens TO "gw_service";
GRANT UPDATE ON TABLE public.auth_refresh_tokens TO "gw_service";
GRANT DELETE ON TABLE public.auth_sessions TO "gw_service";
GRANT INSERT ON TABLE public.auth_sessions TO "gw_service";
GRANT SELECT ON TABLE public.auth_sessions TO "gw_service";
GRANT UPDATE ON TABLE public.auth_sessions TO "gw_service";
GRANT DELETE ON TABLE public.auth_totp_replays TO "gw_service";
GRANT INSERT ON TABLE public.auth_totp_replays TO "gw_service";
GRANT SELECT ON TABLE public.auth_totp_replays TO "gw_service";
GRANT DELETE ON TABLE public.bot_challenges TO "gw_service";
GRANT INSERT ON TABLE public.bot_challenges TO "gw_service";
GRANT SELECT ON TABLE public.bot_challenges TO "gw_service";
GRANT DELETE ON TABLE public.bot_token_uses TO "gw_service";
GRANT INSERT ON TABLE public.bot_token_uses TO "gw_service";
GRANT SELECT ON TABLE public.bot_token_uses TO "gw_service";
GRANT INSERT ON TABLE public.chain_checkpoints TO "gw_service";
GRANT SELECT ON TABLE public.chain_checkpoints TO "gw_service";
GRANT INSERT ON TABLE public.chain_fee_claims TO "gw_service";
GRANT SELECT ON TABLE public.chain_fee_claims TO "gw_service";
GRANT INSERT ON TABLE public.chain_observations TO "gw_service";
GRANT SELECT ON TABLE public.chain_observations TO "gw_service";
GRANT INSERT ON TABLE public.chain_recovery_runs TO "gw_service";
GRANT SELECT ON TABLE public.chain_recovery_runs TO "gw_service";
GRANT INSERT ON TABLE public.chain_scan_pages TO "gw_service";
GRANT SELECT ON TABLE public.chain_scan_pages TO "gw_service";
GRANT INSERT ON TABLE public.crypto_events TO "gw_service";
GRANT SELECT ON TABLE public.crypto_events TO "gw_service";
GRANT UPDATE ON TABLE public.crypto_events TO "gw_service";
GRANT INSERT ON TABLE public.crypto_invoices TO "gw_service";
GRANT SELECT ON TABLE public.crypto_invoices TO "gw_service";
GRANT UPDATE ON TABLE public.crypto_invoices TO "gw_service";
GRANT INSERT ON TABLE public.crypto_obligations TO "gw_service";
GRANT SELECT ON TABLE public.crypto_obligations TO "gw_service";
GRANT UPDATE ON TABLE public.crypto_obligations TO "gw_service";
GRANT SELECT ON TABLE public.crypto_obligations TO "gw_signer";
GRANT INSERT ON TABLE public.crypto_reorg_resolutions TO "gw_service";
GRANT SELECT ON TABLE public.crypto_reorg_resolutions TO "gw_service";
GRANT INSERT ON TABLE public.crypto_reorg_reviews TO "gw_service";
GRANT SELECT ON TABLE public.crypto_reorg_reviews TO "gw_service";
GRANT INSERT ON TABLE public.crypto_submissions TO "gw_service";
GRANT SELECT ON TABLE public.crypto_submissions TO "gw_service";
GRANT SELECT ON TABLE public.cycles TO "gw_read";
GRANT INSERT ON TABLE public.cycles TO "gw_service";
GRANT SELECT ON TABLE public.cycles TO "gw_service";
GRANT UPDATE ON TABLE public.cycles TO "gw_service";
GRANT SELECT ON TABLE public.data_exports TO "gw_read";
GRANT INSERT ON TABLE public.data_exports TO "gw_service";
GRANT SELECT ON TABLE public.data_exports TO "gw_service";
GRANT UPDATE ON TABLE public.data_exports TO "gw_service";
GRANT SELECT ON TABLE public.deployment_binding_challenges TO "gw_service";
GRANT SELECT ON TABLE public.environment_instances TO "gw_service";
GRANT DELETE ON TABLE public.export_chunks TO "gw_service";
GRANT INSERT ON TABLE public.export_chunks TO "gw_service";
GRANT SELECT ON TABLE public.export_chunks TO "gw_service";
GRANT INSERT ON TABLE public.financial_reconciliation_results TO "gw_service";
GRANT SELECT ON TABLE public.financial_reconciliation_results TO "gw_service";
GRANT SELECT ON TABLE public.gift_invoices TO "gw_read";
GRANT INSERT ON TABLE public.gift_invoices TO "gw_service";
GRANT SELECT ON TABLE public.gift_invoices TO "gw_service";
GRANT UPDATE ON TABLE public.gift_invoices TO "gw_service";
GRANT SELECT ON TABLE public.gw_cycle_financial_reviews TO "gw_read";
GRANT SELECT ON TABLE public.gw_cycle_financial_reviews TO "gw_service";
GRANT SELECT ON TABLE public.gw_queue_positions TO "gw_read";
GRANT SELECT ON TABLE public.gw_signed_attempt_status TO "gw_service";
GRANT SELECT ON TABLE public.gw_signer_health TO "gw_service";
GRANT SELECT ON TABLE public.gw_sim_accounts TO "gw_read";
GRANT SELECT ON TABLE public.gw_user_account_balances TO "gw_read";
GRANT SELECT ON TABLE public.gw_user_financial_reviews TO "gw_read";
GRANT SELECT ON TABLE public.gw_user_financial_reviews TO "gw_service";
GRANT SELECT ON TABLE public.help_articles TO "gw_preview";
GRANT SELECT ON TABLE public.help_articles TO "gw_read";
GRANT INSERT ON TABLE public.help_articles TO "gw_service";
GRANT SELECT ON TABLE public.help_articles TO "gw_service";
GRANT UPDATE ON TABLE public.help_articles TO "gw_service";
GRANT INSERT ON TABLE public.jobs TO "gw_service";
GRANT SELECT ON TABLE public.jobs TO "gw_service";
GRANT SELECT ON TABLE public.ledger_account_buckets TO "gw_service";
GRANT SELECT ON TABLE public.ledger_account_totals TO "gw_service";
GRANT INSERT ON TABLE public.ledger_accounts TO "gw_service";
GRANT SELECT ON TABLE public.ledger_accounts TO "gw_service";
GRANT SELECT ON TABLE public.ledger_accounts TO "gw_signer";
GRANT SELECT ON TABLE public.ledger_asset_totals TO "gw_service";
GRANT SELECT ON TABLE public.ledger_counter_markers TO "gw_service";
GRANT SELECT ON TABLE public.ledger_counter_state TO "gw_service";
GRANT SELECT ON TABLE public.ledger_journal_audits TO "gw_service";
GRANT INSERT ON TABLE public.ledger_journals TO "gw_service";
GRANT SELECT ON TABLE public.ledger_journals TO "gw_service";
GRANT INSERT ON TABLE public.ledger_postings TO "gw_service";
GRANT SELECT ON TABLE public.ledger_postings TO "gw_service";
GRANT SELECT ON TABLE public.ledger_postings TO "gw_signer";
GRANT INSERT ON TABLE public.liability_recoveries TO "gw_service";
GRANT SELECT ON TABLE public.liability_recoveries TO "gw_service";
GRANT UPDATE ON TABLE public.liability_recoveries TO "gw_service";
GRANT INSERT ON TABLE public.maintenance_results TO "gw_service";
GRANT SELECT ON TABLE public.maintenance_results TO "gw_service";
GRANT INSERT ON TABLE public.native_reserve_inflows TO "gw_service";
GRANT SELECT ON TABLE public.native_reserve_inflows TO "gw_service";
GRANT SELECT ON TABLE public.notification_views TO "gw_read";
GRANT INSERT ON TABLE public.notification_views TO "gw_service";
GRANT SELECT ON TABLE public.notification_views TO "gw_service";
GRANT UPDATE ON TABLE public.notification_views TO "gw_service";
GRANT SELECT ON TABLE public.notifications TO "gw_read";
GRANT INSERT ON TABLE public.notifications TO "gw_service";
GRANT SELECT ON TABLE public.notifications TO "gw_service";
GRANT INSERT ON TABLE public.operation_keys TO "gw_service";
GRANT SELECT ON TABLE public.operation_keys TO "gw_service";
GRANT INSERT ON TABLE public.operational_alerts TO "gw_service";
GRANT SELECT ON TABLE public.operational_alerts TO "gw_service";
GRANT UPDATE ON TABLE public.operational_alerts TO "gw_service";
GRANT SELECT ON TABLE public.operational_alerts TO "gw_signer";
GRANT INSERT ON TABLE public.operational_diagnostics TO "gw_service";
GRANT SELECT ON TABLE public.operational_diagnostics TO "gw_service";
GRANT UPDATE ON TABLE public.operational_diagnostics TO "gw_service";
GRANT INSERT ON TABLE public.outbox TO "gw_service";
GRANT SELECT ON TABLE public.outbox TO "gw_service";
GRANT SELECT ON TABLE public.plan_versions TO "gw_preview";
GRANT SELECT ON TABLE public.plan_versions TO "gw_read";
GRANT INSERT ON TABLE public.plan_versions TO "gw_service";
GRANT SELECT ON TABLE public.plan_versions TO "gw_service";
GRANT UPDATE ON TABLE public.plan_versions TO "gw_service";
GRANT SELECT ON TABLE public.plans TO "gw_preview";
GRANT SELECT ON TABLE public.plans TO "gw_read";
GRANT INSERT ON TABLE public.plans TO "gw_service";
GRANT SELECT ON TABLE public.plans TO "gw_service";
GRANT UPDATE ON TABLE public.plans TO "gw_service";
GRANT SELECT ON TABLE public.point_events TO "gw_read";
GRANT INSERT ON TABLE public.point_events TO "gw_service";
GRANT SELECT ON TABLE public.point_events TO "gw_service";
GRANT INSERT ON TABLE public.price_quotes TO "gw_service";
GRANT SELECT ON TABLE public.price_quotes TO "gw_service";
GRANT SELECT ON TABLE public.price_quotes TO "gw_signer";
GRANT DELETE ON TABLE public.profile_previews TO "gw_service";
GRANT INSERT ON TABLE public.profile_previews TO "gw_service";
GRANT SELECT ON TABLE public.profile_previews TO "gw_service";
GRANT INSERT ON TABLE public.provider_quota_reports TO "gw_service";
GRANT SELECT ON TABLE public.provider_quota_reports TO "gw_service";
GRANT UPDATE ON TABLE public.provider_quota_reports TO "gw_service";
GRANT INSERT ON TABLE public.public_statistics TO "gw_service";
GRANT SELECT ON TABLE public.public_statistics TO "gw_service";
GRANT UPDATE ON TABLE public.public_statistics TO "gw_service";
GRANT SELECT ON TABLE public.queue_entries TO "gw_read";
GRANT INSERT ON TABLE public.queue_entries TO "gw_service";
GRANT SELECT ON TABLE public.queue_entries TO "gw_service";
GRANT UPDATE ON TABLE public.queue_entries TO "gw_service";
GRANT SELECT ON TABLE public.queue_partitions TO "gw_read";
GRANT INSERT ON TABLE public.queue_partitions TO "gw_service";
GRANT SELECT ON TABLE public.queue_partitions TO "gw_service";
GRANT UPDATE ON TABLE public.queue_partitions TO "gw_service";
GRANT SELECT ON TABLE public.queue_rank_nodes TO "gw_service";
GRANT DELETE ON TABLE public.rate_limits TO "gw_service";
GRANT INSERT ON TABLE public.rate_limits TO "gw_service";
GRANT SELECT ON TABLE public.rate_limits TO "gw_service";
GRANT UPDATE ON TABLE public.rate_limits TO "gw_service";
GRANT SELECT ON TABLE public.receipt_allocations TO "gw_read";
GRANT INSERT ON TABLE public.receipt_allocations TO "gw_service";
GRANT SELECT ON TABLE public.receipt_allocations TO "gw_service";
GRANT INSERT ON TABLE public.recovery_outflow_resolutions TO "gw_service";
GRANT SELECT ON TABLE public.recovery_outflow_resolutions TO "gw_service";
GRANT INSERT ON TABLE public.recovery_outflows TO "gw_service";
GRANT SELECT ON TABLE public.recovery_outflows TO "gw_service";
GRANT DELETE ON TABLE public.recovery_view_caps TO "gw_service";
GRANT INSERT ON TABLE public.recovery_view_caps TO "gw_service";
GRANT SELECT ON TABLE public.recovery_view_caps TO "gw_service";
GRANT SELECT ON TABLE public.referral_codes TO "gw_read";
GRANT DELETE ON TABLE public.referral_codes TO "gw_service";
GRANT INSERT ON TABLE public.referral_codes TO "gw_service";
GRANT SELECT ON TABLE public.referral_codes TO "gw_service";
GRANT SELECT ON TABLE public.reports TO "gw_read";
GRANT INSERT ON TABLE public.reports TO "gw_service";
GRANT SELECT ON TABLE public.reports TO "gw_service";
GRANT UPDATE ON TABLE public.reports TO "gw_service";
GRANT DELETE ON TABLE public.scheduler_nonces TO "gw_service";
GRANT INSERT ON TABLE public.scheduler_nonces TO "gw_service";
GRANT SELECT ON TABLE public.scheduler_nonces TO "gw_service";
GRANT UPDATE ON TABLE public.scheduler_nonces TO "gw_service";
GRANT DELETE ON TABLE public.scheduler_runs TO "gw_service";
GRANT INSERT ON TABLE public.scheduler_runs TO "gw_service";
GRANT SELECT ON TABLE public.scheduler_runs TO "gw_service";
GRANT UPDATE ON TABLE public.scheduler_runs TO "gw_service";
GRANT INSERT ON TABLE public.signed_attempts TO "gw_signer";
GRANT SELECT ON TABLE public.signed_attempts TO "gw_signer";
GRANT UPDATE ON TABLE public.signed_attempts TO "gw_signer";
GRANT INSERT ON TABLE public.signer_dispatch_cursor TO "gw_signer";
GRANT SELECT ON TABLE public.signer_dispatch_cursor TO "gw_signer";
GRANT INSERT ON TABLE public.signer_heartbeats TO "gw_signer";
GRANT SELECT ON TABLE public.signer_heartbeats TO "gw_signer";
GRANT UPDATE ON TABLE public.signer_heartbeats TO "gw_signer";
GRANT INSERT ON TABLE public.signer_reservations TO "gw_signer";
GRANT SELECT ON TABLE public.signer_reservations TO "gw_signer";
GRANT INSERT ON TABLE public.signer_states TO "gw_signer";
GRANT SELECT ON TABLE public.signer_states TO "gw_signer";
GRANT UPDATE ON TABLE public.signer_states TO "gw_signer";
GRANT INSERT ON TABLE public.simulation_incoming_controls TO "gw_service";
GRANT SELECT ON TABLE public.simulation_incoming_controls TO "gw_service";
GRANT INSERT ON TABLE public.simulation_incoming_events TO "gw_service";
GRANT SELECT ON TABLE public.simulation_incoming_events TO "gw_service";
GRANT INSERT ON TABLE public.simulation_incoming_refunds TO "gw_service";
GRANT SELECT ON TABLE public.simulation_incoming_refunds TO "gw_service";
GRANT INSERT ON TABLE public.simulation_reorg_resolutions TO "gw_service";
GRANT SELECT ON TABLE public.simulation_reorg_resolutions TO "gw_service";
GRANT INSERT ON TABLE public.simulation_reorg_reviews TO "gw_service";
GRANT SELECT ON TABLE public.simulation_reorg_reviews TO "gw_service";
GRANT INSERT ON TABLE public.simulation_withdrawal_controls TO "gw_service";
GRANT SELECT ON TABLE public.simulation_withdrawal_controls TO "gw_service";
GRANT SELECT ON TABLE public.slug_redirects TO "gw_preview";
GRANT SELECT ON TABLE public.slug_redirects TO "gw_read";
GRANT INSERT ON TABLE public.slug_redirects TO "gw_service";
GRANT SELECT ON TABLE public.slug_redirects TO "gw_service";
GRANT SELECT ON TABLE public.treasury_addresses TO "gw_service";
GRANT INSERT ON TABLE public.unallocated_inflows TO "gw_service";
GRANT SELECT ON TABLE public.unallocated_inflows TO "gw_service";
GRANT INSERT ON TABLE public.unallocated_refund_claims TO "gw_service";
GRANT SELECT ON TABLE public.unallocated_refund_claims TO "gw_service";
GRANT DELETE ON TABLE public.user_identities TO "gw_service";
GRANT INSERT ON TABLE public.user_identities TO "gw_service";
GRANT SELECT ON TABLE public.user_identities TO "gw_service";
GRANT SELECT ON TABLE public.users TO "gw_read";
GRANT INSERT ON TABLE public.users TO "gw_service";
GRANT SELECT ON TABLE public.users TO "gw_service";
GRANT UPDATE ON TABLE public.users TO "gw_service";
GRANT DELETE ON TABLE public.wallet_challenges TO "gw_service";
GRANT INSERT ON TABLE public.wallet_challenges TO "gw_service";
GRANT SELECT ON TABLE public.wallet_challenges TO "gw_service";
GRANT UPDATE ON TABLE public.wallet_challenges TO "gw_service";
GRANT SELECT ON TABLE public.wallet_links TO "gw_read";
GRANT INSERT ON TABLE public.wallet_links TO "gw_service";
GRANT SELECT ON TABLE public.wallet_links TO "gw_service";
GRANT SELECT ON TABLE public.withdrawals TO "gw_read";
GRANT INSERT ON TABLE public.withdrawals TO "gw_service";
GRANT SELECT ON TABLE public.withdrawals TO "gw_service";
GRANT UPDATE ON TABLE public.withdrawals TO "gw_service";
GRANT DELETE ON TABLE public.worker_requests TO "gw_service";
GRANT INSERT ON TABLE public.worker_requests TO "gw_service";
GRANT SELECT ON TABLE public.worker_requests TO "gw_service";
GRANT SELECT ON TABLE public.x_manifest TO "gw_preview";
GRANT INSERT ON TABLE public.x_manifest TO "gw_service";
GRANT SELECT ON TABLE public.x_manifest TO "gw_service";
GRANT UPDATE ON TABLE public.x_manifest TO "gw_service";
GRANT SELECT ON TABLE public.x_manifest TO "gw_signer";
GRANT UPDATE ("enabled") ON TABLE public."assets" TO "gw_service";
GRANT UPDATE ("registry_binding") ON TABLE public."assets" TO "gw_service";
GRANT UPDATE ("consumed_at") ON TABLE public."bot_challenges" TO "gw_service";
GRANT UPDATE ("next_observation_at") ON TABLE public."chain_observations" TO "gw_service";
GRANT UPDATE ("rounds") ON TABLE public."chain_observations" TO "gw_service";
GRANT UPDATE ("source_job_id") ON TABLE public."chain_observations" TO "gw_service";
GRANT UPDATE ("status") ON TABLE public."chain_observations" TO "gw_service";
GRANT UPDATE ("completed_at") ON TABLE public."chain_recovery_runs" TO "gw_service";
GRANT UPDATE ("cursor_height") ON TABLE public."chain_recovery_runs" TO "gw_service";
GRANT UPDATE ("incoming_count") ON TABLE public."chain_recovery_runs" TO "gw_service";
GRANT UPDATE ("known_attempt_cursor") ON TABLE public."chain_recovery_runs" TO "gw_service";
GRANT UPDATE ("outgoing_count") ON TABLE public."chain_recovery_runs" TO "gw_service";
GRANT UPDATE ("reason_code") ON TABLE public."chain_recovery_runs" TO "gw_service";
GRANT UPDATE ("revision") ON TABLE public."chain_recovery_runs" TO "gw_service";
GRANT UPDATE ("scan_progress") ON TABLE public."chain_recovery_runs" TO "gw_service";
GRANT UPDATE ("state") ON TABLE public."chain_recovery_runs" TO "gw_service";
GRANT UPDATE ("status") ON TABLE public."crypto_obligations" TO "gw_signer";
GRANT UPDATE ("part") ON TABLE public."export_chunks" TO "gw_service";
GRANT UPDATE ("attempts") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("completed_at") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("due_at") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("last_error_code") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("lease_generation") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("lease_token") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("lease_until") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("payload") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("redacted_at") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("redacted_payload_hash") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("retry_limit") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("status") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("updated_at") ON TABLE public."jobs" TO "gw_service";
GRANT UPDATE ("body") ON TABLE public."notifications" TO "gw_service";
GRANT UPDATE ("read_at") ON TABLE public."notifications" TO "gw_service";
GRANT UPDATE ("redacted_at") ON TABLE public."notifications" TO "gw_service";
GRANT UPDATE ("redacted_body_hash") ON TABLE public."notifications" TO "gw_service";
GRANT UPDATE ("dispatched_at") ON TABLE public."outbox" TO "gw_service";
GRANT UPDATE ("payload") ON TABLE public."outbox" TO "gw_service";
GRANT UPDATE ("redacted_at") ON TABLE public."outbox" TO "gw_service";
GRANT UPDATE ("redacted_payload_hash") ON TABLE public."outbox" TO "gw_service";
GRANT UPDATE ("committed_at") ON TABLE public."profile_previews" TO "gw_service";
GRANT UPDATE ("last_created_at") ON TABLE public."signer_dispatch_cursor" TO "gw_signer";
GRANT UPDATE ("last_id") ON TABLE public."signer_dispatch_cursor" TO "gw_signer";
GRANT UPDATE ("activity_opt_in") ON TABLE public."users" TO "gw_service";
GRANT UPDATE ("activity_revision") ON TABLE public."users" TO "gw_service";
GRANT UPDATE ("address") ON TABLE public."wallet_links" TO "gw_service";
GRANT UPDATE ("cooling_until") ON TABLE public."wallet_links" TO "gw_service";
GRANT UPDATE ("revision") ON TABLE public."wallet_links" TO "gw_service";
GRANT UPDATE ("verified_at") ON TABLE public."wallet_links" TO "gw_service";
GRANT UPDATE ("nonce") ON TABLE public."worker_requests" TO "gw_service";

-- Fresh identities and empty-ledger coverage; never import user/financial rows.
INSERT INTO public.environment_instances(environment) VALUES('simulation');
INSERT INTO public.database_binding_nonce(singleton) VALUES(true);
INSERT INTO public.ledger_counter_state(id,postings_complete,journals_complete,complete,sealed_at) VALUES('global',true,true,true,clock_timestamp());
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('activity_epoch','1'::jsonb,'number','private','Phase Two activity_epoch');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('activity_presentation','"fixtures"'::jsonb,'string','public','Phase Two activity_presentation');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('bootstrap_presentation','"legacy"'::jsonb,'string','public','Phase Two bootstrap_presentation');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('feature_transparency','false'::jsonb,'boolean','public','Phase Two feature_transparency');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('financial_readiness_record','{"status": "not_reviewed", "evidence_refs": []}'::jsonb,'json','staff','Phase Two financial_readiness_record');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('priority_presentation','"legacy"'::jsonb,'string','public','Phase Two priority_presentation');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('profile_revision','1'::jsonb,'number','public','Phase Two profile_revision');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('public_receipt_policy','{"show_time": true, "show_asset": true, "show_network": true, "mask_identity": true, "show_environment": true}'::jsonb,'json','public','Phase Two public_receipt_policy');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('queue_disclosure_policy','{"show_system_ahead": true, "show_snapshot_time": true, "show_priority_ahead": true}'::jsonb,'json','public','Phase Two queue_disclosure_policy');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('transparency_content','{"en": {"fees": "You pay incoming network gas. A withdrawal deducts only the charges you approve, including any account setup charge. Platform reserves pay business settlement fees. Internal credits are separate from transfers to your wallet.", "risk": "Receipts depend on later participants and are not guaranteed. You may receive less than you send.", "slots": "Each gift adds its configured receipt target to the queue while funding one receiver allocation. At a target of two, one new unfunded conditional slot remains per gift. Money for all future receipts is not already held.", "example": "At the default 85% receiver share, a $200-equivalent gift may receive two $170-equivalent internal credits: $340 gross only if both later gifts confirm. Withdrawal charges reduce any amount sent to your wallet. This is a conditional example, not a promised return.", "mechanics": "Send a crypto gift, join its receiver queue, and become eligible for allocations from later participants.", "empty_queue": "When no receiver is waiting, the selected startup rule either blocks checkout or credits the first receiver share to the disclosed developer/marketing role. That business allocation is not a member payout.", "priority_label": "Administrative priority applies to this queue", "bootstrap_label": "Platform-controlled position"}, "fr": {"fees": "Vous payez le coût réseau du don entrant. Un retrait déduit uniquement les frais approuvés, y compris la création éventuelle d’un compte. Les réserves de la plateforme paient les règlements professionnels. Un crédit interne est distinct d’un transfert vers votre portefeuille.", "risk": "Les réceptions dépendent de participants ultérieurs et ne sont pas garanties. Vous pouvez recevoir moins que votre don.", "slots": "Chaque don ajoute son objectif de réceptions à la file tout en finançant une allocation. Avec un objectif de deux, chaque don laisse une place conditionnelle supplémentaire non financée. L’argent de toutes les réceptions futures n’est pas déjà détenu.", "example": "Avec la part destinataire par défaut de 85 %, un don équivalent à 200 $ peut recevoir deux crédits internes de 170 $, soit 340 $ bruts uniquement si les deux dons ultérieurs sont confirmés. Les frais de retrait réduisent le montant envoyé au portefeuille. Cet exemple est conditionnel, sans rendement promis.", "mechanics": "Envoyez un don en crypto, rejoignez sa file de réception et devenez admissible aux allocations de participants ultérieurs.", "empty_queue": "Si personne n’attend, la règle de démarrage bloque le paiement ou crédite la première part destinataire au rôle développeur/marketing annoncé. Cette allocation professionnelle n’est pas un paiement à un membre.", "priority_label": "Une priorité administrative s’applique à cette file", "bootstrap_label": "Position contrôlée par la plateforme"}, "version": "transparency-1"}'::jsonb,'json','public','Phase Two transparency_content');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('transparency_snapshot_policy','{"client_poll_seconds": 60, "preview_ttl_minutes": 15}'::jsonb,'json','private','Phase Two transparency_snapshot_policy');
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('verified_activity_policy','{"max_records": 50, "exclude_test": true, "max_age_hours": 24, "exclude_system": true, "require_opt_in": true}'::jsonb,'json','private','Phase Two verified_activity_policy');
INSERT INTO public.help_articles(locale,slug,title,body,published,version) VALUES('en','privacy','Test privacy notice','Version 1 — simulation and test networks. The app records account identity, consent, sessions and security information; linked public wallet addresses; gifts, ledger and payout history; points, referrals and messages. Account deletion removes or redacts personal information while required financial and audit evidence is retained. Public blockchain transactions cannot be erased. Own-data downloads require your session and expire at the displayed time. The configured authentication, database, wallet and RPC providers process relevant requests. This notice describes the test implementation; the operator must review the notice and selected providers before a real-money launch.',true,1);
INSERT INTO public.help_articles(locale,slug,title,body,published,version) VALUES('fr','privacy','Notice de confidentialité de test','Version 1 — simulation et réseaux de test. L’application conserve l’identité du compte, le consentement, les sessions et les informations de sécurité ; les adresses publiques associées ; les dons, mouvements et retraits ; les points, parrainages et messages. La suppression du compte efface ou masque les données personnelles tout en conservant les preuves financières et d’audit requises. Les transactions publiques sur une chaîne ne peuvent être effacées. Les exports nécessitent votre session et expirent à la date indiquée. Les fournisseurs configurés d’authentification, de base de données, de portefeuille et de RPC traitent les requêtes concernées. Cette notice décrit l’implémentation de test ; l’opérateur doit la revoir ainsi que les fournisseurs avant un lancement avec de l’argent réel.',true,1);
DO $initial_archive_months$ DECLARE source_name text; BEGIN FOREACH source_name IN ARRAY ARRAY['ledger_postings','chain_scan_pages','audit_events'] LOOP PERFORM public.gw_create_archive_month(source_name,date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')::date);PERFORM public.gw_create_archive_month(source_name,(date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')+interval '1 month')::date);END LOOP;END $initial_archive_months$;
INSERT INTO public.schema_migrations(name,sha256) VALUES('000_initial_schema.sql','fabb6e5958ff029a9895f248d6b96a4c'||'f8f59959e893c1bbfadce75e071d8cfe');
INSERT INTO public.schema_migrations(name,sha256) VALUES('001_historical_treasury_fence.sql','86ff0db3baff58248460c503fd34a815'||'93efdd1e5429021b1f05ffb8cfde54da');
INSERT INTO public.schema_migrations(name,sha256) VALUES('002_ephemeral_retention.sql','9803ff7f3b6806a6d4bf7702e03e8d79'||'3e970d887ad844734074c7943a223914');
INSERT INTO public.schema_migrations(name,sha256) VALUES('003_monthly_financial_archives.sql','77aef990452ba92a1c15c1723bcc02bb'||'608e7da04d2b72cb4297858f4f98ce34');
INSERT INTO public.schema_migrations(name,sha256) VALUES('004_transparent_profiles.sql','77ae7eb1f76135cedec8681523e3013e'||'a0db35e07073691381152f1eabd02a3a');
INSERT INTO public.schema_migrations(name,sha256) VALUES('005_production_environments.sql','617806668c00dd6a0202dd96a22b0164'||'3967943e62868b6475a3413251e315a0');
INSERT INTO public.schema_migrations(name,sha256) VALUES('006_public_queue_disclosure.sql','1ee3e604b865d1e8c7ecc90cd60edc5d'||'c401cb92b4e9a212dba1bf536d94b3f1');


-- Final-state installer SHA256 (base64): tx8VdqQQwujv0D6ssbgNZ/B887uS89mZ9ucjxAYyQBI=
COMMIT;
