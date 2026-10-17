-- Resolve the public queue version parameter without changing disclosures or grants.
-- Apply whole-file only after SQL005; fresh installations use fresh-install.sql.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('gw-schema-migrations',0));
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='30s';
DO $existing$ BEGIN IF to_regprocedure('public.gw_public_queue_disclosure(uuid)') IS NULL THEN RAISE EXCEPTION 'DATABASE_SCHEMA_MISMATCH';END IF;END $existing$;
CREATE OR REPLACE FUNCTION public.gw_public_queue_disclosure(version uuid) RETURNS jsonb
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

-- Baseline receipt: SHA256 of every preceding byte; generated, do not edit.
INSERT INTO public.schema_migrations(name,sha256) VALUES('006_public_queue_disclosure.sql','1ee3e604b865d1e8c7ecc90cd60edc5d'||'c401cb92b4e9a212dba1bf536d94b3f1');
COMMIT;
