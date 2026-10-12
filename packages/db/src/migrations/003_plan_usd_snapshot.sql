-- Add/backfill/constrain without changing an existing economics snapshot.
-- The only implemented adapter is GIV, priced at 100 base units per USD in the
-- original seed conversion. Unsupported legacy assets require operator review.
ALTER TABLE public.plan_versions ADD COLUMN IF NOT EXISTS usd_reference numeric(20,2);
UPDATE public.plan_versions pv
SET usd_reference = pv.amount_base_units / 100::numeric
FROM public.assets a
WHERE pv.asset_id = a.id AND pv.usd_reference IS NULL
  AND a.symbol = 'GIV' AND a.environment = 'simulation' AND a.chain_id = 'giv';
ALTER TABLE public.plan_versions ALTER COLUMN usd_reference SET NOT NULL;
-- No new table or browser/Data API grant is introduced.
