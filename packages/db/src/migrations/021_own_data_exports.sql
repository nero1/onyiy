-- Owner-only schema provenance is retained metadata, never runtime authentication authority.
CREATE TABLE IF NOT EXISTS public.schema_migrations(name text PRIMARY KEY,sha256 text NOT NULL CHECK(length(sha256)=64),applied_at timestamptz NOT NULL DEFAULT clock_timestamp());
ALTER TABLE public.outbox DROP CONSTRAINT IF EXISTS outbox_kind_check;
ALTER TABLE public.outbox ADD CONSTRAINT outbox_kind_check CHECK(kind IN ('notification','financial_reconciliation','operational_cleanup','own_export'));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_kind_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_kind_check CHECK(kind IN ('notification','financial_reconciliation','operational_cleanup','own_export'));
CREATE TABLE IF NOT EXISTS public.data_exports(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'building' CHECK(status IN ('building','ready','failed','expired')),section integer NOT NULL DEFAULT 0 CHECK(section BETWEEN 0 AND 10),
 page integer NOT NULL DEFAULT 0 CHECK(page BETWEEN 0 AND 10000),after_id uuid,total_bytes integer NOT NULL DEFAULT 0 CHECK(total_bytes BETWEEN 0 AND 52428800),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),expires_at timestamptz NOT NULL,completed_at timestamptz,error_code text CHECK(error_code IN ('LIMIT_EXCEEDED','ACCOUNT_RESTRICTED','BUILD_FAILED')),
 CHECK(expires_at>created_at),CHECK((status='building' AND completed_at IS NULL) OR (status<>'building' AND completed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS data_export_owned_idx ON public.data_exports(user_id,created_at,id);
CREATE INDEX IF NOT EXISTS data_export_expiry_idx ON public.data_exports(expires_at,id);
CREATE TABLE IF NOT EXISTS public.export_chunks(
 export_id uuid NOT NULL REFERENCES public.data_exports(id) ON DELETE RESTRICT,part integer NOT NULL CHECK(part BETWEEN 0 AND 10000),section text NOT NULL,
 cipher text NOT NULL CHECK(octet_length(cipher)<=1400000),sha256 text NOT NULL CHECK(length(sha256)=64),row_count integer NOT NULL CHECK(row_count BETWEEN 0 AND 100),
 byte_count integer NOT NULL CHECK(byte_count BETWEEN 0 AND 1048576),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(export_id,part)
);
CREATE OR REPLACE FUNCTION public.gw_export_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
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
REVOKE ALL ON FUNCTION public.gw_export_guard() FROM PUBLIC;
DROP TRIGGER IF EXISTS export_request_guard ON public.data_exports;
CREATE TRIGGER export_request_guard BEFORE UPDATE OR DELETE ON public.data_exports FOR EACH ROW EXECUTE FUNCTION public.gw_export_guard();
DROP TRIGGER IF EXISTS export_chunk_guard ON public.export_chunks;
CREATE TRIGGER export_chunk_guard BEFORE UPDATE OR DELETE ON public.export_chunks FOR EACH ROW EXECUTE FUNCTION public.gw_export_guard();
-- Supabase Data API grants: public.schema_migrations is owner-only;
-- public.data_exports and public.export_chunks are authenticated server routes only.
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schema_migrations,public.data_exports,public.export_chunks FROM PUBLIC,gw_read,gw_service;
GRANT SELECT ON public.data_exports TO gw_read;
GRANT SELECT,INSERT,UPDATE ON public.data_exports TO gw_service;
GRANT SELECT,INSERT,DELETE ON public.export_chunks TO gw_service;
CREATE POLICY data_export_reader ON public.data_exports FOR SELECT TO gw_read USING(public.gw_owns(user_id));
CREATE POLICY data_export_service ON public.data_exports TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
CREATE POLICY export_chunk_service ON public.export_chunks TO gw_service USING(current_setting('gw.access',true)='service') WITH CHECK(current_setting('gw.access',true)='service');
DO $$ DECLARE browser text;BEGIN FOREACH browser IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=browser) THEN EXECUTE format('REVOKE ALL ON public.schema_migrations,public.data_exports,public.export_chunks FROM %I',browser);END IF;
END LOOP;END $$;
