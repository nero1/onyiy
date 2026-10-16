-- Historical treasury recovery fence. Paste this complete file once after 000.
-- Existing schema receipts and all financial history remain unchanged.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('gw-schema-migrations',0));
SELECT pg_advisory_xact_lock(hashtextextended('financial-policy',0));

CREATE TABLE public.treasury_addresses (
 asset_id uuid NOT NULL CONSTRAINT treasury_addresses_asset_id_assets_id_fk REFERENCES public.assets(id) ON DELETE RESTRICT,
 address text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_monitor_at timestamptz NOT NULL DEFAULT 'epoch'::timestamptz,
 CONSTRAINT treasury_addresses_pkey PRIMARY KEY(asset_id,address),
 CONSTRAINT treasury_addresses_address_check CHECK(length(address) BETWEEN 1 AND 128)
);
ALTER TABLE public.treasury_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY treasury_addresses_service ON public.treasury_addresses TO gw_service
 USING(current_setting('gw.access',true)='service');
-- Supabase Data API grants: public.treasury_addresses is server-only.
DO $acl$
DECLARE recipient text;
BEGIN
 FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END
  FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
  WHERE c.oid='public.treasury_addresses'::regclass AND a.grantee<>c.relowner
 LOOP EXECUTE 'REVOKE ALL ON TABLE public.treasury_addresses FROM '||recipient; END LOOP;
END $acl$;
GRANT SELECT ON TABLE public.treasury_addresses TO gw_service;
CREATE FUNCTION public.gw_treasury_inventory_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog' AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.asset_id,NEW.address,NEW.created_at) IS NOT DISTINCT FROM (OLD.asset_id,OLD.address,OLD.created_at)
   AND NEW.last_monitor_at>=OLD.last_monitor_at THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'CHAIN_RECOVERY_EVIDENCE_RETAINED';
END $$;
CREATE TRIGGER treasury_addresses_retained BEFORE UPDATE OR DELETE ON public.treasury_addresses
 FOR EACH ROW EXECUTE FUNCTION public.gw_treasury_inventory_guard();
CREATE INDEX treasury_addresses_monitor_idx ON public.treasury_addresses(asset_id,last_monitor_at,address);
CREATE FUNCTION public.gw_next_treasury_monitor(target uuid,current_address text)
RETURNS TABLE(address text,historical_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE selected text; total bigint;
BEGIN
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' OR current_setting('gw.environment',true) IS DISTINCT FROM 'testnet' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT count(*) INTO total FROM public.treasury_addresses t WHERE t.asset_id=target AND t.address<>current_address;
 SELECT t.address INTO selected FROM public.treasury_addresses t WHERE t.asset_id=target AND t.address<>current_address
  ORDER BY t.last_monitor_at,t.address LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF selected IS NOT NULL THEN UPDATE public.treasury_addresses t SET last_monitor_at=clock_timestamp() WHERE t.asset_id=target AND t.address=selected; END IF;
 RETURN QUERY SELECT selected,total;
END $$;
-- No direct metadata writes are granted to runtime roles.
DO $acl$
DECLARE recipient text; routine regprocedure;
BEGIN
 FOREACH routine IN ARRAY ARRAY['public.gw_treasury_inventory_guard()'::regprocedure,'public.gw_next_treasury_monitor(uuid,text)'::regprocedure] LOOP
  FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END
   FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
   WHERE p.oid=routine AND a.grantee<>p.proowner
  LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||routine||' FROM '||recipient; END LOOP;
 END LOOP;
END $acl$;
GRANT EXECUTE ON FUNCTION public.gw_next_treasury_monitor(uuid,text) TO gw_service;

CREATE FUNCTION public.gw_capture_treasury_address() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog' AS $$
DECLARE address text;
BEGIN
 IF TG_TABLE_NAME='crypto_invoices' THEN address:=NEW.treasury;
 ELSIF TG_TABLE_NAME IN ('crypto_obligations','chain_checkpoints') THEN address:=NEW.treasury_sender;
 ELSE address:=NEW.destination; END IF;
 IF address IS NOT NULL AND EXISTS(SELECT 1 FROM public.assets a WHERE a.id=NEW.asset_id AND a.environment='testnet') THEN
  INSERT INTO public.treasury_addresses(asset_id,address) VALUES(NEW.asset_id,address) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DO $acl$
DECLARE recipient text;
BEGIN
 FOR recipient IN SELECT CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END
  FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  WHERE p.oid='public.gw_capture_treasury_address()'::regprocedure AND a.grantee<>p.proowner
 LOOP EXECUTE 'REVOKE ALL ON FUNCTION public.gw_capture_treasury_address() FROM '||recipient; END LOOP;
END $acl$;
CREATE TRIGGER capture_treasury_address AFTER INSERT ON public.crypto_invoices FOR EACH ROW EXECUTE FUNCTION public.gw_capture_treasury_address();
CREATE TRIGGER capture_treasury_address AFTER INSERT ON public.crypto_obligations FOR EACH ROW EXECUTE FUNCTION public.gw_capture_treasury_address();
CREATE TRIGGER capture_treasury_address AFTER INSERT ON public.chain_checkpoints FOR EACH ROW EXECUTE FUNCTION public.gw_capture_treasury_address();
CREATE TRIGGER capture_treasury_address AFTER INSERT ON public.unallocated_inflows FOR EACH ROW EXECUTE FUNCTION public.gw_capture_treasury_address();
-- Trigger installation locks source writes until this atomic inventory is complete.
INSERT INTO public.treasury_addresses(asset_id,address,created_at)
 SELECT asset_id,address,min(created_at) FROM (
  SELECT asset_id,treasury AS address,created_at FROM public.crypto_invoices WHERE environment='testnet'
  UNION ALL SELECT asset_id,treasury_sender,created_at FROM public.chain_checkpoints
  UNION ALL SELECT asset_id,treasury_sender,created_at FROM public.crypto_obligations WHERE environment='testnet' AND treasury_sender IS NOT NULL
  UNION ALL SELECT asset_id,destination,created_at FROM public.unallocated_inflows
 ) sources WHERE EXISTS(SELECT 1 FROM public.assets a WHERE a.id=sources.asset_id AND a.environment='testnet')
 GROUP BY asset_id,address ON CONFLICT DO NOTHING;
CREATE INDEX chain_checkpoints_address_latest_idx ON public.chain_checkpoints(asset_id,treasury_sender,created_at DESC NULLS LAST,id DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.gw_native_asset_fence(asset uuid) RETURNS boolean
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

-- Existing financial history, function ownership and EXECUTE grants remain intact.

-- Baseline receipt: SHA256 of every preceding byte; generated, do not edit.
INSERT INTO public.schema_migrations(name,sha256) VALUES('001_historical_treasury_fence.sql','86ff0db3baff58248460c503fd34a815'||'93efdd1e5429021b1f05ffb8cfde54da');
COMMIT;
