import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email').unique(),
  role: text('role').notNull().default('member'),
  status: text('status').notNull().default('pending_consent'),
  sessionVersion: integer('session_version').notNull().default(1),
  ageConfirmedAt: timestamp('age_confirmed_at',{withTimezone:true}),
  ageMinimumAccepted: integer('age_minimum_accepted'),
  locale: text('locale').notNull().default('en'),
  consentVersion: text('consent_version'),
  consentedAt: timestamp('consented_at', { withTimezone: true }),
  referrerUserId: uuid('referrer_user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('users_role_check', sql`${t.role} in ('member','moderator','admin')`),
  check('users_status_check', sql`${t.status} in ('pending_consent','active','suspended','banned','deactivated','deleted')`),
]).enableRLS();

export const userIdentities=pgTable('user_identities',{id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),provider:text('provider').notNull(),subject:text('subject').notNull(),createdAt:createdAt()},t=>[unique().on(t.provider,t.subject)]).enableRLS();
export const authSessions=pgTable('auth_sessions',{
 id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),generation:uuid('generation').notNull().defaultRandom(),sessionVersion:integer('session_version').notNull(),accessHash:text('access_hash').notNull().unique(),csrfHash:text('csrf_hash').notNull(),createdAt:createdAt(),lastSeenAt:timestamp('last_seen_at',{withTimezone:true}).notNull().defaultNow(),accessExpiresAt:timestamp('access_expires_at',{withTimezone:true}).notNull(),idleExpiresAt:timestamp('idle_expires_at',{withTimezone:true}).notNull(),absoluteExpiresAt:timestamp('absolute_expires_at',{withTimezone:true}).notNull(),preAuth:boolean('pre_auth').notNull().default(false),revokedAt:timestamp('revoked_at',{withTimezone:true}),stepUpAt:timestamp('step_up_at',{withTimezone:true}),
},t=>[index('auth_sessions_user_idx').on(t.userId,t.id)]).enableRLS();
export const authRefreshTokens=pgTable('auth_refresh_tokens',{tokenHash:text('token_hash').primaryKey(),sessionId:uuid('session_id').notNull().references(()=>authSessions.id,{onDelete:'restrict'}),createdAt:createdAt(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),usedAt:timestamp('used_at',{withTimezone:true})},t=>[index('auth_refresh_session_idx').on(t.sessionId)]).enableRLS();
export const authFactors=pgTable('auth_factors',{userId:uuid('user_id').primaryKey().references(()=>users.id,{onDelete:'restrict'}),id:uuid('id').notNull().defaultRandom().unique(),secretCipher:text('secret_cipher').notNull(),active:boolean('active').notNull().default(false),createdAt:createdAt(),setupExpiresAt:timestamp('setup_expires_at',{withTimezone:true}).notNull(),lastStep:bigint('last_step',{mode:'bigint'}).notNull().default(sql`-1`)}).enableRLS();
export const authTotpReplays=pgTable('auth_totp_replays',{factorId:uuid('factor_id').notNull().references(()=>authFactors.id,{onDelete:'restrict'}),timeStep:bigint('time_step',{mode:'bigint'}).notNull(),acceptedAt:timestamp('accepted_at',{withTimezone:true}).notNull().defaultNow()},t=>[primaryKey({columns:[t.factorId,t.timeStep]})]).enableRLS();
export const authRecoveryCodes=pgTable('auth_recovery_codes',{id:uuid('id').primaryKey().defaultRandom(),factorId:uuid('factor_id').notNull().references(()=>authFactors.id,{onDelete:'restrict'}),codeHash:text('code_hash').notNull().unique(),createdAt:createdAt(),usedAt:timestamp('used_at',{withTimezone:true})}).enableRLS();
export const authFlows=pgTable('auth_flows',{stateHash:text('state_hash').primaryKey(),nonceHash:text('nonce_hash').notNull(),verifierCipher:text('verifier_cipher').notNull(),createdAt:createdAt(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),usedAt:timestamp('used_at',{withTimezone:true})}).enableRLS();
export const rateLimits=pgTable('rate_limits',{keyHash:text('key_hash').primaryKey(),environment:text('environment').notNull(),windowStart:timestamp('window_start',{withTimezone:true}).notNull(),windowSeconds:integer('window_seconds').notNull(),used:integer('used').notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull()},t=>[index('rate_limit_expiry_idx').on(t.environment,t.expiresAt,t.keyHash)]).enableRLS();

export const referralCodes = pgTable('referral_codes', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  code: uuid('code').notNull().defaultRandom().unique(),
  createdAt: createdAt(),
}).enableRLS();

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  symbol: text('symbol').notNull(),
  environment: text('environment').notNull(),
  chainId: text('chain_id').notNull(),
  decimals: integer('decimals').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [
  unique('assets_symbol_environment_chain_id_unique').on(t.symbol, t.environment, t.chainId),
  check('assets_environment_check', sql`${t.environment} in ('simulation','testnet','mainnet')`),
]).enableRLS();

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  usdReference: numeric('usd_reference', { precision: 18, scale: 2 }).notNull(),
  receiptsRequired: integer('receipts_required').notNull().default(2),
  status: text('status').notNull().default('disabled'),
  bootstrapEnabled: boolean('bootstrap_enabled').notNull().default(true),
  bootstrapCount: integer('bootstrap_count').notNull().default(10),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('plans_status_check', sql`${t.status} in ('disabled','scheduled','active','paused','retired')`)]).enableRLS();

