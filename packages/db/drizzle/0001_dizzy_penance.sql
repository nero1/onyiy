CREATE TABLE "abuse_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"source_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abuse_signals_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
ALTER TABLE "abuse_signals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bot_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_generation" uuid NOT NULL,
	"environment" text NOT NULL,
	"surface" text NOT NULL,
	"provider" text NOT NULL,
	"dummy_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bot_token_uses" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"challenge_id" uuid NOT NULL,
	"request_key" text NOT NULL,
	"environment" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_token_uses_challenge_id_unique" UNIQUE("challenge_id")
);
--> statement-breakpoint
ALTER TABLE "bot_token_uses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "liability_recoveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"obligation_id" uuid NOT NULL,
	"proof_reference" text NOT NULL,
	"statement" text NOT NULL,
	"statement_hash" text NOT NULL,
	"signature_hash" text,
	"confirmation_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "liability_recoveries_obligation_id_unique" UNIQUE("obligation_id")
);
--> statement-breakpoint
ALTER TABLE "liability_recoveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recovery_view_caps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recovery_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recovery_view_caps_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "recovery_view_caps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crypto_obligations" ADD COLUMN "treasury_sender" text;--> statement-breakpoint
ALTER TABLE "signed_attempts" ADD COLUMN "previous_attempt_id" uuid;--> statement-breakpoint
ALTER TABLE "signed_attempts" ADD COLUMN "signed_at_height" numeric(78, 0);--> statement-breakpoint
ALTER TABLE "signed_attempts" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "abuse_signals" ADD CONSTRAINT "abuse_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_challenges" ADD CONSTRAINT "bot_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_token_uses" ADD CONSTRAINT "bot_token_uses_challenge_id_bot_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."bot_challenges"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liability_recoveries" ADD CONSTRAINT "liability_recoveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liability_recoveries" ADD CONSTRAINT "liability_recoveries_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liability_recoveries" ADD CONSTRAINT "liability_recoveries_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liability_recoveries" ADD CONSTRAINT "liability_recoveries_obligation_id_crypto_obligations_id_fk" FOREIGN KEY ("obligation_id") REFERENCES "public"."crypto_obligations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recovery_view_caps" ADD CONSTRAINT "recovery_view_caps_recovery_id_liability_recoveries_id_fk" FOREIGN KEY ("recovery_id") REFERENCES "public"."liability_recoveries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signed_attempts" ADD CONSTRAINT "signed_attempts_previous_attempt_id_signed_attempts_id_fk" FOREIGN KEY ("previous_attempt_id") REFERENCES "public"."signed_attempts"("id") ON DELETE restrict ON UPDATE no action;