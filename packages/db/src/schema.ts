import {contractChecks,contractIndexes} from './schema-contracts';
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
  accountRevision:integer('account_revision').notNull().default(1),
  suspensionPreviousStatus:text('suspension_previous_status'),
  suspensionUntil:timestamp('suspension_until',{withTimezone:true}),
  sessionVersion: integer('session_version').notNull().default(1),
  ageConfirmedAt: timestamp('age_confirmed_at',{withTimezone:true}),
  ageMinimumAccepted: integer('age_minimum_accepted'),
  locale: text('locale').notNull().default('en'),
  consentVersion: text('consent_version'),
  consentedAt: timestamp('consented_at', { withTimezone: true }),
  referrerUserId: uuid('referrer_user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [...contractChecks("users"),...contractIndexes("users")]).enableRLS();

export const userIdentities=pgTable('user_identities',{id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),provider:text('provider').notNull(),subject:text('subject').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("user_identities"),...contractIndexes("user_identities"),unique().on(t.provider,t.subject)]).enableRLS();
export const authSessions=pgTable('auth_sessions',{
 id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),generation:uuid('generation').notNull().defaultRandom(),sessionVersion:integer('session_version').notNull(),accessHash:text('access_hash').notNull().unique(),csrfHash:text('csrf_hash').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()")),lastSeenAt:timestamp('last_seen_at',{withTimezone:true}).notNull().default(sql.raw("clock_timestamp()")),accessExpiresAt:timestamp('access_expires_at',{withTimezone:true}).notNull(),idleExpiresAt:timestamp('idle_expires_at',{withTimezone:true}).notNull(),absoluteExpiresAt:timestamp('absolute_expires_at',{withTimezone:true}).notNull(),preAuth:boolean('pre_auth').notNull().default(false),revokedAt:timestamp('revoked_at',{withTimezone:true}),stepUpAt:timestamp('step_up_at',{withTimezone:true}),
},t=>[...contractChecks("auth_sessions"),...contractIndexes("auth_sessions")]).enableRLS();
export const authRefreshTokens=pgTable('auth_refresh_tokens',{tokenHash:text('token_hash').primaryKey(),sessionId:uuid('session_id').notNull().references(()=>authSessions.id,{onDelete:'restrict'}),createdAt:createdAt().default(sql.raw("clock_timestamp()")),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),usedAt:timestamp('used_at',{withTimezone:true})},t=>[...contractChecks("auth_refresh_tokens"),...contractIndexes("auth_refresh_tokens")]).enableRLS();
export const authFactors=pgTable('auth_factors',{userId:uuid('user_id').primaryKey().references(()=>users.id,{onDelete:'restrict'}),id:uuid('id').notNull().defaultRandom().unique(),secretCipher:text('secret_cipher').notNull(),active:boolean('active').notNull().default(false),createdAt:createdAt().default(sql.raw("clock_timestamp()")),setupExpiresAt:timestamp('setup_expires_at',{withTimezone:true}).notNull(),lastStep:bigint('last_step',{mode:'bigint'}).notNull().default(sql`-1`)},t=>[...contractChecks("auth_factors"),...contractIndexes("auth_factors")]).enableRLS();
export const authTotpReplays=pgTable('auth_totp_replays',{factorId:uuid('factor_id').notNull().references(()=>authFactors.id,{onDelete:'restrict'}),timeStep:bigint('time_step',{mode:'bigint'}).notNull(),acceptedAt:timestamp('accepted_at',{withTimezone:true}).notNull().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("auth_totp_replays"),...contractIndexes("auth_totp_replays"),primaryKey({columns:[t.factorId,t.timeStep]})]).enableRLS();
export const authRecoveryCodes=pgTable('auth_recovery_codes',{id:uuid('id').primaryKey().defaultRandom(),factorId:uuid('factor_id').notNull().references(()=>authFactors.id,{onDelete:'restrict'}),codeHash:text('code_hash').notNull().unique(),createdAt:createdAt().default(sql.raw("clock_timestamp()")),usedAt:timestamp('used_at',{withTimezone:true})},t=>[...contractChecks("auth_recovery_codes"),...contractIndexes("auth_recovery_codes")]).enableRLS();
export const authFlows=pgTable('auth_flows',{stateHash:text('state_hash').primaryKey(),nonceHash:text('nonce_hash').notNull(),verifierCipher:text('verifier_cipher').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()")),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),usedAt:timestamp('used_at',{withTimezone:true})},t=>[...contractChecks("auth_flows"),...contractIndexes("auth_flows")]).enableRLS();
export const rateLimits=pgTable('rate_limits',{keyHash:text('key_hash').primaryKey(),environment:text('environment').notNull(),windowStart:timestamp('window_start',{withTimezone:true}).notNull(),windowSeconds:integer('window_seconds').notNull(),used:integer('used').notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull()},t=>[...contractChecks("rate_limits"),...contractIndexes("rate_limits")]).enableRLS();

export const referralCodes = pgTable('referral_codes', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  code: uuid('code').notNull().defaultRandom().unique(),
  createdAt: createdAt(),
},t=>[...contractChecks("referral_codes"),...contractIndexes("referral_codes")]).enableRLS();

export const assets = pgTable('assets', {
  registryBinding:jsonb('registry_binding'),
  id: uuid('id').primaryKey().defaultRandom(),
  symbol: text('symbol').notNull(),
  environment: text('environment').notNull(),
  chainId: text('chain_id').notNull(),
  decimals: integer('decimals').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  createdAt: createdAt(),
}, (t) => [...contractChecks("assets"),...contractIndexes("assets"),unique('assets_symbol_environment_chain_id_unique').on(t.symbol, t.environment, t.chainId)]).enableRLS();

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  usdReference: numeric('usd_reference', { precision: 18, scale: 2 }).notNull(),
  receiptsRequired: integer('receipts_required').notNull().default(2),
  status: text('status').notNull().default('disabled'),
  revision:integer('revision').notNull().default(1),
  bootstrapEnabled: boolean('bootstrap_enabled').notNull().default(true),
  bootstrapCount: integer('bootstrap_count').notNull().default(10),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [...contractChecks("plans"),...contractIndexes("plans")]).enableRLS();

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
}, (t) => [...contractChecks("plan_versions"),...contractIndexes("plan_versions"),unique('plan_versions_plan_asset_version_unique').on(t.planId, t.assetId, t.version)]).enableRLS();

export const queuePartitions = pgTable('queue_partitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  planVersionId: uuid('plan_version_id').notNull().unique().references(() => planVersions.id, { onDelete: 'restrict' }),
  nextTicket: bigint('next_ticket', { mode: 'number' }).notNull().default(1),
  nextPriorityTicket: bigint('next_priority_ticket', {mode:'number'}).notNull().default(1),
  revision: bigint('revision', { mode: 'number' }).notNull().default(0),
  createdAt: createdAt(),
},(t) => [...contractChecks("queue_partitions"),...contractIndexes("queue_partitions")]).enableRLS();

