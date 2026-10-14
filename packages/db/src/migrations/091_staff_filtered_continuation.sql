-- Bounded current-work and retained-history pages. No evidence is deleted.
CREATE INDEX IF NOT EXISTS staff_user_status_cursor_idx ON public.users(status,id);
CREATE INDEX IF NOT EXISTS staff_report_status_cursor_idx ON public.reports(status,id);
CREATE INDEX IF NOT EXISTS staff_appeal_status_cursor_idx ON public.appeals(status,id);
CREATE INDEX IF NOT EXISTS staff_job_history_cursor_idx ON public.jobs(environment,id);
CREATE INDEX IF NOT EXISTS staff_job_status_cursor_idx ON public.jobs(environment,status,id);
CREATE INDEX IF NOT EXISTS staff_job_current_cursor_idx ON public.jobs(environment,id) WHERE status<>'done';
CREATE INDEX IF NOT EXISTS staff_recovery_current_cursor_idx ON public.chain_recovery_runs(id) WHERE state<>'reconciled';
CREATE INDEX IF NOT EXISTS staff_outflow_review_cursor_idx ON public.recovery_outflows(id) WHERE status='review';
CREATE INDEX IF NOT EXISTS staff_alert_current_cursor_idx ON public.operational_alerts(id) WHERE status<>'resolved';
CREATE INDEX IF NOT EXISTS unallocated_refund_source_status_idx ON public.crypto_obligations(asset_id,status,(split_part(business_key,':',2))) WHERE kind='unallocated_refund' AND split_part(business_key,':',1)='unallocated-refund';