export const planVersions = pgTable('plan_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'restrict' }),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'restrict' }),
  version: integer('version').notNull(),
  amountBaseUnits: numeric('amount_base_units', { precision: 78, scale: 0 }).notNull(),
  usdReference: numeric('usd_reference', { precision: 20, scale: 2 }).notNull(),
  receiverBps: integer('receiver_bps').notNull(),
  marketingBps: integer('marketing_bps').notNull(),
  referralBps: integer('referral_bps').notNull(),
  developerBps: integer('developer_bps').notNull(),
  reserveBps: integer('reserve_bps').notNull(),
  receiptsRequired: integer('receipts_required').notNull(),
  active: boolean('active').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [unique('plan_versions_plan_asset_version_unique').on(t.planId, t.assetId, t.version)]).enableRLS();

export const queuePartitions = pgTable('queue_partitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  planVersionId: uuid('plan_version_id').notNull().unique().references(() => planVersions.id, { onDelete: 'restrict' }),
  nextTicket: bigint('next_ticket', { mode: 'number' }).notNull().default(1),
  nextPriorityTicket: bigint('next_priority_ticket', {mode:'number'}).notNull().default(1),
  revision: bigint('revision', { mode: 'number' }).notNull().default(0),
  createdAt: createdAt(),
},(t) => [check('queue_partition_ticket_bounds',sql`${t.nextTicket} between 1 and 1099511627776 and ${t.nextPriorityTicket} between 1 and 1099511627776`)]).enableRLS();

export const cycles = pgTable('cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  planVersionId: uuid('plan_version_id').notNull().references(() => planVersions.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('active'),
  creditedCount: integer('credited_count').notNull().default(0),
  receiptsRequired: integer('receipts_required').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  index('cycle_user_history_idx').on(t.userId,t.createdAt,t.id),
  check('cycles_status_check', sql`${t.status} in ('active','completed','exception')`),
  uniqueIndex('uniq_active_cycle_per_user_plan').on(t.userId, t.planVersionId).where(sql`${t.status} in ('active','exception')`),
]).enableRLS();

export const queueEntries = pgTable('queue_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  partitionId: uuid('partition_id').notNull().references(() => queuePartitions.id, { onDelete: 'restrict' }),
  ticket: bigint('ticket', { mode: 'number' }).notNull(),
  kind: text('kind').notNull(),
  cycleId: uuid('cycle_id').references(() => cycles.id, { onDelete: 'restrict' }),
  beneficiaryUserId: uuid('beneficiary_user_id').references(() => users.id, { onDelete: 'restrict' }),
  platformRole: text('platform_role'),
  priorityRevision:integer('priority_revision').notNull().default(1),
  priorityTicket: bigint('priority_ticket', { mode: 'number' }),
  requiredCount: integer('required_count').notNull(),
  creditedCount: integer('credited_count').notNull().default(0),
  status: text('status').notNull().default('waiting'),
  createdAt: createdAt(),
}, (t) => [
  unique('queue_entries_partition_ticket_unique').on(t.partitionId, t.ticket),
  index('queue_waiting_order_idx').on(t.partitionId, t.priorityTicket, t.ticket).where(sql`${t.status} = 'waiting'`),
  uniqueIndex('queue_priority_ticket_unique').on(t.partitionId,t.priorityTicket).where(sql`${t.priorityTicket} is not null and ${t.status}='waiting'`),
  uniqueIndex('queue_cycle_entry_unique').on(t.cycleId).where(sql`${t.cycleId} is not null`),
  index('queue_waiting_display_idx').on(t.partitionId,t.ticket).where(sql`${t.status}='waiting'`),
  index('queue_waiting_priority_idx').on(t.partitionId,t.priorityTicket,t.ticket).where(sql`${t.status}='waiting' and ${t.priorityTicket} is not null`),
  index('queue_waiting_fifo_idx').on(t.partitionId,t.ticket).where(sql`${t.status}='waiting' and ${t.priorityTicket} is null`),
  check('queue_entry_ticket_bounds',sql`${t.ticket} between 1 and 1099511627775 and (${t.priorityTicket} is null or ${t.priorityTicket} between 1 and 1099511627775)`),
  check('queue_entries_kind_check', sql`${t.kind} in ('member','bootstrap')`),
  check('queue_entries_status_check', sql`${t.status} in ('waiting','fully_allocated','fulfilled','removed')`),
]).enableRLS();