export const cycles = pgTable('cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  planVersionId: uuid('plan_version_id').notNull().references(() => planVersions.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('active'),
  creditedCount: integer('credited_count').notNull().default(0),
  receiptsRequired: integer('receipts_required').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [...contractChecks("cycles"),...contractIndexes("cycles")]).enableRLS();

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
}, (t) => [...contractChecks("queue_entries"),...contractIndexes("queue_entries"),unique('queue_entries_partition_ticket_unique').on(t.partitionId, t.ticket)]).enableRLS();

export const ledgerAccounts = pgTable('ledger_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'restrict' }),
  ownerType: text('owner_type').notNull(),
  ownerId: uuid('owner_id').references(() => users.id, {onDelete:'restrict'}),
  purpose: text('purpose').notNull(),
  normalSide: text('normal_side').notNull(),
  createdAt: createdAt(),
}, (t) => [...contractChecks("ledger_accounts"),...contractIndexes("ledger_accounts"),unique("ledger_accounts_asset_id_owner_type_owner_id_purpose_key").on(t.assetId,t.ownerType,t.ownerId,t.purpose)]).enableRLS();

export const ledgerJournals = pgTable('ledger_journals', {
  id: uuid('id').primaryKey().defaultRandom(),
  ledgerType: text('ledger_type').notNull(),
  businessKey: text('business_key').notNull().unique(),
  createdTxid: bigint('created_txid', { mode:'bigint' }).notNull().default(sql`txid_current()`),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
},(t)=>[...contractChecks("ledger_journals"),...contractIndexes("ledger_journals")]).enableRLS();

export const ledgerPostings = pgTable('ledger_postings', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalId: uuid('journal_id').notNull().references(() => ledgerJournals.id, { onDelete: 'restrict' }),
  accountId: uuid('account_id').notNull().references(() => ledgerAccounts.id, { onDelete: 'restrict' }),
  direction: text('direction').notNull(),
  amountBaseUnits: numeric('amount_base_units', { precision: 78, scale: 0 }).notNull(),
  createdAt: createdAt(),
}, (t) => [...contractChecks("ledger_postings"),...contractIndexes("ledger_postings")]).enableRLS();

export const operationKeys = pgTable('operation_keys', {
  businessKey: text('business_key').primaryKey(),
  requestHash: text('request_hash').notNull(),
  result: jsonb('result').$type<Record<string, unknown> | null>(),
  createdAt: createdAt(),
},(t)=>[...contractChecks("operation_keys"),...contractIndexes("operation_keys")]).enableRLS();

export const pointEvents = pgTable('point_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  sourceKey: text('source_key').notNull(),
  awardType: text('award_type').notNull(),
  points: integer('points').notNull(),
  createdAt: createdAt(),
}, (t) => [...contractChecks("point_events"),...contractIndexes("point_events"),unique('point_events_user_source_award_unique').on(t.userId, t.sourceKey, t.awardType)]).enableRLS();

export const walletLinks = pgTable('wallet_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  environment: text('environment').notNull(),
  chainId: text('chain_id').notNull(),
  address: text('address').notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull().defaultNow(),
  revision:integer('revision').notNull().default(1),
  coolingUntil: timestamp('cooling_until', { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [...contractChecks("wallet_links"),...contractIndexes("wallet_links"),unique('wallet_links_user_environment_chain_unique').on(t.userId, t.environment, t.chainId)]).enableRLS();

export const withdrawals = pgTable('withdrawals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'restrict' }),
  grossBaseUnits: numeric('gross_base_units', { precision: 78, scale: 0 }).notNull(),
  feeBaseUnits: numeric('fee_base_units', { precision: 78, scale: 0 }).notNull().default(sql.raw("0")),
  netBaseUnits: numeric('net_base_units', { precision: 78, scale: 0 }).notNull(),
  destination: text('destination').notNull(),
  status: text('status').notNull(),
  quoteExpiresAt: timestamp('quote_expires_at', { withTimezone: true }).notNull(),
  settledAt: timestamp('settled_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  requestKey: text('request_key').notNull().unique(),
  createdAt: createdAt(),
}, (t) => [...contractChecks("withdrawals"),...contractIndexes("withdrawals")]).enableRLS();

export const notifications = pgTable('notifications', {redactedAt:timestamp('redacted_at',{withTimezone:true}),redactedBodyHash:text('redacted_body_hash'),
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deliveryKey: text('delivery_key'),
  titleKey: text('title_key').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: createdAt(),
},(t)=>[...contractChecks("notifications"),...contractIndexes("notifications")]).enableRLS();

export const helpArticles=pgTable('help_articles',{id:uuid('id').primaryKey().defaultRandom(),locale:text('locale').notNull(),slug:text('slug').notNull(),title:text('title').notNull(),body:text('body').notNull(),published:boolean('published').notNull().default(false),version:integer('version').notNull().default(1),createdAt:createdAt(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),editedBy:uuid('edited_by').references(()=>users.id,{onDelete:'restrict'})},t=>[...contractChecks("help_articles"),...contractIndexes("help_articles"),unique().on(t.locale,t.slug)]).enableRLS();
export const slugRedirects=pgTable('slug_redirects',{locale:text('locale').notNull(),oldSlug:text('old_slug').notNull(),articleId:uuid('article_id').notNull().references(()=>helpArticles.id,{onDelete:'restrict'}),createdAt:createdAt()},t=>[...contractChecks("slug_redirects"),...contractIndexes("slug_redirects"),primaryKey({columns:[t.locale,t.oldSlug]})]).enableRLS();
export const notificationViews=pgTable('notification_views',{userId:uuid('user_id').primaryKey().references(()=>users.id,{onDelete:'cascade'}),seenAt:timestamp('seen_at',{withTimezone:true}).notNull(),seenId:uuid('seen_id').notNull(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow()},t=>[...contractChecks("notification_views"),...contractIndexes("notification_views")]).enableRLS();

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
}, (t) => [...contractChecks("x_manifest"),...contractIndexes("x_manifest")]).enableRLS();

export const auditEvents = pgTable('audit_events', {requestId:uuid('request_id').default(sql`nullif(current_setting('gw.request_id',true),'')::uuid`),
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  reason: text('reason'),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: createdAt(),
},t=>[...contractChecks("audit_events"),...contractIndexes("audit_events")]).enableRLS();

export const userAccountBalances = pgView('gw_user_account_balances', {
  userId: uuid('user_id'), assetId: uuid('asset_id'), purpose: text('purpose'),
  balance: numeric('balance',{precision:78,scale:0}),
}).existing();
export const environmentInstances = pgTable('environment_instances', {
  environment:text('environment').primaryKey(), instanceId:uuid('instance_id').notNull().unique().defaultRandom(), createdAt:createdAt(),
},(t) => [...contractChecks("environment_instances"),...contractIndexes("environment_instances")]).enableRLS();
export const queueRankNodes = pgTable('queue_rank_nodes', {
  partitionId:uuid('partition_id').notNull().references(()=>queuePartitions.id,{onDelete:'restrict'}),
  lane:text('lane').notNull(), nodeIndex:bigint('node_index',{mode:'bigint'}).notNull(), waitingCount:bigint('waiting_count',{mode:'bigint'}).notNull(),
},(t) => [...contractChecks("queue_rank_nodes"),...contractIndexes("queue_rank_nodes"),primaryKey({columns:[t.partitionId,t.lane,t.nodeIndex]})]).enableRLS();
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
},(t)=>[...contractChecks("receipt_allocations"),...contractIndexes("receipt_allocations")]).enableRLS();
export const queuePositions = pgView('gw_queue_positions', {
  entryId: uuid('entry_id'), displayPosition: bigint('display_position',{mode:'number'}),
}).existing();
export const simulationAccounts = pgView('gw_sim_accounts', {
  id: uuid('id'), username: text('username'), role: text('role'), status: text('status'), locale: text('locale'),
}).existing();

