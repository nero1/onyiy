-- Production environment foundations. Run whole-file after004, with the matching app release.
-- Preserves all historical records; does not activate any asset or signer.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('gw-schema-migrations',0));
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='120s';
CREATE FUNCTION public.gw_runtime_environment_allowed() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
 SELECT CASE
 WHEN EXISTS(SELECT 1 FROM public.environment_instances WHERE environment='mainnet') THEN current_setting('gw.environment',true)='mainnet'
 WHEN EXISTS(SELECT 1 FROM public.environment_instances WHERE environment='testnet') THEN current_setting('gw.environment',true)='testnet'
 ELSE current_setting('gw.environment',true)='simulation' END
$$;
CREATE FUNCTION public.gw_production_write_fence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
 IF current_setting('role',true) IN ('gw_read','gw_service','gw_signer') AND public.gw_runtime_environment_allowed() IS NOT TRUE THEN RAISE EXCEPTION 'FINANCIAL_ENVIRONMENT_DENIED'; END IF;
 RETURN NULL;
END $$;
DO $roles$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='gw_preview') THEN CREATE ROLE gw_preview NOLOGIN NOINHERIT NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='gw_preview' AND (rolcanlogin OR rolinherit OR rolbypassrls OR rolsuper OR rolcreatedb OR rolcreaterole)) OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member='gw_preview'::regrole) THEN RAISE EXCEPTION 'UNSAFE_PREVIEW_ROLE'; END IF;
END $roles$;
ALTER TABLE public.bot_challenges DROP CONSTRAINT bot_challenges_environment_check, ADD CONSTRAINT bot_challenges_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])));
ALTER TABLE public.bot_token_uses DROP CONSTRAINT bot_token_uses_environment_check, ADD CONSTRAINT bot_token_uses_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])));
ALTER TABLE public.chain_fee_claims DROP CONSTRAINT chain_fee_claims_environment_check, ADD CONSTRAINT chain_fee_claims_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));
ALTER TABLE public.crypto_events DROP CONSTRAINT crypto_events_environment_check, ADD CONSTRAINT crypto_events_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));
ALTER TABLE public.crypto_invoices DROP CONSTRAINT crypto_invoices_environment_check, ADD CONSTRAINT crypto_invoices_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));
ALTER TABLE public.crypto_obligations DROP CONSTRAINT crypto_obligations_environment_check, ADD CONSTRAINT crypto_obligations_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));
ALTER TABLE public.native_reserve_inflows DROP CONSTRAINT native_reserve_inflows_environment_check, ADD CONSTRAINT native_reserve_inflows_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));
ALTER TABLE public.operational_alerts DROP CONSTRAINT operational_alerts_environment_check, ADD CONSTRAINT operational_alerts_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])));
ALTER TABLE public.operational_diagnostics DROP CONSTRAINT operational_diagnostics_environment_check, ADD CONSTRAINT operational_diagnostics_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])));
ALTER TABLE public.provider_quota_reports DROP CONSTRAINT provider_quota_reports_environment_check, ADD CONSTRAINT provider_quota_reports_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])));
ALTER TABLE public.public_statistics DROP CONSTRAINT public_statistics_environment_check, ADD CONSTRAINT public_statistics_environment_check CHECK ((environment = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])));
ALTER TABLE public.signed_attempts DROP CONSTRAINT signed_attempts_environment_check, ADD CONSTRAINT signed_attempts_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));
ALTER TABLE public.signer_heartbeats DROP CONSTRAINT signer_heartbeats_environment_check, ADD CONSTRAINT signer_heartbeats_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));
ALTER TABLE public.signer_states DROP CONSTRAINT signer_states_environment_check, ADD CONSTRAINT signer_states_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));
ALTER TABLE public.unallocated_inflows DROP CONSTRAINT unallocated_inflows_environment_check, ADD CONSTRAINT unallocated_inflows_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));
ALTER TABLE public.wallet_challenges DROP CONSTRAINT wallet_challenges_environment_check, ADD CONSTRAINT wallet_challenges_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));
ALTER TABLE public.worker_requests DROP CONSTRAINT worker_requests_environment_check, ADD CONSTRAINT worker_requests_environment_check CHECK ((environment = ANY (ARRAY['testnet'::text, 'mainnet'::text])));

