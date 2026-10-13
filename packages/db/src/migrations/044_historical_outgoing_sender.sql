ALTER TABLE public.crypto_obligations ADD COLUMN IF NOT EXISTS treasury_sender text;
-- First binding is permitted only when it reproduces the immutable fingerprint.
CREATE OR REPLACE FUNCTION public.gw_financial_adapter_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
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
  IF (to_jsonb(NEW)-ARRAY['status','actual_native_fee','broadcast_at','confirmed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','actual_native_fee','broadcast_at','confirmed_at']) THEN RAISE EXCEPTION 'SIGNED_ATTEMPT_IMMUTABLE';END IF;
 ELSE RAISE EXCEPTION 'FINANCIAL_HISTORY_IMMUTABLE';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gw_financial_adapter_guard() FROM PUBLIC;
WITH possible AS (
 SELECT DISTINCT o.id,i.treasury FROM public.crypto_obligations o JOIN public.assets a ON a.id=o.asset_id JOIN public.crypto_invoices i ON i.environment=o.environment AND i.chain=o.chain AND i.registry_snapshot->>'network'=a.chain_id
 WHERE encode(pg_catalog.sha256(pg_catalog.convert_to(o.environment||'|'||o.chain||'|'||a.chain_id||'|'||i.treasury,'UTF8')),'hex')=o.treasury_fingerprint
), single AS (SELECT id,min(treasury) AS treasury FROM possible GROUP BY id HAVING count(*)=1)
UPDATE public.crypto_obligations o SET treasury_sender=s.treasury FROM single s WHERE o.id=s.id AND o.treasury_sender IS NULL;