export const outbox = pgTable('outbox', {requestId:uuid('request_id').default(sql`nullif(current_setting('gw.request_id',true),'')::uuid`),redactedAt:timestamp('redacted_at',{withTimezone:true}),redactedPayloadHash:text('redacted_payload_hash'),
  id:uuid('id').primaryKey().defaultRandom(),businessKey:text('business_key').notNull().unique(),
  environment:text('environment').notNull(),kind:text('kind').notNull(),payload:jsonb('payload').notNull(),
  dispatchedAt:timestamp('dispatched_at',{withTimezone:true}),createdAt:createdAt(),
},(t)=>[...contractChecks("outbox"),...contractIndexes("outbox")]).enableRLS();
export const jobs = pgTable('jobs', {requestId:uuid('request_id').default(sql`nullif(current_setting('gw.request_id',true),'')::uuid`),redactedAt:timestamp('redacted_at',{withTimezone:true}),redactedPayloadHash:text('redacted_payload_hash'),
  id:uuid('id').primaryKey().defaultRandom(),outboxId:uuid('outbox_id').notNull().unique().references(()=>outbox.id,{onDelete:'restrict'}),
  businessKey:text('business_key').notNull().unique(),environment:text('environment').notNull(),kind:text('kind').notNull(),payload:jsonb('payload').notNull(),
  status:text('status').notNull().default('pending'),attempts:integer('attempts').notNull().default(0),retryLimit:integer('retry_limit').notNull(),
  dueAt:timestamp('due_at',{withTimezone:true}).notNull().defaultNow(),leaseGeneration:integer('lease_generation').notNull().default(0),leaseToken:uuid('lease_token'),leaseUntil:timestamp('lease_until',{withTimezone:true}),
  lastErrorCode:text('last_error_code'),completedAt:timestamp('completed_at',{withTimezone:true}),createdAt:createdAt(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
},(t)=>[...contractChecks("jobs"),...contractIndexes("jobs")]).enableRLS();
export const schedulerNonces = pgTable('scheduler_nonces', {
  id:uuid('id').primaryKey().defaultRandom(),environment:text('environment').notNull(),nonce:uuid('nonce').notNull(),
  expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:createdAt(),
},(t)=>[...contractChecks("scheduler_nonces"),...contractIndexes("scheduler_nonces"),unique('scheduler_nonces_environment_nonce_key').on(t.environment,t.nonce)]).enableRLS();
export const schedulerRuns = pgTable('scheduler_runs', {
  id:uuid('id').primaryKey().defaultRandom(),environment:text('environment').notNull(),runKey:text('run_key').notNull(),
  leaseGeneration:integer('lease_generation').notNull().default(1),leaseToken:uuid('lease_token').notNull(),leaseUntil:timestamp('lease_until',{withTimezone:true}).notNull(),
  completedAt:timestamp('completed_at',{withTimezone:true}),createdAt:createdAt(),
},(t)=>[...contractChecks("scheduler_runs"),...contractIndexes("scheduler_runs"),unique('scheduler_runs_environment_run_key_key').on(t.environment,t.runKey)]).enableRLS();

export const maintenanceResults=pgTable('maintenance_results',{
  id:uuid('id').primaryKey().defaultRandom(),sourceJobId:uuid('source_job_id').notNull().unique().references(()=>jobs.id,{onDelete:'restrict'}),
  environment:text('environment').notNull(),runDate:date('run_date').notNull(),pageNumber:integer('page_number').notNull(),leaseGeneration:integer('lease_generation').notNull(),
  noncesDeleted:integer('nonces_deleted').notNull(),runsDeleted:integer('runs_deleted').notNull(),batchLimit:integer('batch_limit').notNull(),
  held:boolean('held').notNull(),morePossible:boolean('more_possible').notNull(),checkedAt:timestamp('checked_at',{withTimezone:true}).notNull().default(sql`clock_timestamp()`),
},t=>[...contractChecks("maintenance_results"),...contractIndexes("maintenance_results")]).enableRLS();

export const simulationWithdrawalControls=pgTable('simulation_withdrawal_controls',{
  id:uuid('id').primaryKey().defaultRandom(),withdrawalId:uuid('withdrawal_id').notNull().unique().references(()=>withdrawals.id,{onDelete:'restrict'}),
  environment:text('environment').notNull().default('simulation'),outcome:text('outcome').notNull(),actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
  operationKey:text('operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),reason:text('reason').notNull(),createdAt:createdAt(),
},(t)=>[...contractChecks("simulation_withdrawal_controls"),...contractIndexes("simulation_withdrawal_controls")]).enableRLS();

export const financialReconciliationResults=pgTable('financial_reconciliation_results',{
  id:uuid('id').primaryKey().defaultRandom(),sourceJobId:uuid('source_job_id').notNull().unique().references(()=>jobs.id,{onDelete:'restrict'}),
  environment:text('environment').notNull(),runDate:date('run_date').notNull(),balanced:boolean('balanced').notNull(),consistent:boolean('consistent').notNull(),lineageComplete:boolean('lineage_complete').notNull(),
  result:jsonb('result').notNull(),snapshotStartedAt:timestamp('snapshot_started_at',{withTimezone:true}).notNull().defaultNow(),checkedAt:timestamp('checked_at',{withTimezone:true}).notNull().default(sql`clock_timestamp()`),
},(t)=>[...contractChecks("financial_reconciliation_results"),...contractIndexes("financial_reconciliation_results")]).enableRLS();

export const deploymentBindingChallenges=pgTable('deployment_binding_challenges',{
  id:uuid('id').primaryKey(),environment:text('environment').notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:createdAt(),
},(t)=>[...contractChecks("deployment_binding_challenges"),...contractIndexes("deployment_binding_challenges")]).enableRLS();

export const giftInvoices=pgTable('gift_invoices',{
  id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
  planVersionId:uuid('plan_version_id').notNull().references(()=>planVersions.id,{onDelete:'restrict'}),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),
  environment:text('environment').notNull().default('simulation'),chainId:text('chain_id').notNull().default('giv'),requestKey:uuid('request_key').notNull(),
  expectedBaseUnits:numeric('expected_base_units',{precision:78,scale:0}).notNull(),actualBaseUnits:numeric('actual_base_units',{precision:78,scale:0}),
  refundableBaseUnits:numeric('refundable_base_units',{precision:78,scale:0}).notNull().default(sql.raw("0")),status:text('status').notNull().default('quoted'),
  quoteExpiresAt:timestamp('quote_expires_at',{withTimezone:true}).notNull(),submittedAt:timestamp('submitted_at',{withTimezone:true}),createdAt:createdAt(),
},t=>[...contractChecks("gift_invoices"),...contractIndexes("gift_invoices"),unique('gift_invoice_request_key').on(t.userId,t.requestKey)]).enableRLS();
export const simulationIncomingControls=pgTable('simulation_incoming_controls',{
  id:uuid('id').primaryKey().defaultRandom(),invoiceId:uuid('invoice_id').notNull().unique().references(()=>giftInvoices.id,{onDelete:'restrict'}),
  environment:text('environment').notNull().default('simulation'),outcome:text('outcome').notNull(),actualBaseUnits:numeric('actual_base_units',{precision:78,scale:0}).notNull(),
  actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),operationKey:text('operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),reason:text('reason').notNull(),createdAt:createdAt(),
},t=>[...contractChecks("simulation_incoming_controls"),...contractIndexes("simulation_incoming_controls")]).enableRLS();
export const simulationIncomingEvents=pgTable('simulation_incoming_events',{
  id:uuid('id').primaryKey().defaultRandom(),invoiceId:uuid('invoice_id').notNull().unique().references(()=>giftInvoices.id,{onDelete:'restrict'}),
  environment:text('environment').notNull().default('simulation'),outcome:text('outcome').notNull(),giftOperationKey:text('gift_operation_key').unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),
  holdJournalId:uuid('hold_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}),acceptJournalId:uuid('accept_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}),refundJournalId:uuid('refund_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}),
  createdAt:createdAt(),
},t=>[...contractChecks("simulation_incoming_events"),...contractIndexes("simulation_incoming_events")]).enableRLS();
export const simulationIncomingRefunds=pgTable('simulation_incoming_refunds',{
  id:uuid('id').primaryKey().defaultRandom(),invoiceId:uuid('invoice_id').notNull().unique().references(()=>giftInvoices.id,{onDelete:'restrict'}),environment:text('environment').notNull().default('simulation'),
  actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),operationKey:text('operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),
  journalId:uuid('journal_id').notNull().unique().references(()=>ledgerJournals.id,{onDelete:'restrict'}),amountBaseUnits:numeric('amount_base_units',{precision:78,scale:0}).notNull(),reason:text('reason').notNull(),createdAt:createdAt(),
},t=>[...contractChecks("simulation_incoming_refunds"),...contractIndexes("simulation_incoming_refunds")]).enableRLS();