ALTER TABLE public.users ADD COLUMN time_zone text NOT NULL DEFAULT 'Africa/Lagos', ADD COLUMN preferences_revision integer NOT NULL DEFAULT 1, ADD CONSTRAINT users_preferences_revision_check CHECK(preferences_revision>0), ADD COLUMN age_dob_verified_at timestamptz, ADD CONSTRAINT users_dob_verification_check CHECK(age_dob_verified_at IS NULL OR (age_confirmed_at IS NOT NULL AND age_minimum_accepted IS NOT NULL));
ALTER TABLE public.plan_versions ADD COLUMN pricing_mode text NOT NULL DEFAULT 'usd_at_activation', ADD COLUMN activation_price_id uuid REFERENCES public.price_quotes(id) ON DELETE RESTRICT, ADD CONSTRAINT plan_versions_pricing_mode_check CHECK(pricing_mode IN ('usd_at_activation','fixed_token'));
CREATE FUNCTION public.gw_plan_pricing_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog' AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.pricing_mode,NEW.activation_price_id) IS DISTINCT FROM (OLD.pricing_mode,OLD.activation_price_id) THEN RAISE EXCEPTION 'PLAN_PRICING_IMMUTABLE'; END IF;
 IF NEW.activation_price_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.price_quotes WHERE id=NEW.activation_price_id AND asset_id=NEW.asset_id) THEN RAISE EXCEPTION 'PRICE_ASSET_MISMATCH'; END IF;
 IF NEW.pricing_mode='fixed_token' AND NEW.activation_price_id IS NULL THEN RAISE EXCEPTION 'PRICE_REQUIRED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER plan_versions_pricing_guard BEFORE INSERT OR UPDATE ON public.plan_versions FOR EACH ROW EXECUTE FUNCTION public.gw_plan_pricing_guard();
