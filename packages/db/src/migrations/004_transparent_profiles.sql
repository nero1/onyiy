-- Phase Two profile controls. Preserve installed SQL000–003 and all financial facts.
-- Paste the complete file once after003, before deploying the matching app.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('gw-schema-migrations',0));
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='120s';
ALTER TABLE public.users ADD COLUMN publication_classification text NOT NULL DEFAULT 'unreviewed', ADD CONSTRAINT users_publication_classification_check CHECK(publication_classification IN ('unreviewed','test','real')), ADD COLUMN activity_opt_in boolean NOT NULL DEFAULT false, ADD COLUMN activity_revision integer NOT NULL DEFAULT 1, ADD CONSTRAINT users_activity_revision_check CHECK(activity_revision>0);
ALTER TABLE public.public_statistics ADD COLUMN profile_revision integer NOT NULL DEFAULT 1, ADD COLUMN verified_only boolean NOT NULL DEFAULT false, ADD CONSTRAINT public_statistics_profile_revision_check CHECK(profile_revision>0);
ALTER TABLE public.queue_partitions ADD CONSTRAINT queue_partitions_revision_bounds CHECK(revision>=0 AND revision<=9007199254740991);
ALTER TABLE public.queue_entries ADD COLUMN cancelled_count integer NOT NULL DEFAULT 0,
 ADD CONSTRAINT queue_entries_cancelled_count_check CHECK(cancelled_count>=0 AND cancelled_count<=required_count-credited_count AND (cancelled_count=0 OR (kind='bootstrap' AND status='removed')));
ALTER TABLE public.gift_invoices ADD COLUMN profile_revision integer NOT NULL DEFAULT 1,
 ADD CONSTRAINT gift_invoices_profile_revision_check CHECK(profile_revision>0);
ALTER TABLE public.crypto_invoices ADD COLUMN profile_revision integer NOT NULL DEFAULT 1,
 ADD CONSTRAINT crypto_invoices_profile_revision_check CHECK(profile_revision>0);
CREATE INDEX users_publication_review_idx ON public.users(publication_classification,id);
CREATE INDEX users_public_activity_idx ON public.users(created_at,id) WHERE publication_classification='real' AND activity_opt_in AND role='member' AND status='active';
CREATE TABLE public.profile_previews(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 expected_revision integer NOT NULL,manifest_version text NOT NULL,proposal jsonb NOT NULL,impact jsonb NOT NULL,partition_versions jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL,committed_at timestamptz,
 CONSTRAINT profile_previews_revision_check CHECK(expected_revision>0),
 CONSTRAINT profile_previews_version_check CHECK(manifest_version ~ '^[a-f0-9]{64}$'),
 CONSTRAINT profile_previews_expiry_check CHECK(expires_at>created_at));