export const simulationReorgReviews=pgTable('simulation_reorg_reviews',{
 id:uuid('id').primaryKey(),sourceAllocationId:uuid('source_allocation_id').notNull().references(()=>receiptAllocations.id,{onDelete:'restrict'}),
 sourceOperationKey:text('source_operation_key').notNull().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),revision:integer('revision').notNull(),
 sourceCycleId:uuid('source_cycle_id').notNull().references(()=>cycles.id,{onDelete:'restrict'}),sourceTicket:bigint('source_ticket',{mode:'number'}).notNull(),
 partitionId:uuid('partition_id').notNull().references(()=>queuePartitions.id,{onDelete:'restrict'}),receiverEntryId:uuid('receiver_entry_id').references(()=>queueEntries.id,{onDelete:'restrict'}),
 assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),payerUserId:uuid('payer_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
 affectedUserIds:uuid('affected_user_ids').array().notNull(),environment:text('environment').notNull().default('simulation'),amountBaseUnits:numeric('amount_base_units',{precision:78,scale:0}).notNull(),
 settledOutgoingExposure:numeric('settled_outgoing_exposure',{precision:78,scale:0}).notNull().default(sql.raw("0")),lossJournalId:uuid('loss_journal_id').notNull().unique().references(()=>ledgerJournals.id,{onDelete:'restrict'}),
 actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),operationKey:text('operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),reason:text('reason').notNull(),createdAt:createdAt(),
},t=>[...contractChecks("simulation_reorg_reviews"),...contractIndexes("simulation_reorg_reviews"),unique('reorg_source_revision_unique').on(t.sourceAllocationId,t.revision)]).enableRLS();
export const simulationReorgResolutions=pgTable('simulation_reorg_resolutions',{
 id:uuid('id').primaryKey().defaultRandom(),reviewId:uuid('review_id').notNull().unique().references(()=>simulationReorgReviews.id,{onDelete:'restrict'}),environment:text('environment').notNull().default('simulation'),
 journalId:uuid('journal_id').notNull().unique().references(()=>ledgerJournals.id,{onDelete:'restrict'}),actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
 operationKey:text('operation_key').notNull().unique().references(()=>operationKeys.businessKey,{onDelete:'restrict'}),reason:text('reason').notNull(),createdAt:createdAt(),
},t=>[...contractChecks("simulation_reorg_resolutions"),...contractIndexes("simulation_reorg_resolutions")]).enableRLS();
export const userFinancialReviews=pgView('gw_user_financial_reviews',{
 userId:uuid('user_id').notNull(),assetId:uuid('asset_id').notNull(),reviewCount:integer('review_count').notNull(),
}).existing();
export const cycleFinancialReviews=pgView('gw_cycle_financial_reviews',{
 cycleId:uuid('cycle_id').notNull(),underReview:boolean('under_review').notNull(),invalidCreditCount:integer('invalid_credit_count').notNull(),queuePaused:boolean('queue_paused').notNull(),
}).existing();