CREATE OR REPLACE FUNCTION public.gw_advance_monthly_archive(maximum integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
 SET "TimeZone" TO 'UTC'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_capture_treasury_address()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE address text;
BEGIN
 IF TG_TABLE_NAME='crypto_invoices' THEN address:=NEW.treasury;
 ELSIF TG_TABLE_NAME IN ('crypto_obligations','chain_checkpoints') THEN address:=NEW.treasury_sender;
 ELSE address:=NEW.destination; END IF;
 IF address IS NOT NULL AND EXISTS(SELECT 1 FROM public.assets a WHERE a.id=NEW.asset_id AND a.environment IN ('testnet','mainnet')) THEN
  INSERT INTO public.treasury_addresses(asset_id,address) VALUES(NEW.asset_id,address) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_chain_fee_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_check_treasury_sweep(target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_counter_advance(batch_size integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_next_treasury_monitor(target uuid, current_address text)
 RETURNS TABLE(address text, historical_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_record_verified_expiry(attempt uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_recovery_loss_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_registry_binding_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
 IF OLD.registry_binding IS NOT NULL AND NEW.registry_binding IS DISTINCT FROM OLD.registry_binding THEN RAISE EXCEPTION 'ASSET_REGISTRY_IMMUTABLE';END IF;
 IF NEW.registry_binding IS NOT NULL AND (NEW.environment NOT IN ('testnet','mainnet') OR NEW.registry_binding->>'network'<>NEW.chain_id OR (NEW.registry_binding->>'decimals')::integer<>NEW.decimals) THEN RAISE EXCEPTION 'ASSET_REGISTRY_INVALID';END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_retire_ephemeral_batch(maximum integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_signer_asset_balance(target uuid, purposes text[])
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_signer_identity_fence(obligation uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
END $function$
;
CREATE OR REPLACE FUNCTION public.gw_wallet_revision_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
 IF (to_jsonb(NEW)-ARRAY['address','verified_at','revision','cooling_until']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['address','verified_at','revision','cooling_until']) THEN RAISE EXCEPTION 'WALLET_IDENTITY_IMMUTABLE';END IF;
 IF NEW.address IS DISTINCT FROM OLD.address THEN
  IF OLD.environment NOT IN ('testnet','mainnet') OR NEW.revision<>OLD.revision+1 OR NEW.verified_at<=OLD.verified_at OR NEW.cooling_until<NEW.verified_at THEN RAISE EXCEPTION 'WALLET_REVISION_REQUIRED';END IF;
 ELSIF NEW.revision<>OLD.revision THEN RAISE EXCEPTION 'WALLET_REVISION_REQUIRED';END IF;
 RETURN NEW;
END $function$
;
ALTER POLICY signer_delivery_read ON public.alert_deliveries USING ((alert_id IN ( SELECT operational_alerts.id
   FROM operational_alerts
  WHERE (operational_alerts.environment = current_setting('gw.environment'::text, true)))));
ALTER POLICY signer_assets ON public.assets USING ((environment = current_setting('gw.environment'::text, true)));
ALTER POLICY gw_identity_service ON public.auth_factors USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));
ALTER POLICY gw_identity_service ON public.auth_flows USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));
ALTER POLICY gw_identity_service ON public.auth_recovery_codes USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));
ALTER POLICY gw_identity_service ON public.auth_refresh_tokens USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));
ALTER POLICY gw_identity_service ON public.auth_sessions USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));
ALTER POLICY gw_identity_service ON public.auth_totp_replays USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));
ALTER POLICY signer_obligation_transition ON public.crypto_obligations USING (((environment = current_setting('gw.environment'::text, true)) AND (status = ANY (ARRAY['approved'::text, 'signing'::text, 'broadcast'::text])))) WITH CHECK (((environment = current_setting('gw.environment'::text, true)) AND (status = ANY (ARRAY['signing'::text, 'broadcast'::text, 'exception'::text, 'awaiting_requote'::text]))));
ALTER POLICY signer_obligations ON public.crypto_obligations USING (((environment = current_setting('gw.environment'::text, true)) AND (status = ANY (ARRAY['approved'::text, 'signing'::text, 'broadcast'::text, 'awaiting_requote'::text, 'exception'::text, 'settled'::text]))));
ALTER POLICY signer_account_read ON public.ledger_accounts USING ((asset_id IN ( SELECT assets.id
   FROM assets
  WHERE (assets.environment = current_setting('gw.environment'::text, true)))));
ALTER POLICY signer_alert_read ON public.operational_alerts USING ((environment = current_setting('gw.environment'::text, true)));
ALTER POLICY gw_identity_service ON public.rate_limits USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));
ALTER POLICY isolated_signer ON public.signed_attempts USING (environment=current_setting('gw.environment',true)) WITH CHECK (environment=current_setting('gw.environment',true));
ALTER POLICY signer_dispatch_scope ON public.signer_dispatch_cursor USING ((current_setting('gw.environment'::text, true) IN ('testnet','mainnet'))) WITH CHECK ((current_setting('gw.environment'::text, true) IN ('testnet','mainnet')));
ALTER POLICY signer_heartbeat_worker ON public.signer_heartbeats USING (((environment = current_setting('gw.environment'::text, true)) AND (current_setting('gw.environment'::text, true) IN ('testnet','mainnet')))) WITH CHECK (((environment = current_setting('gw.environment'::text, true)) AND (current_setting('gw.environment'::text, true) IN ('testnet','mainnet'))));
ALTER POLICY isolated_signer ON public.signer_reservations USING (EXISTS(SELECT 1 FROM public.crypto_obligations o WHERE o.id=obligation_id AND o.environment=current_setting('gw.environment',true))) WITH CHECK (EXISTS(SELECT 1 FROM public.crypto_obligations o WHERE o.id=obligation_id AND o.environment=current_setting('gw.environment',true)));
ALTER POLICY isolated_signer ON public.signer_states USING (environment=current_setting('gw.environment',true)) WITH CHECK (environment=current_setting('gw.environment',true));
ALTER POLICY gw_identity_service ON public.user_identities USING (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text))) WITH CHECK (((current_setting('gw.environment'::text, true) = ANY (ARRAY['simulation'::text, 'testnet'::text, 'mainnet'::text])) AND (current_setting('gw.access'::text, true) = 'service'::text)));
ALTER POLICY signer_manifest_read ON public.x_manifest USING ((current_setting('gw.environment'::text, true) IN ('testnet','mainnet')));

