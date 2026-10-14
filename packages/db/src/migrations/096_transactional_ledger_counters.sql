-- Additive derived state. Original journals/postings remain immutable.
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.ledger_journals,public.ledger_postings IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE public.ledger_counter_state (
 id text PRIMARY KEY CHECK(id='global'), posting_ceiling uuid,posting_cursor uuid,journal_ceiling uuid,journal_cursor uuid,
 postings_complete boolean NOT NULL DEFAULT false,journals_complete boolean NOT NULL DEFAULT false,
 complete boolean NOT NULL DEFAULT false,reason_code text CHECK(reason_code IS NULL OR reason_code='LEDGER_SOURCE_INVALID'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),sealed_at timestamptz,
 CHECK(NOT complete OR postings_complete AND journals_complete AND reason_code IS NULL)
);
CREATE TABLE public.ledger_account_totals (
 account_id uuid PRIMARY KEY REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
 asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,owner_type text NOT NULL,owner_id uuid,purpose text NOT NULL,
 credits numeric NOT NULL DEFAULT 0 CHECK(credits>=0),debits numeric NOT NULL DEFAULT 0 CHECK(debits>=0),
 balance numeric NOT NULL DEFAULT 0 CHECK(balance=credits-debits),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ledger_counter_nonzero_idx ON public.ledger_account_totals(purpose,asset_id,owner_id,account_id) WHERE balance<>0;
CREATE INDEX ledger_counter_negative_idx ON public.ledger_account_totals(account_id) WHERE balance<0;
CREATE TABLE public.ledger_asset_totals (
 asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,purpose text NOT NULL,
 credits numeric NOT NULL DEFAULT 0 CHECK(credits>=0),debits numeric NOT NULL DEFAULT 0 CHECK(debits>=0),
 balance numeric NOT NULL DEFAULT 0 CHECK(balance=credits-debits),
 PRIMARY KEY(asset_id,purpose)
);
CREATE TABLE public.ledger_account_buckets (
 account_id uuid NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
 label text NOT NULL CHECK(label IN ('settled_payout_net','refund_held')),amount numeric NOT NULL DEFAULT 0,
 PRIMARY KEY(account_id,label)
);
CREATE TABLE public.ledger_counter_markers (posting_id uuid PRIMARY KEY);
CREATE TABLE public.ledger_journal_audits (
 journal_id uuid PRIMARY KEY REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
 debit_total numeric NOT NULL,credit_total numeric NOT NULL,line_count bigint NOT NULL CHECK(line_count>=0),
 asset_ids uuid[] NOT NULL,valid boolean NOT NULL,proof_hash text NOT NULL CHECK(length(proof_hash)=64),
 checked_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ledger_journal_audit_invalid_idx ON public.ledger_journal_audits(journal_id) WHERE NOT valid;
INSERT INTO public.ledger_counter_state(id,posting_ceiling,journal_ceiling)
VALUES('global',(SELECT id FROM public.ledger_postings ORDER BY id DESC LIMIT 1),(SELECT id FROM public.ledger_journals ORDER BY id DESC LIMIT 1));
-- Permissions/policies and fixed trigger/backfill functions follow after draft review.
CREATE FUNCTION public.gw_counter_refresh_journal(target uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
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
CREATE FUNCTION public.gw_counter_apply_postings(targets uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
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
END $$;
CREATE FUNCTION public.gw_counter_new_postings() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
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
CREATE TRIGGER ledger_counter_posting_write AFTER INSERT ON public.ledger_postings REFERENCING NEW TABLE AS counter_posting_rows FOR EACH STATEMENT EXECUTE FUNCTION public.gw_counter_new_postings();
CREATE FUNCTION public.gw_counter_new_journal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN PERFORM public.gw_counter_refresh_journal(NEW.id);RETURN NEW;END $$;
CREATE TRIGGER ledger_counter_journal_write AFTER INSERT ON public.ledger_journals FOR EACH ROW EXECUTE FUNCTION public.gw_counter_new_journal();
CREATE FUNCTION public.gw_counter_advance(batch_size integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE state public.ledger_counter_state;ids uuid[];fresh uuid[];last_id uuid;target uuid;removed integer:=0;more boolean;
BEGIN
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' OR coalesce(current_setting('gw.environment',true),'') NOT IN('simulation','testnet') OR batch_size IS NULL OR batch_size NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
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

-- Coverage is explicit. Invalid source history never becomes a zero balance.
CREATE FUNCTION public.gw_counter_ready() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE state public.ledger_counter_state;
BEGIN
 SELECT * INTO state FROM public.ledger_counter_state WHERE id='global';
 IF NOT FOUND OR state.reason_code IS NOT NULL THEN RAISE EXCEPTION 'FINANCIAL_SAFETY_PAUSE';END IF;
 RETURN state.complete;
END $$;
CREATE FUNCTION public.gw_account_balance(target uuid) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
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
CREATE FUNCTION public.gw_account_bucket(target uuid,bucket text) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
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
END $$;
CREATE FUNCTION public.gw_asset_balance(target uuid,purposes text[]) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE value numeric;
BEGIN
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' OR NOT EXISTS(SELECT 1 FROM public.assets WHERE id=target AND environment=current_setting('gw.environment',true)) THEN RAISE EXCEPTION 'FORBIDDEN';END IF;
 IF public.gw_counter_ready() THEN SELECT coalesce(sum(balance),0) INTO value FROM public.ledger_asset_totals WHERE asset_id=target AND purpose=ANY(purposes);
 ELSE SELECT coalesce(sum(CASE WHEN p.direction='credit' THEN p.amount_base_units ELSE -p.amount_base_units END),0) INTO value FROM public.ledger_accounts a JOIN public.ledger_postings p ON p.account_id=a.id WHERE a.asset_id=target AND a.purpose=ANY(purposes);END IF;
 RETURN value;
END $$;
CREATE OR REPLACE FUNCTION public.gw_check_user_payable() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a public.ledger_accounts;net numeric;BEGIN SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='user' AND a.purpose IN ('available_payable','held_payable','refund_payable','incoming_payable') THEN
  net:=public.gw_account_balance(a.id);IF net<0 THEN RAISE EXCEPTION 'USER_PAYABLE_NEGATIVE';END IF;
 END IF;RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.gw_unallocated_source_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a public.ledger_accounts;balance numeric;BEGIN SELECT * INTO a FROM public.ledger_accounts WHERE id=NEW.account_id;
 IF a.owner_type='system' AND a.purpose='unallocated_payable' THEN balance:=public.gw_account_balance(a.id);IF balance<0 THEN RAISE EXCEPTION 'UNALLOCATED_SOURCE_NEGATIVE';END IF;END IF;RETURN NULL;
END $$;
CREATE OR REPLACE VIEW public.gw_user_account_balances WITH(security_barrier=true) AS
 SELECT a.owner_id AS user_id,a.asset_id,a.purpose,public.gw_account_balance(a.id)::numeric(78,0) AS balance
 FROM public.ledger_accounts a JOIN public.assets x ON x.id=a.asset_id WHERE a.owner_type='user' AND public.gw_owns(a.owner_id) AND x.environment=current_setting('gw.environment',true);
-- Supabase Data API grants: all derived internals are server-only and owner-written.
DO $$
DECLARE t text;r text;
BEGIN
 FOREACH t IN ARRAY ARRAY['ledger_counter_state','ledger_account_totals','ledger_asset_totals','ledger_account_buckets','ledger_counter_markers','ledger_journal_audits'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,gw_read,gw_service',t);
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',t,r);END IF;
  END LOOP;
  EXECUTE format('GRANT SELECT ON public.%I TO gw_service',t);
  EXECUTE format('CREATE POLICY gw_counter_service_read ON public.%I FOR SELECT TO gw_service USING (current_setting(''gw.access'',true)=''service'')',t);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.gw_counter_refresh_journal(uuid),public.gw_counter_apply_postings(uuid[]),public.gw_counter_new_postings(),public.gw_counter_new_journal(),public.gw_counter_advance(integer),public.gw_counter_ready(),public.gw_account_balance(uuid),public.gw_account_bucket(uuid,text),public.gw_asset_balance(uuid,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_counter_advance(integer),public.gw_counter_ready(),public.gw_account_balance(uuid),public.gw_account_bucket(uuid,text),public.gw_asset_balance(uuid,text[]) TO gw_service;
GRANT EXECUTE ON FUNCTION public.gw_account_balance(uuid),public.gw_account_bucket(uuid,text) TO gw_read;
-- Explicit classifications for the owner-maintained objects above:
-- public.ledger_counter_state public.ledger_account_totals public.ledger_asset_totals
-- public.ledger_account_buckets public.ledger_counter_markers public.ledger_journal_audits