export const reports=pgTable('reports',{id:uuid('id').primaryKey().defaultRandom(),actorId:uuid('actor_id').notNull().references(()=>users.id,{onDelete:'restrict'}),targetId:uuid('target_id').notNull().references(()=>users.id,{onDelete:'restrict'}),reasonHash:text('reason_hash').notNull(),body:text('body').notNull(),status:text('status').notNull().default('open'),revision:integer('revision').notNull().default(1),caseTokenHash:text('case_token_hash'),caseTokenExpiresAt:timestamp('case_token_expires_at',{withTimezone:true}),createdAt:createdAt(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow()},t=>[...contractChecks("reports"),...contractIndexes("reports")]).enableRLS();
export const appeals=pgTable('appeals',{id:uuid('id').primaryKey().defaultRandom(),reportId:uuid('report_id').notNull().references(()=>reports.id,{onDelete:'restrict'}),actorId:uuid('actor_id').notNull().references(()=>users.id,{onDelete:'restrict'}),body:text('body').notNull(),status:text('status').notNull().default('open'),revision:integer('revision').notNull().default(1),createdAt:createdAt(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow()},t=>[...contractChecks("appeals"),...contractIndexes("appeals")]).enableRLS();

export const migrationHistory=pgTable('schema_migrations',{name:text('name').primaryKey(),sha256:text('sha256').notNull(),appliedAt:timestamp('applied_at',{withTimezone:true}).notNull().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("schema_migrations"),...contractIndexes("schema_migrations")]).enableRLS();
export const dataExports=pgTable('data_exports',{id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),status:text('status').notNull().default('building'),section:integer('section').notNull().default(0),page:integer('page').notNull().default(0),afterId:uuid('after_id'),totalBytes:integer('total_bytes').notNull().default(0),createdAt:createdAt().default(sql.raw("clock_timestamp()")),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),completedAt:timestamp('completed_at',{withTimezone:true}),errorCode:text('error_code')},t=>[...contractChecks("data_exports"),...contractIndexes("data_exports")]).enableRLS();
export const exportChunks=pgTable('export_chunks',{exportId:uuid('export_id').notNull().references(()=>dataExports.id,{onDelete:'restrict'}),part:integer('part').notNull(),section:text('section').notNull(),cipher:text('cipher').notNull(),sha256:text('sha256').notNull(),rowCount:integer('row_count').notNull(),byteCount:integer('byte_count').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("export_chunks"),...contractIndexes("export_chunks"),primaryKey({columns:[t.exportId,t.part]})]).enableRLS();
export const walletChallenges=pgTable('wallet_challenges',{id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),environment:text('environment').notNull(),chain:text('chain').notNull(),assetKey:text('asset_key').notNull(),address:text('address').notNull(),message:text('message').notNull(),sessionGeneration:uuid('session_generation').notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),usedAt:timestamp('used_at',{withTimezone:true}),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("wallet_challenges"),...contractIndexes("wallet_challenges")]).enableRLS();
export const cryptoInvoices=pgTable('crypto_invoices',{id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),planVersionId:uuid('plan_version_id').notNull().references(()=>planVersions.id,{onDelete:'restrict'}),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),requestKey:uuid('request_key').notNull(),sessionGeneration:uuid('session_generation').notNull(),walletId:uuid('wallet_id').notNull().references(()=>walletLinks.id,{onDelete:'restrict'}),walletRevision:integer('wallet_revision').notNull(),environment:text('environment').notNull(),chain:text('chain').notNull(),registryHash:text('registry_hash').notNull(),registrySnapshot:jsonb('registry_snapshot').notNull().default(sql.raw("'{}'::jsonb")),treasury:text('treasury').notNull(),sender:text('sender').notNull(),expectedBaseUnits:numeric('expected_base_units',{precision:78,scale:0}).notNull(),usdReference:numeric('usd_reference',{precision:38,scale:18}).notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),status:text('status').notNull().default('quoted'),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("crypto_invoices"),...contractIndexes("crypto_invoices"),unique().on(t.userId,t.requestKey)]).enableRLS();
export const cryptoSubmissions=pgTable('crypto_submissions',{id:uuid('id').primaryKey().defaultRandom(),invoiceId:uuid('invoice_id').notNull().references(()=>cryptoInvoices.id,{onDelete:'restrict'}),txHash:text('tx_hash').notNull(),eventIndex:integer('event_index').notNull(),firstSeenAt:timestamp('first_seen_at',{withTimezone:true}).notNull().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("crypto_submissions"),...contractIndexes("crypto_submissions"),unique().on(t.invoiceId,t.txHash,t.eventIndex)]).enableRLS();
export const cryptoEvents=pgTable('crypto_events',{id:uuid('id').primaryKey().defaultRandom(),invoiceId:uuid('invoice_id').notNull().references(()=>cryptoInvoices.id,{onDelete:'restrict'}),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),environment:text('environment').notNull(),chain:text('chain').notNull(),txHash:text('tx_hash').notNull(),eventIndex:integer('event_index').notNull(),amountBaseUnits:numeric('amount_base_units',{precision:78,scale:0}).notNull(),sender:text('sender').notNull(),destination:text('destination').notNull(),blockHash:text('block_hash').notNull(),blockHeight:numeric('block_height',{precision:78,scale:0}).notNull(),status:text('status').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("crypto_events"),...contractIndexes("crypto_events"),unique().on(t.environment,t.chain,t.txHash,t.eventIndex,t.assetId)]).enableRLS();
export const priceQuotes=pgTable('price_quotes',{id:uuid('id').primaryKey().defaultRandom(),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),assetUsd:text('asset_usd').notNull(),nativeUsd:text('native_usd').notNull(),observedAt:timestamp('observed_at',{withTimezone:true}).notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),source:text('source').notNull(),fingerprint:text('fingerprint').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("price_quotes"),...contractIndexes("price_quotes")]).enableRLS();
export const cryptoObligations=pgTable('crypto_obligations',{id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').references(()=>users.id,{onDelete:'restrict'}),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),kind:text('kind').notNull(),previousObligationId:uuid('previous_obligation_id').references(():AnyPgColumn=>cryptoObligations.id,{onDelete:'restrict'}),businessKey:text('business_key').notNull().unique(),requestHash:text('request_hash').notNull(),environment:text('environment').notNull(),chain:text('chain').notNull(),treasuryFingerprint:text('treasury_fingerprint').notNull(),treasurySender:text('treasury_sender'),configurationHash:text('configuration_hash').notNull(),registryHash:text('registry_hash').notNull(),registrySnapshot:jsonb('registry_snapshot').notNull().default(sql.raw("'{}'::jsonb")),destination:text('destination').notNull(),sourcePurpose:text('source_purpose').notNull(),walletRevision:integer('wallet_revision'),sessionGeneration:uuid('session_generation'),grossBaseUnits:numeric('gross_base_units',{precision:78,scale:0}).notNull(),chargeBaseUnits:numeric('charge_base_units',{precision:78,scale:0}).notNull(),netBaseUnits:numeric('net_base_units',{precision:78,scale:0}).notNull(),nativeFeeQuote:numeric('native_fee_quote',{precision:78,scale:0}).notNull(),rateSnapshot:jsonb('rate_snapshot').notNull(),feeSnapshot:jsonb('fee_snapshot').notNull(),status:text('status').notNull().default('quoted'),quoteExpiresAt:timestamp('quote_expires_at',{withTimezone:true}).notNull(),approvedAt:timestamp('approved_at',{withTimezone:true}),completedAt:timestamp('completed_at',{withTimezone:true}),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("crypto_obligations"),...contractIndexes("crypto_obligations")]).enableRLS();
export const signerStates=pgTable('signer_states',{treasuryFingerprint:text('treasury_fingerprint').primaryKey(),environment:text('environment').notNull(),chain:text('chain').notNull(),nextNonce:numeric('next_nonce',{precision:78,scale:0}).notNull().default(sql.raw("0")),leaseToken:uuid('lease_token'),leaseGeneration:integer('lease_generation').notNull().default(0),leaseUntil:timestamp('lease_until',{withTimezone:true}),heartbeatAt:timestamp('heartbeat_at',{withTimezone:true}),configurationHash:text('configuration_hash')},t=>[...contractChecks("signer_states"),...contractIndexes("signer_states")]).enableRLS();
export const signerReservations=pgTable('signer_reservations',{obligationId:uuid('obligation_id').notNull().references(()=>cryptoObligations.id,{onDelete:'restrict'}),treasuryFingerprint:text('treasury_fingerprint').notNull(),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),signingDay:date('signing_day').notNull(),principalUsdMicros:numeric('principal_usd_micros',{precision:78,scale:0}).notNull(),nativeFeeReserved:numeric('native_fee_reserved',{precision:78,scale:0}).notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("signer_reservations"),...contractIndexes("signer_reservations"),primaryKey({columns:[t.obligationId,t.signingDay]})]).enableRLS();
export const signedAttempts=pgTable('signed_attempts',{id:uuid('id').primaryKey().defaultRandom(),previousAttemptId:uuid('previous_attempt_id').references(():AnyPgColumn=>signedAttempts.id,{onDelete:'restrict'}),signedAtHeight:numeric('signed_at_height',{precision:78,scale:0}),expiresAt:timestamp('expires_at',{withTimezone:true}),obligationId:uuid('obligation_id').notNull().references(()=>cryptoObligations.id,{onDelete:'restrict'}),attempt:integer('attempt').notNull(),environment:text('environment').notNull(),chain:text('chain').notNull(),txHash:text('tx_hash').notNull().unique(),nonce:numeric('nonce',{precision:78,scale:0}),validUntilHeight:numeric('valid_until_height',{precision:78,scale:0}),signedCipher:text('signed_cipher').notNull(),nativeFeeCap:numeric('native_fee_cap',{precision:78,scale:0}).notNull(),intentHash:text('intent_hash').notNull(),configurationHash:text('configuration_hash').notNull(),status:text('status').notNull().default('signed'),actualNativeFee:numeric('actual_native_fee',{precision:78,scale:0}),createdAt:createdAt().default(sql.raw("clock_timestamp()")),broadcastAt:timestamp('broadcast_at',{withTimezone:true}),confirmedAt:timestamp('confirmed_at',{withTimezone:true})},t=>[...contractChecks("signed_attempts"),...contractIndexes("signed_attempts"),unique().on(t.obligationId,t.attempt)]).enableRLS();
export const workerRequests=pgTable('worker_requests',{nonce:uuid('nonce').primaryKey(),environment:text('environment').notNull(),purpose:text('purpose').notNull(),bodyHash:text('body_hash').notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("worker_requests"),...contractIndexes("worker_requests")]).enableRLS();
export const operationalAlerts=pgTable('operational_alerts',{occurrence:integer('occurrence').notNull().default(1),escalationStep:integer('escalation_step').notNull().default(0),occurrenceStartedAt:timestamp('occurrence_started_at',{withTimezone:true}).notNull().default(sql.raw("clock_timestamp()")),id:uuid('id').primaryKey().defaultRandom(),environment:text('environment').notNull(),assetId:uuid('asset_id').references(()=>assets.id,{onDelete:'restrict'}),conditionKey:text('condition_key').notNull().unique(),severity:text('severity').notNull(),category:text('category').notNull(),status:text('status').notNull().default('open'),safeDetails:jsonb('safe_details').notNull().default({}),nextReminderAt:timestamp('next_reminder_at',{withTimezone:true}).notNull().default(sql.raw("clock_timestamp()")),reminders:integer('reminders').notNull().default(0),createdAt:createdAt().default(sql.raw("clock_timestamp()")),acknowledgedAt:timestamp('acknowledged_at',{withTimezone:true}),resolvedAt:timestamp('resolved_at',{withTimezone:true})},t=>[...contractChecks("operational_alerts"),...contractIndexes("operational_alerts")]).enableRLS();
export const alertDeliveries=pgTable('alert_deliveries',{occurrence:integer('occurrence').notNull().default(1),payloadText:text('payload_text'),payloadHash:text('payload_hash'),id:uuid('id').primaryKey().defaultRandom(),alertId:uuid('alert_id').notNull().references(()=>operationalAlerts.id,{onDelete:'restrict'}),businessKey:text('business_key').notNull().unique(),status:text('status').notNull().default('pending'),attempts:integer('attempts').notNull().default(0),leaseToken:uuid('lease_token'),leaseGeneration:integer('lease_generation').notNull().default(0),leaseUntil:timestamp('lease_until',{withTimezone:true}),createdAt:createdAt().default(sql.raw("clock_timestamp()")),deliveredAt:timestamp('delivered_at',{withTimezone:true})},t=>[...contractChecks("alert_deliveries"),...contractIndexes("alert_deliveries")]).enableRLS();
export const signedAttemptStatus=pgView('gw_signed_attempt_status',{signedAtHeight:numeric('signed_at_height',{precision:78,scale:0}),createdAt:timestamp('created_at',{withTimezone:true}),id:uuid('id').notNull(),obligationId:uuid('obligation_id').notNull(),txHash:text('tx_hash').notNull(),nonce:numeric('nonce',{precision:78,scale:0}),nativeFeeCap:numeric('native_fee_cap',{precision:78,scale:0}),status:text('status'),actualNativeFee:numeric('actual_native_fee',{precision:78,scale:0}),intentHash:text('intent_hash'),configurationHash:text('configuration_hash'),validUntilHeight:numeric('valid_until_height',{precision:78,scale:0}),expiresAt:timestamp('expires_at',{withTimezone:true}),previousAttemptId:uuid('previous_attempt_id')}).existing();

export const nativeReserveInflows=pgTable('native_reserve_inflows',{id:uuid('id').primaryKey().defaultRandom(),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),environment:text('environment').notNull(),chain:text('chain').notNull(),network:text('network').notNull(),txHash:text('tx_hash').notNull(),eventIndex:integer('event_index').notNull(),sender:text('sender').notNull(),destination:text('destination').notNull(),amountBaseUnits:numeric('amount_base_units',{precision:78,scale:0}).notNull(),blockHash:text('block_hash').notNull(),blockHeight:numeric('block_height',{precision:78,scale:0}).notNull(),statementHash:text('statement_hash').notNull(),requestHash:text('request_hash').notNull(),journalId:uuid('journal_id').notNull().references(()=>ledgerJournals.id,{onDelete:'restrict'}),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("native_reserve_inflows"),...contractIndexes("native_reserve_inflows"),unique().on(t.environment,t.chain,t.network,t.txHash,t.eventIndex,t.assetId)]).enableRLS();