-- Enforce the active payment mode even for older service builds and definer writes.
DO $fences$ DECLARE item record; predicate text; BEGIN
 FOR item IN SELECT c.oid,c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition LOOP
  EXECUTE format('CREATE TRIGGER production_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.gw_production_write_fence()',item.relname);
  IF item.relrowsecurity THEN
   predicate:='public.gw_runtime_environment_allowed()';
   IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=item.oid AND attname='environment' AND attnum>0 AND NOT attisdropped) THEN
    predicate:=predicate||' AND environment=current_setting(''gw.environment'',true)';
   ELSIF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=item.oid AND attname='asset_id' AND attnum>0 AND NOT attisdropped) THEN
    predicate:=predicate||format(' AND EXISTS(SELECT 1 FROM public.assets a WHERE a.id=%I.asset_id AND a.environment=current_setting(''gw.environment'',true))',item.relname);
   END IF;
   EXECUTE format('CREATE POLICY active_payment_environment ON public.%I AS RESTRICTIVE TO gw_read,gw_service,gw_signer USING(%s) WITH CHECK(%s)',item.relname,predicate,predicate);
  END IF;
 END LOOP;
END $fences$;
-- Supabase Data API grants: preview is server-only, read-only and receives no financial/user tables.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM gw_preview;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM gw_preview;
GRANT USAGE ON SCHEMA public TO gw_preview;
CREATE POLICY preview_public_manifest ON public.x_manifest FOR SELECT TO gw_preview USING(scope='public');
CREATE POLICY preview_plans ON public.plans FOR SELECT TO gw_preview USING(true);
CREATE POLICY preview_assets ON public.assets FOR SELECT TO gw_preview USING(environment=current_setting('gw.environment',true));
CREATE POLICY preview_versions ON public.plan_versions FOR SELECT TO gw_preview USING(EXISTS(SELECT 1 FROM public.assets a WHERE a.id=asset_id AND a.environment=current_setting('gw.environment',true)));
CREATE POLICY preview_help ON public.help_articles FOR SELECT TO gw_preview USING(published);
CREATE POLICY preview_redirects ON public.slug_redirects FOR SELECT TO gw_preview USING(EXISTS(SELECT 1 FROM public.help_articles h WHERE h.id=article_id AND h.published));
GRANT SELECT ON public.x_manifest,public.plans,public.assets,public.plan_versions,public.help_articles,public.slug_redirects TO gw_preview;
REVOKE ALL ON FUNCTION public.gw_runtime_environment_allowed(),public.gw_production_write_fence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_runtime_environment_allowed() TO gw_read,gw_service,gw_signer;
DO $acl$ DECLARE item regprocedure; recipient text; BEGIN
 FOREACH item IN ARRAY ARRAY['public.gw_plan_pricing_guard()'::regprocedure,'public.gw_runtime_environment_allowed()'::regprocedure,'public.gw_production_write_fence()'::regprocedure] LOOP
  FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=item AND a.grantee<>p.proowner
  LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||item||' FROM '||recipient;END LOOP;
 END LOOP;
END $acl$;
GRANT EXECUTE ON FUNCTION public.gw_runtime_environment_allowed() TO gw_read,gw_service,gw_signer;

-- Baseline receipt: SHA256 of every preceding byte; generated, do not edit.
INSERT INTO public.schema_migrations(name,sha256) VALUES('005_production_environments.sql','617806668c00dd6a0202dd96a22b0164'||'3967943e62868b6475a3413251e315a0');
COMMIT;