ALTER TABLE public.profile_previews ENABLE ROW LEVEL SECURITY;
CREATE INDEX profile_previews_actor_expiry_idx ON public.profile_previews(actor_user_id,expires_at);
CREATE INDEX profile_previews_cleanup_idx ON public.profile_previews(expires_at,id) WHERE committed_at IS NULL;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('activity_epoch','1'::jsonb,'number','private','Phase Two activity_epoch') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('feature_transparency','false'::jsonb,'boolean','public','Phase Two feature_transparency') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('profile_revision','1'::jsonb,'number','public','Phase Two profile_revision') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('bootstrap_presentation','"legacy"'::jsonb,'string','public','Phase Two bootstrap_presentation') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('priority_presentation','"legacy"'::jsonb,'string','public','Phase Two priority_presentation') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('activity_presentation','"fixtures"'::jsonb,'string','public','Phase Two activity_presentation') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('transparency_content','{"version":"transparency-1","en":{"mechanics":"Send a crypto gift, join its receiver queue, and become eligible for allocations from later participants.","risk":"Receipts depend on later participants and are not guaranteed. You may receive less than you send.","fees":"You pay incoming network gas. A withdrawal deducts only the charges you approve, including any account setup charge. Platform reserves pay business settlement fees. Internal credits are separate from transfers to your wallet.","example":"At the default 85% receiver share, a $200-equivalent gift may receive two $170-equivalent internal credits: $340 gross only if both later gifts confirm. Withdrawal charges reduce any amount sent to your wallet. This is a conditional example, not a promised return.","slots":"Each gift adds its configured receipt target to the queue while funding one receiver allocation. At a target of two, one new unfunded conditional slot remains per gift. Money for all future receipts is not already held.","bootstrap_label":"Platform-controlled position","priority_label":"Administrative priority applies to this queue","empty_queue":"When no receiver is waiting, the selected startup rule either blocks checkout or credits the first receiver share to the disclosed developer/marketing role. That business allocation is not a member payout."},"fr":{"mechanics":"Envoyez un don en crypto, rejoignez sa file de réception et devenez admissible aux allocations de participants ultérieurs.","risk":"Les réceptions dépendent de participants ultérieurs et ne sont pas garanties. Vous pouvez recevoir moins que votre don.","fees":"Vous payez le coût réseau du don entrant. Un retrait déduit uniquement les frais approuvés, y compris la création éventuelle d’un compte. Les réserves de la plateforme paient les règlements professionnels. Un crédit interne est distinct d’un transfert vers votre portefeuille.","example":"Avec la part destinataire par défaut de 85 %, un don équivalent à 200 $ peut recevoir deux crédits internes de 170 $, soit 340 $ bruts uniquement si les deux dons ultérieurs sont confirmés. Les frais de retrait réduisent le montant envoyé au portefeuille. Cet exemple est conditionnel, sans rendement promis.","slots":"Chaque don ajoute son objectif de réceptions à la file tout en finançant une allocation. Avec un objectif de deux, chaque don laisse une place conditionnelle supplémentaire non financée. L’argent de toutes les réceptions futures n’est pas déjà détenu.","bootstrap_label":"Position contrôlée par la plateforme","priority_label":"Une priorité administrative s’applique à cette file","empty_queue":"Si personne n’attend, la règle de démarrage bloque le paiement ou crédite la première part destinataire au rôle développeur/marketing annoncé. Cette allocation professionnelle n’est pas un paiement à un membre."}}'::jsonb,'json','public','Phase Two transparency_content') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('verified_activity_policy','{"require_opt_in":true,"max_records":50,"max_age_hours":24,"exclude_system":true,"exclude_test":true}'::jsonb,'json','private','Phase Two verified_activity_policy') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('queue_disclosure_policy','{"show_system_ahead":true,"show_priority_ahead":true,"show_snapshot_time":true}'::jsonb,'json','public','Phase Two queue_disclosure_policy') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('public_receipt_policy','{"show_asset":true,"show_network":true,"show_time":true,"mask_identity":true,"show_environment":true}'::jsonb,'json','public','Phase Two public_receipt_policy') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('transparency_snapshot_policy','{"preview_ttl_minutes":15,"client_poll_seconds":60}'::jsonb,'json','private','Phase Two transparency_snapshot_policy') ON CONFLICT(key) DO NOTHING;
INSERT INTO public.x_manifest(key,value,type,scope,description) VALUES('financial_readiness_record','{"status":"not_reviewed","evidence_refs":[]}'::jsonb,'json','staff','Phase Two financial_readiness_record') ON CONFLICT(key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.gw_queue_rank(entry uuid, mode text) RETURNS bigint
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

CREATE INDEX queue_entries_bootstrap_disclosure_idx ON public.queue_entries(partition_id,priority_ticket,ticket) WHERE kind='bootstrap' AND status='waiting';
CREATE FUNCTION public.gw_public_queue_disclosure(version uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE partition uuid; total bigint; slots bigint; revision bigint; priority_enabled boolean;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.x_manifest WHERE key='deployment_profile' AND value='"transparent"'::jsonb) OR NOT EXISTS(SELECT 1 FROM public.x_manifest WHERE key='feature_transparency' AND value='true'::jsonb) THEN RETURN NULL; END IF;
 SELECT q.id,q.revision INTO partition,revision FROM public.queue_partitions q JOIN public.plan_versions v ON v.id=q.plan_version_id JOIN public.assets a ON a.id=v.asset_id WHERE v.id=version AND a.environment=current_setting('gw.environment',true);
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT count(*),coalesce(sum(required_count-credited_count),0) INTO total,slots FROM public.queue_entries WHERE partition_id=partition AND kind='bootstrap' AND status='waiting';
 SELECT value='true'::jsonb INTO priority_enabled FROM public.x_manifest WHERE key='feature_priority';
 RETURN jsonb_build_object('system_positions',total::text,'system_remaining_slots',slots::text,'priority_positions',CASE WHEN priority_enabled THEN public.gw_rank_prefix(partition,'priority',1099511627776) ELSE 0 END::text,'queue_revision',revision::text,'snapshot_at',statement_timestamp());
END $$;
CREATE FUNCTION public.gw_queue_disclosure(entry uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
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

CREATE FUNCTION public.gw_queue_profile_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW IS DISTINCT FROM OLD THEN UPDATE public.queue_partitions SET revision=revision+1 WHERE id=NEW.partition_id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER queue_entries_profile_revision AFTER INSERT OR UPDATE ON public.queue_entries FOR EACH ROW EXECUTE FUNCTION public.gw_queue_profile_revision();
CREATE OR REPLACE FUNCTION public.gw_queue_identity_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog' AS $$
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
CREATE FUNCTION public.gw_invoice_profile_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
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
CREATE TRIGGER gift_invoices_profile_guard BEFORE INSERT OR UPDATE ON public.gift_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_invoice_profile_guard();
CREATE TRIGGER crypto_invoices_profile_guard BEFORE INSERT OR UPDATE ON public.crypto_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_invoice_profile_guard();
CREATE FUNCTION public.gw_profile_setting_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog' AS $$
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
CREATE TRIGGER x_manifest_profile_guard BEFORE UPDATE OR DELETE ON public.x_manifest FOR EACH ROW EXECUTE FUNCTION public.gw_profile_setting_guard();
CREATE FUNCTION public.gw_profile_preview_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog' AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.committed_at IS NOT NULL OR OLD.expires_at>=clock_timestamp() THEN RAISE EXCEPTION 'PROFILE_PREVIEW_RETAINED'; END IF;RETURN OLD;
 END IF;
 IF (to_jsonb(NEW)-'committed_at') IS DISTINCT FROM (to_jsonb(OLD)-'committed_at') OR OLD.committed_at IS NOT NULL OR NEW.committed_at IS NULL OR OLD.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'PROFILE_PREVIEW_RETAINED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER profile_previews_retained BEFORE UPDATE OR DELETE ON public.profile_previews FOR EACH ROW EXECUTE FUNCTION public.gw_profile_preview_guard();
CREATE FUNCTION public.gw_publication_consent_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog' AS $$
BEGIN
 IF NEW.publication_classification IS DISTINCT FROM OLD.publication_classification AND current_user::regrole<>(SELECT relowner FROM pg_class WHERE oid=TG_RELID) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF NEW.activity_opt_in IS DISTINCT FROM OLD.activity_opt_in THEN
  IF current_setting('gw.actor_id',true) IS DISTINCT FROM OLD.id::text OR NEW.activity_revision<>OLD.activity_revision+1
   OR NEW.activity_opt_in AND (NEW.status<>'active' OR NEW.role<>'member' OR NEW.consented_at IS NULL OR NEW.age_confirmed_at IS NULL OR NOT EXISTS(SELECT 1 FROM public.x_manifest WHERE key='terms_content' AND value->>'version'=NEW.consent_version)) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 ELSIF NEW.activity_revision<>OLD.activity_revision THEN RAISE EXCEPTION 'VERSION_CONFLICT'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER users_publication_consent_guard BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.gw_publication_consent_guard();
CREATE FUNCTION public.gw_publication_cache_epoch() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
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
CREATE TRIGGER users_publication_cache_epoch AFTER INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.gw_publication_cache_epoch();
CREATE FUNCTION public.gw_public_statistics_reorg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
BEGIN
 UPDATE public.public_statistics SET expires_at=clock_timestamp() WHERE verified_only;
 UPDATE public.x_manifest SET value=to_jsonb((value#>>'{}')::bigint+1),version=version+1,updated_at=clock_timestamp() WHERE key='activity_epoch';
 RETURN NEW;
END $$;
CREATE TRIGGER crypto_reorg_public_statistics AFTER INSERT ON public.crypto_reorg_reviews FOR EACH ROW EXECUTE FUNCTION public.gw_public_statistics_reorg();
CREATE TRIGGER crypto_reconfirm_public_statistics AFTER INSERT ON public.crypto_reorg_resolutions FOR EACH ROW EXECUTE FUNCTION public.gw_public_statistics_reorg();
CREATE FUNCTION public.gw_expire_profile_previews(maximum integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE amount integer;
BEGIN
 IF maximum IS NULL OR maximum NOT BETWEEN 1 AND 100 OR current_setting('gw.access',true) IS DISTINCT FROM 'service' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF current_setting('gw.operational_retention_hold',true)='true' THEN RETURN 0; END IF;
 WITH candidates AS(SELECT id FROM public.profile_previews WHERE committed_at IS NULL AND expires_at<clock_timestamp() ORDER BY expires_at,id LIMIT maximum FOR UPDATE SKIP LOCKED)
 DELETE FROM public.profile_previews p USING candidates c WHERE p.id=c.id;
 GET DIAGNOSTICS amount=ROW_COUNT;RETURN amount;
END $$;
CREATE POLICY profile_preview_admin ON public.profile_previews TO gw_service USING(actor_user_id=nullif(current_setting('gw.actor_id',true),'')::uuid AND EXISTS(SELECT 1 FROM public.users WHERE id=actor_user_id AND role='admin' AND status='active')) WITH CHECK(actor_user_id=nullif(current_setting('gw.actor_id',true),'')::uuid AND EXISTS(SELECT 1 FROM public.users WHERE id=actor_user_id AND role='admin' AND status='active'));
-- Supabase Data API grants: no provider role receives profile_previews access.
DO $acl$
DECLARE recipient text; routine regprocedure;
BEGIN
 FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid='public.profile_previews'::regclass AND a.grantee<>c.relowner
 LOOP EXECUTE 'REVOKE ALL ON TABLE public.profile_previews FROM '||recipient;END LOOP;
 FOREACH routine IN ARRAY ARRAY['public.gw_publication_cache_epoch()'::regprocedure,'public.gw_public_statistics_reorg()'::regprocedure,'public.gw_queue_profile_revision()'::regprocedure,'public.gw_publication_consent_guard()'::regprocedure,'public.gw_expire_profile_previews(integer)'::regprocedure,'public.gw_public_queue_disclosure(uuid)'::regprocedure,'public.gw_queue_disclosure(uuid)'::regprocedure,'public.gw_invoice_profile_guard()'::regprocedure,'public.gw_profile_setting_guard()'::regprocedure,'public.gw_profile_preview_guard()'::regprocedure] LOOP
  FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=routine AND a.grantee<>p.proowner
  LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||routine||' FROM '||recipient;END LOOP;
 END LOOP;
END $acl$;
GRANT EXECUTE ON FUNCTION public.gw_public_queue_disclosure(uuid) TO gw_read,gw_service;
GRANT EXECUTE ON FUNCTION public.gw_queue_disclosure(uuid) TO gw_read,gw_service;
GRANT SELECT,INSERT,DELETE ON public.profile_previews TO gw_service;
GRANT UPDATE(committed_at) ON public.profile_previews TO gw_service;
GRANT UPDATE(activity_opt_in,activity_revision) ON public.users TO gw_service;
GRANT EXECUTE ON FUNCTION public.gw_expire_profile_previews(integer) TO gw_service;

-- Baseline receipt: SHA256 of every preceding byte; generated, do not edit.
INSERT INTO public.schema_migrations(name,sha256) VALUES('004_transparent_profiles.sql','77ae7eb1f76135cedec8681523e3013e'||'a0db35e07073691381152f1eabd02a3a');
COMMIT;
