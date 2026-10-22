-- Index bounded notification reads and queue-change admission.
-- Existing installations apply this forward migration once; new ones use fresh-install.sql.
BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('gw-schema-migrations',0));
SET LOCAL lock_timeout='10s';
SET LOCAL statement_timeout='120s';
CREATE INDEX notifications_user_page_idx ON public.notifications USING btree (user_id, created_at DESC, id DESC) WHERE (retired_at IS NULL);
CREATE INDEX queue_entries_waiting_members_idx ON public.queue_entries USING btree (partition_id, ticket) WHERE (kind='member' AND status='waiting');

-- Baseline receipt: SHA256 of every preceding byte; generated, do not edit.
INSERT INTO public.schema_migrations(name,sha256) VALUES('007_audit_queue_indexes.sql','539ed319da78062d9ae9598516489630'||'67c9d69c85f1680474109c6c0d9c3263');
COMMIT;
