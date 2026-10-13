CREATE TABLE "crypto_reorg_resolutions" (
	"review_id" uuid PRIMARY KEY NOT NULL,
	"journal_id" uuid NOT NULL,
	"block_hash" text NOT NULL,
	"block_height" numeric(78, 0),
	"evidence_hash" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crypto_reorg_resolutions_journal_id_unique" UNIQUE("journal_id")
);
--> statement-breakpoint
ALTER TABLE "crypto_reorg_resolutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crypto_reorg_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"amount_base_units" numeric(78, 0) NOT NULL,
	"original_block_hash" text NOT NULL,
	"anchor_height" numeric(78, 0) NOT NULL,
	"evidence_hash" text NOT NULL,
	"loss_journal_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crypto_reorg_reviews_loss_journal_id_unique" UNIQUE("loss_journal_id"),
	CONSTRAINT "crypto_reorg_reviews_event_id_revision_unique" UNIQUE("event_id","revision")
);
--> statement-breakpoint
ALTER TABLE "crypto_reorg_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crypto_reorg_resolutions" ADD CONSTRAINT "crypto_reorg_resolutions_review_id_crypto_reorg_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."crypto_reorg_reviews"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_reorg_resolutions" ADD CONSTRAINT "crypto_reorg_resolutions_journal_id_ledger_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_reorg_reviews" ADD CONSTRAINT "crypto_reorg_reviews_event_id_crypto_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."crypto_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_reorg_reviews" ADD CONSTRAINT "crypto_reorg_reviews_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_reorg_reviews" ADD CONSTRAINT "crypto_reorg_reviews_loss_journal_id_ledger_journals_id_fk" FOREIGN KEY ("loss_journal_id") REFERENCES "public"."ledger_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crypto_reorg_asset_idx" ON "crypto_reorg_reviews" USING btree ("asset_id","event_id","revision");--> statement-breakpoint
CREATE INDEX "crypto_event_invoice_cursor_idx" ON "crypto_events" USING btree ("invoice_id","id");--> statement-breakpoint
CREATE INDEX "crypto_invoice_owned_cursor_idx" ON "crypto_invoices" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "crypto_obligation_owned_cursor_idx" ON "crypto_obligations" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "native_receipt_owned_cursor_idx" ON "crypto_obligations" USING btree ("user_id","kind","status","id");