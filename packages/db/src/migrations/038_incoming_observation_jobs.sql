ALTER TABLE public.outbox DROP CONSTRAINT IF EXISTS outbox_kind_check;
ALTER TABLE public.outbox ADD CONSTRAINT outbox_kind_check CHECK(kind IN ('notification','financial_reconciliation','operational_cleanup','own_export','chain_observation'));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_kind_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_kind_check CHECK(kind IN ('notification','financial_reconciliation','operational_cleanup','own_export','chain_observation'));
