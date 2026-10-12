import { z } from 'zod';

const count = z.number().int().nonnegative().max(1_000_000);
const positive = z.number().int().positive().max(1_000_000);
const text = z.string().min(1).max(5000);
const localized = z.object({ en: text, fr: text }).strict();
const money = z.number().finite().positive().refine((value) => /^[0-9]+(\.[0-9]{1,2})?$/.test(String(value)), 'Money configuration requires an exact decimal with at most two places');
const zone = z.string().max(100).refine((value) => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
});
const rate = z.object({ allowance: positive, window_seconds: positive, key: z.enum(['ip_route','session','user_route','user_asset_route','factor_ip_route','admin_route']), failure_policy: z.enum(['closed','cached_public_only']), disableable: z.literal(false) }).strict();
export const rateFamilies = ['auth','mfa','consent','invoice','payment_proof','wallet','withdrawal','business_settlement','notifications','reports','own_data','staff','import_reset','mutation','reads'] as const;

// Closed schemas mirror the Phase One inventory. Declaring a future policy does
// not implement its adapter or authorize a live integration.
export const policyFields = {
  terms_content: z.object({ version: z.string().min(1).max(100), body: localized }).strict(),
  admin_timezone: zone,
  entitlements_member: z.object({ dashboard:z.boolean(), history:z.boolean(), wallet_link:z.boolean(), send_enabled_gifts:z.boolean(), receive_own_cycles:z.boolean() }).strict(),
  plan_templates: z.array(z.object({ name:z.string().regex(/^[A-Za-z][A-Za-z ]{1,39}$/), price_usd:money, receipts_required:positive }).strict()).length(12).refine((rows) => new Set(rows.map((r) => r.name.toLowerCase())).size === rows.length),
  quote_ttl_minutes: positive,
  price_max_age_minutes: positive,
  native_price_display_decimals: count.max(18),
  fiat_display_decimals: count.max(8),
  wallet_change_cooloff_hours: count,
  wallet_reminder_hours: count,
  empty_queue_policy: z.object({ mode:z.enum(['business_credit','block_checkout']), destination_role:z.enum(['developer','marketing']) }).strict(),
  payout_limits: z.object({ auto_approve_usd:money, signer_per_tx_usd:money, daily_per_asset_usd:money, batch_size:positive.max(1000), interval_minutes:positive }).strict(),
  withdrawal_fee_policy: z.object({ quote_ttl_minutes:positive, max_rate_age_minutes:positive, platform_variance_pct:count.max(25), failure_fee_mode:z.literal('actual_up_to_approved_quote'), fixed_minimum:z.literal(0) }).strict(),
  business_settlement_policy: z.object({ manual_enabled:z.boolean(), daily_enabled:z.boolean(), daily_anchor:z.literal('utc_midnight'), fee_payer:z.literal('platform_reserve') }).strict(),
  bootstrap_destination_role: z.enum(['developer','marketing','platform','custom_bootstrap']),
  crypto_monitor_policy: z.object({ first_poll_seconds:positive, later_poll_seconds:positive, active_poll_minutes:positive, exception_age_hours:positive, stuck_blocks:positive, replacement_attempts:count, rpc_rps:positive, rpc_timeout_ms:positive }).strict(),
  points_rules: z.object({ signup:count, usd_threshold:money, sender_low:count, sender_high:count, referrer_low:count, referrer_high:count }).strict(),
  points_daily_cap: count,
  public_stats_policy: z.object({ enabled:z.boolean(), refresh_hours:positive, include_system:z.literal(false) }).strict(),
  activity_policy: z.object({ source:z.literal('fixtures'), max_records:positive.max(50) }).strict(),
  captcha_surfaces: z.object({ consent:z.boolean(), suspicious_checkout:z.boolean() }).strict(),
  rate_policies: z.object(Object.fromEntries(rateFamilies.map((key) => [key,rate])) as Record<typeof rateFamilies[number], typeof rate>).strict(),
  report_dedupe_hours: positive,
  moderator_permissions: z.object({ review:z.boolean(), suspend:z.boolean(), restore_suspension:z.boolean(), ban:z.literal(false), delete:z.literal(false), finance:z.literal(false), bulk_export:z.literal(false) }).strict(),
  identity_policy:z.object({username_min:positive.max(64),username_max:positive.max(64),collision_attempts:positive.max(100),reserved:z.array(z.string().regex(/^[a-z0-9_]{1,64}$/)).max(200),blocked_words:z.array(z.string().min(1).max(64)).max(200)}).strict().refine(v=>v.username_min<=v.username_max),
  auth_session_policy: z.object({ access_minutes:positive, absolute_days:positive, idle_days:positive, preauth_minutes:positive.max(5), totp_step_seconds:z.literal(30), totp_window_steps:count.max(1), replay_retention_seconds:positive.min(90) }).strict(),
  staff_reauth_minutes: positive,
  pending_consent_retention_days: count,
  job_policy: z.object({ max_attempts:positive.max(20), base_delay_seconds:positive, max_delay_seconds:positive, jitter_fraction:z.number().min(0).max(1), lease_seconds:positive, chunk_size:positive.max(1000) }).strict(),
  scheduler_auth_policy: z.object({ max_clock_skew_seconds:positive.max(300), replay_ttl_seconds:positive.min(600) }).strict(),
  worker_shutdown_seconds: positive,
  health_timeout_ms: positive.max(10_000),
  cache_policy: z.object({ manifest_server_seconds:positive, manifest_public_seconds:positive, catalog_seconds:positive, identity_seconds:positive, private_snapshot_seconds:positive, client_poll_seconds:positive, max_memory_entries:positive, max_memory_mb:positive.max(100), max_public_help_mb:positive.max(100) }).strict(),
  retention_policy: z.object({ financial_archive_after_days:positive, financial_keep_years:positive, audit_hot_days:positive, job_terminal_days:positive, http_replay_days:positive, export_hours:positive, notification_days:positive }).strict(),
  backup_policy: z.object({ interval_hours:positive, keep_days:positive, restore_check_days:positive, rpo_hours:positive, rto_hours:positive }).strict(),
  alert_policy: z.object({ backlog:positive, dlq:positive, signer_stale_minutes:positive, lock_wait_ms:positive, quota_warning_fraction:z.number().gt(0).lte(1), public_rpc_minutes:positive, remind_minutes:z.array(positive).min(1).max(10), daily_limit:positive }).strict(),
  export_import_limits: z.object({ upload_mb:positive.max(50), chunk_rows:positive.max(1000), max_message_chars:positive.max(5000), max_provider_metadata_kb:positive.max(16) }).strict(),
  api_deprecation_days: positive,
};

