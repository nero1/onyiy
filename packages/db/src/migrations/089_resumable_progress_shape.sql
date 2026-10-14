ALTER TABLE public.chain_recovery_runs DROP CONSTRAINT recovery_progress_shape;
ALTER TABLE public.chain_recovery_runs ADD CONSTRAINT recovery_progress_shape CHECK(scan_progress IS NULL OR (
 jsonb_typeof(scan_progress)='object' AND octet_length(scan_progress::text)<=16384
 AND scan_progress ?& ARRAY['stage','cursor'] AND jsonb_typeof(scan_progress->'stage')='string'
 AND scan_progress->>'stage' IN ('discover','verify','book','known_next','known_index','known_settle','known_expiry','balance')
 AND jsonb_typeof(scan_progress->'cursor')='object'
 AND (scan_progress->'cursor') ?& ARRAY['height','transaction','event']
 AND jsonb_typeof(scan_progress->'cursor'->'height')='string'
 AND (scan_progress->'cursor'->>'height') ~ '^(0|[1-9][0-9]{0,77})$'
 AND (scan_progress->'cursor'->>'height')::numeric=cursor_height+1
 AND jsonb_typeof(scan_progress->'cursor'->'transaction')='number'
 AND (scan_progress->'cursor'->>'transaction') ~ '^(0|[1-9][0-9]{0,5})$'
 AND (scan_progress->'cursor'->>'transaction')::integer<=100000
 AND jsonb_typeof(scan_progress->'cursor'->'event')='number'
 AND (scan_progress->'cursor'->>'event') ~ '^(0|[1-9][0-9]{0,5})$'
 AND (scan_progress->'cursor'->>'event')::integer<=100000
));
-- Server-only RLS, column grants and immutable evidence policies are unchanged.