export const ledgerAccounts = pgTable('ledger_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'restrict' }),
  ownerType: text('owner_type').notNull(),
  ownerId: uuid('owner_id').references(() => users.id, {onDelete:'restrict'}),
  purpose: text('purpose').notNull(),
  normalSide: text('normal_side').notNull(),
  createdAt: createdAt(),
}, (t) => [
  check('ledger_accounts_owner_type_check', sql`${t.ownerType} in ('user','platform','system')`),
  check('ledger_accounts_normal_side_check', sql`${t.normalSide} in ('debit','credit')`),
  uniqueIndex('ledger_accounts_owner_unique').on(t.assetId,t.ownerType,sql`coalesce(${t.ownerId},'00000000-0000-0000-0000-000000000000'::uuid)`,t.purpose),
]).enableRLS();

export const ledgerJournals = pgTable('ledger_journals', {
  id: uuid('id').primaryKey().defaultRandom(),
  ledgerType: text('ledger_type').notNull(),
  businessKey: text('business_key').notNull().unique(),
  createdTxid: bigint('created_txid', { mode:'bigint' }).notNull().default(sql`txid_current()`),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
},(t)=>[index('ledger_business_prefix_idx').on(t.businessKey.asc().op('text_pattern_ops')),uniqueIndex('ledger_giv_uuid_nonce_unique').on(sql`lower(${t.businessKey})`).where(sql`${t.businessKey} ~ '^gift-in:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$|^allocation:gift:[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}:'`)]).enableRLS();

export const ledgerPostings = pgTable('ledger_postings', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalId: uuid('journal_id').notNull().references(() => ledgerJournals.id, { onDelete: 'restrict' }),
  accountId: uuid('account_id').notNull().references(() => ledgerAccounts.id, { onDelete: 'restrict' }),
  direction: text('direction').notNull(),
  amountBaseUnits: numeric('amount_base_units', { precision: 78, scale: 0 }).notNull(),
  createdAt: createdAt(),
}, (t) => [
  check('ledger_postings_direction_check', sql`${t.direction} in ('debit','credit')`),
  check('ledger_postings_amount_positive', sql`${t.amountBaseUnits} > 0`),
]).enableRLS();

export const operationKeys = pgTable('operation_keys', {
  businessKey: text('business_key').primaryKey(),
  requestHash: text('request_hash').notNull(),
  result: jsonb('result').$type<Record<string, unknown> | null>(),
  createdAt: createdAt(),
},(t)=>[uniqueIndex('operation_staff_uuid_nonce_unique').on(sql`lower(${t.businessKey})`).where(sql`${t.businessKey} ~ '^admin-(job-replay|sim-withdrawal|resolve-withdrawal):[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$`),index('operation_key_case_lookup').on(sql`lower(${t.businessKey})`),uniqueIndex('operation_uuid_nonce_unique').on(sql`lower(${t.businessKey})`).where(sql`${t.businessKey} ~ '^(gift|admin-activate):[0-9a-fA-F-]{36}:[0-9a-fA-F-]{36}$`)]).enableRLS();

export const pointEvents = pgTable('point_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  sourceKey: text('source_key').notNull(),
  awardType: text('award_type').notNull(),
  points: integer('points').notNull(),
  createdAt: createdAt(),
}, (t) => [index('point_source_idx').on(t.sourceKey,t.userId),unique('point_events_user_source_award_unique').on(t.userId, t.sourceKey, t.awardType)]).enableRLS();

export const walletLinks = pgTable('wallet_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  environment: text('environment').notNull(),
  chainId: text('chain_id').notNull(),
  address: text('address').notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull().defaultNow(),
  coolingUntil: timestamp('cooling_until', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [unique('wallet_links_user_environment_chain_unique').on(t.userId, t.environment, t.chainId)]).enableRLS();

export const withdrawals = pgTable('withdrawals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'restrict' }),
  grossBaseUnits: numeric('gross_base_units', { precision: 78, scale: 0 }).notNull(),
  feeBaseUnits: numeric('fee_base_units', { precision: 78, scale: 0 }).notNull().default('0'),
  netBaseUnits: numeric('net_base_units', { precision: 78, scale: 0 }).notNull(),
  destination: text('destination').notNull(),
  status: text('status').notNull(),
  quoteExpiresAt: timestamp('quote_expires_at', { withTimezone: true }).notNull(),
  settledAt: timestamp('settled_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  requestKey: text('request_key').notNull().unique(),
  createdAt: createdAt(),
}, (t) => [index('withdrawals_user_history_idx').on(t.userId,t.createdAt,t.id),uniqueIndex('withdrawal_uuid_quote_unique').on(sql`lower(${t.requestKey})`),check('withdrawals_status_check', sql`${t.status} in ('quoted','held','awaiting_requote','approved','sending','settled','cancelled','exception')`)]).enableRLS();

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deliveryKey: text('delivery_key'),
  titleKey: text('title_key').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: createdAt(),
},(t)=>[uniqueIndex('notifications_delivery_key_unique').on(t.deliveryKey)]).enableRLS();

