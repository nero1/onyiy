-- Monthly online financial/audit archives in the existing database.
-- No financial row, balance, operation key or signed attempt is discarded.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('gw-schema-migrations',0));
SELECT pg_advisory_xact_lock(hashtextextended('financial-policy',0));
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='120s';
SET LOCAL timezone='UTC';

CREATE TABLE public.archive_record_keys (
 source_table text NOT NULL CHECK(source_table IN ('ledger_postings','chain_scan_pages','audit_events')),
 record_key text NOT NULL CHECK(length(record_key) BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL,
 PRIMARY KEY(source_table,record_key)
);
CREATE TABLE public.archive_months (
 source_table text NOT NULL CHECK(source_table IN ('ledger_postings','chain_scan_pages','audit_events')),
 month_start date NOT NULL CHECK(extract(day FROM month_start)=1),
 child_name text NOT NULL UNIQUE CHECK(child_name ~ '^gw_part_(lp|cs|au)_[0-9]{6}$'),
 state text NOT NULL DEFAULT 'hot' CHECK(state IN ('hot','hashing','verifying','archived','review')),
 cursor_id uuid,
 cursor_revision integer,
 walk_count bigint NOT NULL DEFAULT 0 CHECK(walk_count>=0),
 walk_hash text NOT NULL DEFAULT encode(sha256(''::bytea),'hex') CHECK(length(walk_hash)=64),
 expected_count bigint CHECK(expected_count>=0),
 expected_hash text CHECK(expected_hash IS NULL OR length(expected_hash)=64),
 frozen_at timestamptz,
 archived_at timestamptz,
 last_step_at timestamptz NOT NULL DEFAULT 'epoch'::timestamptz,
 PRIMARY KEY(source_table,month_start)
);
CREATE INDEX archive_months_pending_idx ON public.archive_months(state,last_step_at,month_start,source_table);
ALTER TABLE public.archive_record_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_months ENABLE ROW LEVEL SECURITY;
CREATE POLICY archive_months_service ON public.archive_months FOR SELECT TO gw_service USING(current_setting('gw.access',true)='service');
CREATE TRIGGER archive_keys_retained BEFORE UPDATE OR DELETE ON public.archive_record_keys FOR EACH ROW EXECUTE FUNCTION public.gw_recovery_evidence_retained();

-- Supabase Data API grants: public.archive_record_keys and public.archive_months
-- are owner-maintained infrastructure. Only bounded status reads are granted.
DO $acl$
DECLARE item regclass; recipient text;
BEGIN
 FOREACH item IN ARRAY ARRAY['public.archive_record_keys'::regclass,'public.archive_months'::regclass] LOOP
  FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=item AND a.grantee<>c.relowner
  LOOP EXECUTE 'REVOKE ALL ON TABLE '||item||' FROM '||recipient; END LOOP;
 END LOOP;
END $acl$;
GRANT SELECT ON public.archive_months TO gw_service;

CREATE FUNCTION public.gw_partition_private_acl(target regclass) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE recipient text;
BEGIN
 FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=target AND a.grantee<>c.relowner
 LOOP EXECUTE 'REVOKE ALL ON TABLE '||target||' FROM '||recipient; END LOOP;
 EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',target);
END $$;

CREATE FUNCTION public.gw_partition_transfer_allowed(target regclass,operation text) RETURNS boolean
LANGUAGE plpgsql SET search_path TO 'pg_catalog' AS $$
DECLARE source_name text; prefix text;
BEGIN
 IF operation<>'DELETE' OR current_user::regrole<>(SELECT relowner FROM pg_class WHERE oid=target) THEN RETURN false; END IF;
 source_name:=current_setting('gw.partition_transfer',true);
 prefix:=CASE source_name WHEN 'ledger_postings' THEN 'lp' WHEN 'chain_scan_pages' THEN 'cs' WHEN 'audit_events' THEN 'au' END;
 RETURN prefix IS NOT NULL AND target=to_regclass(format('public.%I','gw_part_'||prefix||'_default'))
  AND EXISTS(SELECT 1 FROM pg_inherits WHERE inhrelid=target AND inhparent=to_regclass(format('public.%I',source_name)));
END $$;

CREATE OR REPLACE FUNCTION public.gw_reject_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog' AS $$
BEGIN
 IF public.gw_partition_transfer_allowed(TG_RELID,TG_OP) THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'LEDGER_APPEND_ONLY';
END $$;
CREATE OR REPLACE FUNCTION public.gw_recovery_evidence_retained() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog' AS $$
BEGIN
 IF public.gw_partition_transfer_allowed(TG_RELID,TG_OP) THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'CHAIN_RECOVERY_EVIDENCE_RETAINED';
END $$;

CREATE FUNCTION public.gw_create_archive_month(source_name text,month_value date,maximum_transfer integer DEFAULT 10000) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' SET timezone='UTC' AS $$
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
END $$;

CREATE FUNCTION public.gw_archive_record_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' SET timezone='UTC' AS $$
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

-- Rebuild only three append-only payload tables. Global identities stay in a
-- small unpartitioned registry. All existing rows must compare in both
-- directions before the old physical table can be removed; no CASCADE.
DO $partition$
DECLARE source_name text; legacy text; item record; data record; meta jsonb; month_value date; relation regclass; difference boolean; created_count integer;
BEGIN
 FOREACH source_name IN ARRAY ARRAY['ledger_postings','chain_scan_pages','audit_events'] LOOP
  relation:=to_regclass(format('public.%I',source_name));
  IF relation IS NULL OR (SELECT relkind FROM pg_class WHERE oid=relation)<>'r' OR (SELECT relowner FROM pg_class WHERE oid=relation)<>current_user::regrole THEN RAISE EXCEPTION 'ARCHIVE_SOURCE_INVALID'; END IF;
  IF EXISTS(SELECT 1 FROM pg_constraint WHERE confrelid=relation) THEN RAISE EXCEPTION 'ARCHIVE_DEPENDENCY_REVIEW_REQUIRED'; END IF;
  EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE','public',source_name);
  SELECT jsonb_build_object(
   'indexes',(SELECT coalesce(jsonb_agg(pg_get_indexdef(i.indexrelid)),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=relation AND NOT i.indisprimary),
   'foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'definition',pg_get_constraintdef(k.oid,true))),'[]'::jsonb) FROM pg_constraint k WHERE k.conrelid=relation AND k.contype='f'),
   'triggers',(SELECT coalesce(jsonb_agg(pg_get_triggerdef(t.oid,true)),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=relation AND NOT t.tgisinternal),
   'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,'roles',(SELECT string_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(r)) END,',') FROM unnest(p.polroles) r),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=relation),
   'grants',(SELECT coalesce(jsonb_agg(jsonb_build_object('recipient',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,'privilege',a.privilege_type,'option',a.is_grantable)),'[]'::jsonb) FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=relation AND a.grantee<>c.relowner),
   'column_grants',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',t.attname,'recipient',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,'privilege',a.privilege_type,'option',a.is_grantable)),'[]'::jsonb) FROM pg_attribute t CROSS JOIN LATERAL aclexplode(t.attacl) a WHERE t.attrelid=relation AND t.attnum>0 AND NOT t.attisdropped),
   'rls',c.relrowsecurity,'force',c.relforcerowsecurity) INTO meta FROM pg_class c WHERE c.oid=relation;
  legacy:='gw_before_partition_'||source_name;
  IF to_regclass(format('public.%I',legacy)) IS NOT NULL THEN RAISE EXCEPTION 'ARCHIVE_SCHEMA_CONFLICT'; END IF;
  EXECUTE format('ALTER TABLE %I.%I RENAME TO %I','public',source_name,legacy);
  EXECUTE format('CREATE TABLE %I.%I (LIKE %I.%I INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING STORAGE INCLUDING COMMENTS INCLUDING CONSTRAINTS) PARTITION BY RANGE(created_at)','public',source_name,'public',legacy);
  PERFORM public.gw_partition_private_acl(to_regclass(format('public.%I',source_name)));
  created_count:=0;
  FOR data IN EXECUTE format('SELECT DISTINCT date_trunc(''month'',created_at AT TIME ZONE ''UTC'')::date AS month_start FROM %I.%I ORDER BY 1','public',legacy) LOOP
   created_count:=created_count+1;IF created_count>2400 THEN RAISE EXCEPTION 'ARCHIVE_RANGE_REVIEW_REQUIRED'; END IF;
   PERFORM public.gw_create_archive_month(source_name,data.month_start);
  END LOOP;
  PERFORM public.gw_create_archive_month(source_name,date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')::date);
  PERFORM public.gw_create_archive_month(source_name,(date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')+interval '1 month')::date);
  EXECUTE format('CREATE TABLE %I.%I PARTITION OF %I.%I DEFAULT','public','gw_part_'||CASE source_name WHEN 'ledger_postings' THEN 'lp' WHEN 'chain_scan_pages' THEN 'cs' ELSE 'au' END||'_default','public',source_name);
  PERFORM public.gw_partition_private_acl(to_regclass(format('public.%I','gw_part_'||CASE source_name WHEN 'ledger_postings' THEN 'lp' WHEN 'chain_scan_pages' THEN 'cs' ELSE 'au' END||'_default')));
  EXECUTE format('INSERT INTO %I.%I SELECT * FROM %I.%I','public',source_name,'public',legacy);
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM ((TABLE %I.%I EXCEPT ALL TABLE %I.%I) UNION ALL (TABLE %I.%I EXCEPT ALL TABLE %I.%I)) delta LIMIT 1)','public',legacy,'public',source_name,'public',source_name,'public',legacy) INTO difference;
  IF difference THEN RAISE EXCEPTION 'ARCHIVE_COPY_MISMATCH'; END IF;
  IF source_name='chain_scan_pages' THEN EXECUTE format('INSERT INTO public.archive_record_keys(source_table,record_key,created_at) SELECT %L,run_id::text||'':''||revision::text,created_at FROM %I.%I',source_name,'public',source_name);
  ELSE EXECUTE format('INSERT INTO public.archive_record_keys(source_table,record_key,created_at) SELECT %L,id::text,created_at FROM %I.%I',source_name,'public',source_name); END IF;
  EXECUTE format('DROP TABLE %I.%I','public',legacy);
  IF source_name='chain_scan_pages' THEN EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I PRIMARY KEY(run_id,revision,created_at)','public',source_name,source_name||'_pkey');
  ELSE EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I PRIMARY KEY(id,created_at)','public',source_name,source_name||'_pkey'); END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(meta->'foreign_keys') LOOP EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s','public',source_name,item.value->>'name',item.value->>'definition'); END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements_text(meta->'indexes') LOOP EXECUTE item.value; END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(meta->'policies') LOOP
   EXECUTE format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',item.value->>'name','public',source_name,CASE WHEN (item.value->>'permissive')::boolean THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,CASE item.value->>'command' WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,item.value->>'roles',CASE WHEN item.value->>'using' IS NULL THEN '' ELSE ' USING ('||(item.value->>'using')||')' END,CASE WHEN item.value->>'check' IS NULL THEN '' ELSE ' WITH CHECK ('||(item.value->>'check')||')' END);
  END LOOP;
  IF (meta->>'force')::boolean THEN EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY','public',source_name); END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(meta->'grants') LOOP EXECUTE format('GRANT %s ON TABLE %I.%I TO %s%s',item.value->>'privilege','public',source_name,item.value->>'recipient',CASE WHEN (item.value->>'option')::boolean THEN ' WITH GRANT OPTION' ELSE '' END); END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(meta->'column_grants') LOOP EXECUTE format('GRANT %s (%I) ON TABLE %I.%I TO %s%s',item.value->>'privilege',item.value->>'column','public',source_name,item.value->>'recipient',CASE WHEN (item.value->>'option')::boolean THEN ' WITH GRANT OPTION' ELSE '' END); END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements_text(meta->'triggers') LOOP EXECUTE item.value; END LOOP;
  EXECUTE format('CREATE TRIGGER archive_record_identity BEFORE INSERT ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.gw_archive_record_guard(%L)','public',source_name,source_name);
  IF source_name='audit_events' THEN EXECUTE 'CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON public.audit_events FOR EACH ROW EXECUTE FUNCTION public.gw_reject_ledger_mutation()'; END IF;
  IF source_name='chain_scan_pages' THEN EXECUTE format('CREATE INDEX %I ON %I.%I(created_at,run_id,revision)',source_name||'_archive_time_idx','public',source_name);
  ELSE EXECUTE format('CREATE INDEX %I ON %I.%I(created_at,id)',source_name||'_archive_time_idx','public',source_name); END IF;
 END LOOP;
END $partition$;

-- Keep archive tables and functions closed to browser/runtime mutation.
DO $acl$
DECLARE routine regprocedure; recipient text;
BEGIN
 FOREACH routine IN ARRAY ARRAY['public.gw_partition_private_acl(regclass)'::regprocedure,'public.gw_create_archive_month(text,date,integer)'::regprocedure,'public.gw_partition_transfer_allowed(regclass,text)'::regprocedure,'public.gw_archive_record_guard()'::regprocedure] LOOP
  FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=routine AND a.grantee<>p.proowner
  LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||routine||' FROM '||recipient; END LOOP;
 END LOOP;
END $acl$;

GRANT EXECUTE ON FUNCTION public.gw_partition_transfer_allowed(regclass,text) TO gw_read,gw_service,gw_signer;

CREATE FUNCTION public.gw_archive_month_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog' AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ARCHIVE_EVIDENCE_RETAINED'; END IF;
 IF (NEW.source_table,NEW.month_start,NEW.child_name) IS DISTINCT FROM (OLD.source_table,OLD.month_start,OLD.child_name)
  OR OLD.state IN ('archived','review') OR NOT ((OLD.state='hot' AND NEW.state='hashing') OR (OLD.state='hashing' AND NEW.state IN ('hashing','verifying','review')) OR (OLD.state='verifying' AND NEW.state IN ('verifying','archived','review')))
  OR (OLD.frozen_at IS NOT NULL AND NEW.frozen_at IS DISTINCT FROM OLD.frozen_at)
  OR (OLD.state=NEW.state AND NEW.walk_count<OLD.walk_count) THEN RAISE EXCEPTION 'ARCHIVE_EVIDENCE_RETAINED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER archive_months_retained BEFORE UPDATE OR DELETE ON public.archive_months FOR EACH ROW EXECUTE FUNCTION public.gw_archive_month_guard();

CREATE FUNCTION public.gw_advance_monthly_archive(maximum integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' SET timezone='UTC' AS $$
DECLARE policy jsonb; item public.archive_months; source_name text; prefix text; default_name text; pending_month date; row_value record;
 actor uuid; environment text; count_value bigint; hash_value text; cursor_value uuid; revision_value integer; processed integer:=0; new_state text; query text; review_reason text;
BEGIN
 actor:=nullif(current_setting('gw.actor_id',true),'')::uuid; environment:=current_setting('gw.environment',true);
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' OR environment IS NULL OR environment NOT IN ('simulation','testnet') OR maximum IS NULL OR maximum NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
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
END $$;

DO $acl$
DECLARE routine regprocedure; recipient text;
BEGIN
 FOREACH routine IN ARRAY ARRAY['public.gw_archive_month_guard()'::regprocedure,'public.gw_advance_monthly_archive(integer)'::regprocedure] LOOP
  FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=routine AND a.grantee<>p.proowner
  LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||routine||' FROM '||recipient; END LOOP;
 END LOOP;
END $acl$;
GRANT EXECUTE ON FUNCTION public.gw_advance_monthly_archive(integer) TO gw_service;

-- Baseline receipt: SHA256 of every preceding byte; generated, do not edit.
INSERT INTO public.schema_migrations(name,sha256) VALUES('003_monthly_financial_archives.sql','77aef990452ba92a1c15c1723bcc02bb'||'608e7da04d2b72cb4297858f4f98ce34');
COMMIT;
