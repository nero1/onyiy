CREATE TABLE "alert_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"business_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_token" uuid,
	"lease_generation" integer DEFAULT 0 NOT NULL,
	"lease_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	CONSTRAINT "alert_deliveries_business_key_unique" UNIQUE("business_key")
);
--> statement-breakpoint
ALTER TABLE "alert_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appeals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assets" (
	"registry_binding" jsonb,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"environment" text NOT NULL,
	"chain_id" text NOT NULL,
	"decimals" integer NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_symbol_environment_chain_id_unique" UNIQUE("symbol","environment","chain_id"),
	CONSTRAINT "assets_environment_check" CHECK ("assets"."environment" in ('simulation','testnet','mainnet'))
);
--> statement-breakpoint
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"reason" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth_factors" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"secret_cipher" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"setup_expires_at" timestamp with time zone NOT NULL,
	"last_step" bigint DEFAULT -1 NOT NULL,
	CONSTRAINT "auth_factors_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "auth_factors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth_flows" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"nonce_hash" text NOT NULL,
	"verifier_cipher" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth_flows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth_recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factor_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "auth_recovery_codes_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "auth_recovery_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth_refresh_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth_refresh_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"generation" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_version" integer NOT NULL,
	"access_hash" text NOT NULL,
	"csrf_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"access_expires_at" timestamp with time zone NOT NULL,
	"idle_expires_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone NOT NULL,
	"pre_auth" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"step_up_at" timestamp with time zone,
	CONSTRAINT "auth_sessions_access_hash_unique" UNIQUE("access_hash")
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth_totp_replays" (
	"factor_id" uuid NOT NULL,
	"time_step" bigint NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_totp_replays_factor_id_time_step_pk" PRIMARY KEY("factor_id","time_step")
);
--> statement-breakpoint
ALTER TABLE "auth_totp_replays" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crypto_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"chain" text NOT NULL,
	"tx_hash" text NOT NULL,
	"event_index" integer NOT NULL,
	"amount_base_units" numeric(78, 0) NOT NULL,
	"sender" text NOT NULL,
	"destination" text NOT NULL,
	"block_hash" text NOT NULL,
	"block_height" numeric(78, 0) NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crypto_events_environment_chain_tx_hash_event_index_asset_id_unique" UNIQUE("environment","chain","tx_hash","event_index","asset_id")
);
--> statement-breakpoint
ALTER TABLE "crypto_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crypto_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_version_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"request_key" uuid NOT NULL,
	"session_generation" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"wallet_revision" integer NOT NULL,
	"environment" text NOT NULL,
	"chain" text NOT NULL,
	"registry_hash" text NOT NULL,
	"registry_snapshot" jsonb NOT NULL,
	"treasury" text NOT NULL,
	"sender" text NOT NULL,
	"expected_base_units" numeric(78, 0) NOT NULL,
	"usd_reference" numeric(38, 18) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'quoted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crypto_invoices_user_id_request_key_unique" UNIQUE("user_id","request_key")
);
--> statement-breakpoint
ALTER TABLE "crypto_invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crypto_obligations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"asset_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"previous_obligation_id" uuid,
	"business_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"environment" text NOT NULL,
	"chain" text NOT NULL,
	"treasury_fingerprint" text NOT NULL,
	"configuration_hash" text NOT NULL,
	"registry_hash" text NOT NULL,
	"registry_snapshot" jsonb NOT NULL,
	"destination" text NOT NULL,
	"source_purpose" text NOT NULL,
	"wallet_revision" integer,
	"session_generation" uuid,
	"gross_base_units" numeric(78, 0) NOT NULL,
	"charge_base_units" numeric(78, 0) NOT NULL,
	"net_base_units" numeric(78, 0) NOT NULL,
	"native_fee_quote" numeric(78, 0) NOT NULL,
	"rate_snapshot" jsonb NOT NULL,
	"fee_snapshot" jsonb NOT NULL,
	"status" text DEFAULT 'quoted' NOT NULL,
	"quote_expires_at" timestamp with time zone NOT NULL,
	"approved_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crypto_obligations_business_key_unique" UNIQUE("business_key")
);
--> statement-breakpoint
ALTER TABLE "crypto_obligations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crypto_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"tx_hash" text NOT NULL,
	"event_index" integer NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crypto_submissions_invoice_id_tx_hash_event_index_unique" UNIQUE("invoice_id","tx_hash","event_index")
);
--> statement-breakpoint
ALTER TABLE "crypto_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_version_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"credited_count" integer DEFAULT 0 NOT NULL,
	"receipts_required" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cycles_status_check" CHECK ("cycles"."status" in ('active','completed','exception'))
);
--> statement-breakpoint
ALTER TABLE "cycles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "data_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'building' NOT NULL,
	"section" integer DEFAULT 0 NOT NULL,
	"page" integer DEFAULT 0 NOT NULL,
	"after_id" uuid,
	"total_bytes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"error_code" text
);
--> statement-breakpoint
ALTER TABLE "data_exports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deployment_binding_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"environment" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deployment_binding_challenges_environment_check" CHECK ("deployment_binding_challenges"."environment" in ('simulation','testnet','mainnet'))
);
--> statement-breakpoint
ALTER TABLE "deployment_binding_challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "environment_instances" (
	"environment" text PRIMARY KEY NOT NULL,
	"instance_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "environment_instances_instance_id_unique" UNIQUE("instance_id"),
	CONSTRAINT "environment_instances_environment_check" CHECK ("environment_instances"."environment" in ('simulation','testnet','mainnet'))
);
--> statement-breakpoint
ALTER TABLE "environment_instances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "export_chunks" (
	"export_id" uuid NOT NULL,
	"part" integer NOT NULL,
	"section" text NOT NULL,
	"cipher" text NOT NULL,
	"sha256" text NOT NULL,
	"row_count" integer NOT NULL,
	"byte_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "export_chunks_export_id_part_pk" PRIMARY KEY("export_id","part")
);
--> statement-breakpoint
ALTER TABLE "export_chunks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "financial_reconciliation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_job_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"run_date" date NOT NULL,
	"balanced" boolean NOT NULL,
	"consistent" boolean NOT NULL,
	"lineage_complete" boolean NOT NULL,
	"result" jsonb NOT NULL,
	"snapshot_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "financial_reconciliation_results_source_job_id_unique" UNIQUE("source_job_id"),
	CONSTRAINT "financial_reconciliation_results_environment_check" CHECK ("financial_reconciliation_results"."environment" in ('simulation','testnet','mainnet')),
	CONSTRAINT "financial_reconciliation_results_result_check" CHECK (jsonb_typeof("financial_reconciliation_results"."result")='object' and octet_length("financial_reconciliation_results"."result"::text)<=131072)
);
--> statement-breakpoint
ALTER TABLE "financial_reconciliation_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gift_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_version_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"environment" text DEFAULT 'simulation' NOT NULL,
	"chain_id" text DEFAULT 'giv' NOT NULL,
	"request_key" uuid NOT NULL,
	"expected_base_units" numeric(78, 0) NOT NULL,
	"actual_base_units" numeric(78, 0),
	"refundable_base_units" numeric(78, 0) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'quoted' NOT NULL,
	"quote_expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_invoice_request_key" UNIQUE("user_id","request_key"),
	CONSTRAINT "gift_invoice_environment_check" CHECK ("gift_invoices"."environment"='simulation' and "gift_invoices"."chain_id"='giv'),
	CONSTRAINT "gift_invoice_amount_check" CHECK ("gift_invoices"."expected_base_units">0 and "gift_invoices"."actual_base_units">=0 and "gift_invoices"."refundable_base_units">=0),
	CONSTRAINT "gift_invoice_status_check" CHECK ("gift_invoices"."status" in ('quoted','submitted','credited','exception','failed','expired'))
);
--> statement-breakpoint
ALTER TABLE "gift_invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "help_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_by" uuid,
	CONSTRAINT "help_articles_locale_slug_unique" UNIQUE("locale","slug")
);
--> statement-breakpoint
ALTER TABLE "help_articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outbox_id" uuid NOT NULL,
	"business_key" text NOT NULL,
	"environment" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"retry_limit" integer NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_generation" integer DEFAULT 0 NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"last_error_code" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_outbox_id_unique" UNIQUE("outbox_id"),
	CONSTRAINT "jobs_business_key_unique" UNIQUE("business_key"),
	CONSTRAINT "jobs_environment_check" CHECK ("jobs"."environment" in ('simulation','testnet','mainnet')),
	CONSTRAINT "jobs_kind_check" CHECK ("jobs"."kind" in ('notification','financial_reconciliation','operational_cleanup','own_export','chain_observation')),
	CONSTRAINT "jobs_payload_check" CHECK (jsonb_typeof("jobs"."payload")='object' and octet_length("jobs"."payload"::text)<=8192),
	CONSTRAINT "jobs_status_check" CHECK ("jobs"."status" in ('pending','running','done','retry_wait','dead_letter')),
	CONSTRAINT "jobs_attempts_check" CHECK ("jobs"."attempts">=0),
	CONSTRAINT "jobs_retry_limit_check" CHECK ("jobs"."retry_limit" between 1 and 1000000),
	CONSTRAINT "jobs_lease_generation_check" CHECK ("jobs"."lease_generation" between 0 and 1000000),
	CONSTRAINT "jobs_last_error_code_check" CHECK ("jobs"."last_error_code" in ('TRANSIENT_FAILURE','INVALID_JOB','LEASE_EXPIRED','PERMANENT_FAILURE')),
	CONSTRAINT "jobs_lease_shape" CHECK (("jobs"."status"='running' and "jobs"."lease_token" is not null and "jobs"."lease_until" is not null) or ("jobs"."status"<>'running' and "jobs"."lease_token" is null and "jobs"."lease_until" is null)),
	CONSTRAINT "jobs_completion_shape" CHECK (("jobs"."status" in ('done','dead_letter') and "jobs"."completed_at" is not null) or ("jobs"."status" not in ('done','dead_letter') and "jobs"."completed_at" is null))
);
--> statement-breakpoint
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" uuid,
	"purpose" text NOT NULL,
	"normal_side" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_accounts_owner_type_check" CHECK ("ledger_accounts"."owner_type" in ('user','platform','system')),
	CONSTRAINT "ledger_accounts_normal_side_check" CHECK ("ledger_accounts"."normal_side" in ('debit','credit'))
);
--> statement-breakpoint
ALTER TABLE "ledger_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ledger_journals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_type" text NOT NULL,
	"business_key" text NOT NULL,
	"created_txid" bigint DEFAULT txid_current() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_journals_business_key_unique" UNIQUE("business_key")
);
--> statement-breakpoint
ALTER TABLE "ledger_journals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ledger_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"amount_base_units" numeric(78, 0) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_postings_direction_check" CHECK ("ledger_postings"."direction" in ('debit','credit')),
	CONSTRAINT "ledger_postings_amount_positive" CHECK ("ledger_postings"."amount_base_units" > 0)
);
--> statement-breakpoint
ALTER TABLE "ledger_postings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "maintenance_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_job_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"run_date" date NOT NULL,
	"page_number" integer NOT NULL,
	"lease_generation" integer NOT NULL,
	"nonces_deleted" integer NOT NULL,
	"runs_deleted" integer NOT NULL,
	"batch_limit" integer NOT NULL,
	"held" boolean NOT NULL,
	"more_possible" boolean NOT NULL,
	"checked_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "maintenance_results_source_job_id_unique" UNIQUE("source_job_id"),
	CONSTRAINT "maintenance_results_environment_check" CHECK ("maintenance_results"."environment" in ('simulation','testnet','mainnet')),
	CONSTRAINT "maintenance_results_page_number_check" CHECK ("maintenance_results"."page_number" between 0 and 1000000),
	CONSTRAINT "maintenance_results_lease_generation_check" CHECK ("maintenance_results"."lease_generation" between 1 and 1000000),
	CONSTRAINT "maintenance_results_nonces_deleted_check" CHECK ("maintenance_results"."nonces_deleted" between 0 and 100),
	CONSTRAINT "maintenance_results_runs_deleted_check" CHECK ("maintenance_results"."runs_deleted" between 0 and 100),
	CONSTRAINT "maintenance_results_batch_limit_check" CHECK ("maintenance_results"."batch_limit" between 1 and 100),
	CONSTRAINT "maintenance_result_bounds" CHECK ("maintenance_results"."nonces_deleted"<="maintenance_results"."batch_limit" and "maintenance_results"."runs_deleted"<="maintenance_results"."batch_limit" and (not "maintenance_results"."held" or ("maintenance_results"."nonces_deleted"=0 and "maintenance_results"."runs_deleted"=0 and not "maintenance_results"."more_possible")))
);
--> statement-breakpoint
ALTER TABLE "maintenance_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "schema_migrations" (
	"name" text PRIMARY KEY NOT NULL,
	"sha256" text NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schema_migrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "native_reserve_inflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"chain" text NOT NULL,
	"network" text NOT NULL,
	"tx_hash" text NOT NULL,
	"event_index" integer NOT NULL,
	"sender" text NOT NULL,
	"destination" text NOT NULL,
	"amount_base_units" numeric(78, 0) NOT NULL,
	"block_hash" text NOT NULL,
	"block_height" numeric(78, 0) NOT NULL,
	"statement_hash" text NOT NULL,
	"request_hash" text NOT NULL,
	"journal_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "native_reserve_inflows_environment_chain_network_tx_hash_event_index_asset_id_unique" UNIQUE("environment","chain","network","tx_hash","event_index","asset_id")
);
--> statement-breakpoint
ALTER TABLE "native_reserve_inflows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_views" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"seen_at" timestamp with time zone NOT NULL,
	"seen_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"delivery_key" text,
	"title_key" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "operation_keys" (
	"business_key" text PRIMARY KEY NOT NULL,
	"request_hash" text NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operation_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "operational_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"environment" text NOT NULL,
	"asset_id" uuid,
	"condition_key" text NOT NULL,
	"severity" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"safe_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"next_reminder_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reminders" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "operational_alerts_condition_key_unique" UNIQUE("condition_key")
);
--> statement-breakpoint
ALTER TABLE "operational_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_key" text NOT NULL,
	"environment" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"dispatched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_business_key_unique" UNIQUE("business_key"),
	CONSTRAINT "outbox_environment_check" CHECK ("outbox"."environment" in ('simulation','testnet','mainnet')),
	CONSTRAINT "outbox_kind_check" CHECK ("outbox"."kind" in ('notification','financial_reconciliation','operational_cleanup','own_export','chain_observation')),
	CONSTRAINT "outbox_payload_check" CHECK (jsonb_typeof("outbox"."payload")='object' and octet_length("outbox"."payload"::text)<=8192)
);
--> statement-breakpoint
ALTER TABLE "outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plan_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"amount_base_units" numeric(78, 0) NOT NULL,
	"usd_reference" numeric(20, 2) NOT NULL,
	"receiver_bps" integer NOT NULL,
	"marketing_bps" integer NOT NULL,
	"referral_bps" integer NOT NULL,
	"developer_bps" integer NOT NULL,
	"reserve_bps" integer NOT NULL,
	"receipts_required" integer NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_versions_plan_asset_version_unique" UNIQUE("plan_id","asset_id","version")
);
--> statement-breakpoint
ALTER TABLE "plan_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"usd_reference" numeric(18, 2) NOT NULL,
	"receipts_required" integer DEFAULT 2 NOT NULL,
	"status" text DEFAULT 'disabled' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"bootstrap_enabled" boolean DEFAULT true NOT NULL,
	"bootstrap_count" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug"),
	CONSTRAINT "plans_status_check" CHECK ("plans"."status" in ('disabled','scheduled','active','paused','retired'))
);
--> statement-breakpoint
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "point_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"award_type" text NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "point_events_user_source_award_unique" UNIQUE("user_id","source_key","award_type")
);
--> statement-breakpoint
ALTER TABLE "point_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "price_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"asset_usd" text NOT NULL,
	"native_usd" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_quotes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "queue_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partition_id" uuid NOT NULL,
	"ticket" bigint NOT NULL,
	"kind" text NOT NULL,
	"cycle_id" uuid,
	"beneficiary_user_id" uuid,
	"platform_role" text,
	"priority_revision" integer DEFAULT 1 NOT NULL,
	"priority_ticket" bigint,
	"required_count" integer NOT NULL,
	"credited_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queue_entries_partition_ticket_unique" UNIQUE("partition_id","ticket"),
	CONSTRAINT "queue_entry_ticket_bounds" CHECK ("queue_entries"."ticket" between 1 and 1099511627775 and ("queue_entries"."priority_ticket" is null or "queue_entries"."priority_ticket" between 1 and 1099511627775)),
	CONSTRAINT "queue_entries_kind_check" CHECK ("queue_entries"."kind" in ('member','bootstrap')),
	CONSTRAINT "queue_entries_status_check" CHECK ("queue_entries"."status" in ('waiting','fully_allocated','fulfilled','removed'))
);
--> statement-breakpoint
ALTER TABLE "queue_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "queue_partitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_version_id" uuid NOT NULL,
	"next_ticket" bigint DEFAULT 1 NOT NULL,
	"next_priority_ticket" bigint DEFAULT 1 NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queue_partitions_plan_version_id_unique" UNIQUE("plan_version_id"),
	CONSTRAINT "queue_partition_ticket_bounds" CHECK ("queue_partitions"."next_ticket" between 1 and 1099511627776 and "queue_partitions"."next_priority_ticket" between 1 and 1099511627776)
);
--> statement-breakpoint
ALTER TABLE "queue_partitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "queue_rank_nodes" (
	"partition_id" uuid NOT NULL,
	"lane" text NOT NULL,
	"node_index" bigint NOT NULL,
	"waiting_count" bigint NOT NULL,
	CONSTRAINT "queue_rank_nodes_partition_id_lane_node_index_pk" PRIMARY KEY("partition_id","lane","node_index"),
	CONSTRAINT "queue_rank_nodes_lane_check" CHECK ("queue_rank_nodes"."lane" in ('display','fifo','priority')),
	CONSTRAINT "queue_rank_nodes_node_index_check" CHECK ("queue_rank_nodes"."node_index" between 1 and 1099511627776),
	CONSTRAINT "queue_rank_nodes_waiting_count_check" CHECK ("queue_rank_nodes"."waiting_count" between 0 and 1099511627775)
);
--> statement-breakpoint
ALTER TABLE "queue_rank_nodes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"environment" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_seconds" integer NOT NULL,
	"used" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "receipt_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_operation_key" text NOT NULL,
	"source_cycle_id" uuid NOT NULL,
	"payer_user_id" uuid NOT NULL,
	"receiver_entry_id" uuid,
	"beneficiary_user_id" uuid,
	"receiver_kind" text NOT NULL,
	"recipient_role" text,
	"slot_index" integer,
	"receiver_account_id" uuid NOT NULL,
	"credit_journal_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"chain_id" text NOT NULL,
	"amount_base_units" numeric(78, 0) NOT NULL,
	"lineage_status" text NOT NULL,
	"credited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipt_allocations_source_operation_key_unique" UNIQUE("source_operation_key"),
	CONSTRAINT "receipt_allocations_credit_journal_id_unique" UNIQUE("credit_journal_id"),
	CONSTRAINT "receipt_allocations_receiver_kind_check" CHECK ("receipt_allocations"."receiver_kind" in ('member','bootstrap','empty_queue_business')),
	CONSTRAINT "receipt_allocations_environment_check" CHECK ("receipt_allocations"."environment" in ('simulation','testnet','mainnet')),
	CONSTRAINT "receipt_allocations_amount_base_units_check" CHECK ("receipt_allocations"."amount_base_units">0),
	CONSTRAINT "receipt_allocations_lineage_status_check" CHECK ("receipt_allocations"."lineage_status" in ('captured','legacy_linked')),
	CONSTRAINT "receipt_slot_shape" CHECK (("receipt_allocations"."receiver_kind"='empty_queue_business' and "receipt_allocations"."receiver_entry_id" is null and "receipt_allocations"."slot_index" is null) or ("receipt_allocations"."receiver_kind" in ('member','bootstrap') and "receipt_allocations"."receiver_entry_id" is not null and (("receipt_allocations"."lineage_status"='captured' and "receipt_allocations"."slot_index" is not null and "receipt_allocations"."slot_index">0) or ("receipt_allocations"."lineage_status"='legacy_linked' and "receipt_allocations"."slot_index" is null)))),
	CONSTRAINT "receipt_beneficiary_shape" CHECK (("receipt_allocations"."receiver_kind"='member' and "receipt_allocations"."beneficiary_user_id" is not null and "receipt_allocations"."beneficiary_user_id"<>"receipt_allocations"."payer_user_id" and "receipt_allocations"."recipient_role" is null) or ("receipt_allocations"."receiver_kind" in ('bootstrap','empty_queue_business') and "receipt_allocations"."beneficiary_user_id" is null and "receipt_allocations"."recipient_role" is not null and "receipt_allocations"."recipient_role" in ('developer','marketing','platform','custom_bootstrap')))
);
--> statement-breakpoint
ALTER TABLE "receipt_allocations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"code" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "referral_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"reason_hash" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"case_token_hash" text,
	"case_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scheduler_nonces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"environment" text NOT NULL,
	"nonce" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduler_nonces_environment_nonce_key" UNIQUE("environment","nonce"),
	CONSTRAINT "scheduler_nonces_environment_check" CHECK ("scheduler_nonces"."environment" in ('simulation','testnet','mainnet'))
);
--> statement-breakpoint
ALTER TABLE "scheduler_nonces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scheduler_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"environment" text NOT NULL,
	"run_key" text NOT NULL,
	"lease_generation" integer DEFAULT 1 NOT NULL,
	"lease_token" uuid NOT NULL,
	"lease_until" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduler_runs_environment_run_key_key" UNIQUE("environment","run_key"),
	CONSTRAINT "scheduler_runs_environment_check" CHECK ("scheduler_runs"."environment" in ('simulation','testnet','mainnet')),
	CONSTRAINT "scheduler_runs_lease_generation_check" CHECK ("scheduler_runs"."lease_generation" between 1 and 1000000)
);
--> statement-breakpoint
ALTER TABLE "scheduler_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "signed_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obligation_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"environment" text NOT NULL,
	"chain" text NOT NULL,
	"tx_hash" text NOT NULL,
	"nonce" numeric(78, 0),
	"valid_until_height" numeric(78, 0),
	"signed_cipher" text NOT NULL,
	"native_fee_cap" numeric(78, 0) NOT NULL,
	"intent_hash" text NOT NULL,
	"configuration_hash" text NOT NULL,
	"status" text DEFAULT 'signed' NOT NULL,
	"actual_native_fee" numeric(78, 0),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"broadcast_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "signed_attempts_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "signed_attempts_obligation_id_attempt_unique" UNIQUE("obligation_id","attempt")
);
--> statement-breakpoint
ALTER TABLE "signed_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "signer_reservations" (
	"obligation_id" uuid NOT NULL,
	"treasury_fingerprint" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"signing_day" date NOT NULL,
	"principal_usd_micros" numeric(78, 0) NOT NULL,
	"native_fee_reserved" numeric(78, 0) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signer_reservations_obligation_id_signing_day_pk" PRIMARY KEY("obligation_id","signing_day")
);
--> statement-breakpoint
ALTER TABLE "signer_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "signer_states" (
	"treasury_fingerprint" text PRIMARY KEY NOT NULL,
	"environment" text NOT NULL,
	"chain" text NOT NULL,
	"next_nonce" numeric(78, 0) DEFAULT '0' NOT NULL,
	"lease_token" uuid,
	"lease_generation" integer DEFAULT 0 NOT NULL,
	"lease_until" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"configuration_hash" text
);
--> statement-breakpoint
ALTER TABLE "signer_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "simulation_incoming_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"environment" text DEFAULT 'simulation' NOT NULL,
	"outcome" text NOT NULL,
	"actual_base_units" numeric(78, 0) NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"operation_key" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_incoming_controls_invoice_id_unique" UNIQUE("invoice_id"),
	CONSTRAINT "simulation_incoming_controls_operation_key_unique" UNIQUE("operation_key"),
	CONSTRAINT "incoming_control_environment_check" CHECK ("simulation_incoming_controls"."environment"='simulation'),
	CONSTRAINT "incoming_control_outcome_check" CHECK ("simulation_incoming_controls"."outcome" in ('reject','under','over','late','delay')),
	CONSTRAINT "incoming_control_amount_check" CHECK ("simulation_incoming_controls"."actual_base_units">=0),
	CONSTRAINT "incoming_control_reason_check" CHECK (length("simulation_incoming_controls"."reason") between 5 and 500)
);
--> statement-breakpoint
ALTER TABLE "simulation_incoming_controls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "simulation_incoming_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"environment" text DEFAULT 'simulation' NOT NULL,
	"outcome" text NOT NULL,
	"gift_operation_key" text,
	"hold_journal_id" uuid,
	"accept_journal_id" uuid,
	"refund_journal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_incoming_events_invoice_id_unique" UNIQUE("invoice_id"),
	CONSTRAINT "simulation_incoming_events_gift_operation_key_unique" UNIQUE("gift_operation_key"),
	CONSTRAINT "incoming_event_environment_check" CHECK ("simulation_incoming_events"."environment"='simulation'),
	CONSTRAINT "incoming_event_outcome_check" CHECK ("simulation_incoming_events"."outcome" in ('exact','reject','under','over','late','review_reject'))
);
--> statement-breakpoint
ALTER TABLE "simulation_incoming_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "simulation_incoming_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"environment" text DEFAULT 'simulation' NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"operation_key" text NOT NULL,
	"journal_id" uuid NOT NULL,
	"amount_base_units" numeric(78, 0) NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_incoming_refunds_invoice_id_unique" UNIQUE("invoice_id"),
	CONSTRAINT "simulation_incoming_refunds_operation_key_unique" UNIQUE("operation_key"),
	CONSTRAINT "simulation_incoming_refunds_journal_id_unique" UNIQUE("journal_id"),
	CONSTRAINT "incoming_refund_environment_check" CHECK ("simulation_incoming_refunds"."environment"='simulation'),
	CONSTRAINT "incoming_refund_amount_check" CHECK ("simulation_incoming_refunds"."amount_base_units">0),
	CONSTRAINT "incoming_refund_reason_check" CHECK (length("simulation_incoming_refunds"."reason") between 5 and 500)
);
--> statement-breakpoint
ALTER TABLE "simulation_incoming_refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "simulation_reorg_resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"environment" text DEFAULT 'simulation' NOT NULL,
	"journal_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"operation_key" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_reorg_resolutions_review_id_unique" UNIQUE("review_id"),
	CONSTRAINT "simulation_reorg_resolutions_journal_id_unique" UNIQUE("journal_id"),
	CONSTRAINT "simulation_reorg_resolutions_operation_key_unique" UNIQUE("operation_key"),
	CONSTRAINT "reorg_resolution_environment_check" CHECK ("simulation_reorg_resolutions"."environment"='simulation'),
	CONSTRAINT "reorg_resolution_reason_check" CHECK (length("simulation_reorg_resolutions"."reason") between 5 and 500)
);
--> statement-breakpoint
ALTER TABLE "simulation_reorg_resolutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "simulation_reorg_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_allocation_id" uuid NOT NULL,
	"source_operation_key" text NOT NULL,
	"revision" integer NOT NULL,
	"source_cycle_id" uuid NOT NULL,
	"source_ticket" bigint NOT NULL,
	"partition_id" uuid NOT NULL,
	"receiver_entry_id" uuid,
	"asset_id" uuid NOT NULL,
	"payer_user_id" uuid NOT NULL,
	"affected_user_ids" uuid[] NOT NULL,
	"environment" text DEFAULT 'simulation' NOT NULL,
	"amount_base_units" numeric(78, 0) NOT NULL,
	"settled_outgoing_exposure" numeric(78, 0) DEFAULT '0' NOT NULL,
	"loss_journal_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"operation_key" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_reorg_reviews_loss_journal_id_unique" UNIQUE("loss_journal_id"),
	CONSTRAINT "simulation_reorg_reviews_operation_key_unique" UNIQUE("operation_key"),
	CONSTRAINT "reorg_source_revision_unique" UNIQUE("source_allocation_id","revision"),
	CONSTRAINT "reorg_environment_check" CHECK ("simulation_reorg_reviews"."environment"='simulation'),
	CONSTRAINT "reorg_amount_check" CHECK ("simulation_reorg_reviews"."amount_base_units">0 and "simulation_reorg_reviews"."settled_outgoing_exposure">=0),
	CONSTRAINT "reorg_revision_check" CHECK ("simulation_reorg_reviews"."revision" between 1 and 1000000),
	CONSTRAINT "reorg_users_check" CHECK (cardinality("simulation_reorg_reviews"."affected_user_ids") between 1 and 3),
	CONSTRAINT "reorg_reason_check" CHECK (length("simulation_reorg_reviews"."reason") between 5 and 500)
);
--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "simulation_withdrawal_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"withdrawal_id" uuid NOT NULL,
	"environment" text DEFAULT 'simulation' NOT NULL,
	"outcome" text NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"operation_key" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_withdrawal_controls_withdrawal_id_unique" UNIQUE("withdrawal_id"),
	CONSTRAINT "simulation_withdrawal_controls_operation_key_unique" UNIQUE("operation_key"),
	CONSTRAINT "simulation_withdrawal_controls_environment_check" CHECK ("simulation_withdrawal_controls"."environment"='simulation'),
	CONSTRAINT "simulation_withdrawal_controls_outcome_check" CHECK ("simulation_withdrawal_controls"."outcome" in ('hold','reject')),
	CONSTRAINT "simulation_withdrawal_controls_reason_check" CHECK (length("simulation_withdrawal_controls"."reason") between 5 and 500)
);
--> statement-breakpoint
ALTER TABLE "simulation_withdrawal_controls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "slug_redirects" (
	"locale" text NOT NULL,
	"old_slug" text NOT NULL,
	"article_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slug_redirects_locale_old_slug_pk" PRIMARY KEY("locale","old_slug")
);
--> statement-breakpoint
ALTER TABLE "slug_redirects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"subject" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identities_provider_subject_unique" UNIQUE("provider","subject")
);
--> statement-breakpoint
ALTER TABLE "user_identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending_consent' NOT NULL,
	"account_revision" integer DEFAULT 1 NOT NULL,
	"suspension_previous_status" text,
	"suspension_until" timestamp with time zone,
	"session_version" integer DEFAULT 1 NOT NULL,
	"age_confirmed_at" timestamp with time zone,
	"age_minimum_accepted" integer,
	"locale" text DEFAULT 'en' NOT NULL,
	"consent_version" text,
	"consented_at" timestamp with time zone,
	"referrer_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('member','moderator','admin')),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('pending_consent','active','suspended','banned','deactivated','deleted'))
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wallet_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"chain" text NOT NULL,
	"asset_key" text NOT NULL,
	"address" text NOT NULL,
	"message" text NOT NULL,
	"session_generation" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet_challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wallet_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"chain_id" text NOT NULL,
	"address" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"cooling_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_links_user_environment_chain_unique" UNIQUE("user_id","environment","chain_id")
);
--> statement-breakpoint
ALTER TABLE "wallet_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"gross_base_units" numeric(78, 0) NOT NULL,
	"fee_base_units" numeric(78, 0) DEFAULT '0' NOT NULL,
	"net_base_units" numeric(78, 0) NOT NULL,
	"destination" text NOT NULL,
	"status" text NOT NULL,
	"quote_expires_at" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"request_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "withdrawals_request_key_unique" UNIQUE("request_key"),
	CONSTRAINT "withdrawals_status_check" CHECK ("withdrawals"."status" in ('quoted','held','awaiting_requote','approved','sending','settled','cancelled','exception'))
);
--> statement-breakpoint
ALTER TABLE "withdrawals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "worker_requests" (
	"nonce" uuid PRIMARY KEY NOT NULL,
	"environment" text NOT NULL,
	"purpose" text NOT NULL,
	"body_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "worker_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "x_manifest" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"type" text NOT NULL,
	"scope" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deprecated_at" timestamp with time zone,
	CONSTRAINT "x_manifest_scope_check" CHECK ("x_manifest"."scope" in ('public','private','staff'))
);
--> statement-breakpoint
ALTER TABLE "x_manifest" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_alert_id_operational_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."operational_alerts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_factors" ADD CONSTRAINT "auth_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_recovery_codes" ADD CONSTRAINT "auth_recovery_codes_factor_id_auth_factors_id_fk" FOREIGN KEY ("factor_id") REFERENCES "public"."auth_factors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_refresh_tokens" ADD CONSTRAINT "auth_refresh_tokens_session_id_auth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_totp_replays" ADD CONSTRAINT "auth_totp_replays_factor_id_auth_factors_id_fk" FOREIGN KEY ("factor_id") REFERENCES "public"."auth_factors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_events" ADD CONSTRAINT "crypto_events_invoice_id_crypto_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."crypto_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_events" ADD CONSTRAINT "crypto_events_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_invoices" ADD CONSTRAINT "crypto_invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_invoices" ADD CONSTRAINT "crypto_invoices_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_invoices" ADD CONSTRAINT "crypto_invoices_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_invoices" ADD CONSTRAINT "crypto_invoices_wallet_id_wallet_links_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet_links"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_obligations" ADD CONSTRAINT "crypto_obligations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_obligations" ADD CONSTRAINT "crypto_obligations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_obligations" ADD CONSTRAINT "crypto_obligations_previous_obligation_id_crypto_obligations_id_fk" FOREIGN KEY ("previous_obligation_id") REFERENCES "public"."crypto_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_submissions" ADD CONSTRAINT "crypto_submissions_invoice_id_crypto_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."crypto_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_chunks" ADD CONSTRAINT "export_chunks_export_id_data_exports_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."data_exports"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_reconciliation_results" ADD CONSTRAINT "financial_reconciliation_results_source_job_id_jobs_id_fk" FOREIGN KEY ("source_job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_invoices" ADD CONSTRAINT "gift_invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_invoices" ADD CONSTRAINT "gift_invoices_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_invoices" ADD CONSTRAINT "gift_invoices_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_outbox_id_outbox_id_fk" FOREIGN KEY ("outbox_id") REFERENCES "public"."outbox"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_journal_id_ledger_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_account_id_ledger_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_results" ADD CONSTRAINT "maintenance_results_source_job_id_jobs_id_fk" FOREIGN KEY ("source_job_id") REFERENCES "public"."jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "native_reserve_inflows" ADD CONSTRAINT "native_reserve_inflows_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "native_reserve_inflows" ADD CONSTRAINT "native_reserve_inflows_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "native_reserve_inflows" ADD CONSTRAINT "native_reserve_inflows_journal_id_ledger_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_views" ADD CONSTRAINT "notification_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_quotes" ADD CONSTRAINT "price_quotes_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_partition_id_queue_partitions_id_fk" FOREIGN KEY ("partition_id") REFERENCES "public"."queue_partitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_beneficiary_user_id_users_id_fk" FOREIGN KEY ("beneficiary_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_partitions" ADD CONSTRAINT "queue_partitions_plan_version_id_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."plan_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_rank_nodes" ADD CONSTRAINT "queue_rank_nodes_partition_id_queue_partitions_id_fk" FOREIGN KEY ("partition_id") REFERENCES "public"."queue_partitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_source_operation_key_operation_keys_business_key_fk" FOREIGN KEY ("source_operation_key") REFERENCES "public"."operation_keys"("business_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_source_cycle_id_cycles_id_fk" FOREIGN KEY ("source_cycle_id") REFERENCES "public"."cycles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_payer_user_id_users_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_receiver_entry_id_queue_entries_id_fk" FOREIGN KEY ("receiver_entry_id") REFERENCES "public"."queue_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_beneficiary_user_id_users_id_fk" FOREIGN KEY ("beneficiary_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_receiver_account_id_ledger_accounts_id_fk" FOREIGN KEY ("receiver_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_credit_journal_id_ledger_journals_id_fk" FOREIGN KEY ("credit_journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_attempts" ADD CONSTRAINT "signed_attempts_obligation_id_crypto_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."crypto_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signer_reservations" ADD CONSTRAINT "signer_reservations_obligation_id_crypto_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."crypto_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signer_reservations" ADD CONSTRAINT "signer_reservations_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_controls" ADD CONSTRAINT "simulation_incoming_controls_invoice_id_gift_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."gift_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_controls" ADD CONSTRAINT "simulation_incoming_controls_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_controls" ADD CONSTRAINT "simulation_incoming_controls_operation_key_operation_keys_business_key_fk" FOREIGN KEY ("operation_key") REFERENCES "public"."operation_keys"("business_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_events" ADD CONSTRAINT "simulation_incoming_events_invoice_id_gift_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."gift_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_events" ADD CONSTRAINT "simulation_incoming_events_gift_operation_key_operation_keys_business_key_fk" FOREIGN KEY ("gift_operation_key") REFERENCES "public"."operation_keys"("business_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_events" ADD CONSTRAINT "simulation_incoming_events_hold_journal_id_ledger_journals_id_fk" FOREIGN KEY ("hold_journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_events" ADD CONSTRAINT "simulation_incoming_events_accept_journal_id_ledger_journals_id_fk" FOREIGN KEY ("accept_journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_events" ADD CONSTRAINT "simulation_incoming_events_refund_journal_id_ledger_journals_id_fk" FOREIGN KEY ("refund_journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_refunds" ADD CONSTRAINT "simulation_incoming_refunds_invoice_id_gift_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."gift_invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_refunds" ADD CONSTRAINT "simulation_incoming_refunds_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_refunds" ADD CONSTRAINT "simulation_incoming_refunds_operation_key_operation_keys_business_key_fk" FOREIGN KEY ("operation_key") REFERENCES "public"."operation_keys"("business_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_incoming_refunds" ADD CONSTRAINT "simulation_incoming_refunds_journal_id_ledger_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_resolutions" ADD CONSTRAINT "simulation_reorg_resolutions_review_id_simulation_reorg_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."simulation_reorg_reviews"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_resolutions" ADD CONSTRAINT "simulation_reorg_resolutions_journal_id_ledger_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_resolutions" ADD CONSTRAINT "simulation_reorg_resolutions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_resolutions" ADD CONSTRAINT "simulation_reorg_resolutions_operation_key_operation_keys_business_key_fk" FOREIGN KEY ("operation_key") REFERENCES "public"."operation_keys"("business_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ADD CONSTRAINT "simulation_reorg_reviews_source_allocation_id_receipt_allocations_id_fk" FOREIGN KEY ("source_allocation_id") REFERENCES "public"."receipt_allocations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ADD CONSTRAINT "simulation_reorg_reviews_source_operation_key_operation_keys_business_key_fk" FOREIGN KEY ("source_operation_key") REFERENCES "public"."operation_keys"("business_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ADD CONSTRAINT "simulation_reorg_reviews_source_cycle_id_cycles_id_fk" FOREIGN KEY ("source_cycle_id") REFERENCES "public"."cycles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ADD CONSTRAINT "simulation_reorg_reviews_partition_id_queue_partitions_id_fk" FOREIGN KEY ("partition_id") REFERENCES "public"."queue_partitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ADD CONSTRAINT "simulation_reorg_reviews_receiver_entry_id_queue_entries_id_fk" FOREIGN KEY ("receiver_entry_id") REFERENCES "public"."queue_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ADD CONSTRAINT "simulation_reorg_reviews_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ADD CONSTRAINT "simulation_reorg_reviews_payer_user_id_users_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ADD CONSTRAINT "simulation_reorg_reviews_loss_journal_id_ledger_journals_id_fk" FOREIGN KEY ("loss_journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ADD CONSTRAINT "simulation_reorg_reviews_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_reorg_reviews" ADD CONSTRAINT "simulation_reorg_reviews_operation_key_operation_keys_business_key_fk" FOREIGN KEY ("operation_key") REFERENCES "public"."operation_keys"("business_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_withdrawal_controls" ADD CONSTRAINT "simulation_withdrawal_controls_withdrawal_id_withdrawals_id_fk" FOREIGN KEY ("withdrawal_id") REFERENCES "public"."withdrawals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_withdrawal_controls" ADD CONSTRAINT "simulation_withdrawal_controls_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_withdrawal_controls" ADD CONSTRAINT "simulation_withdrawal_controls_operation_key_operation_keys_business_key_fk" FOREIGN KEY ("operation_key") REFERENCES "public"."operation_keys"("business_key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slug_redirects" ADD CONSTRAINT "slug_redirects_article_id_help_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."help_articles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_challenges" ADD CONSTRAINT "wallet_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_links" ADD CONSTRAINT "wallet_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "x_manifest" ADD CONSTRAINT "x_manifest_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appeal_open_case_unique" ON "appeals" USING btree ("report_id") WHERE "appeals"."status"='open';--> statement-breakpoint
CREATE INDEX "auth_refresh_session_idx" ON "auth_refresh_tokens" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "crypto_invoice_open_idx" ON "crypto_invoices" USING btree ("user_id","plan_version_id") WHERE "crypto_invoices"."status" in ('quoted','submitted');--> statement-breakpoint
CREATE INDEX "obligation_pending_idx" ON "crypto_obligations" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "cycle_user_history_idx" ON "cycles" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_active_cycle_per_user_plan" ON "cycles" USING btree ("user_id","plan_version_id") WHERE "cycles"."status" in ('active','exception');--> statement-breakpoint
CREATE INDEX "data_export_owned_idx" ON "data_exports" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "data_export_expiry_idx" ON "data_exports" USING btree ("expires_at","id");--> statement-breakpoint
CREATE INDEX "binding_challenge_expiry_idx" ON "deployment_binding_challenges" USING btree ("expires_at","id");--> statement-breakpoint
CREATE INDEX "reconciliation_history_idx" ON "financial_reconciliation_results" USING btree ("environment","checked_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_invoice_open_unique" ON "gift_invoices" USING btree ("user_id","plan_version_id") WHERE "gift_invoices"."status" in ('quoted','submitted');--> statement-breakpoint
CREATE INDEX "gift_invoice_history_idx" ON "gift_invoices" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "help_public_locale_idx" ON "help_articles" USING btree ("locale","published","slug");--> statement-breakpoint
CREATE INDEX "jobs_due_idx" ON "jobs" USING btree ("environment","status","due_at","id");--> statement-breakpoint
CREATE INDEX "jobs_expired_lease_idx" ON "jobs" USING btree ("environment","lease_until","id") WHERE "jobs"."status"='running';--> statement-breakpoint
CREATE INDEX "ledger_user_page_idx" ON "ledger_accounts" USING btree ("owner_id","asset_id","id") WHERE "ledger_accounts"."owner_type"='user';--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_owner_unique" ON "ledger_accounts" USING btree ("asset_id","owner_type",coalesce("owner_id",'00000000-0000-0000-0000-000000000000'::uuid),"purpose");--> statement-breakpoint
CREATE INDEX "ledger_business_prefix_idx" ON "ledger_journals" USING btree ("business_key" text_pattern_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_giv_uuid_nonce_unique" ON "ledger_journals" USING btree (lower("business_key")) WHERE "ledger_journals"."business_key" ~ '^gift-in:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$|^allocation:gift:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}:';--> statement-breakpoint
CREATE INDEX "ledger_account_page_idx" ON "ledger_postings" USING btree ("account_id","id");--> statement-breakpoint
CREATE INDEX "maintenance_history_idx" ON "maintenance_results" USING btree ("environment","checked_at","id");--> statement-breakpoint
CREATE INDEX "notification_user_page_idx" ON "notifications" USING btree ("user_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_delivery_key_unique" ON "notifications" USING btree ("delivery_key");--> statement-breakpoint
CREATE UNIQUE INDEX "operation_staff_uuid_nonce_unique" ON "operation_keys" USING btree (lower("business_key")) WHERE "operation_keys"."business_key" ~ '^admin-(job-replay|sim-withdrawal|resolve-withdrawal):[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$;--> statement-breakpoint
CREATE INDEX "operation_key_case_lookup" ON "operation_keys" USING btree (lower("business_key"));--> statement-breakpoint
CREATE UNIQUE INDEX "operation_uuid_nonce_unique" ON "operation_keys" USING btree (lower("business_key")) WHERE "operation_keys"."business_key" ~ '^(gift|admin-activate):[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$;--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox" USING btree ("environment","created_at","id") WHERE "outbox"."dispatched_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_asset_active_unique" ON "plan_versions" USING btree ("plan_id","asset_id") WHERE "plan_versions"."active";--> statement-breakpoint
CREATE INDEX "point_user_page_idx" ON "point_events" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "point_source_idx" ON "point_events" USING btree ("source_key","user_id");--> statement-breakpoint
CREATE INDEX "queue_waiting_order_idx" ON "queue_entries" USING btree ("partition_id","priority_ticket","ticket") WHERE "queue_entries"."status" = 'waiting';--> statement-breakpoint
CREATE UNIQUE INDEX "queue_priority_ticket_unique" ON "queue_entries" USING btree ("partition_id","priority_ticket") WHERE "queue_entries"."priority_ticket" is not null and "queue_entries"."status"='waiting';--> statement-breakpoint
CREATE UNIQUE INDEX "queue_cycle_entry_unique" ON "queue_entries" USING btree ("cycle_id") WHERE "queue_entries"."cycle_id" is not null;--> statement-breakpoint
CREATE INDEX "queue_waiting_display_idx" ON "queue_entries" USING btree ("partition_id","ticket") WHERE "queue_entries"."status"='waiting';--> statement-breakpoint
CREATE INDEX "queue_waiting_priority_idx" ON "queue_entries" USING btree ("partition_id","priority_ticket","ticket") WHERE "queue_entries"."status"='waiting' and "queue_entries"."priority_ticket" is not null;--> statement-breakpoint
CREATE INDEX "queue_waiting_fifo_idx" ON "queue_entries" USING btree ("partition_id","ticket") WHERE "queue_entries"."status"='waiting' and "queue_entries"."priority_ticket" is null;--> statement-breakpoint
CREATE INDEX "rate_limit_expiry_idx" ON "rate_limits" USING btree ("environment","expires_at","key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_receiver_slot_unique" ON "receipt_allocations" USING btree ("receiver_entry_id","slot_index") WHERE "receipt_allocations"."slot_index" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_source_cycle_unique" ON "receipt_allocations" USING btree ("source_cycle_id");--> statement-breakpoint
CREATE INDEX "receipt_beneficiary_history_idx" ON "receipt_allocations" USING btree ("beneficiary_user_id","credited_at","id");--> statement-breakpoint
CREATE INDEX "reports_dedupe_idx" ON "reports" USING btree ("actor_id","target_id","reason_hash","created_at");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "scheduler_nonce_expiry_idx" ON "scheduler_nonces" USING btree ("expires_at","id");--> statement-breakpoint
CREATE INDEX "scheduler_nonce_environment_expiry_idx" ON "scheduler_nonces" USING btree ("environment","expires_at","id");--> statement-breakpoint
CREATE INDEX "scheduler_runs_lease_idx" ON "scheduler_runs" USING btree ("environment","lease_until","id") WHERE "scheduler_runs"."completed_at" is null;--> statement-breakpoint
CREATE INDEX "scheduler_runs_completed_idx" ON "scheduler_runs" USING btree ("environment","completed_at","id") WHERE "scheduler_runs"."completed_at" is not null;--> statement-breakpoint
CREATE INDEX "reorg_source_operation_idx" ON "simulation_reorg_reviews" USING btree ("source_operation_key");--> statement-breakpoint
CREATE INDEX "reorg_partition_idx" ON "simulation_reorg_reviews" USING btree ("partition_id","created_at","id");--> statement-breakpoint
CREATE INDEX "reorg_affected_users_idx" ON "simulation_reorg_reviews" USING gin ("affected_user_ids");--> statement-breakpoint
CREATE INDEX "withdrawals_user_history_idx" ON "withdrawals" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawal_uuid_quote_unique" ON "withdrawals" USING btree (lower("request_key"));