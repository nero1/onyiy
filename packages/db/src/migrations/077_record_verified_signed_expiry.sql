-- A scoped service may record only the already verified terminal expiry. It
-- cannot read signed bytes, alter intent or allocate a nonce/reservation.
CREATE OR REPLACE FUNCTION public.gw_record_verified_expiry(attempt uuid) RETURNS boolean
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE a public.signed_attempts;
BEGIN
 IF current_setting('gw.access',true) IS DISTINCT FROM 'service' THEN RAISE EXCEPTION 'EXPIRY_SCOPE_DENIED';END IF;
 SELECT * INTO a FROM public.signed_attempts WHERE id=attempt FOR UPDATE;
 IF a.id IS NULL OR a.environment<>'testnet' OR a.chain NOT IN ('sol','tron') OR NOT EXISTS(
  SELECT 1 FROM public.operation_keys k WHERE k.business_key='crypto-expiry:'||a.id::text
  AND k.result->>'status'='expiry_verified' AND k.result->>'attempt_id'=a.id::text
  AND k.result->>'obligation_id'=a.obligation_id::text
 ) THEN RAISE EXCEPTION 'EXPIRY_PROOF_REQUIRED';END IF;
 IF a.status='expired' THEN RETURN true;END IF;
 IF a.status NOT IN ('signed','broadcast') THEN RETURN false;END IF;
 UPDATE public.signed_attempts SET status='expired',actual_native_fee=0,confirmed_at=clock_timestamp() WHERE id=a.id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.gw_record_verified_expiry(uuid) FROM PUBLIC,gw_read,gw_signer;
GRANT EXECUTE ON FUNCTION public.gw_record_verified_expiry(uuid) TO gw_service;
DO $$ DECLARE browser text;BEGIN
 FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON FUNCTION public.gw_record_verified_expiry(uuid) FROM %I',browser);END IF;
 END LOOP;
END $$;