export const helpArticles=pgTable('help_articles',{id:uuid('id').primaryKey().defaultRandom(),locale:text('locale').notNull(),slug:text('slug').notNull(),title:text('title').notNull(),body:text('body').notNull(),published:boolean('published').notNull().default(false),version:integer('version').notNull().default(1),createdAt:createdAt(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),editedBy:uuid('edited_by').references(()=>users.id,{onDelete:'restrict'})},t=>[unique().on(t.locale,t.slug),index('help_public_locale_idx').on(t.locale,t.published,t.slug)]).enableRLS();
export const slugRedirects=pgTable('slug_redirects',{locale:text('locale').notNull(),oldSlug:text('old_slug').notNull(),articleId:uuid('article_id').notNull().references(()=>helpArticles.id,{onDelete:'restrict'}),createdAt:createdAt()},t=>[primaryKey({columns:[t.locale,t.oldSlug]})]).enableRLS();
export const notificationViews=pgTable('notification_views',{userId:uuid('user_id').primaryKey().references(()=>users.id,{onDelete:'cascade'}),seenAt:timestamp('seen_at',{withTimezone:true}).notNull(),seenId:uuid('seen_id').notNull(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow()}).enableRLS();

export const xManifest = pgTable('x_manifest', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  type: text('type').notNull(),
  scope: text('scope').notNull(),
  description: text('description').notNull().default(''),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  deprecatedAt: timestamp('deprecated_at', { withTimezone: true }),
}, (t) => [check('x_manifest_scope_check', sql`${t.scope} in ('public','private','staff')`)]).enableRLS();

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  reason: text('reason'),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: createdAt(),
}).enableRLS();

