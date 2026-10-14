-- Additive immutable evidence; retained runs/financial rows are not rewritten.
ALTER TABLE public.chain_recovery_runs ADD COLUMN balance_witness jsonb;
ALTER TABLE public.chain_recovery_runs ADD CONSTRAINT recovery_balance_witness_check CHECK (
 balance_witness IS NULL OR (
  jsonb_typeof(balance_witness)='object'
  AND balance_witness->>'format'='gw-finalized-balance-v1'
  AND balance_witness->>'checkpoint_id'=checkpoint_id::text
  AND balance_witness->>'binding_fingerprint'=binding_fingerprint
  AND balance_witness->>'height'=through_height::text
  AND length(balance_witness->>'asset_key') BETWEEN 1 AND 30
  AND length(balance_witness->>'address') BETWEEN 1 AND 128
  AND length(balance_witness->>'block_hash') BETWEEN 1 AND 100
  AND balance_witness->>'amount_base_units' ~ '^(0|[1-9][0-9]{0,77})$'
  AND balance_witness-ARRAY['format','asset_key','checkpoint_id','binding_fingerprint','address','height','block_hash','amount_base_units']='{}'::jsonb
 ) IS TRUE
);
-- The existing recovery_run_guard compares all immutable fields, including
-- this new column. No UPDATE grant is added; copied witnesses remain bound to
-- their original checkpoint/database and cannot authorize a restored clone.
-- Supabase Data API grants unchanged: server-only evidence, no browser access.
