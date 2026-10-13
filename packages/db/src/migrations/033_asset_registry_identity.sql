ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS registry_binding jsonb;
-- Historical immutable snapshots can bind an asset only when unambiguous.
WITH snapshots AS (
 SELECT asset_id,registry_snapshot AS value FROM public.crypto_invoices WHERE registry_snapshot->>'environment'='testnet'
 UNION ALL SELECT asset_id,registry_snapshot FROM public.crypto_obligations WHERE registry_snapshot->>'environment'='testnet'
), identities AS (
 SELECT asset_id,jsonb_build_object('key',value->>'key','chain',value->>'chain','network',value->>'network','kind',value->>'kind','decimals',(value->>'decimals')::integer,
 'contract',CASE WHEN value->>'chain' IN ('eth','bnb') THEN lower(value->>'contract') ELSE value->>'contract' END,'mint',value->>'mint') AS binding FROM snapshots
), unique_bindings AS (SELECT asset_id,(jsonb_agg(DISTINCT binding)->0) AS binding FROM identities GROUP BY asset_id HAVING count(DISTINCT binding)=1)
UPDATE public.assets a SET registry_binding=b.binding FROM unique_bindings b WHERE a.id=b.asset_id AND a.registry_binding IS NULL;
CREATE OR REPLACE FUNCTION public.gw_registry_binding_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.registry_binding IS NOT NULL AND NEW.registry_binding IS DISTINCT FROM OLD.registry_binding THEN RAISE EXCEPTION 'ASSET_REGISTRY_IMMUTABLE';END IF;
 IF NEW.registry_binding IS NOT NULL AND (NEW.environment<>'testnet' OR NEW.registry_binding->>'network'<>NEW.chain_id OR (NEW.registry_binding->>'decimals')::integer<>NEW.decimals) THEN RAISE EXCEPTION 'ASSET_REGISTRY_INVALID';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_registry_binding_guard() FROM PUBLIC;
CREATE TRIGGER registry_binding_guard BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.gw_registry_binding_guard();