export const userAccountBalances = pgView('gw_user_account_balances', {
  userId: uuid('user_id'), assetId: uuid('asset_id'), purpose: text('purpose'),
  balance: numeric('balance',{precision:78,scale:0}),
}).existing();
export const environmentInstances = pgTable('environment_instances', {
  environment:text('environment').primaryKey(), instanceId:uuid('instance_id').notNull().unique().defaultRandom(), createdAt:createdAt(),
},(t) => [check('environment_instances_environment_check',sql`${t.environment} in ('simulation','testnet','mainnet')`)]).enableRLS();
export const queueRankNodes = pgTable('queue_rank_nodes', {
  partitionId:uuid('partition_id').notNull().references(()=>queuePartitions.id,{onDelete:'restrict'}),
  lane:text('lane').notNull(), nodeIndex:bigint('node_index',{mode:'bigint'}).notNull(), waitingCount:bigint('waiting_count',{mode:'bigint'}).notNull(),
},(t) => [primaryKey({columns:[t.partitionId,t.lane,t.nodeIndex]}),
  check('queue_rank_nodes_lane_check',sql`${t.lane} in ('display','fifo','priority')`),
  check('queue_rank_nodes_node_index_check',sql`${t.nodeIndex} between 1 and 1099511627776`),
  check('queue_rank_nodes_waiting_count_check',sql`${t.waitingCount} between 0 and 1099511627775`),
]).enableRLS();
export const receiptAllocations = pgTable('receipt_allocations', {
  id:uuid('id').primaryKey().defaultRandom(),
  sourceOperationKey:text('source_operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),
  sourceCycleId:uuid('source_cycle_id').notNull().references(()=>cycles.id,{onDelete:'restrict'}),
  payerUserId:uuid('payer_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
  receiverEntryId:uuid('receiver_entry_id').references(()=>queueEntries.id,{onDelete:'restrict'}),
  beneficiaryUserId:uuid('beneficiary_user_id').references(()=>users.id,{onDelete:'restrict'}),
  receiverKind:text('receiver_kind').notNull(),recipientRole:text('recipient_role'),slotIndex:integer('slot_index'),
  receiverAccountId:uuid('receiver_account_id').notNull().references(()=>ledgerAccounts.id,{onDelete:'restrict'}),
  creditJournalId:uuid('credit_journal_id').notNull().unique().references(()=>ledgerJournals.id,{onDelete:'restrict'}),
  assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),
  environment:text('environment').notNull(),chainId:text('chain_id').notNull(),
  amountBaseUnits:numeric('amount_base_units',{precision:78,scale:0}).notNull(),lineageStatus:text('lineage_status').notNull(),
  creditedAt:timestamp('credited_at',{withTimezone:true}).notNull().defaultNow(),recordedAt:timestamp('recorded_at',{withTimezone:true}).notNull().defaultNow(),
},(t)=>[
  uniqueIndex('receipt_receiver_slot_unique').on(t.receiverEntryId,t.slotIndex).where(sql`${t.slotIndex} is not null`),
  uniqueIndex('receipt_source_cycle_unique').on(t.sourceCycleId),
  index('receipt_beneficiary_history_idx').on(t.beneficiaryUserId,t.creditedAt,t.id),
  check('receipt_allocations_receiver_kind_check',sql`${t.receiverKind} in ('member','bootstrap','empty_queue_business')`),
  check('receipt_allocations_environment_check',sql`${t.environment} in ('simulation','testnet','mainnet')`),
  check('receipt_allocations_amount_base_units_check',sql`${t.amountBaseUnits}>0`),
  check('receipt_allocations_lineage_status_check',sql`${t.lineageStatus} in ('captured','legacy_linked')`),
  check('receipt_slot_shape',sql`(${t.receiverKind}='empty_queue_business' and ${t.receiverEntryId} is null and ${t.slotIndex} is null) or (${t.receiverKind} in ('member','bootstrap') and ${t.receiverEntryId} is not null and ((${t.lineageStatus}='captured' and ${t.slotIndex} is not null and ${t.slotIndex}>0) or (${t.lineageStatus}='legacy_linked' and ${t.slotIndex} is null)))`),
  check('receipt_beneficiary_shape',sql`(${t.receiverKind}='member' and ${t.beneficiaryUserId} is not null and ${t.beneficiaryUserId}<>${t.payerUserId} and ${t.recipientRole} is null) or (${t.receiverKind} in ('bootstrap','empty_queue_business') and ${t.beneficiaryUserId} is null and ${t.recipientRole} is not null and ${t.recipientRole} in ('developer','marketing','platform','custom_bootstrap'))`),
]).enableRLS();
export const queuePositions = pgView('gw_queue_positions', {
  entryId: uuid('entry_id'), displayPosition: bigint('display_position',{mode:'number'}),
}).existing();
export const simulationAccounts = pgView('gw_sim_accounts', {
  id: uuid('id'), username: text('username'), role: text('role'), status: text('status'), locale: text('locale'),
}).existing();

export const outbox = pgTable('outbox', {
  id:uuid('id').primaryKey().defaultRandom(),businessKey:text('business_key').notNull().unique(),
  environment:text('environment').notNull(),kind:text('kind').notNull(),payload:jsonb('payload').notNull(),
  dispatchedAt:timestamp('dispatched_at',{withTimezone:true}),createdAt:createdAt(),
},(t)=>[check('outbox_environment_check',sql`${t.environment} in ('simulation','testnet','mainnet')`),check('outbox_kind_check',sql`${t.kind} in ('notification','financial_reconciliation','operational_cleanup')`),check('outbox_payload_check',sql`jsonb_typeof(${t.payload})='object' and octet_length(${t.payload}::text)<=8192`),index('outbox_pending_idx').on(t.environment,t.createdAt,t.id).where(sql`${t.dispatchedAt} is null`)]).enableRLS();
export const jobs = pgTable('jobs', {
  id:uuid('id').primaryKey().defaultRandom(),outboxId:uuid('outbox_id').notNull().unique().references(()=>outbox.id,{onDelete:'restrict'}),
  businessKey:text('business_key').notNull().unique(),environment:text('environment').notNull(),kind:text('kind').notNull(),payload:jsonb('payload').notNull(),
  status:text('status').notNull().default('pending'),attempts:integer('attempts').notNull().default(0),retryLimit:integer('retry_limit').notNull(),
  dueAt:timestamp('due_at',{withTimezone:true}).notNull().defaultNow(),leaseGeneration:integer('lease_generation').notNull().default(0),leaseToken:uuid('lease_token'),leaseUntil:timestamp('lease_until',{withTimezone:true}),
  lastErrorCode:text('last_error_code'),completedAt:timestamp('completed_at',{withTimezone:true}),createdAt:createdAt(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
},(t)=>[check('jobs_environment_check',sql`${t.environment} in ('simulation','testnet','mainnet')`),check('jobs_kind_check',sql`${t.kind} in ('notification','financial_reconciliation','operational_cleanup')`),check('jobs_payload_check',sql`jsonb_typeof(${t.payload})='object' and octet_length(${t.payload}::text)<=8192`),check('jobs_status_check',sql`${t.status} in ('pending','running','done','retry_wait','dead_letter')`),check('jobs_attempts_check',sql`${t.attempts}>=0`),check('jobs_retry_limit_check',sql`${t.retryLimit} between 1 and 1000000`),check('jobs_lease_generation_check',sql`${t.leaseGeneration} between 0 and 1000000`),check('jobs_last_error_code_check',sql`${t.lastErrorCode} in ('TRANSIENT_FAILURE','INVALID_JOB','LEASE_EXPIRED','PERMANENT_FAILURE')`),index('jobs_due_idx').on(t.environment,t.status,t.dueAt,t.id),index('jobs_expired_lease_idx').on(t.environment,t.leaseUntil,t.id).where(sql`${t.status}='running'`),
  check('jobs_lease_shape',sql`(${t.status}='running' and ${t.leaseToken} is not null and ${t.leaseUntil} is not null) or (${t.status}<>'running' and ${t.leaseToken} is null and ${t.leaseUntil} is null)`),
  check('jobs_completion_shape',sql`(${t.status} in ('done','dead_letter') and ${t.completedAt} is not null) or (${t.status} not in ('done','dead_letter') and ${t.completedAt} is null)`),
]).enableRLS();
export const schedulerNonces = pgTable('scheduler_nonces', {
  id:uuid('id').primaryKey().defaultRandom(),environment:text('environment').notNull(),nonce:uuid('nonce').notNull(),
  expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:createdAt(),
},(t)=>[check('scheduler_nonces_environment_check',sql`${t.environment} in ('simulation','testnet','mainnet')`),unique('scheduler_nonces_environment_nonce_key').on(t.environment,t.nonce),index('scheduler_nonce_expiry_idx').on(t.expiresAt,t.id),index('scheduler_nonce_environment_expiry_idx').on(t.environment,t.expiresAt,t.id)]).enableRLS();
export const schedulerRuns = pgTable('scheduler_runs', {
  id:uuid('id').primaryKey().defaultRandom(),environment:text('environment').notNull(),runKey:text('run_key').notNull(),
  leaseGeneration:integer('lease_generation').notNull().default(1),leaseToken:uuid('lease_token').notNull(),leaseUntil:timestamp('lease_until',{withTimezone:true}).notNull(),
  completedAt:timestamp('completed_at',{withTimezone:true}),createdAt:createdAt(),
},(t)=>[check('scheduler_runs_environment_check',sql`${t.environment} in ('simulation','testnet','mainnet')`),check('scheduler_runs_lease_generation_check',sql`${t.leaseGeneration} between 1 and 1000000`),unique('scheduler_runs_environment_run_key_key').on(t.environment,t.runKey),index('scheduler_runs_lease_idx').on(t.environment,t.leaseUntil,t.id).where(sql`${t.completedAt} is null`),index('scheduler_runs_completed_idx').on(t.environment,t.completedAt,t.id).where(sql`${t.completedAt} is not null`)]).enableRLS();

export const maintenanceResults=pgTable('maintenance_results',{
  id:uuid('id').primaryKey().defaultRandom(),sourceJobId:uuid('source_job_id').notNull().unique().references(()=>jobs.id,{onDelete:'restrict'}),
  environment:text('environment').notNull(),runDate:date('run_date').notNull(),pageNumber:integer('page_number').notNull(),leaseGeneration:integer('lease_generation').notNull(),
  noncesDeleted:integer('nonces_deleted').notNull(),runsDeleted:integer('runs_deleted').notNull(),batchLimit:integer('batch_limit').notNull(),
  held:boolean('held').notNull(),morePossible:boolean('more_possible').notNull(),checkedAt:timestamp('checked_at',{withTimezone:true}).notNull().default(sql`clock_timestamp()`),
},t=>[index('maintenance_history_idx').on(t.environment,t.checkedAt,t.id),check('maintenance_results_environment_check',sql`${t.environment} in ('simulation','testnet','mainnet')`),check('maintenance_results_page_number_check',sql`${t.pageNumber} between 0 and 1000000`),
  check('maintenance_results_lease_generation_check',sql`${t.leaseGeneration} between 1 and 1000000`),check('maintenance_results_nonces_deleted_check',sql`${t.noncesDeleted} between 0 and 100`),
  check('maintenance_results_runs_deleted_check',sql`${t.runsDeleted} between 0 and 100`),check('maintenance_results_batch_limit_check',sql`${t.batchLimit} between 1 and 100`),
  check('maintenance_result_bounds',sql`${t.noncesDeleted}<=${t.batchLimit} and ${t.runsDeleted}<=${t.batchLimit} and (not ${t.held} or (${t.noncesDeleted}=0 and ${t.runsDeleted}=0 and not ${t.morePossible}))`),
]).enableRLS();

export const simulationWithdrawalControls=pgTable('simulation_withdrawal_controls',{
  id:uuid('id').primaryKey().defaultRandom(),withdrawalId:uuid('withdrawal_id').notNull().unique().references(()=>withdrawals.id,{onDelete:'restrict'}),
  environment:text('environment').notNull().default('simulation'),outcome:text('outcome').notNull(),actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
  operationKey:text('operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),reason:text('reason').notNull(),createdAt:createdAt(),
},(t)=>[check('simulation_withdrawal_controls_environment_check',sql`${t.environment}='simulation'`),check('simulation_withdrawal_controls_outcome_check',sql`${t.outcome} in ('hold','reject')`),check('simulation_withdrawal_controls_reason_check',sql`length(${t.reason}) between 5 and 500`)]).enableRLS();

export const financialReconciliationResults=pgTable('financial_reconciliation_results',{
  id:uuid('id').primaryKey().defaultRandom(),sourceJobId:uuid('source_job_id').notNull().unique().references(()=>jobs.id,{onDelete:'restrict'}),
  environment:text('environment').notNull(),runDate:date('run_date').notNull(),balanced:boolean('balanced').notNull(),consistent:boolean('consistent').notNull(),lineageComplete:boolean('lineage_complete').notNull(),
  result:jsonb('result').notNull(),snapshotStartedAt:timestamp('snapshot_started_at',{withTimezone:true}).notNull().defaultNow(),checkedAt:timestamp('checked_at',{withTimezone:true}).notNull().default(sql`clock_timestamp()`),
},(t)=>[index('reconciliation_history_idx').on(t.environment,t.checkedAt,t.id),check('financial_reconciliation_results_environment_check',sql`${t.environment} in ('simulation','testnet','mainnet')`),check('financial_reconciliation_results_result_check',sql`jsonb_typeof(${t.result})='object' and octet_length(${t.result}::text)<=131072`)]).enableRLS();

export const deploymentBindingChallenges=pgTable('deployment_binding_challenges',{
  id:uuid('id').primaryKey(),environment:text('environment').notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:createdAt(),
},(t)=>[check('deployment_binding_challenges_environment_check',sql`${t.environment} in ('simulation','testnet','mainnet')`),index('binding_challenge_expiry_idx').on(t.expiresAt,t.id)]).enableRLS();

export const giftInvoices=pgTable('gift_invoices',{
  id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
  planVersionId:uuid('plan_version_id').notNull().references(()=>planVersions.id,{onDelete:'restrict'}),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),
  environment:text('environment').notNull().default('simulation'),chainId:text('chain_id').notNull().default('giv'),requestKey:uuid('request_key').notNull(),
  expectedBaseUnits:numeric('expected_base_units',{precision:78,scale:0}).notNull(),actualBaseUnits:numeric('actual_base_units',{precision:78,scale:0}),
  refundableBaseUnits:numeric('refundable_base_units',{precision:78,scale:0}).notNull().default('0'),status:text('status').notNull().default('quoted'),
  quoteExpiresAt:timestamp('quote_expires_at',{withTimezone:true}).notNull(),submittedAt:timestamp('submitted_at',{withTimezone:true}),createdAt:createdAt(),
},t=>[unique('gift_invoice_request_key').on(t.userId,t.requestKey),uniqueIndex('gift_invoice_open_unique').on(t.userId,t.planVersionId).where(sql`${t.status} in ('quoted','submitted')`),index('gift_invoice_history_idx').on(t.userId,t.createdAt,t.id),check('gift_invoice_environment_check',sql`${t.environment}='simulation' and ${t.chainId}='giv'`),check('gift_invoice_amount_check',sql`${t.expectedBaseUnits}>0 and ${t.actualBaseUnits}>=0 and ${t.refundableBaseUnits}>=0`),check('gift_invoice_status_check',sql`${t.status} in ('quoted','submitted','credited','exception','failed','expired')`)]).enableRLS();
export const simulationIncomingControls=pgTable('simulation_incoming_controls',{
  id:uuid('id').primaryKey().defaultRandom(),invoiceId:uuid('invoice_id').notNull().unique().references(()=>giftInvoices.id,{onDelete:'restrict'}),
  environment:text('environment').notNull().default('simulation'),outcome:text('outcome').notNull(),actualBaseUnits:numeric('actual_base_units',{precision:78,scale:0}).notNull(),
  actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),operationKey:text('operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),reason:text('reason').notNull(),createdAt:createdAt(),
},t=>[check('incoming_control_environment_check',sql`${t.environment}='simulation'`),check('incoming_control_outcome_check',sql`${t.outcome} in ('reject','under','over','late','delay')`),check('incoming_control_amount_check',sql`${t.actualBaseUnits}>=0`),check('incoming_control_reason_check',sql`length(${t.reason}) between 5 and 500`)]).enableRLS();
export const simulationIncomingEvents=pgTable('simulation_incoming_events',{
  id:uuid('id').primaryKey().defaultRandom(),invoiceId:uuid('invoice_id').notNull().unique().references(()=>giftInvoices.id,{onDelete:'restrict'}),
  environment:text('environment').notNull().default('simulation'),outcome:text('outcome').notNull(),giftOperationKey:text('gift_operation_key').unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),
  holdJournalId:uuid('hold_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}),acceptJournalId:uuid('accept_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}),refundJournalId:uuid('refund_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}),
  createdAt:createdAt(),
},t=>[check('incoming_event_environment_check',sql`${t.environment}='simulation'`),check('incoming_event_outcome_check',sql`${t.outcome} in ('exact','reject','under','over','late','review_reject')`)]).enableRLS();
export const simulationIncomingRefunds=pgTable('simulation_incoming_refunds',{
  id:uuid('id').primaryKey().defaultRandom(),invoiceId:uuid('invoice_id').notNull().unique().references(()=>giftInvoices.id,{onDelete:'restrict'}),environment:text('environment').notNull().default('simulation'),
  actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),operationKey:text('operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),
  journalId:uuid('journal_id').notNull().unique().references(()=>ledgerJournals.id,{onDelete:'restrict'}),amountBaseUnits:numeric('amount_base_units',{precision:78,scale:0}).notNull(),reason:text('reason').notNull(),createdAt:createdAt(),
},t=>[check('incoming_refund_environment_check',sql`${t.environment}='simulation'`),check('incoming_refund_amount_check',sql`${t.amountBaseUnits}>0`),check('incoming_refund_reason_check',sql`length(${t.reason}) between 5 and 500`)]).enableRLS();

export const simulationReorgReviews=pgTable('simulation_reorg_reviews',{
 id:uuid('id').primaryKey(),sourceAllocationId:uuid('source_allocation_id').notNull().references(()=>receiptAllocations.id,{onDelete:'restrict'}),
 sourceOperationKey:text('source_operation_key').notNull().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),revision:integer('revision').notNull(),
 sourceCycleId:uuid('source_cycle_id').notNull().references(()=>cycles.id,{onDelete:'restrict'}),sourceTicket:bigint('source_ticket',{mode:'number'}).notNull(),
 partitionId:uuid('partition_id').notNull().references(()=>queuePartitions.id,{onDelete:'restrict'}),receiverEntryId:uuid('receiver_entry_id').references(()=>queueEntries.id,{onDelete:'restrict'}),
 assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),payerUserId:uuid('payer_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
 affectedUserIds:uuid('affected_user_ids').array().notNull(),environment:text('environment').notNull().default('simulation'),amountBaseUnits:numeric('amount_base_units',{precision:78,scale:0}).notNull(),
 settledOutgoingExposure:numeric('settled_outgoing_exposure',{precision:78,scale:0}).notNull().default('0'),lossJournalId:uuid('loss_journal_id').notNull().unique().references(()=>ledgerJournals.id,{onDelete:'restrict'}),
 actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),operationKey:text('operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),reason:text('reason').notNull(),createdAt:createdAt(),
},t=>[unique('reorg_source_revision_unique').on(t.sourceAllocationId,t.revision),index('reorg_source_operation_idx').on(t.sourceOperationKey),index('reorg_partition_idx').on(t.partitionId,t.createdAt,t.id),index('reorg_affected_users_idx').using('gin',t.affectedUserIds),check('reorg_environment_check',sql`${t.environment}='simulation'`),check('reorg_amount_check',sql`${t.amountBaseUnits}>0 and ${t.settledOutgoingExposure}>=0`),check('reorg_revision_check',sql`${t.revision} between 1 and 1000000`),check('reorg_users_check',sql`cardinality(${t.affectedUserIds}) between 1 and 3`),check('reorg_reason_check',sql`length(${t.reason}) between 5 and 500`)]).enableRLS();
export const simulationReorgResolutions=pgTable('simulation_reorg_resolutions',{
 id:uuid('id').primaryKey().defaultRandom(),reviewId:uuid('review_id').notNull().unique().references(()=>simulationReorgReviews.id,{onDelete:'restrict'}),environment:text('environment').notNull().default('simulation'),
 journalId:uuid('journal_id').notNull().unique().references(()=>ledgerJournals.id,{onDelete:'restrict'}),actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
 operationKey:text('operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),reason:text('reason').notNull(),createdAt:createdAt(),
},t=>[check('reorg_resolution_environment_check',sql`${t.environment}='simulation'`),check('reorg_resolution_reason_check',sql`length(${t.reason}) between 5 and 500`)]).enableRLS();
export const userFinancialReviews=pgView('gw_user_financial_reviews',{
 userId:uuid('user_id').notNull(),assetId:uuid('asset_id').notNull(),reviewCount:integer('review_count').notNull(),
}).existing();
export const cycleFinancialReviews=pgView('gw_cycle_financial_reviews',{
 cycleId:uuid('cycle_id').notNull(),underReview:boolean('under_review').notNull(),invalidCreditCount:integer('invalid_credit_count').notNull(),queuePaused:boolean('queue_paused').notNull(),
}).existing();

export const schema = {
 userIdentities,authSessions,authRefreshTokens,authFactors,authTotpReplays,authRecoveryCodes,authFlows,rateLimits,
  maintenanceResults,
  simulationReorgReviews,simulationReorgResolutions,userFinancialReviews,cycleFinancialReviews,
  giftInvoices,simulationIncomingControls,simulationIncomingEvents,simulationIncomingRefunds,
  deploymentBindingChallenges,
  financialReconciliationResults,
  simulationWithdrawalControls,
  outbox,jobs,schedulerNonces,schedulerRuns,
  environmentInstances,
  queueRankNodes,
  receiptAllocations,
  userAccountBalances, queuePositions, simulationAccounts,
  users,
  referralCodes,
  assets,
  plans,
  planVersions,
  queuePartitions,
  cycles,
  queueEntries,
  ledgerAccounts,
  ledgerJournals,
  ledgerPostings,
  operationKeys,
  pointEvents,
  walletLinks,
  withdrawals,
  notifications,
  notificationViews,helpArticles,slugRedirects,
  xManifest,
  auditEvents,
};
