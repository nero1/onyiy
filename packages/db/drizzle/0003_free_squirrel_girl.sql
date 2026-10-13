CREATE TABLE "chain_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"binding_fingerprint" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"treasury_fingerprint" text NOT NULL,
	"treasury_sender" text NOT NULL,
	"registry_snapshot" jsonb NOT NULL,
	"configuration_hash" text NOT NULL,
	"height" numeric(78, 0) NOT NULL,
	"block_hash" text NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"proof_reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chain_checkpoints" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chain_recovery_runs" (
	"known_attempt_cursor" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkpoint_id" uuid NOT NULL,
	"binding_fingerprint" text NOT NULL,
	"through_height" numeric(78, 0) NOT NULL,
	"cursor_height" numeric(78, 0) NOT NULL,
	"state" text DEFAULT 'scanning' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"incoming_count" integer DEFAULT 0 NOT NULL,
	"outgoing_count" integer DEFAULT 0 NOT NULL,
	"reason_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "chain_recovery_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chain_scan_pages" (
	"run_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"from_height" numeric(78, 0) NOT NULL,
	"through_height" numeric(78, 0) NOT NULL,
	"evidence_hash" text NOT NULL,
	"incoming_count" integer NOT NULL,
	"outgoing_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chain_scan_pages_run_id_revision_pk" PRIMARY KEY("run_id","revision")
);
--> statement-breakpoint
ALTER TABLE "chain_scan_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "public_statistics" (
	"environment" text PRIMARY KEY NOT NULL,
	"members" bigint NOT NULL,
	"pending_registrations" bigint NOT NULL,
	"settled_member_usd" numeric(78, 18) NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public_statistics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recovery_outflow_resolutions" (
	"account_setup_base_units" numeric(78, 0) NOT NULL,
	"setup_journal_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outflow_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"tx_hash" text NOT NULL,
	"event_index" integer NOT NULL,
	"principal_base_units" numeric(78, 0) NOT NULL,
	"native_asset_id" uuid NOT NULL,
	"native_fee_base_units" numeric(78, 0) NOT NULL,
	"principal_journal_id" uuid,
	"gas_journal_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"proof_reference" text NOT NULL,
	"reason" text NOT NULL,
	"evidence_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_outflow_resolutions_asset_id_tx_hash_event_index_unique" UNIQUE("asset_id","tx_hash","event_index")
);
--> statement-breakpoint
ALTER TABLE "recovery_outflow_resolutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recovery_outflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"tx_hash" text NOT NULL,
	"event_index" integer NOT NULL,
	"sender" text NOT NULL,
	"destination" text NOT NULL,
	"amount_base_units" numeric(78, 0) NOT NULL,
	"block_height" numeric(78, 0) NOT NULL,
	"status" text NOT NULL,
	"obligation_id" uuid,
	"evidence_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_outflows_run_id_tx_hash_event_index_unique" UNIQUE("run_id","tx_hash","event_index")
);
--> statement-breakpoint
ALTER TABLE "recovery_outflows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "signer_heartbeats" (
	"treasury_fingerprint" text PRIMARY KEY NOT NULL,
	"environment" text NOT NULL,
	"chain" text NOT NULL,
	"configuration_hash" text NOT NULL,
	"heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signer_heartbeats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "unallocated_inflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
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
	"registry_snapshot" jsonb NOT NULL,
	"treasury_fingerprint" text NOT NULL,
	"journal_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unallocated_inflows_journal_id_unique" UNIQUE("journal_id"),
	CONSTRAINT "unallocated_inflows_asset_id_environment_chain_network_tx_hash_event_index_unique" UNIQUE("asset_id","environment","chain","network","tx_hash","event_index")
);
--> statement-breakpoint
ALTER TABLE "unallocated_inflows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "unallocated_refund_claims" (
	"inflow_id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"statement_hash" text NOT NULL,
	"signature_hash" text NOT NULL,
	"proof_reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unallocated_refund_claims" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chain_checkpoints" ADD CONSTRAINT "chain_checkpoints_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_checkpoints" ADD CONSTRAINT "chain_checkpoints_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_recovery_runs" ADD CONSTRAINT "chain_recovery_runs_checkpoint_id_chain_checkpoints_id_fk" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."chain_checkpoints"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_scan_pages" ADD CONSTRAINT "chain_scan_pages_run_id_chain_recovery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."chain_recovery_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outflow_resolutions" ADD CONSTRAINT "recovery_outflow_resolutions_setup_journal_id_ledger_journals_id_fk" FOREIGN KEY ("setup_journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outflow_resolutions" ADD CONSTRAINT "recovery_outflow_resolutions_outflow_id_recovery_outflows_id_fk" FOREIGN KEY ("outflow_id") REFERENCES "public"."recovery_outflows"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outflow_resolutions" ADD CONSTRAINT "recovery_outflow_resolutions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outflow_resolutions" ADD CONSTRAINT "recovery_outflow_resolutions_native_asset_id_assets_id_fk" FOREIGN KEY ("native_asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outflow_resolutions" ADD CONSTRAINT "recovery_outflow_resolutions_principal_journal_id_ledger_journals_id_fk" FOREIGN KEY ("principal_journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outflow_resolutions" ADD CONSTRAINT "recovery_outflow_resolutions_gas_journal_id_ledger_journals_id_fk" FOREIGN KEY ("gas_journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outflow_resolutions" ADD CONSTRAINT "recovery_outflow_resolutions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outflows" ADD CONSTRAINT "recovery_outflows_run_id_chain_recovery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."chain_recovery_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outflows" ADD CONSTRAINT "recovery_outflows_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_outflows" ADD CONSTRAINT "recovery_outflows_obligation_id_crypto_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."crypto_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unallocated_inflows" ADD CONSTRAINT "unallocated_inflows_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unallocated_inflows" ADD CONSTRAINT "unallocated_inflows_journal_id_ledger_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unallocated_refund_claims" ADD CONSTRAINT "unallocated_refund_claims_inflow_id_unallocated_inflows_id_fk" FOREIGN KEY ("inflow_id") REFERENCES "public"."unallocated_inflows"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unallocated_refund_claims" ADD CONSTRAINT "unallocated_refund_claims_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chain_checkpoint_latest_idx" ON "chain_checkpoints" USING btree ("asset_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "checkpoint_treasury_idx" ON "chain_checkpoints" USING btree ("treasury_fingerprint","asset_id","created_at","id");--> statement-breakpoint
CREATE INDEX "chain_recovery_latest_idx" ON "chain_recovery_runs" USING btree ("checkpoint_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "recovery_outflow_event_idx" ON "recovery_outflows" USING btree ("asset_id","tx_hash","event_index");--> statement-breakpoint
CREATE INDEX "unmatched_sender_idx" ON "unallocated_inflows" USING btree ("asset_id","sender","created_at","id");--> statement-breakpoint
CREATE INDEX "crypto_obligation_treasury_lineage_idx" ON "crypto_obligations" USING btree ("asset_id","treasury_sender","id");--> statement-breakpoint
CREATE INDEX "recovery_known_attempt_order" ON "signed_attempts" USING btree ("obligation_id","id");