export const signerHealth=pgView('gw_signer_health',{treasuryFingerprint:text('treasury_fingerprint').notNull(),chain:text('chain').notNull(),heartbeatAt:timestamp('heartbeat_at',{withTimezone:true}),nativeReserved:numeric('native_reserved',{precision:78,scale:0}).notNull()}).existing();

export const botChallenges=pgTable('bot_challenges',{id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),sessionGeneration:uuid('session_generation').notNull(),environment:text('environment').notNull(),surface:text('surface').notNull(),provider:text('provider').notNull(),dummyHash:text('dummy_hash'),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),consumedAt:timestamp('consumed_at',{withTimezone:true}),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("bot_challenges"),...contractIndexes("bot_challenges")]).enableRLS();
export const botTokenUses=pgTable('bot_token_uses',{tokenHash:text('token_hash').primaryKey(),challengeId:uuid('challenge_id').notNull().unique().references(()=>botChallenges.id,{onDelete:'restrict'}),requestKey:text('request_key').notNull(),environment:text('environment').notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("bot_token_uses"),...contractIndexes("bot_token_uses")]).enableRLS();
export const abuseSignals=pgTable('abuse_signals',{id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),category:text('category').notNull(),sourceKey:text('source_key').notNull().unique(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("abuse_signals"),...contractIndexes("abuse_signals")]).enableRLS();
export const liabilityRecoveries=pgTable('liability_recoveries',{id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),obligationId:uuid('obligation_id').notNull().unique().references(()=>cryptoObligations.id,{onDelete:'restrict'}),proofReference:text('proof_reference').notNull(),statement:text('statement').notNull(),statementHash:text('statement_hash').notNull(),signatureHash:text('signature_hash'),confirmationHash:text('confirmation_hash'),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),confirmedAt:timestamp('confirmed_at',{withTimezone:true}),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("liability_recoveries"),...contractIndexes("liability_recoveries")]).enableRLS();
export const recoveryViewCaps=pgTable('recovery_view_caps',{id:uuid('id').primaryKey().defaultRandom(),recoveryId:uuid('recovery_id').notNull().references(()=>liabilityRecoveries.id,{onDelete:'restrict'}),tokenHash:text('token_hash').notNull().unique(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("recovery_view_caps"),...contractIndexes("recovery_view_caps")]).enableRLS();
export const cryptoReorgReviews=pgTable('crypto_reorg_reviews',{id:uuid('id').primaryKey().defaultRandom(),eventId:uuid('event_id').notNull().references(()=>cryptoEvents.id,{onDelete:'restrict'}),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),revision:integer('revision').notNull(),amountBaseUnits:numeric('amount_base_units',{precision:78,scale:0}).notNull(),originalBlockHash:text('original_block_hash').notNull(),anchorHeight:numeric('anchor_height',{precision:78,scale:0}).notNull(),evidenceHash:text('evidence_hash').notNull(),lossJournalId:uuid('loss_journal_id').notNull().unique().references(()=>ledgerJournals.id,{onDelete:'restrict'}),reason:text('reason').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("crypto_reorg_reviews"),...contractIndexes("crypto_reorg_reviews"),unique().on(t.eventId,t.revision)]).enableRLS();
export const cryptoReorgResolutions=pgTable('crypto_reorg_resolutions',{reviewId:uuid('review_id').primaryKey().references(()=>cryptoReorgReviews.id,{onDelete:'restrict'}),journalId:uuid('journal_id').notNull().unique().references(()=>ledgerJournals.id,{onDelete:'restrict'}),blockHash:text('block_hash').notNull(),blockHeight:numeric('block_height',{precision:78,scale:0}),evidenceHash:text('evidence_hash').notNull(),reason:text('reason').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("crypto_reorg_resolutions"),...contractIndexes("crypto_reorg_resolutions")]).enableRLS();
export const signerHeartbeats=pgTable('signer_heartbeats',{treasuryFingerprint:text('treasury_fingerprint').primaryKey(),environment:text('environment').notNull(),chain:text('chain').notNull(),configurationHash:text('configuration_hash').notNull(),heartbeatAt:timestamp('heartbeat_at',{withTimezone:true}).notNull().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("signer_heartbeats"),...contractIndexes("signer_heartbeats")]).enableRLS();
export const chainCheckpoints=pgTable('chain_checkpoints',{id:uuid('id').primaryKey().defaultRandom(),bindingFingerprint:text('binding_fingerprint').notNull(),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),treasuryFingerprint:text('treasury_fingerprint').notNull(),treasurySender:text('treasury_sender').notNull(),registrySnapshot:jsonb('registry_snapshot').notNull(),configurationHash:text('configuration_hash').notNull(),height:numeric('height',{precision:78,scale:0}).notNull(),blockHash:text('block_hash').notNull(),actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),proofReference:text('proof_reference').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("chain_checkpoints"),...contractIndexes("chain_checkpoints")]).enableRLS();
export const chainRecoveryRuns=pgTable('chain_recovery_runs',{scanProgress:jsonb('scan_progress'),knownAttemptCursor:uuid('known_attempt_cursor'),id:uuid('id').primaryKey().defaultRandom(),checkpointId:uuid('checkpoint_id').notNull().references(()=>chainCheckpoints.id,{onDelete:'restrict'}),bindingFingerprint:text('binding_fingerprint').notNull(),throughHeight:numeric('through_height',{precision:78,scale:0}).notNull(),cursorHeight:numeric('cursor_height',{precision:78,scale:0}).notNull(),state:text('state').notNull().default('scanning'),revision:integer('revision').notNull().default(0),incomingCount:integer('incoming_count').notNull().default(0),outgoingCount:integer('outgoing_count').notNull().default(0),reasonCode:text('reason_code'),createdAt:createdAt().default(sql.raw("clock_timestamp()")),completedAt:timestamp('completed_at',{withTimezone:true})},t=>[...contractChecks("chain_recovery_runs"),...contractIndexes("chain_recovery_runs")]).enableRLS();
export const chainScanPages=pgTable('chain_scan_pages',{progressBefore:jsonb('progress_before'),progressAfter:jsonb('progress_after'),runId:uuid('run_id').notNull().references(()=>chainRecoveryRuns.id,{onDelete:'restrict'}),revision:integer('revision').notNull(),fromHeight:numeric('from_height',{precision:78,scale:0}).notNull(),throughHeight:numeric('through_height',{precision:78,scale:0}).notNull(),evidenceHash:text('evidence_hash').notNull(),incomingCount:integer('incoming_count').notNull(),outgoingCount:integer('outgoing_count').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("chain_scan_pages"),...contractIndexes("chain_scan_pages"),primaryKey({columns:[t.runId,t.revision]})]).enableRLS();
export const unallocatedInflows=pgTable('unallocated_inflows',{id:uuid('id').primaryKey().defaultRandom(),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),environment:text('environment').notNull(),chain:text('chain').notNull(),network:text('network').notNull(),txHash:text('tx_hash').notNull(),eventIndex:integer('event_index').notNull(),sender:text('sender').notNull(),destination:text('destination').notNull(),amountBaseUnits:numeric('amount_base_units',{precision:78,scale:0}).notNull(),blockHash:text('block_hash').notNull(),blockHeight:numeric('block_height',{precision:78,scale:0}).notNull(),registrySnapshot:jsonb('registry_snapshot').notNull(),treasuryFingerprint:text('treasury_fingerprint').notNull(),journalId:uuid('journal_id').notNull().unique().references(()=>ledgerJournals.id,{onDelete:'restrict'}),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("unallocated_inflows"),...contractIndexes("unallocated_inflows"),unique().on(t.assetId,t.environment,t.chain,t.network,t.txHash,t.eventIndex)]).enableRLS();
export const recoveryOutflows=pgTable('recovery_outflows',{id:uuid('id').primaryKey().defaultRandom(),runId:uuid('run_id').notNull().references(()=>chainRecoveryRuns.id,{onDelete:'restrict'}),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),txHash:text('tx_hash').notNull(),eventIndex:integer('event_index').notNull(),sender:text('sender').notNull(),destination:text('destination').notNull(),amountBaseUnits:numeric('amount_base_units',{precision:78,scale:0}).notNull(),blockHeight:numeric('block_height',{precision:78,scale:0}).notNull(),status:text('status').notNull(),obligationId:uuid('obligation_id').references(()=>cryptoObligations.id,{onDelete:'restrict'}),evidenceHash:text('evidence_hash').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("recovery_outflows"),...contractIndexes("recovery_outflows"),unique().on(t.runId,t.txHash,t.eventIndex)]).enableRLS();
export const unallocatedRefundClaims=pgTable('unallocated_refund_claims',{inflowId:uuid('inflow_id').primaryKey().references(()=>unallocatedInflows.id,{onDelete:'restrict'}),actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),statementHash:text('statement_hash').notNull(),signatureHash:text('signature_hash').notNull(),proofReference:text('proof_reference').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("unallocated_refund_claims"),...contractIndexes("unallocated_refund_claims")]).enableRLS();
export const publicStatistics=pgTable('public_statistics',{environment:text('environment').primaryKey(),members:bigint('members',{mode:'bigint'}).notNull(),pendingRegistrations:bigint('pending_registrations',{mode:'bigint'}).notNull(),settledMemberUsd:numeric('settled_member_usd',{precision:78,scale:18}).notNull(),observedAt:timestamp('observed_at',{withTimezone:true}).notNull().default(sql.raw("clock_timestamp()")),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull()},t=>[...contractChecks("public_statistics"),...contractIndexes("public_statistics")]).enableRLS();
export const recoveryOutflowResolutions=pgTable('recovery_outflow_resolutions',{accountSetupBaseUnits:numeric('account_setup_base_units',{precision:78,scale:0}).notNull(),setupJournalId:uuid('setup_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}),id:uuid('id').primaryKey().defaultRandom(),outflowId:uuid('outflow_id').notNull().references(()=>recoveryOutflows.id,{onDelete:'restrict'}),assetId:uuid('asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),txHash:text('tx_hash').notNull(),eventIndex:integer('event_index').notNull(),principalBaseUnits:numeric('principal_base_units',{precision:78,scale:0}).notNull(),nativeAssetId:uuid('native_asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),nativeFeeBaseUnits:numeric('native_fee_base_units',{precision:78,scale:0}).notNull(),principalJournalId:uuid('principal_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}),gasJournalId:uuid('gas_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}),actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),proofReference:text('proof_reference').notNull(),reason:text('reason').notNull(),evidenceHash:text('evidence_hash').notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("recovery_outflow_resolutions"),...contractIndexes("recovery_outflow_resolutions"),unique().on(t.assetId,t.txHash,t.eventIndex)]).enableRLS();
export const databaseBindingNonce=pgTable('database_binding_nonce',{singleton:boolean('singleton').primaryKey().default(true),nonce:uuid('nonce').notNull().defaultRandom(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("database_binding_nonce"),...contractIndexes("database_binding_nonce")]).enableRLS();

export const chainFeeClaims=pgTable('chain_fee_claims',{id:uuid('id').primaryKey().defaultRandom(),environment:text('environment').notNull(),chain:text('chain').notNull(),network:text('network').notNull(),txHash:text('tx_hash').notNull(),nativeAssetId:uuid('native_asset_id').notNull().references(()=>assets.id,{onDelete:'restrict'}),networkFeeBaseUnits:numeric('network_fee_base_units',{precision:78,scale:0}).notNull(),accountSetupBaseUnits:numeric('account_setup_base_units',{precision:78,scale:0}).notNull(),gasJournalId:uuid('gas_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}).unique("chain_fee_claims_gas_journal_id_key"),setupJournalId:uuid('setup_journal_id').references(()=>ledgerJournals.id,{onDelete:'restrict'}).unique("chain_fee_claims_setup_journal_id_key"),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("chain_fee_claims"),...contractIndexes("chain_fee_claims")]).enableRLS();

export const signerDispatchCursor=pgTable('signer_dispatch_cursor',{singleton:boolean('singleton').primaryKey().default(true),lastCreatedAt:timestamp('last_created_at',{withTimezone:true}),lastId:uuid('last_id')},t=>[...contractChecks("signer_dispatch_cursor"),...contractIndexes("signer_dispatch_cursor")]).enableRLS();

export const chainObservations=pgTable('chain_observations',{id:uuid('id').primaryKey().defaultRandom(),businessKey:text('business_key').notNull().unique(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),invoiceId:uuid('invoice_id').notNull().references(()=>cryptoInvoices.id,{onDelete:'restrict'}),txHash:text('tx_hash').notNull(),eventIndex:integer('event_index').notNull(),sourceJobId:uuid('source_job_id').unique().references(()=>jobs.id,{onDelete:'restrict'}),rounds:integer('rounds').notNull().default(0),status:text('status').notNull().default('pending'),nextObservationAt:timestamp('next_observation_at',{withTimezone:true}).notNull(),createdAt:createdAt().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("chain_observations"),...contractIndexes("chain_observations"),unique().on(t.invoiceId,t.txHash,t.eventIndex)]).enableRLS();

export const operationalDiagnostics=pgTable('operational_diagnostics',{environment:text('environment').primaryKey(),snapshot:jsonb('snapshot').notNull(),observedAt:timestamp('observed_at',{withTimezone:true}).notNull().default(sql.raw("clock_timestamp()"))},t=>[...contractChecks("operational_diagnostics"),...contractIndexes("operational_diagnostics")]).enableRLS();
export const providerQuotaReports=pgTable('provider_quota_reports',{bindingFingerprint:text('binding_fingerprint').notNull(),environment:text('environment').notNull(),provider:text('provider').notNull(),used:numeric('used',{precision:18,scale:0}).notNull(),capacity:numeric('capacity',{precision:18,scale:0}).notNull(),observedAt:timestamp('observed_at',{withTimezone:true}).notNull(),revision:integer('revision').notNull(),actorUserId:uuid('actor_user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),proofReference:text('proof_reference').notNull()},t=>[...contractChecks("provider_quota_reports"),...contractIndexes("provider_quota_reports"),primaryKey({columns:[t.environment,t.provider]})]).enableRLS();

export const schema = {
 operationalDiagnostics,providerQuotaReports,
 chainObservations,
 signerDispatchCursor,
 chainFeeClaims,
 databaseBindingNonce,recoveryOutflowResolutions,publicStatistics,
 unallocatedRefundClaims,
 chainCheckpoints,chainRecoveryRuns,chainScanPages,unallocatedInflows,recoveryOutflows,
 signerHeartbeats,
 cryptoReorgReviews,cryptoReorgResolutions,
 recoveryViewCaps,
 liabilityRecoveries,
 botChallenges,botTokenUses,abuseSignals,
 nativeReserveInflows,
 walletChallenges,cryptoInvoices,cryptoSubmissions,cryptoEvents,priceQuotes,cryptoObligations,signerStates,signerReservations,signedAttempts,workerRequests,operationalAlerts,alertDeliveries,signedAttemptStatus,signerHealth,
 migrationHistory,dataExports,exportChunks,
 reports,appeals,
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