export const privatePolicyKeys = new Set(['price_max_age_minutes','crypto_monitor_policy','points_daily_cap','activity_policy','rate_policies','report_dedupe_hours','auth_session_policy','pending_consent_retention_days','job_policy','scheduler_auth_policy','worker_shutdown_seconds','health_timeout_ms']);
export const staffPolicyKeys = new Set(['identity_policy','admin_timezone','plan_templates','empty_queue_policy','payout_limits','business_settlement_policy','bootstrap_destination_role','moderator_permissions','staff_reauth_minutes','retention_policy','backup_policy','alert_policy','simulation_policy','export_import_limits']);

export const planConfigSchema = z.object({ status:z.enum(['disabled','scheduled','active','paused','retired']), price_usd:money.or(z.string().regex(/^[0-9]+(\.[0-9]{1,2})?$/).refine((v) => BigInt(v.replace('.','')) > 0n)), pricing_mode:z.enum(['usd_at_activation','fixed_token']), amount_base_units:z.string().regex(/^[1-9][0-9]{0,77}$/).optional(), receipts_required:positive, icon:z.string().min(1).max(100), launch_at:z.string().datetime().optional(), countdown:z.boolean(), countdown_lead_days:count, bootstrap_enabled:z.boolean(), bootstrap_count:count.max(1000) }).strict();
export const assetConfigSchema = z.object({ enabled:z.boolean(), environment:z.enum(['simulation','testnet','mainnet']), chain_id:z.string().min(1).max(100), kind:z.enum(['native','token','internal']), contract:z.string().min(1).max(200).optional(), mint:z.string().min(1).max(200).optional(), decimals:count.max(78), display_unit:z.enum(['usd','asset']), confirmation_policy:z.object({ mode:z.enum(['transactional','finalized','solidified','depth']), depth:positive.optional() }).strict() }).strict();
export const cryptoRiskSchema = z.object({ hot_wallet_cap_usd:money, gas_low_usd:money, reorg_buffer_blocks:count, dust_base_units:z.string().regex(/^(0|[1-9][0-9]{0,77})$/) }).strict();
